-- Migration: 0001_users.sql
-- Creates the users table for DuitKu.
-- Conventions: boolean = INTEGER (0/1), timestamps = TEXT (ISO 8601), money = INTEGER.

CREATE TABLE IF NOT EXISTS users (
  id         TEXT    PRIMARY KEY,
  email      TEXT    NOT NULL UNIQUE,
  name       TEXT    NOT NULL,
  avatar_url TEXT,
  tier       TEXT    NOT NULL DEFAULT 'free',   -- 'free' | 'premium' | 'admin'
  google_id  TEXT    NOT NULL UNIQUE,
  is_active  INTEGER NOT NULL DEFAULT 1,        -- 0 = inactive, 1 = active
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Index for Google OAuth lookup
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Index for email lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
