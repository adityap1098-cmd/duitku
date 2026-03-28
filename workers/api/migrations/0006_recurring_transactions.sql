-- Recurring transactions: user-confirmed recurring expenses detected from history
CREATE TABLE recurring_transactions (
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

CREATE INDEX idx_recurring_user_dismissed ON recurring_transactions (user_id, is_dismissed);
