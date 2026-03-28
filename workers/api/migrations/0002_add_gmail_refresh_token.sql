-- Migration: 0002_add_gmail_refresh_token.sql
-- Adds encrypted Gmail refresh token column to users table.

ALTER TABLE users ADD COLUMN gmail_refresh_token TEXT;
