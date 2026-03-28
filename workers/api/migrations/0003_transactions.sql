-- Migration: 0003_transactions.sql
-- Creates the transactions table for manual and synced transactions.
-- Conventions: money = INTEGER (Rupiah), boolean = INTEGER (0/1), timestamps = TEXT (ISO 8601).

CREATE TABLE IF NOT EXISTS transactions (
  id          TEXT    PRIMARY KEY,
  user_id     TEXT    NOT NULL,
  type        TEXT    NOT NULL,               -- 'income' | 'expense'
  amount      INTEGER NOT NULL,               -- Rupiah as integer, always > 0
  category    TEXT    NOT NULL,               -- CategoryHint value
  description TEXT    NOT NULL DEFAULT '',
  date        TEXT    NOT NULL,               -- ISO 8601 date (YYYY-MM-DD)
  source      TEXT    NOT NULL DEFAULT 'manual', -- 'manual' | 'gmail_sync'
  notes       TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for listing by user (RLS filter)
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

-- Index for date-range queries per user
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date);

-- Index for category filter per user
CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON transactions(user_id, category);
