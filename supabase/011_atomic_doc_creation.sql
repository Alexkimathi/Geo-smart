-- ============================================================
-- Atomic document creation: generates doc_no AND inserts in
-- one transaction so there is no window for a duplicate key.
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION create_finance_document(
  p_type       TEXT,
  p_client_id  UUID,
  p_job_type   TEXT,
  p_job_id     UUID,
  p_due_date   DATE,
  p_tax        NUMERIC,
  p_amount     NUMERIC,
  p_total      NUMERIC,
  p_line_items JSONB,
  p_notes      TEXT,
  p_created_by UUID
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_year   TEXT := TO_CHAR(now(), 'YYYY');
  v_prefix TEXT;
  v_seq    INT;
  v_doc_no TEXT;
  v_id     UUID;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('doc_no_' || p_type || v_year));

  IF p_type = 'Invoice' THEN
    v_prefix := 'INV-' || v_year || '-';
  ELSE
    v_prefix := 'QT-'  || v_year || '-';
  END IF;

  SELECT COALESCE(
    MAX(CAST(SPLIT_PART(doc_no, '-', 3) AS INTEGER)), 0
  ) + 1
  INTO v_seq
  FROM public.finance_documents
  WHERE type   = p_type
    AND doc_no LIKE v_prefix || '%'
    AND doc_no ~ '^[A-Z]+-[0-9]{4}-[0-9]+$';

  v_doc_no := v_prefix || LPAD(v_seq::TEXT, 3, '0');

  INSERT INTO public.finance_documents (
    type, doc_no, client_id, job_type, job_id, due_date,
    tax, amount, total, line_items, notes, status, created_by
  ) VALUES (
    p_type, v_doc_no, p_client_id, p_job_type, p_job_id, p_due_date,
    p_tax, p_amount, p_total, p_line_items, p_notes, 'Draft', p_created_by
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
