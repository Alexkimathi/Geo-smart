-- ============================================================
-- 015_quote_bank_details.sql
-- Add bank_details JSONB column to finance_documents so each
-- quotation/invoice can carry its own payment instructions.
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE finance_documents
  ADD COLUMN IF NOT EXISTS bank_details JSONB;
