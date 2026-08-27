-- ============================================================
-- 014_bank_accounts_quote_fields.sql
-- 1. bank_accounts table for company banking details
-- 2. quote_to + reference_no columns on finance_documents
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── bank_accounts ────────────────────────────────────────────

CREATE TABLE bank_accounts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL,
  bank_name    TEXT NOT NULL,
  branch       TEXT,
  account_no   TEXT NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  sort_order   INT NOT NULL DEFAULT 0,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_accounts_select" ON bank_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "bank_accounts_insert" ON bank_accounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "bank_accounts_update" ON bank_accounts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "bank_accounts_delete" ON bank_accounts FOR DELETE TO authenticated USING (true);

-- ── Add quote_to and reference_no to finance_documents ───────

ALTER TABLE finance_documents
  ADD COLUMN IF NOT EXISTS quote_to     TEXT,
  ADD COLUMN IF NOT EXISTS reference_no TEXT;
