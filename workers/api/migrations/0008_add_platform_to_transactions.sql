-- Migration: 0008_add_platform_to_transactions.sql
-- Adds platform column to transactions table for better sync visualization.

ALTER TABLE transactions ADD COLUMN platform TEXT;
