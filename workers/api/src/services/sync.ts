/**
 * Sync orchestration service — ties Gmail API client and email parsers together.
 * Thick service pattern: all sync logic here, routes are thin HTTP wrappers.
 *
 * Cycle: get users → decrypt tokens → refresh access token → fetch emails →
 * parse → dedup → create transactions → log results.
 *
 * Money = INTEGER (Rupiah). Timestamps = TEXT (ISO 8601).
 */

import type { SyncLog, SyncStatus, ParsedTransaction } from '@duitku/shared';

import { decrypt } from '../lib/crypto';
import {
  refreshGmailAccessToken,
  listGmailMessages,
  getGmailMessage,
  GmailTokenError,
} from '../lib/gmail';
import { findParserForEmail, getAllParsers } from '../parsers/index';
import * as transactionService from './transaction';

// ── Gmail Query Builder ────────────────────────────────────

/**
 * Build Gmail search query from all registered parsers' sender patterns.
 * E.g. `from:(grab.com OR gojek.com OR shopee.co.id)`
 */
export function buildGmailQuery(afterDate?: string): string {
  const parsers = getAllParsers();
  const domains = new Set<string>();

  for (const parser of parsers) {
    for (const pattern of parser.senderPatterns) {
      // Extract domain from regex source
      // e.g. /no-?reply@shopee\.co\.id/i → "shopee.co.id"
      // e.g. /@bankmandiri\.co\.id/i → "bankmandiri.co.id"
      // e.g. /.*@go-jek\.com/i → "go-jek.com"
      const source = pattern.source;

      // Find the @ sign and take everything after it as the domain
      const atIndex = source.indexOf('@');
      if (atIndex >= 0) {
        const domainPart = source
          .slice(atIndex + 1)
          .replace(/\\\./g, '.')   // unescape dots
          .replace(/\$$/, '')      // remove end anchor
          .replace(/\/[gimsuy]*$/, ''); // remove flags
        domains.add(domainPart);
      } else {
        // No @, try the old approach (e.g. /grab\.com$/i)
        const cleaned = source
          .replace(/\\\./g, '.')
          .replace(/\$$/, '')
          .replace(/^\^?/, '')
          .replace(/\.\*.*$/, ''); // remove wildcards
        if (cleaned.includes('.')) {
          domains.add(cleaned);
        }
      }
    }
  }

  const fromClause = `from:(${[...domains].join(' OR ')})`;
  if (afterDate) {
    const formatted = afterDate.replace(/-/g, '/');
    return `${fromClause} after:${formatted}`;
  }
  return fromClause;
}

// ── Sync Log Helpers ───────────────────────────────────────

async function createSyncLog(
  db: D1Database,
  userId: string,
  status: SyncStatus = 'running'
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO sync_logs (id, user_id, status, emails_found, emails_parsed, transactions_created, started_at)
       VALUES (?, ?, ?, 0, 0, 0, ?)`
    )
    .bind(id, userId, status, now)
    .run();

  return id;
}

async function updateSyncLog(
  db: D1Database,
  syncLogId: string,
  userId: string,
  update: {
    status: SyncStatus;
    emails_found: number;
    emails_parsed: number;
    transactions_created: number;
    error_message?: string | null;
  }
): Promise<void> {
  const now = new Date().toISOString();

  await db
    .prepare(
      `UPDATE sync_logs
       SET status = ?, emails_found = ?, emails_parsed = ?, transactions_created = ?,
           error_message = ?, completed_at = ?
       WHERE id = ? AND user_id = ?`
    )
    .bind(
      update.status,
      update.emails_found,
      update.emails_parsed,
      update.transactions_created,
      update.error_message ?? null,
      now,
      syncLogId,
      userId
    )
    .run();
}

// ── Dedup Helpers ──────────────────────────────────────────

async function isEmailProcessed(
  db: D1Database,
  userId: string,
  gmailMessageId: string
): Promise<boolean> {
  const row = await db
    .prepare(
      'SELECT 1 FROM processed_emails WHERE gmail_message_id = ? AND user_id = ?'
    )
    .bind(gmailMessageId, userId)
    .first();

  return row !== null;
}

async function markEmailProcessed(
  db: D1Database,
  userId: string,
  gmailMessageId: string
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      'INSERT OR IGNORE INTO processed_emails (gmail_message_id, user_id, processed_at) VALUES (?, ?, ?)'
    )
    .bind(gmailMessageId, userId, now)
    .run();
}

// ── Last Sync Date ─────────────────────────────────────────

async function getLastSyncDate(
  db: D1Database,
  userId: string
): Promise<string | undefined> {
  const row = await db
    .prepare(
      `SELECT completed_at FROM sync_logs
       WHERE user_id = ? AND status = 'completed'
       ORDER BY completed_at DESC LIMIT 1`
    )
    .bind(userId)
    .first<{ completed_at: string }>();

  if (!row?.completed_at) return undefined;

  // Return YYYY-MM-DD
  return row.completed_at.slice(0, 10);
}

// ── Core Sync Functions ────────────────────────────────────

/**
 * Sync emails for a single user.
 * Orchestrates: decrypt token → refresh → query → fetch → parse → dedup → create.
 * Returns the sync log entry.
 */
export async function syncUserEmails(
  db: D1Database,
  userId: string,
  encryptedRefreshToken: string,
  encryptionKey: string,
  clientId: string,
  clientSecret: string
): Promise<SyncLog> {
  const syncLogId = await createSyncLog(db, userId, 'running');

  let emailsFound = 0;
  let emailsParsed = 0;
  let transactionsCreated = 0;

  try {
    // 1. Decrypt refresh token
    let refreshToken: string;
    try {
      refreshToken = await decrypt(encryptedRefreshToken, encryptionKey);
    } catch (err) {
      const msg = `Token decryption failed: ${err instanceof Error ? err.message : 'unknown'}`;
      await updateSyncLog(db, syncLogId, userId, {
        status: 'failed',
        emails_found: 0,
        emails_parsed: 0,
        transactions_created: 0,
        error_message: msg,
      });
      return getSyncLogById(db, syncLogId, userId);
    }

    // 2. Refresh access token
    let accessToken: string;
    try {
      accessToken = await refreshGmailAccessToken(refreshToken, clientId, clientSecret);
    } catch (err) {
      const isRevoked = err instanceof GmailTokenError && err.isRevoked;
      const msg = isRevoked
        ? 'Gmail access revoked by user'
        : `Token refresh failed: ${err instanceof Error ? err.message : 'unknown'}`;
      await updateSyncLog(db, syncLogId, userId, {
        status: 'failed',
        emails_found: 0,
        emails_parsed: 0,
        transactions_created: 0,
        error_message: msg,
      });
      return getSyncLogById(db, syncLogId, userId);
    }

    // 3. Build query and list messages
    // No date filter — rely on processed_emails dedup to skip already-seen emails.
    // This ensures historical emails from newly-added parsers are always fetched.
    const query = buildGmailQuery();
    console.log(`[sync] User ${userId} | Gmail query: ${query}`);

    const messages = await listGmailMessages(accessToken, query, 20);
    emailsFound = messages.length;
    console.log(`[sync] User ${userId} | Emails found: ${emailsFound}`);

    // 4. Process each message: dedup → fetch → parse → create transaction
    for (const msgRef of messages) {
      try {
        // Dedup check
        const alreadyProcessed = await isEmailProcessed(db, userId, msgRef.id);
        if (alreadyProcessed) {
          console.log(`[sync] Message ${msgRef.id} | SKIP: already processed`);
          continue;
        }

        // Fetch full message
        const email = await getGmailMessage(accessToken, msgRef.id);
        if (!email) {
          console.log(`[sync] Message ${msgRef.id} | SKIP: fetch returned null`);
          // Mark as processed to avoid re-fetching unfetchable messages
          await markEmailProcessed(db, userId, msgRef.id);
          continue;
        }

        console.log(`[sync] Message ${msgRef.id} | From: ${email.from} | Subject: ${email.subject?.slice(0, 60)}`);

        // Find matching parser
        const parser = findParserForEmail(email.from);
        if (!parser) {
          console.log(`[sync] Message ${msgRef.id} | SKIP: no parser matched for sender "${email.from}"`);
          await markEmailProcessed(db, userId, msgRef.id);
          continue;
        }

        console.log(`[sync] Message ${msgRef.id} | Parser: ${parser.platform}`);

        // Parse email
        const parsed: ParsedTransaction | null = parser.parse(email);
        if (!parsed) {
          console.log(`[sync] Message ${msgRef.id} | SKIP: parser returned null (no amount or unrecognized format)`);
          await markEmailProcessed(db, userId, msgRef.id);
          continue;
        }

        console.log(`[sync] Message ${msgRef.id} | Parsed: ${parsed.type} ${parsed.amount} ${parsed.category} "${parsed.description?.slice(0, 40)}"`);

        emailsParsed++;

        // Create transaction
        try {
          await transactionService.create(db, userId, {
            type: parsed.type,
            amount: parsed.amount,
            category: parsed.category,
            description: parsed.description,
            date: parsed.date,
            source: 'gmail_sync',
            platform: parsed.platform,
            notes: parsed.originalSnippet,
          });
          transactionsCreated++;
          console.log(`[sync] Message ${msgRef.id} | ✅ Transaction created: ${parsed.platform} ${parsed.amount}`);
        } catch (err) {
          // Log but continue — one bad transaction shouldn't block others
          console.error(`[sync] Message ${msgRef.id} | ❌ Failed to create transaction:`, err instanceof Error ? err.message : err);
          console.error(
            `[sync] Failed to create transaction for message ${msgRef.id}:`,
            err instanceof Error ? err.message : err
          );
        }

        // Mark as processed (after successful parse, regardless of transaction create outcome)
        await markEmailProcessed(db, userId, msgRef.id);
      } catch (err) {
        // Per-message error isolation — log and continue
        console.error(
          `[sync] Error processing message ${msgRef.id}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    // 5. Mark sync complete
    console.log(`[sync] User ${userId} | DONE: found=${emailsFound} parsed=${emailsParsed} created=${transactionsCreated}`);
    await updateSyncLog(db, syncLogId, userId, {
      status: 'completed',
      emails_found: emailsFound,
      emails_parsed: emailsParsed,
      transactions_created: transactionsCreated,
    });
  } catch (err) {
    // Top-level catch — infrastructure failures
    const msg = err instanceof Error ? err.message : 'Unknown sync error';
    console.error(`[sync] Sync failed for user ${userId}:`, msg);
    await updateSyncLog(db, syncLogId, userId, {
      status: 'failed',
      emails_found: emailsFound,
      emails_parsed: emailsParsed,
      transactions_created: transactionsCreated,
      error_message: msg,
    });
  }

  return getSyncLogById(db, syncLogId, userId);
}

/**
 * Cron entry point — sync all users with Gmail connected.
 * Per-user error isolation: one failure doesn't stop others.
 */
export async function syncAllUsers(
  db: D1Database,
  kv: KVNamespace,
  encryptionKey: string,
  clientId: string,
  clientSecret: string
): Promise<{ usersProcessed: number; usersSucceeded: number; usersFailed: number }> {
  // Query users with encrypted Gmail refresh tokens
  const usersResult = await db
    .prepare(
      "SELECT id, gmail_refresh_token FROM users WHERE gmail_refresh_token IS NOT NULL AND gmail_refresh_token != ''"
    )
    .all<{ id: string; gmail_refresh_token: string }>();

  const users = usersResult.results ?? [];
  let usersSucceeded = 0;
  let usersFailed = 0;

  for (const user of users) {
    // Per-user sync lock — same as manual trigger
    const lockKey = `sync:lock:${user.id}`;
    const existingLock = await kv.get(lockKey);
    if (existingLock) {
      console.log(`[cron-sync] Skipping user ${user.id} — sync already running`);
      continue;
    }
    await kv.put(lockKey, new Date().toISOString(), { expirationTtl: 300 });

    try {
      const syncLog = await syncUserEmails(
        db,
        user.id,
        user.gmail_refresh_token,
        encryptionKey,
        clientId,
        clientSecret
      );

      if (syncLog.status === 'completed') {
        usersSucceeded++;
      } else {
        usersFailed++;
      }
    } catch (err) {
      // Per-user error isolation
      usersFailed++;
      console.error(
        `[cron-sync] Failed for user ${user.id}:`,
        err instanceof Error ? err.message : err
      );
    } finally {
      await kv.delete(lockKey);
    }
  }

  console.log(
    `[cron-sync] Complete: ${users.length} users processed, ${usersSucceeded} succeeded, ${usersFailed} failed`
  );

  return {
    usersProcessed: users.length,
    usersSucceeded,
    usersFailed,
  };
}

/**
 * Manual sync trigger for a single authenticated user.
 * Returns the sync log entry with results.
 */
export async function triggerSync(
  db: D1Database,
  userId: string,
  encryptionKey: string,
  clientId: string,
  clientSecret: string
): Promise<SyncLog> {
  // Get user's encrypted refresh token
  const user = await db
    .prepare('SELECT gmail_refresh_token FROM users WHERE id = ?')
    .bind(userId)
    .first<{ gmail_refresh_token: string | null }>();

  if (!user?.gmail_refresh_token) {
    // Create a failed sync log for clarity
    const syncLogId = await createSyncLog(db, userId, 'failed');
    await updateSyncLog(db, syncLogId, userId, {
      status: 'failed',
      emails_found: 0,
      emails_parsed: 0,
      transactions_created: 0,
      error_message: 'Gmail not connected — no refresh token found',
    });
    return getSyncLogById(db, syncLogId, userId);
  }

  return syncUserEmails(
    db,
    userId,
    user.gmail_refresh_token,
    encryptionKey,
    clientId,
    clientSecret
  );
}

/**
 * Get the latest sync log for a user — for status display.
 */
export async function getLatestSyncLog(
  db: D1Database,
  userId: string
): Promise<SyncLog | null> {
  const row = await db
    .prepare(
      'SELECT * FROM sync_logs WHERE user_id = ? ORDER BY started_at DESC LIMIT 1'
    )
    .bind(userId)
    .first<SyncLog>();

  return row ?? null;
}

/**
 * Get a specific sync log by ID (internal helper).
 * Includes user_id filter to maintain manual RLS pattern.
 */
async function getSyncLogById(db: D1Database, syncLogId: string, userId: string): Promise<SyncLog> {
  const row = await db
    .prepare('SELECT * FROM sync_logs WHERE id = ? AND user_id = ?')
    .bind(syncLogId, userId)
    .first<SyncLog>();

  if (!row) {
    // Shouldn't happen — we just created it. Construct a minimal fallback.
    return {
      id: syncLogId,
      user_id: '',
      status: 'failed',
      emails_found: 0,
      emails_parsed: 0,
      transactions_created: 0,
      error_message: 'Sync log not found after creation',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };
  }

  return row;
}
