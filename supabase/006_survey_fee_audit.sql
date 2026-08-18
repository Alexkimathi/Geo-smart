-- ============================================================
-- Track when quoted_amount changes on survey_jobs
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- Add timestamp column (NULL means fee was never explicitly set/changed)
ALTER TABLE survey_jobs
  ADD COLUMN IF NOT EXISTS quoted_amount_updated_at TIMESTAMPTZ;

-- Trigger function: stamps the column only when quoted_amount actually changes
CREATE OR REPLACE FUNCTION trg_fn_survey_fee_updated()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quoted_amount IS DISTINCT FROM OLD.quoted_amount THEN
    NEW.quoted_amount_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_survey_fee_updated ON survey_jobs;
CREATE TRIGGER trg_survey_fee_updated
  BEFORE UPDATE ON survey_jobs
  FOR EACH ROW EXECUTE FUNCTION trg_fn_survey_fee_updated();
