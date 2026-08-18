-- ============================================================
-- Add quoted_amount to survey_jobs
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE survey_jobs ADD COLUMN IF NOT EXISTS quoted_amount DECIMAL(15,2) DEFAULT 0;
