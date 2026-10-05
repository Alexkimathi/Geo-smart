-- Add missing columns to bank_accounts table
ALTER TABLE bank_accounts
  ADD COLUMN IF NOT EXISTS currency    TEXT,
  ADD COLUMN IF NOT EXISTS swift_code  TEXT,
  ADD COLUMN IF NOT EXISTS bank_code   TEXT,
  ADD COLUMN IF NOT EXISTS branch_code TEXT;

-- Tighten write policies (drop old open ones, add role-checked ones)
DROP POLICY IF EXISTS "bank_accounts_insert" ON bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_update" ON bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_delete" ON bank_accounts;

CREATE POLICY "bank_accounts_insert" ON bank_accounts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager'))
  );
CREATE POLICY "bank_accounts_update" ON bank_accounts FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager'))
  );
CREATE POLICY "bank_accounts_delete" ON bank_accounts FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager'))
  );
-- SELECT remains open to all authenticated users (unchanged)
