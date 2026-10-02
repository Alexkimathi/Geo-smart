-- Add doc_type column to etims_documents to distinguish invoices from credit notes
ALTER TABLE etims_documents
  ADD COLUMN IF NOT EXISTS doc_type TEXT NOT NULL DEFAULT 'Invoice'
  CHECK (doc_type IN ('Invoice', 'Credit Note'));
