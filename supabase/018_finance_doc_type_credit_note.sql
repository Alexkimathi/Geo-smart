-- Allow 'Credit Note' as a valid finance_documents type
ALTER TABLE finance_documents
  DROP CONSTRAINT IF EXISTS finance_documents_type_check;

ALTER TABLE finance_documents
  ADD CONSTRAINT finance_documents_type_check
  CHECK (type IN ('Invoice', 'Quotation', 'Credit Note'));
