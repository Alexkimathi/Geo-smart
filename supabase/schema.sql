-- ============================================================
-- GEOSMART ENGINEERING - SUPABASE SCHEMA
-- Run this in Supabase SQL Editor (Project > SQL Editor > New query)
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'surveyor', 'site_engineer', 'accountant');

CREATE TYPE job_type AS ENUM ('survey', 'construction');

CREATE TYPE survey_type AS ENUM ('topographic', 'cadastral', 'control', 'setting_out');

CREATE TYPE construction_type AS ENUM ('house', 'commercial', 'road', 'tender', 'renovation');

CREATE TYPE job_status_survey AS ENUM ('new', 'in_progress', 'qa', 'delivered', 'paid');

CREATE TYPE job_status_construction AS ENUM ('ongoing', 'completed', 'handover', 'tender');

CREATE TYPE equipment_type AS ENUM ('total_station', 'gps', 'level', 'drone', 'vehicle', 'material', 'tool', 'other');

CREATE TYPE equipment_condition AS ENUM ('good', 'fair', 'poor', 'under_maintenance', 'retired');

CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');

CREATE TYPE quotation_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');

CREATE TYPE payment_method AS ENUM ('cash', 'bank_transfer', 'mpesa', 'cheque', 'other');

CREATE TYPE document_type AS ENUM ('survey_report', 'drawing', 'contract', 'photo', 'certificate', 'boq', 'receipt', 'other');

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'surveyor',
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CLIENTS / CRM
-- ============================================================

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  company TEXT,
  site_location TEXT,
  gps_lat DECIMAL(10, 8),
  gps_lng DECIMAL(11, 8),
  pin TEXT,
  contact_person TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- JOB AUTO-NUMBERING
-- ============================================================

CREATE TABLE job_sequences (
  type TEXT PRIMARY KEY, -- 'SV' or 'CT'
  year INT NOT NULL,
  last_seq INT NOT NULL DEFAULT 0
);

INSERT INTO job_sequences (type, year, last_seq)
VALUES ('SV', EXTRACT(YEAR FROM NOW())::INT, 0),
       ('CT', EXTRACT(YEAR FROM NOW())::INT, 0);

CREATE OR REPLACE FUNCTION generate_job_number(p_type TEXT)
RETURNS TEXT AS $$
DECLARE
  v_year INT := EXTRACT(YEAR FROM NOW())::INT;
  v_seq INT;
BEGIN
  -- Reset sequence if new year
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

CREATE TABLE jobs (
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

-- Auto-generate job number on insert
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

CREATE TRIGGER trg_set_job_number
  BEFORE INSERT ON jobs
  FOR EACH ROW EXECUTE FUNCTION set_job_number();

-- ============================================================
-- SURVEY JOBS
-- ============================================================

CREATE TABLE survey_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID UNIQUE NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  site_name TEXT NOT NULL,
  county TEXT,
  survey_type survey_type NOT NULL,
  status job_status_survey NOT NULL DEFAULT 'new',
  report_file_url TEXT,
  drawing_file_url TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link equipment to survey jobs (many-to-many)
CREATE TABLE survey_job_equipment (
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  equipment_id UUID, -- references equipment(id), added after
  PRIMARY KEY (job_id, equipment_id)
);

-- Link team members to survey jobs
CREATE TABLE job_team (
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role_on_job TEXT,
  PRIMARY KEY (job_id, user_id)
);

-- ============================================================
-- CONSTRUCTION JOBS
-- ============================================================

CREATE TABLE construction_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID UNIQUE NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  project_type construction_type NOT NULL,
  status job_status_construction NOT NULL DEFAULT 'ongoing',
  boq_total DECIMAL(15, 2) DEFAULT 0,
  contract_value DECIMAL(15, 2) DEFAULT 0,
  progress_percent DECIMAL(5, 2) DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EQUIPMENT & INVENTORY
-- ============================================================

CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  serial_no TEXT,
  type equipment_type NOT NULL,
  purchase_date DATE,
  condition equipment_condition NOT NULL DEFAULT 'good',
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  calibration_due DATE,
  quantity INT NOT NULL DEFAULT 1,
  min_stock_level INT DEFAULT 0,
  unit TEXT DEFAULT 'piece',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK now that equipment table exists
ALTER TABLE survey_job_equipment
  ADD CONSTRAINT fk_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE;

CREATE TABLE maintenance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  cost DECIMAL(10, 2) DEFAULT 0,
  done_by UUID REFERENCES profiles(id),
  next_due DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TIMESHEETS
-- ============================================================

CREATE TABLE timesheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in TIME,
  clock_out TIME,
  hours_worked DECIMAL(4, 2),
  site_photo_url TEXT,
  notes TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  offline_id TEXT, -- client-side UUID for dedup during offline sync
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FINANCE - QUOTATIONS
-- ============================================================

CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_number TEXT UNIQUE NOT NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  status quotation_status NOT NULL DEFAULT 'draft',
  valid_until DATE,
  notes TEXT,
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  tax_percent DECIMAL(5, 2) DEFAULT 16, -- VAT 16%
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quotation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'item',
  unit_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  amount DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order INT DEFAULT 0
);

-- Auto-number quotations
CREATE SEQUENCE quotation_seq;
CREATE OR REPLACE FUNCTION set_quotation_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quotation_number IS NULL OR NEW.quotation_number = '' THEN
    NEW.quotation_number := 'QT-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(nextval('quotation_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_set_quotation_number BEFORE INSERT ON quotations FOR EACH ROW EXECUTE FUNCTION set_quotation_number();

-- ============================================================
-- FINANCE - INVOICES
-- ============================================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL,
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

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'item',
  unit_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  amount DECIMAL(15, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order INT DEFAULT 0
);

CREATE SEQUENCE invoice_seq;
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'INV-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(nextval('invoice_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_set_invoice_number BEFORE INSERT ON invoices FOR EACH ROW EXECUTE FUNCTION set_invoice_number();

-- ============================================================
-- FINANCE - PAYMENTS & EXPENSES
-- ============================================================

CREATE TABLE payments (
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

-- Auto-update invoice amount_paid and status on payment insert
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

CREATE TRIGGER trg_update_invoice_payment
  AFTER INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION update_invoice_payment();

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  category TEXT NOT NULL, -- labour, materials, transport, fuel, etc.
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT NOT NULL,
  receipt_url TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BOQ (Bill of Quantities) for Construction
-- ============================================================

CREATE TABLE boq_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  section TEXT, -- e.g. "Substructure", "Superstructure"
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
-- DOCUMENTS
-- ============================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type document_type NOT NULL DEFAULT 'other',
  file_url TEXT NOT NULL,
  file_size INT, -- bytes
  mime_type TEXT,
  version INT NOT NULL DEFAULT 1,
  tags TEXT[] DEFAULT '{}',
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGER (reusable)
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_survey_jobs_updated_at BEFORE UPDATE ON survey_jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_construction_jobs_updated_at BEFORE UPDATE ON construction_jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_quotations_updated_at BEFORE UPDATE ON quotations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_jobs_client ON jobs(client_id);
CREATE INDEX idx_jobs_type ON jobs(type);
CREATE INDEX idx_survey_jobs_status ON survey_jobs(status);
CREATE INDEX idx_construction_jobs_status ON construction_jobs(status);
CREATE INDEX idx_timesheets_user ON timesheets(user_id);
CREATE INDEX idx_timesheets_job ON timesheets(job_id);
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_documents_job ON documents(job_id);
CREATE INDEX idx_expenses_job ON expenses(job_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE boq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- PROFILES: users see all, only admin can update others
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL USING (get_user_role() = 'admin');

-- CLIENTS: all authenticated users can read; admin/manager can write
CREATE POLICY "clients_select" ON clients FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "clients_write" ON clients FOR ALL USING (get_user_role() IN ('admin', 'manager'));

-- JOBS: surveyors see only survey jobs; engineers see only construction; others see all
CREATE POLICY "jobs_select_surveyor" ON jobs FOR SELECT
  USING (
    get_user_role() NOT IN ('surveyor', 'site_engineer')
    OR (get_user_role() = 'surveyor' AND type = 'survey')
    OR (get_user_role() = 'site_engineer' AND type = 'construction')
  );
CREATE POLICY "jobs_insert" ON jobs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "jobs_update" ON jobs FOR UPDATE USING (
  get_user_role() IN ('admin', 'manager')
  OR (get_user_role() = 'surveyor' AND type = 'survey')
  OR (get_user_role() = 'site_engineer' AND type = 'construction')
);

-- SURVEY JOBS
CREATE POLICY "survey_jobs_select" ON survey_jobs FOR SELECT
  USING (get_user_role() NOT IN ('site_engineer'));
CREATE POLICY "survey_jobs_write" ON survey_jobs FOR ALL
  USING (get_user_role() IN ('admin', 'manager', 'surveyor'));

-- CONSTRUCTION JOBS
CREATE POLICY "construction_jobs_select" ON construction_jobs FOR SELECT
  USING (get_user_role() NOT IN ('surveyor'));
CREATE POLICY "construction_jobs_write" ON construction_jobs FOR ALL
  USING (get_user_role() IN ('admin', 'manager', 'site_engineer'));

-- EQUIPMENT: all read; admin/manager write
CREATE POLICY "equipment_select" ON equipment FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "equipment_write" ON equipment FOR ALL USING (get_user_role() IN ('admin', 'manager'));

-- MAINTENANCE LOGS
CREATE POLICY "maintenance_select" ON maintenance_logs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "maintenance_write" ON maintenance_logs FOR ALL USING (get_user_role() IN ('admin', 'manager'));

-- TIMESHEETS: users see their own; admin/manager see all
CREATE POLICY "timesheets_own" ON timesheets FOR SELECT USING (user_id = auth.uid() OR get_user_role() IN ('admin', 'manager'));
CREATE POLICY "timesheets_insert" ON timesheets FOR INSERT WITH CHECK (user_id = auth.uid() OR get_user_role() = 'admin');
CREATE POLICY "timesheets_update" ON timesheets FOR UPDATE USING (user_id = auth.uid() OR get_user_role() IN ('admin', 'manager'));

-- FINANCE: accountant + admin/manager access
CREATE POLICY "quotations_select" ON quotations FOR SELECT USING (get_user_role() IN ('admin', 'manager', 'accountant'));
CREATE POLICY "quotations_write" ON quotations FOR ALL USING (get_user_role() IN ('admin', 'manager', 'accountant'));

CREATE POLICY "invoices_select" ON invoices FOR SELECT USING (get_user_role() IN ('admin', 'manager', 'accountant'));
CREATE POLICY "invoices_write" ON invoices FOR ALL USING (get_user_role() IN ('admin', 'manager', 'accountant'));

CREATE POLICY "payments_select" ON payments FOR SELECT USING (get_user_role() IN ('admin', 'manager', 'accountant'));
CREATE POLICY "payments_write" ON payments FOR ALL USING (get_user_role() IN ('admin', 'manager', 'accountant'));

CREATE POLICY "expenses_select" ON expenses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "expenses_write" ON expenses FOR ALL USING (get_user_role() IN ('admin', 'manager', 'accountant'));

-- BOQ
CREATE POLICY "boq_select" ON boq_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "boq_write" ON boq_items FOR ALL USING (get_user_role() IN ('admin', 'manager', 'site_engineer', 'accountant'));

-- DOCUMENTS: all read docs on their jobs
CREATE POLICY "documents_select" ON documents FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "documents_insert" ON documents FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "documents_delete" ON documents FOR DELETE USING (get_user_role() IN ('admin', 'manager') OR uploaded_by = auth.uid());

-- JOB TEAM
CREATE POLICY "job_team_select" ON job_team FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "job_team_write" ON job_team FOR ALL USING (get_user_role() IN ('admin', 'manager'));

-- ============================================================
-- TRIGGER: auto-create profile on user signup
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'surveyor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- STORAGE BUCKETS (run separately or via Supabase dashboard)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
