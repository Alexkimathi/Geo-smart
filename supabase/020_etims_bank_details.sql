-- Add bank_details JSONB column to etims_documents
ALTER TABLE etims_documents
  ADD COLUMN IF NOT EXISTS bank_details JSONB;
