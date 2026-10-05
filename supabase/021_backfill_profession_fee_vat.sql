-- Backfill VAT (16% of Profession fee line item) for existing Quotations and Invoices
-- that were saved before the auto-VAT feature was introduced.
--
-- Logic: for each finance_document that has at least one line item whose description
-- contains "profession fee" (case-insensitive), recompute tax and total.

UPDATE finance_documents
SET
  tax = (
    SELECT COALESCE(SUM((item->>'amount')::numeric), 0) * 0.16
    FROM jsonb_array_elements(line_items) AS item
    WHERE LOWER(item->>'description') LIKE '%profession fee%'
  ),
  total = amount + (
    SELECT COALESCE(SUM((item->>'amount')::numeric), 0) * 0.16
    FROM jsonb_array_elements(line_items) AS item
    WHERE LOWER(item->>'description') LIKE '%profession fee%'
  )
WHERE
  type IN ('Quotation', 'Invoice')
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(line_items) AS item
    WHERE LOWER(item->>'description') LIKE '%profession fee%'
  );
