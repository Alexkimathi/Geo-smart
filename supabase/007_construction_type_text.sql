-- ============================================================
-- Convert construction_type from ENUM to TEXT
-- Allows free-form project types (Perimeter Wall, Other, etc.)
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE construction_jobs
  ALTER COLUMN project_type TYPE TEXT
  USING project_type::TEXT;

DROP TYPE IF EXISTS construction_type;
