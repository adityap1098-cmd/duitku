-- Sync state tables for Gmail sync engine.
-- sync_logs tracks each sync run; processed_emails prevents re-parsing.

CREATE TABLE IF NOT EXISTS sync_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',  -- 'running' | 'completed' | 'failed'
  emails_found INTEGER NOT NULL DEFAULT 0,
  emails_parsed INTEGER NOT NULL DEFAULT 0,
  transactions_created INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sync_logs_user_id ON sync_logs(user_id);
CREATE INDEX idx_sync_logs_status ON sync_logs(status);

CREATE TABLE IF NOT EXISTS processed_emails (
  gmail_message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  processed_at TEXT NOT NULL,
  PRIMARY KEY (gmail_message_id, user_id)
);

CREATE INDEX idx_processed_emails_user_id ON processed_emails(user_id);
