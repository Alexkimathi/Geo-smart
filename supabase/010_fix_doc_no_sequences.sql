-- ============================================================
-- Fix doc_no / lpo_no generation for finance_documents and lpos
--
-- Root cause: triggers used COUNT(*)+1 (breaks on deletion) and
-- were likely never applied to the live database. Also adds
-- advisory-locked RPC functions for atomic number generation
-- called directly from the app to avoid trigger dependency.
--
-- Safe to run multiple times (CREATE OR REPLACE / DROP IF EXISTS).
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Fix and recreate the BEFORE INSERT trigger function (safety net)
CREATE OR REPLACE FUNCTION finance_doc_set_doc_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_year    TEXT;
  v_prefix  TEXT;
  v_seq     INT;
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

  SELECT COALESCE(
    MAX(CAST(SPLIT_PART(doc_no, '-', 3) AS INTEGER)), 0
  ) + 1
  INTO v_seq
  FROM finance_documents
  WHERE type = v_seq_col
    AND doc_no LIKE v_prefix || '%';

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

-- 2. Fix and recreate the LPO trigger function (safety net)
CREATE OR REPLACE FUNCTION lpo_set_lpo_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  yr  TEXT;
  seq INT;
BEGIN
  IF NEW.lpo_no IS NULL OR NEW.lpo_no = '' THEN
    yr := TO_CHAR(NOW(), 'YYYY');
    SELECT COALESCE(
      MAX(CAST(SPLIT_PART(lpo_no, '-', 3) AS INTEGER)), 0
    ) + 1
    INTO seq
    FROM lpos
    WHERE lpo_no LIKE 'LPO-' || yr || '-%';
    NEW.lpo_no := 'LPO-' || yr || '-' || LPAD(seq::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lpo_set_lpo_no ON lpos;
CREATE TRIGGER trg_lpo_set_lpo_no
  BEFORE INSERT ON lpos FOR EACH ROW EXECUTE FUNCTION lpo_set_lpo_no();

-- 3. Advisory-locked RPC: generate next doc_no atomically
--    Called directly from the app — race-condition safe.
CREATE OR REPLACE FUNCTION generate_finance_doc_no(p_type TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_year   TEXT := TO_CHAR(now(), 'YYYY');
  v_prefix TEXT;
  v_seq    INT;
BEGIN
  -- Serialise concurrent calls for the same type + year
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
  FROM finance_documents
  WHERE type    = p_type
    AND doc_no LIKE v_prefix || '%';

  RETURN v_prefix || LPAD(v_seq::TEXT, 3, '0');
END;
$$;

-- 4. Advisory-locked RPC: generate next lpo_no atomically
CREATE OR REPLACE FUNCTION generate_lpo_no()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_year   TEXT := TO_CHAR(now(), 'YYYY');
  v_prefix TEXT := 'LPO-' || TO_CHAR(now(), 'YYYY') || '-';
  v_seq    INT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('lpo_no_' || v_year));

  SELECT COALESCE(
    MAX(CAST(SPLIT_PART(lpo_no, '-', 3) AS INTEGER)), 0
  ) + 1
  INTO v_seq
  FROM lpos
  WHERE lpo_no LIKE v_prefix || '%';

  RETURN v_prefix || LPAD(v_seq::TEXT, 3, '0');
END;
$$;

-- 5. Clean up any stale empty-string doc_nos left from the broken trigger
--    ONLY deletes Draft documents with doc_no = '' — edit this if needed.
-- DELETE FROM finance_documents WHERE doc_no = '' AND status = 'Draft';
