-- ============================================================
-- RLS POLICIES FOR GEOSMART APP
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- ============================================================
-- CLIENTS
-- ============================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_select" ON clients;
DROP POLICY IF EXISTS "clients_insert" ON clients;
DROP POLICY IF EXISTS "clients_update" ON clients;
DROP POLICY IF EXISTS "clients_delete" ON clients;

CREATE POLICY "clients_select" ON clients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "clients_insert" ON clients
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "clients_update" ON clients
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "clients_delete" ON clients
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- SURVEY JOBS
-- ============================================================
ALTER TABLE survey_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "survey_jobs_select" ON survey_jobs;
DROP POLICY IF EXISTS "survey_jobs_insert" ON survey_jobs;
DROP POLICY IF EXISTS "survey_jobs_update" ON survey_jobs;
DROP POLICY IF EXISTS "survey_jobs_delete" ON survey_jobs;

CREATE POLICY "survey_jobs_select" ON survey_jobs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "survey_jobs_insert" ON survey_jobs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "survey_jobs_update" ON survey_jobs
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "survey_jobs_delete" ON survey_jobs
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- CONSTRUCTION JOBS
-- ============================================================
ALTER TABLE construction_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "construction_jobs_select" ON construction_jobs;
DROP POLICY IF EXISTS "construction_jobs_insert" ON construction_jobs;
DROP POLICY IF EXISTS "construction_jobs_update" ON construction_jobs;
DROP POLICY IF EXISTS "construction_jobs_delete" ON construction_jobs;

CREATE POLICY "construction_jobs_select" ON construction_jobs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "construction_jobs_insert" ON construction_jobs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "construction_jobs_update" ON construction_jobs
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "construction_jobs_delete" ON construction_jobs
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- EQUIPMENT
-- ============================================================
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipment_select" ON equipment;
DROP POLICY IF EXISTS "equipment_insert" ON equipment;
DROP POLICY IF EXISTS "equipment_update" ON equipment;
DROP POLICY IF EXISTS "equipment_delete" ON equipment;

CREATE POLICY "equipment_select" ON equipment
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "equipment_insert" ON equipment
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "equipment_update" ON equipment
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "equipment_delete" ON equipment
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- TIMESHEETS
-- ============================================================
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "timesheets_select" ON timesheets;
DROP POLICY IF EXISTS "timesheets_insert" ON timesheets;
DROP POLICY IF EXISTS "timesheets_update" ON timesheets;
DROP POLICY IF EXISTS "timesheets_delete" ON timesheets;

CREATE POLICY "timesheets_select" ON timesheets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "timesheets_insert" ON timesheets
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "timesheets_update" ON timesheets
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "timesheets_delete" ON timesheets
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- FINANCE DOCUMENTS
-- ============================================================
ALTER TABLE finance_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_documents_select" ON finance_documents;
DROP POLICY IF EXISTS "finance_documents_insert" ON finance_documents;
DROP POLICY IF EXISTS "finance_documents_update" ON finance_documents;
DROP POLICY IF EXISTS "finance_documents_delete" ON finance_documents;

CREATE POLICY "finance_documents_select" ON finance_documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "finance_documents_insert" ON finance_documents
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "finance_documents_update" ON finance_documents
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "finance_documents_delete" ON finance_documents
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- DOCUMENTS
-- ============================================================
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_select" ON documents;
DROP POLICY IF EXISTS "documents_insert" ON documents;
DROP POLICY IF EXISTS "documents_update" ON documents;
DROP POLICY IF EXISTS "documents_delete" ON documents;

CREATE POLICY "documents_select" ON documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "documents_insert" ON documents
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "documents_update" ON documents
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "documents_delete" ON documents
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- MAINTENANCE LOGS
-- ============================================================
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "maintenance_logs_select" ON maintenance_logs;
DROP POLICY IF EXISTS "maintenance_logs_insert" ON maintenance_logs;
DROP POLICY IF EXISTS "maintenance_logs_update" ON maintenance_logs;

CREATE POLICY "maintenance_logs_select" ON maintenance_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "maintenance_logs_insert" ON maintenance_logs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "maintenance_logs_update" ON maintenance_logs
  FOR UPDATE TO authenticated USING (true);

-- ============================================================
-- SERVICE RATES
-- ============================================================
ALTER TABLE service_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_rates_select" ON service_rates;
DROP POLICY IF EXISTS "service_rates_insert" ON service_rates;
DROP POLICY IF EXISTS "service_rates_update" ON service_rates;

CREATE POLICY "service_rates_select" ON service_rates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "service_rates_insert" ON service_rates
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "service_rates_update" ON service_rates
  FOR UPDATE TO authenticated USING (true);
