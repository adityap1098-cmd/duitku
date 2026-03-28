/**
 * Sync types — single source of truth.
 * DB conventions: money = INTEGER (Rupiah), boolean = 0/1, timestamps = TEXT (ISO 8601).
 */

import type { CategoryHint } from '../constants/categories';
import type { TransactionType } from './transaction';

/** Status of a sync operation in sync_logs */
export type SyncStatus = 'running' | 'completed' | 'failed';

/** sync_logs table row shape */
export interface SyncLog {
  id: string;
  user_id: string;
  status: SyncStatus;
  /** Number of Gmail emails found matching query */
  emails_found: number;
  /** Number of emails successfully parsed into transactions */
  emails_parsed: number;
  /** Number of new transactions created (after dedup) */
  transactions_created: number;
  /** Error message if status = 'failed' */
  error_message: string | null;
  /** ISO 8601 */
  started_at: string;
  /** ISO 8601, null while running */
  completed_at: string | null;
}

/** API response when triggering a sync */
export interface SyncTriggerResponse {
  sync_id: string;
  status: SyncStatus;
  message: string;
}

/** Input to email parsers — extracted from Gmail message */
export interface EmailInput {
  /** Gmail message ID for dedup */
  messageId: string;
  /** Email subject line */
  subject: string;
  /** Sender address (e.g. "noreply@grab.com") */
  from: string;
  /** Decoded email body text */
  body: string;
  /** ISO 8601 date from email headers */
  date: string;
}

/** Output from email parsers — ready to become a transaction */
export interface ParsedTransaction {
  /** Amount in Rupiah as integer */
  amount: number;
  /** Income or expense */
  type: TransactionType;
  /** Category hint from parser */
  category: CategoryHint;
  /** Human-readable description (e.g. "Grab ride to Sudirman") */
  description: string;
  /** ISO 8601 date (YYYY-MM-DD) */
  date: string;
  /** Platform identifier (e.g. 'grab', 'gojek', 'shopee') */
  platform: string;
  /** Snippet from original email body — max 200 chars */
  originalSnippet: string;
}
