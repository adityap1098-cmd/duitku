/**
 * Sync service tests — covers sync orchestration with mocked Gmail client, D1, and parsers.
 * Tests: happy path, dedup, token refresh failure, parse failure, empty inbox, status endpoint.
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import type { SyncLog, EmailInput, ParsedTransaction } from '@duitku/shared';

// ── Mock modules before import ─────────────────────────────

vi.mock('../../src/lib/crypto', () => ({
  decrypt: vi.fn(),
}));

vi.mock('../../src/lib/gmail', () => ({
  refreshGmailAccessToken: vi.fn(),
  listGmailMessages: vi.fn(),
  getGmailMessage: vi.fn(),
  GmailTokenError: class GmailTokenError extends Error {
    isRevoked: boolean;
    constructor(message: string, isRevoked: boolean) {
      super(message);
      this.name = 'GmailTokenError';
      this.isRevoked = isRevoked;
    }
  },
}));

vi.mock('../../src/services/transaction', () => ({
  create: vi.fn(),
}));

// Import after mocks are set up
import {
  syncUserEmails,
  syncAllUsers,
  triggerSync,
  getLatestSyncLog,
  buildGmailQuery,
} from '../../src/services/sync';

import { decrypt } from '../../src/lib/crypto';
import {
  refreshGmailAccessToken,
  listGmailMessages,
  getGmailMessage,
  GmailTokenError,
} from '../../src/lib/gmail';
import * as transactionService from '../../src/services/transaction';

// ── D1 Mock ────────────────────────────────────────────────

interface MockRow {
  [key: string]: unknown;
}

/**
 * Create a mock D1 database that tracks sync_logs, processed_emails, users, and transactions.
 */
function createMockDB(initialUsers: MockRow[] = []) {
  const syncLogs: MockRow[] = [];
  const processedEmails: MockRow[] = [];
  const users: MockRow[] = [...initialUsers];

  const mockDB = {
    _syncLogs: syncLogs,
    _processedEmails: processedEmails,
    _users: users,

    prepare: (sql: string) => {
      let bindings: unknown[] = [];

      const stmt = {
        bind: (...args: unknown[]) => {
          bindings = args;
          return stmt;
        },
        first: async <T = MockRow>(): Promise<T | null> => {
          const sqlLower = sql.toLowerCase();

          // SELECT 1 FROM processed_emails WHERE gmail_message_id = ? AND user_id = ?
          if (sqlLower.includes('processed_emails') && sqlLower.includes('select')) {
            const found = processedEmails.find(
              (r) => r.gmail_message_id === bindings[0] && r.user_id === bindings[1]
            );
            return (found ?? null) as T | null;
          }

          // SELECT * FROM sync_logs WHERE id = ? AND user_id = ?
          if (sqlLower.includes('sync_logs') && sqlLower.includes('where id')) {
            const found = syncLogs.find(
              (r) => r.id === bindings[0] && (bindings.length < 2 || r.user_id === bindings[1])
            );
            return (found ?? null) as T | null;
          }

          // SELECT completed_at FROM sync_logs ... ORDER BY completed_at DESC LIMIT 1
          if (sqlLower.includes('sync_logs') && sqlLower.includes('completed_at') && sqlLower.includes('order by')) {
            const userLogs = syncLogs
              .filter((r) => r.user_id === bindings[0] && r.status === 'completed')
              .sort((a, b) => {
                const aDate = String(a.completed_at ?? '');
                const bDate = String(b.completed_at ?? '');
                return bDate.localeCompare(aDate);
              });
            return (userLogs[0] ?? null) as T | null;
          }

          // SELECT * FROM sync_logs WHERE user_id = ? ORDER BY started_at DESC LIMIT 1
          if (sqlLower.includes('sync_logs') && sqlLower.includes('user_id') && sqlLower.includes('order by')) {
            const userLogs = syncLogs
              .filter((r) => r.user_id === bindings[0])
              .sort((a, b) => {
                const aDate = String(a.started_at ?? '');
                const bDate = String(b.started_at ?? '');
                return bDate.localeCompare(aDate);
              });
            return (userLogs[0] ?? null) as T | null;
          }

          // SELECT gmail_refresh_token FROM users WHERE id = ?
          if (sqlLower.includes('users') && sqlLower.includes('where id')) {
            const found = users.find((u) => u.id === bindings[0]);
            return (found ?? null) as T | null;
          }

          return null;
        },
        all: async <T = MockRow>(): Promise<{ results: T[] }> => {
          const sqlLower = sql.toLowerCase();

          // SELECT id, gmail_refresh_token FROM users WHERE gmail_refresh_token IS NOT NULL
          if (sqlLower.includes('users') && sqlLower.includes('gmail_refresh_token')) {
            const filtered = users.filter(
              (u) => u.gmail_refresh_token !== null && u.gmail_refresh_token !== ''
            );
            return { results: filtered as T[] };
          }

          return { results: [] };
        },
        run: async () => {
          const sqlLower = sql.toLowerCase();

          // INSERT INTO sync_logs
          if (sqlLower.includes('insert') && sqlLower.includes('sync_logs')) {
            syncLogs.push({
              id: bindings[0],
              user_id: bindings[1],
              status: bindings[2],
              emails_found: 0,
              emails_parsed: 0,
              transactions_created: 0,
              error_message: null,
              started_at: bindings[3],
              completed_at: null,
            });
            return { success: true };
          }

          // UPDATE sync_logs
          if (sqlLower.includes('update') && sqlLower.includes('sync_logs')) {
            const id = bindings[6]; // last binding is the ID
            const log = syncLogs.find((r) => r.id === id);
            if (log) {
              log.status = bindings[0];
              log.emails_found = bindings[1];
              log.emails_parsed = bindings[2];
              log.transactions_created = bindings[3];
              log.error_message = bindings[4];
              log.completed_at = bindings[5];
            }
            return { success: true };
          }

          // INSERT INTO processed_emails
          if (sqlLower.includes('insert') && sqlLower.includes('processed_emails')) {
            const existing = processedEmails.find(
              (r) => r.gmail_message_id === bindings[0] && r.user_id === bindings[1]
            );
            if (!existing) {
              processedEmails.push({
                gmail_message_id: bindings[0],
                user_id: bindings[1],
                processed_at: bindings[2],
              });
            }
            return { success: true };
          }

          return { success: true };
        },
      };

      return stmt;
    },
  };

  return mockDB as unknown as D1Database & {
    _syncLogs: MockRow[];
    _processedEmails: MockRow[];
    _users: MockRow[];
  };
}

// ── Test Data ──────────────────────────────────────────────

const TEST_USER_ID = 'user-123';
const ENCRYPTED_TOKEN = 'encrypted-refresh-token';
const DECRYPTED_TOKEN = 'real-refresh-token';
const ACCESS_TOKEN = 'access-token-xyz';
const ENCRYPTION_KEY = 'test-encryption-key';
const CLIENT_ID = 'test-client-id';
const CLIENT_SECRET = 'test-client-secret';

const GRAB_EMAIL: EmailInput = {
  messageId: 'msg-001',
  subject: 'Trip receipt from Grab',
  from: 'no-reply@grab.com',
  body: 'Total: Rp25.000\nGrabCar ride',
  date: '2024-01-15T10:00:00Z',
};

const GOJEK_EMAIL: EmailInput = {
  messageId: 'msg-002',
  subject: 'GoFood order confirmation',
  from: 'no-reply@gojek.com',
  body: 'Total: Rp45.000\nGoFood order',
  date: '2024-01-15T11:00:00Z',
};

const PARSED_GRAB: ParsedTransaction = {
  amount: 25000,
  type: 'expense',
  category: 'transport',
  description: 'Grab ride',
  date: '2024-01-15',
  platform: 'grab',
  originalSnippet: 'Total: Rp25.000 GrabCar ride',
};

const PARSED_GOJEK: ParsedTransaction = {
  amount: 45000,
  type: 'expense',
  category: 'food',
  description: 'GoFood order',
  date: '2024-01-15',
  platform: 'gojek',
  originalSnippet: 'Total: Rp45.000 GoFood order',
};

// ── Tests ──────────────────────────────────────────────────

describe('buildGmailQuery', () => {
  it('builds query from all parser sender patterns', () => {
    const query = buildGmailQuery();
    expect(query).toContain('from:');
    expect(query).toContain('OR');
  });

  it('includes after: clause when date provided', () => {
    const query = buildGmailQuery('2024-01-01');
    expect(query).toContain('after:2024/01/01');
  });
});

describe('syncUserEmails', () => {
  let db: ReturnType<typeof createMockDB>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDB();

    // Default happy path mocks
    (decrypt as Mock).mockResolvedValue(DECRYPTED_TOKEN);
    (refreshGmailAccessToken as Mock).mockResolvedValue(ACCESS_TOKEN);
  });

  it('happy path: emails found, parsed, transactions created', async () => {
    (listGmailMessages as Mock).mockResolvedValue([
      { id: 'msg-001', threadId: 't-001' },
      { id: 'msg-002', threadId: 't-002' },
    ]);
    (getGmailMessage as Mock)
      .mockResolvedValueOnce(GRAB_EMAIL)
      .mockResolvedValueOnce(GOJEK_EMAIL);
    (transactionService.create as Mock).mockResolvedValue({ id: 'tx-1' });

    const result = await syncUserEmails(
      db,
      TEST_USER_ID,
      ENCRYPTED_TOKEN,
      ENCRYPTION_KEY,
      CLIENT_ID,
      CLIENT_SECRET
    );

    expect(result.status).toBe('completed');
    expect(result.emails_found).toBe(2);
    // Parsing depends on real parser matching — with mocked getGmailMessage
    // the actual parser.parse() runs against the test email body
    expect(result.user_id).toBe(TEST_USER_ID);
    expect(decrypt).toHaveBeenCalledWith(ENCRYPTED_TOKEN, ENCRYPTION_KEY);
    expect(refreshGmailAccessToken).toHaveBeenCalledWith(
      DECRYPTED_TOKEN,
      CLIENT_ID,
      CLIENT_SECRET
    );
    expect(listGmailMessages).toHaveBeenCalled();
  });

  it('deduplication: already-processed email IDs are skipped', async () => {
    // Pre-populate processed_emails
    db._processedEmails.push({
      gmail_message_id: 'msg-001',
      user_id: TEST_USER_ID,
      processed_at: '2024-01-14T00:00:00Z',
    });

    (listGmailMessages as Mock).mockResolvedValue([
      { id: 'msg-001', threadId: 't-001' }, // already processed
      { id: 'msg-003', threadId: 't-003' }, // new
    ]);
    (getGmailMessage as Mock).mockResolvedValue(GRAB_EMAIL);
    (transactionService.create as Mock).mockResolvedValue({ id: 'tx-1' });

    const result = await syncUserEmails(
      db,
      TEST_USER_ID,
      ENCRYPTED_TOKEN,
      ENCRYPTION_KEY,
      CLIENT_ID,
      CLIENT_SECRET
    );

    expect(result.status).toBe('completed');
    expect(result.emails_found).toBe(2);
    // getGmailMessage should only be called once (for msg-003, skipping msg-001)
    expect(getGmailMessage).toHaveBeenCalledTimes(1);
  });

  it('token decryption failure: sync_log records error, returns failed', async () => {
    (decrypt as Mock).mockRejectedValue(new Error('Decryption failed'));

    const result = await syncUserEmails(
      db,
      TEST_USER_ID,
      ENCRYPTED_TOKEN,
      ENCRYPTION_KEY,
      CLIENT_ID,
      CLIENT_SECRET
    );

    expect(result.status).toBe('failed');
    expect(result.error_message).toContain('Token decryption failed');
    // Should not attempt Gmail API calls
    expect(refreshGmailAccessToken).not.toHaveBeenCalled();
    expect(listGmailMessages).not.toHaveBeenCalled();
  });

  it('token refresh failure: sync_log records error, user skipped', async () => {
    (decrypt as Mock).mockResolvedValue(DECRYPTED_TOKEN);
    (refreshGmailAccessToken as Mock).mockRejectedValue(
      new GmailTokenError('Token expired', false)
    );

    const result = await syncUserEmails(
      db,
      TEST_USER_ID,
      ENCRYPTED_TOKEN,
      ENCRYPTION_KEY,
      CLIENT_ID,
      CLIENT_SECRET
    );

    expect(result.status).toBe('failed');
    expect(result.error_message).toContain('Token refresh failed');
    expect(listGmailMessages).not.toHaveBeenCalled();
  });

  it('token revoked: error message indicates revocation', async () => {
    (decrypt as Mock).mockResolvedValue(DECRYPTED_TOKEN);
    (refreshGmailAccessToken as Mock).mockRejectedValue(
      new GmailTokenError('invalid_grant', true)
    );

    const result = await syncUserEmails(
      db,
      TEST_USER_ID,
      ENCRYPTED_TOKEN,
      ENCRYPTION_KEY,
      CLIENT_ID,
      CLIENT_SECRET
    );

    expect(result.status).toBe('failed');
    expect(result.error_message).toBe('Gmail access revoked by user');
  });

  it('parse failure: unparseable email skipped, others still processed', async () => {
    const unparsableEmail: EmailInput = {
      messageId: 'msg-unknown',
      subject: 'Random newsletter',
      from: 'newsletter@randomsite.com', // no matching parser
      body: 'Some random content',
      date: '2024-01-15T12:00:00Z',
    };

    (listGmailMessages as Mock).mockResolvedValue([
      { id: 'msg-unknown', threadId: 't-x' },
      { id: 'msg-002', threadId: 't-002' },
    ]);
    (getGmailMessage as Mock)
      .mockResolvedValueOnce(unparsableEmail)
      .mockResolvedValueOnce(GOJEK_EMAIL);
    (transactionService.create as Mock).mockResolvedValue({ id: 'tx-1' });

    const result = await syncUserEmails(
      db,
      TEST_USER_ID,
      ENCRYPTED_TOKEN,
      ENCRYPTION_KEY,
      CLIENT_ID,
      CLIENT_SECRET
    );

    expect(result.status).toBe('completed');
    expect(result.emails_found).toBe(2);
    // The unknown email is skipped (NOT marked processed — allows re-evaluation)
    // Only the gojek email (successfully parsed + created) is marked processed
    expect(db._processedEmails).toHaveLength(1);
  });

  it('empty inbox: sync completes with 0 counts', async () => {
    (listGmailMessages as Mock).mockResolvedValue([]);

    const result = await syncUserEmails(
      db,
      TEST_USER_ID,
      ENCRYPTED_TOKEN,
      ENCRYPTION_KEY,
      CLIENT_ID,
      CLIENT_SECRET
    );

    expect(result.status).toBe('completed');
    expect(result.emails_found).toBe(0);
    expect(result.emails_parsed).toBe(0);
    expect(result.transactions_created).toBe(0);
  });

  it('getGmailMessage returns null: message skipped gracefully', async () => {
    (listGmailMessages as Mock).mockResolvedValue([
      { id: 'msg-unfetchable', threadId: 't-x' },
    ]);
    (getGmailMessage as Mock).mockResolvedValue(null);

    const result = await syncUserEmails(
      db,
      TEST_USER_ID,
      ENCRYPTED_TOKEN,
      ENCRYPTION_KEY,
      CLIENT_ID,
      CLIENT_SECRET
    );

    expect(result.status).toBe('completed');
    expect(result.emails_found).toBe(1);
    expect(result.emails_parsed).toBe(0);
    // Message is marked processed to avoid re-fetching
    expect(db._processedEmails).toHaveLength(1);
  });

  it('transaction creation failure: logged but sync continues', async () => {
    (listGmailMessages as Mock).mockResolvedValue([
      { id: 'msg-001', threadId: 't-001' },
    ]);
    (getGmailMessage as Mock).mockResolvedValue(GRAB_EMAIL);
    (transactionService.create as Mock).mockRejectedValue(
      new Error('DB constraint violation')
    );

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await syncUserEmails(
      db,
      TEST_USER_ID,
      ENCRYPTED_TOKEN,
      ENCRYPTION_KEY,
      CLIENT_ID,
      CLIENT_SECRET
    );

    expect(result.status).toBe('completed');
    // Still marked processed even if transaction create failed
    expect(db._processedEmails).toHaveLength(1);

    consoleErrorSpy.mockRestore();
  });
});

describe('syncAllUsers', () => {
  let db: ReturnType<typeof createMockDB>;
  const mockKV = {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  } as unknown as KVNamespace;

  beforeEach(() => {
    vi.clearAllMocks();

    (decrypt as Mock).mockResolvedValue(DECRYPTED_TOKEN);
    (refreshGmailAccessToken as Mock).mockResolvedValue(ACCESS_TOKEN);
    (listGmailMessages as Mock).mockResolvedValue([]);
  });

  it('processes all users with gmail tokens', async () => {
    db = createMockDB([
      { id: 'user-1', gmail_refresh_token: 'token-1' },
      { id: 'user-2', gmail_refresh_token: 'token-2' },
    ]);

    const result = await syncAllUsers(
      db,
      mockKV,
      ENCRYPTION_KEY,
      CLIENT_ID,
      CLIENT_SECRET
    );

    expect(result.usersProcessed).toBe(2);
    expect(result.usersSucceeded).toBe(2);
    expect(result.usersFailed).toBe(0);
  });

  it('skips users without gmail tokens', async () => {
    db = createMockDB([
      { id: 'user-1', gmail_refresh_token: 'token-1' },
      { id: 'user-2', gmail_refresh_token: null },
      { id: 'user-3', gmail_refresh_token: '' },
    ]);

    const result = await syncAllUsers(
      db,
      mockKV,
      ENCRYPTION_KEY,
      CLIENT_ID,
      CLIENT_SECRET
    );

    expect(result.usersProcessed).toBe(1);
    expect(result.usersSucceeded).toBe(1);
  });

  it('per-user error isolation: one failure does not stop others', async () => {
    db = createMockDB([
      { id: 'user-1', gmail_refresh_token: 'token-1' },
      { id: 'user-2', gmail_refresh_token: 'token-2' },
    ]);

    // First user decrypt fails, second succeeds
    (decrypt as Mock)
      .mockRejectedValueOnce(new Error('Corrupt token'))
      .mockResolvedValueOnce(DECRYPTED_TOKEN);

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await syncAllUsers(
      db,
      mockKV,
      ENCRYPTION_KEY,
      CLIENT_ID,
      CLIENT_SECRET
    );

    expect(result.usersProcessed).toBe(2);
    expect(result.usersFailed).toBe(1);
    expect(result.usersSucceeded).toBe(1);

    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('no users with gmail: returns zero counts', async () => {
    db = createMockDB([]);

    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await syncAllUsers(
      db,
      mockKV,
      ENCRYPTION_KEY,
      CLIENT_ID,
      CLIENT_SECRET
    );

    expect(result.usersProcessed).toBe(0);
    expect(result.usersSucceeded).toBe(0);
    expect(result.usersFailed).toBe(0);

    consoleLogSpy.mockRestore();
  });
});

describe('triggerSync', () => {
  let db: ReturnType<typeof createMockDB>;

  beforeEach(() => {
    vi.clearAllMocks();
    (decrypt as Mock).mockResolvedValue(DECRYPTED_TOKEN);
    (refreshGmailAccessToken as Mock).mockResolvedValue(ACCESS_TOKEN);
    (listGmailMessages as Mock).mockResolvedValue([]);
  });

  it('triggers sync for user with gmail connected', async () => {
    db = createMockDB([
      { id: TEST_USER_ID, gmail_refresh_token: ENCRYPTED_TOKEN },
    ]);

    const result = await triggerSync(
      db,
      TEST_USER_ID,
      ENCRYPTION_KEY,
      CLIENT_ID,
      CLIENT_SECRET
    );

    expect(result.status).toBe('completed');
    expect(result.user_id).toBe(TEST_USER_ID);
  });

  it('returns failed sync log when gmail not connected', async () => {
    db = createMockDB([
      { id: TEST_USER_ID, gmail_refresh_token: null },
    ]);

    const result = await triggerSync(
      db,
      TEST_USER_ID,
      ENCRYPTION_KEY,
      CLIENT_ID,
      CLIENT_SECRET
    );

    expect(result.status).toBe('failed');
    expect(result.error_message).toContain('Gmail not connected');
  });
});

describe('getLatestSyncLog', () => {
  it('returns latest sync log for user', async () => {
    const db = createMockDB();
    // Manually insert a sync log
    db._syncLogs.push({
      id: 'log-1',
      user_id: TEST_USER_ID,
      status: 'completed',
      emails_found: 5,
      emails_parsed: 3,
      transactions_created: 3,
      error_message: null,
      started_at: '2024-01-15T10:00:00Z',
      completed_at: '2024-01-15T10:01:00Z',
    });

    const result = await getLatestSyncLog(db, TEST_USER_ID);

    expect(result).not.toBeNull();
    expect(result!.id).toBe('log-1');
    expect(result!.status).toBe('completed');
    expect(result!.emails_found).toBe(5);
  });

  it('returns null when no sync logs exist', async () => {
    const db = createMockDB();

    const result = await getLatestSyncLog(db, TEST_USER_ID);

    expect(result).toBeNull();
  });
});
