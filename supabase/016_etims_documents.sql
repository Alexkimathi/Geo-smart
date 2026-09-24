-- 016_etims_documents.sql
-- Creates the etims_documents table for KRA eTIMS compliant tax invoices

CREATE TABLE IF NOT EXISTS etims_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_no TEXT NOT NULL,
  invoice_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  seller_pin TEXT NOT NULL DEFAULT 'P051695050L',
  seller_name TEXT NOT NULL DEFAULT 'GEO-SMART ENGINEERING REAL ESTATE CONTRACTORS LTD',
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  buyer_pin TEXT NOT NULL DEFAULT '',
  buyer_name TEXT NOT NULL DEFAULT '',
  line_items JSONB NOT NULL DEFAULT '[]',
  scu_id TEXT,
  cu_invoice_no TEXT,
  internal_data TEXT,
  receipt_signature TEXT,
  qr_code_data TEXT,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Final')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE etims_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "etims_documents_select" ON etims_documents;
DROP POLICY IF EXISTS "etims_documents_insert" ON etims_documents;
DROP POLICY IF EXISTS "etims_documents_update" ON etims_documents;
DROP POLICY IF EXISTS "etims_documents_delete" ON etims_documents;

CREATE POLICY "etims_documents_select" ON etims_documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "etims_documents_insert" ON etims_documents
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "etims_documents_update" ON etims_documents
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "etims_documents_delete" ON etims_documents
  FOR DELETE TO authenticated USING (true);
