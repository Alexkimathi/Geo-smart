-- ============================================================
-- GEOSMART - MISSING TABLES MIGRATION
-- Run this in Supabase SQL Editor to complete the schema
-- ============================================================

-- Add email column to profiles if not exists (already present in your DB)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- ============================================================
-- PATCH EXISTING TABLES (add missing columns)
-- ============================================================

-- clients: add missing columns
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;

-- equipment: add missing columns
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS quantity INT NOT NULL DEFAULT 1;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS min_stock_level INT DEFAULT 0;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'piece';
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS calibration_due DATE;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- timesheets: add missing columns
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS offline_id TEXT;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ DEFAULT NOW();

-- survey_jobs: ensure status column default
ALTER TABLE survey_jobs ALTER COLUMN status SET DEFAULT 'new';

-- ============================================================
-- JOB AUTO-NUMBERING
-- ============================================================

CREATE TABLE IF NOT EXISTS job_sequences (
  type TEXT PRIMARY KEY,
  year INT NOT NULL,
  last_seq INT NOT NULL DEFAULT 0
);

INSERT INTO job_sequences (type, year, last_seq)
VALUES ('SV', EXTRACT(YEAR FROM NOW())::INT, 0),
       ('CT', EXTRACT(YEAR FROM NOW())::INT, 0)
ON CONFLICT (type) DO NOTHING;

CREATE OR REPLACE FUNCTION generate_job_number(p_type TEXT)
RETURNS TEXT AS $$
DECLARE
  v_year INT := EXTRACT(YEAR FROM NOW())::INT;
  v_seq INT;
BEGIN
  UPDATE job_sequences
  SET last_seq = CASE WHEN year = v_year THEN last_seq + 1 ELSE 1 END,
      year = v_year
  WHERE type = p_type
  RETURNING last_seq INTO v_seq;

  RETURN p_type || '-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- JOBS (parent table)
-- ============================================================

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_number TEXT UNIQUE NOT NULL,
  type job_type NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_job_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.job_number IS NULL OR NEW.job_number = '' THEN
    IF NEW.type = 'survey' THEN
      NEW.job_number := generate_job_number('SV');
    ELSE
      NEW.job_number := generate_job_number('CT');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_job_number ON jobs;
CREATE TRIGGER trg_set_job_number
  BEFORE INSERT ON jobs
  FOR EACH ROW EXECUTE FUNCTION set_job_number();

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_jobs_updated_at ON jobs;
CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Add job_id FK to survey_jobs and construction_jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='survey_jobs' AND column_name='job_id'
  ) THEN
    ALTER TABLE survey_jobs ADD COLUMN job_id UUID REFERENCES jobs(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='construction_jobs' AND column_name='job_id'
  ) THEN
    ALTER TABLE construction_jobs ADD COLUMN job_id UUID REFERENCES jobs(id) ON DELETE CASCADE;
  END IF;
END$$;

-- ============================================================
-- JOB TEAM
-- ============================================================

CREATE TABLE IF NOT EXISTS job_team (
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role_on_job TEXT,
  PRIMARY KEY (job_id, user_id)
);

-- ============================================================
-- FINANCE - QUOTATIONS
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS quotation_seq;

CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_number TEXT UNIQUE NOT NULL DEFAULT '',
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  status quotation_status NOT NULL DEFAULT 'draft',
  valid_until DATE,
  notes TEXT,
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  tax_percent DECIMAL(5, 2) DEFAULT 16,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_quotation_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quotation_number IS NULL OR NEW.quotation_number = '' THEN
    NEW.quotation_number := 'QT-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(nextval('quotation_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_quotation_number ON quotations;
CREATE TRIGGER trg_set_quotation_number
  BEFORE INSERT ON quotations FOR EACH ROW EXECUTE FUNCTION set_quotation_number();

CREATE TABLE IF NOT EXISTS quotation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'item',
  unit_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  amount DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order INT DEFAULT 0
);

-- ============================================================
-- FINANCE - INVOICES
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS invoice_seq;

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL DEFAULT '',
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  status invoice_status NOT NULL DEFAULT 'draft',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  notes TEXT,
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  tax_percent DECIMAL(5, 2) DEFAULT 16,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(15, 2) DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'INV-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(nextval('invoice_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_invoice_number ON invoices;
CREATE TRIGGER trg_set_invoice_number
  BEFORE INSERT ON invoices FOR EACH ROW EXECUTE FUNCTION set_invoice_number();

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'item',
  unit_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  amount DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order INT DEFAULT 0
);

-- ============================================================
-- PAYMENTS & EXPENSES
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  method payment_method NOT NULL DEFAULT 'bank_transfer',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_invoice_payment()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE invoices
  SET amount_paid = (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id),
      status = CASE
        WHEN (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id) >= total THEN 'paid'::invoice_status
        ELSE status
      END,
      updated_at = NOW()
  WHERE id = NEW.invoice_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_invoice_payment ON payments;
CREATE TRIGGER trg_update_invoice_payment
  AFTER INSERT ON payments FOR EACH ROW EXECUTE FUNCTION update_invoice_payment();

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT NOT NULL,
  receipt_url TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BOQ
-- ============================================================

CREATE TABLE IF NOT EXISTS boq_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  section TEXT,
  item_no TEXT,
  description TEXT NOT NULL,
  unit TEXT,
  quantity DECIMAL(10, 3),
  rate DECIMAL(15, 2),
  amount DECIMAL(15, 2) GENERATED ALWAYS AS (COALESCE(quantity, 0) * COALESCE(rate, 0)) STORED,
  actual_quantity DECIMAL(10, 3) DEFAULT 0,
  sort_order INT DEFAULT 0
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_jobs_client ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_expenses_job ON expenses(job_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE boq_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "jobs_select" ON jobs;
CREATE POLICY "jobs_select" ON jobs FOR SELECT USING (
  get_user_role() NOT IN ('surveyor', 'site_engineer')
  OR (get_user_role() = 'surveyor' AND type = 'survey')
  OR (get_user_role() = 'site_engineer' AND type = 'construction')
);
DROP POLICY IF EXISTS "jobs_insert" ON jobs;
CREATE POLICY "jobs_insert" ON jobs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "jobs_update" ON jobs;
CREATE POLICY "jobs_update" ON jobs FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "job_team_select" ON job_team;
CREATE POLICY "job_team_select" ON job_team FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "job_team_write" ON job_team;
CREATE POLICY "job_team_write" ON job_team FOR ALL USING (get_user_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "quotations_select" ON quotations;
CREATE POLICY "quotations_select" ON quotations FOR SELECT USING (get_user_role() IN ('admin', 'manager', 'accountant'));
DROP POLICY IF EXISTS "quotations_write" ON quotations;
CREATE POLICY "quotations_write" ON quotations FOR ALL USING (get_user_role() IN ('admin', 'manager', 'accountant'));

DROP POLICY IF EXISTS "invoices_select" ON invoices;
CREATE POLICY "invoices_select" ON invoices FOR SELECT USING (get_user_role() IN ('admin', 'manager', 'accountant'));
DROP POLICY IF EXISTS "invoices_write" ON invoices;
CREATE POLICY "invoices_write" ON invoices FOR ALL USING (get_user_role() IN ('admin', 'manager', 'accountant'));

DROP POLICY IF EXISTS "payments_select" ON payments;
CREATE POLICY "payments_select" ON payments FOR SELECT USING (get_user_role() IN ('admin', 'manager', 'accountant'));
DROP POLICY IF EXISTS "payments_write" ON payments;
CREATE POLICY "payments_write" ON payments FOR ALL USING (get_user_role() IN ('admin', 'manager', 'accountant'));

DROP POLICY IF EXISTS "expenses_select" ON expenses;
CREATE POLICY "expenses_select" ON expenses FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "expenses_write" ON expenses;
CREATE POLICY "expenses_write" ON expenses FOR ALL USING (get_user_role() IN ('admin', 'manager', 'accountant'));

DROP POLICY IF EXISTS "boq_select" ON boq_items;
CREATE POLICY "boq_select" ON boq_items FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "boq_write" ON boq_items;
CREATE POLICY "boq_write" ON boq_items FOR ALL USING (get_user_role() IN ('admin', 'manager', 'site_engineer', 'accountant'));
