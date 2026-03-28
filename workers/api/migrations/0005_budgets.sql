-- Budget table for per-category monthly spending limits.
-- Money = INTEGER (Rupiah), boolean = INTEGER (0/1), timestamps = TEXT (ISO 8601).
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  period TEXT NOT NULL DEFAULT 'monthly',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, category)
);

-- Index for fast user-scoped lookups
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
