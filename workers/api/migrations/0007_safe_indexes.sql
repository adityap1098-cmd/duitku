-- Safety migration: re-create indexes with IF NOT EXISTS.
-- Migrations 0004 and 0006 created indexes without IF NOT EXISTS,
-- which causes errors on re-apply. This migration drops and recreates
-- them safely, making the migration chain idempotent.

-- Drop indexes from 0004 (sync_logs) — safe even if they don't exist
DROP INDEX IF EXISTS idx_sync_logs_user_id;
DROP INDEX IF EXISTS idx_sync_logs_status;
DROP INDEX IF EXISTS idx_processed_emails_user_id;

-- Drop indexes from 0006 (recurring_transactions)
DROP INDEX IF EXISTS idx_recurring_user_dismissed;

-- Recreate all with IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_sync_logs_user_id ON sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_processed_emails_user_id ON processed_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_user_dismissed ON recurring_transactions(user_id, is_dismissed);

-- Also ensure recurring_transactions table exists with IF NOT EXISTS
-- (0006 lacked this — safe no-op if table already exists)
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  estimated_amount INTEGER NOT NULL,
  is_dismissed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
