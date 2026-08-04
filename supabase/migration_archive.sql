-- ============================================================
-- MIGRATION: Archive + On Hold + Job Notes + User features
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS)
-- ============================================================

-- 1. Add is_archived columns (for hiding jobs without deleting)
ALTER TABLE survey_jobs ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE construction_jobs ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Add 'On Hold' to survey_jobs status
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'survey_jobs' AND constraint_name = 'survey_jobs_status_check'
  ) THEN
    ALTER TABLE survey_jobs DROP CONSTRAINT survey_jobs_status_check;
  END IF;
  ALTER TABLE survey_jobs
    ADD CONSTRAINT survey_jobs_status_check
    CHECK (status IN ('New', 'In Progress', 'QA', 'Delivered', 'Paid', 'On Hold'));
END $$;

-- 3. Add 'On Hold' to construction_jobs status
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'construction_jobs' AND constraint_name = 'construction_jobs_status_check'
  ) THEN
    ALTER TABLE construction_jobs DROP CONSTRAINT construction_jobs_status_check;
  END IF;
  ALTER TABLE construction_jobs
    ADD CONSTRAINT construction_jobs_status_check
    CHECK (status IN ('Tender', 'Ongoing', 'Completed', 'Handover', 'On Hold'));
END $$;

-- 4. Job notes table (team communications per job)
CREATE TABLE IF NOT EXISTS job_notes (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id      UUID        NOT NULL,
  job_type    TEXT        NOT NULL CHECK (job_type IN ('survey', 'construction')),
  content     TEXT        NOT NULL,
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on job_notes (service client bypasses this anyway)
ALTER TABLE job_notes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all notes
DROP POLICY IF EXISTS "Authenticated users can read job notes" ON job_notes;
CREATE POLICY "Authenticated users can read job notes"
  ON job_notes FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert their own notes
DROP POLICY IF EXISTS "Authenticated users can add job notes" ON job_notes;
CREATE POLICY "Authenticated users can add job notes"
  ON job_notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_survey_jobs_is_archived ON survey_jobs (is_archived);
CREATE INDEX IF NOT EXISTS idx_construction_jobs_is_archived ON construction_jobs (is_archived);
CREATE INDEX IF NOT EXISTS idx_survey_jobs_status ON survey_jobs (status);
CREATE INDEX IF NOT EXISTS idx_construction_jobs_status ON construction_jobs (status);
CREATE INDEX IF NOT EXISTS idx_job_notes_job ON job_notes (job_id, job_type);
CREATE INDEX IF NOT EXISTS idx_job_notes_created_at ON job_notes (created_at DESC);

-- ============================================================
-- MIGRATION: Finance Module — finance_documents, payments, expenses
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS)
-- ============================================================

-- 6. finance_documents table (single table, type discriminator)
CREATE TABLE IF NOT EXISTS finance_documents (
  id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  type          TEXT          NOT NULL CHECK (type IN ('Invoice', 'Quotation')),
  doc_no        TEXT          NOT NULL UNIQUE,
  job_type      TEXT          CHECK (job_type IN ('survey', 'construction')),
  job_id        UUID,
  client_id     UUID          REFERENCES clients(id) ON DELETE SET NULL,
  status        TEXT          NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Paid', 'Overdue')),
  amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax           NUMERIC(5,2)  NOT NULL DEFAULT 0,
  total         NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date      DATE,
  paid_date     DATE,
  line_items    JSONB         NOT NULL DEFAULT '[]',
  converted_to  UUID          REFERENCES finance_documents(id) ON DELETE SET NULL,
  notes         TEXT,
  created_by    UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ   DEFAULT now() NOT NULL,
  updated_at    TIMESTAMPTZ   DEFAULT now() NOT NULL
);

-- 7. payments table
CREATE TABLE IF NOT EXISTS payments (
  id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id    UUID          NOT NULL REFERENCES finance_documents(id) ON DELETE CASCADE,
  amount        NUMERIC(12,2) NOT NULL,
  method        TEXT          NOT NULL CHECK (method IN ('Cash', 'Bank Transfer', 'M-Pesa', 'Cheque', 'Other')),
  payment_date  DATE          NOT NULL,
  reference     TEXT,
  notes         TEXT,
  recorded_by   UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ   DEFAULT now() NOT NULL
);

-- 8. expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type      TEXT          CHECK (job_type IN ('survey', 'construction')),
  job_id        UUID,
  category      TEXT          NOT NULL CHECK (category IN ('Labour','Materials','Transport','Fuel','Equipment','Other')),
  description   TEXT          NOT NULL,
  amount        NUMERIC(12,2) NOT NULL,
  expense_date  DATE          NOT NULL,
  receipt_url   TEXT,
  recorded_by   UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ   DEFAULT now() NOT NULL
);

-- 9. Auto-numbering function for finance_documents
CREATE OR REPLACE FUNCTION finance_doc_set_doc_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_year   TEXT;
  v_prefix TEXT;
  v_seq    INT;
  v_seq_col TEXT;
BEGIN
  v_year := TO_CHAR(now(), 'YYYY');

  IF NEW.type = 'Invoice' THEN
    v_prefix  := 'INV-' || v_year || '-';
    v_seq_col := 'Invoice';
  ELSE
    v_prefix  := 'QT-' || v_year || '-';
    v_seq_col := 'Quotation';
  END IF;

  SELECT COUNT(*) + 1
    INTO v_seq
    FROM finance_documents
   WHERE type = v_seq_col
     AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now());

  NEW.doc_no := v_prefix || LPAD(v_seq::TEXT, 3, '0');
  RETURN NEW;
END;
$$;

-- Apply trigger only when doc_no is empty (allows manual override)
DROP TRIGGER IF EXISTS trg_finance_doc_no ON finance_documents;
CREATE TRIGGER trg_finance_doc_no
  BEFORE INSERT ON finance_documents
  FOR EACH ROW
  WHEN (NEW.doc_no IS NULL OR NEW.doc_no = '')
  EXECUTE FUNCTION finance_doc_set_doc_no();

-- 10. updated_at auto-update trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_finance_doc_updated_at ON finance_documents;
CREATE TRIGGER trg_finance_doc_updated_at
  BEFORE UPDATE ON finance_documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 11. Enable RLS
ALTER TABLE finance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses           ENABLE ROW LEVEL SECURITY;

-- 12. RLS policies — finance_documents (admin, manager, accountant only)
DROP POLICY IF EXISTS "Finance docs: finance roles can read"   ON finance_documents;
CREATE POLICY "Finance docs: finance roles can read"
  ON finance_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
       WHERE profiles.id = auth.uid()
         AND profiles.role IN ('admin', 'manager', 'accountant')
    )
  );

DROP POLICY IF EXISTS "Finance docs: finance roles can insert" ON finance_documents;
CREATE POLICY "Finance docs: finance roles can insert"
  ON finance_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
       WHERE profiles.id = auth.uid()
         AND profiles.role IN ('admin', 'manager', 'accountant')
    )
  );

DROP POLICY IF EXISTS "Finance docs: finance roles can update" ON finance_documents;
CREATE POLICY "Finance docs: finance roles can update"
  ON finance_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
       WHERE profiles.id = auth.uid()
         AND profiles.role IN ('admin', 'manager', 'accountant')
    )
  );

-- 13. RLS policies — payments
DROP POLICY IF EXISTS "Payments: finance roles can read"   ON payments;
CREATE POLICY "Payments: finance roles can read"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
       WHERE profiles.id = auth.uid()
         AND profiles.role IN ('admin', 'manager', 'accountant')
    )
  );

DROP POLICY IF EXISTS "Payments: finance roles can insert" ON payments;
CREATE POLICY "Payments: finance roles can insert"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
       WHERE profiles.id = auth.uid()
         AND profiles.role IN ('admin', 'manager', 'accountant')
    )
  );

-- 14. RLS policies — expenses
DROP POLICY IF EXISTS "Expenses: finance roles can read"   ON expenses;
CREATE POLICY "Expenses: finance roles can read"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
       WHERE profiles.id = auth.uid()
         AND profiles.role IN ('admin', 'manager', 'accountant')
    )
  );

DROP POLICY IF EXISTS "Expenses: finance roles can insert" ON expenses;
CREATE POLICY "Expenses: finance roles can insert"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
       WHERE profiles.id = auth.uid()
         AND profiles.role IN ('admin', 'manager', 'accountant')
    )
  );

DROP POLICY IF EXISTS "Expenses: finance roles can delete" ON expenses;
CREATE POLICY "Expenses: finance roles can delete"
  ON expenses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
       WHERE profiles.id = auth.uid()
         AND profiles.role IN ('admin', 'manager', 'accountant')
    )
  );

-- 15. Indexes
CREATE INDEX IF NOT EXISTS idx_finance_docs_type       ON finance_documents (type);
CREATE INDEX IF NOT EXISTS idx_finance_docs_status     ON finance_documents (status);
CREATE INDEX IF NOT EXISTS idx_finance_docs_client     ON finance_documents (client_id);
CREATE INDEX IF NOT EXISTS idx_finance_docs_created_at ON finance_documents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_invoice        ON payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_expenses_job            ON expenses (job_id, job_type);
CREATE INDEX IF NOT EXISTS idx_expenses_date           ON expenses (expense_date DESC);

-- ============================================================
-- PATCH: finance_documents columns added after initial table creation
-- Run this if the table already existed before the migration above.
-- Safe to run multiple times.
-- ============================================================

-- Add columns that may be missing if the table pre-existed
ALTER TABLE finance_documents ADD COLUMN IF NOT EXISTS notes        TEXT;
ALTER TABLE finance_documents ADD COLUMN IF NOT EXISTS converted_to UUID REFERENCES finance_documents(id) ON DELETE SET NULL;
ALTER TABLE finance_documents ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT now() NOT NULL;

-- Back-fill updated_at for any rows that pre-date this column
UPDATE finance_documents SET updated_at = created_at WHERE updated_at IS NULL;

-- Re-apply the auto-numbering trigger (CREATE OR REPLACE is idempotent)
CREATE OR REPLACE FUNCTION finance_doc_set_doc_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_year   TEXT;
  v_prefix TEXT;
  v_seq    INT;
  v_seq_col TEXT;
BEGIN
  v_year := TO_CHAR(now(), 'YYYY');

  IF NEW.type = 'Invoice' THEN
    v_prefix  := 'INV-' || v_year || '-';
    v_seq_col := 'Invoice';
  ELSE
    v_prefix  := 'QT-' || v_year || '-';
    v_seq_col := 'Quotation';
  END IF;

  SELECT COUNT(*) + 1
    INTO v_seq
    FROM finance_documents
   WHERE type = v_seq_col
     AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now());

  NEW.doc_no := v_prefix || LPAD(v_seq::TEXT, 3, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_finance_doc_no ON finance_documents;
CREATE TRIGGER trg_finance_doc_no
  BEFORE INSERT ON finance_documents
  FOR EACH ROW
  WHEN (NEW.doc_no IS NULL OR NEW.doc_no = '')
  EXECUTE FUNCTION finance_doc_set_doc_no();

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_finance_doc_updated_at ON finance_documents;
CREATE TRIGGER trg_finance_doc_updated_at
  BEFORE UPDATE ON finance_documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- MIGRATION: BOQ Items + LPOs
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS)
-- ============================================================

-- BOQ Items table (Bill of Quantities per job)
CREATE TABLE IF NOT EXISTS boq_items (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id      UUID          NOT NULL,
  job_type    TEXT          NOT NULL CHECK (job_type IN ('survey', 'construction')),
  description TEXT          NOT NULL,
  unit        TEXT          NOT NULL DEFAULT '',
  quantity    NUMERIC(12,3) NOT NULL DEFAULT 0,
  unit_rate   NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order  INT           NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ   DEFAULT now() NOT NULL
);

ALTER TABLE boq_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth users can manage boq_items" ON boq_items;
CREATE POLICY "Auth users can manage boq_items"
  ON boq_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_boq_items_job ON boq_items (job_id, job_type);

-- LPOs table (Local Purchase Orders)
CREATE TABLE IF NOT EXISTS lpos (
  id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  lpo_no        TEXT          NOT NULL UNIQUE,
  supplier_name TEXT          NOT NULL,
  job_type      TEXT          CHECK (job_type IN ('survey', 'construction')),
  job_id        UUID,
  items         JSONB         NOT NULL DEFAULT '[]',
  subtotal      NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax           NUMERIC(5,2)  NOT NULL DEFAULT 0,
  total         NUMERIC(12,2) NOT NULL DEFAULT 0,
  status        TEXT          NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Received', 'Cancelled')),
  issued_date   DATE,
  notes         TEXT,
  created_by    UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ   DEFAULT now() NOT NULL,
  updated_at    TIMESTAMPTZ   DEFAULT now() NOT NULL
);

ALTER TABLE lpos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth users can manage lpos" ON lpos;
CREATE POLICY "Auth users can manage lpos"
  ON lpos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Auto-numbering trigger for LPOs
CREATE OR REPLACE FUNCTION lpo_set_lpo_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE yr TEXT; seq INT;
BEGIN
  IF NEW.lpo_no IS NULL OR NEW.lpo_no = '' THEN
    yr := TO_CHAR(NOW(), 'YYYY');
    SELECT COUNT(*) + 1 INTO seq FROM lpos WHERE lpo_no LIKE 'LPO-' || yr || '-%';
    NEW.lpo_no := 'LPO-' || yr || '-' || LPAD(seq::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lpo_set_lpo_no ON lpos;
CREATE TRIGGER trg_lpo_set_lpo_no
  BEFORE INSERT ON lpos FOR EACH ROW EXECUTE FUNCTION lpo_set_lpo_no();

DROP TRIGGER IF EXISTS trg_lpos_updated_at ON lpos;
CREATE TRIGGER trg_lpos_updated_at
  BEFORE UPDATE ON lpos FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_lpos_job ON lpos (job_id, job_type);
CREATE INDEX IF NOT EXISTS idx_lpos_status ON lpos (status);
