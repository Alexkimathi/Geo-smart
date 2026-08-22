-- ============================================================
-- Fix job_no generation for construction_jobs and survey_jobs
--
-- Root cause: generate_construction_job_no() and generate_survey_job_no()
-- use COUNT(*)+1 to pick the next number. This breaks whenever a job is
-- deleted, because COUNT drops below the highest existing job_no, causing
-- a duplicate on the next insert.
--
-- Fix: replace COUNT(*)+1 with MAX(seq)+1 so gaps from deletions are
-- skipped and new numbers always exceed the current maximum.
-- Safe to run multiple times (CREATE OR REPLACE).
-- ============================================================

CREATE OR REPLACE FUNCTION generate_construction_job_no()
RETURNS TRIGGER AS $$
DECLARE
  yr  TEXT    := TO_CHAR(NOW(), 'YYYY');
  seq INTEGER;
BEGIN
  SELECT COALESCE(
    MAX(CAST(SPLIT_PART(job_no, '-', 3) AS INTEGER)), 0
  ) + 1
  INTO seq
  FROM construction_jobs
  WHERE job_no LIKE 'CT-' || yr || '-%';

  NEW.job_no := 'CT-' || yr || '-' || LPAD(seq::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_survey_job_no()
RETURNS TRIGGER AS $$
DECLARE
  yr  TEXT    := TO_CHAR(NOW(), 'YYYY');
  seq INTEGER;
BEGIN
  SELECT COALESCE(
    MAX(CAST(SPLIT_PART(job_no, '-', 3) AS INTEGER)), 0
  ) + 1
  INTO seq
  FROM survey_jobs
  WHERE job_no LIKE 'SV-' || yr || '-%';

  NEW.job_no := 'SV-' || yr || '-' || LPAD(seq::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
