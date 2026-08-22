-- ============================================================
-- Drop survey_type CHECK constraint on survey_jobs
-- Allows free-form survey types beyond the original four values
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE survey_jobs
  DROP CONSTRAINT IF EXISTS survey_jobs_survey_type_check;
