-- ============================================================
-- MIGRATION: Archive + On Hold + Job Notes + User features
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS)
-- ============================================================

-- 1. Add is_archived columns (for hiding jobs without deleting)
ALTER TABLE survey_jobs ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE construction_jobs ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Add 'On Hold' to survey_jobs status
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'survey_jobs' AND constraint_name = 'survey_jobs_status_check'
  ) THEN
    ALTER TABLE survey_jobs DROP CONSTRAINT survey_jobs_status_check;
  END IF;
  ALTER TABLE survey_jobs
    ADD CONSTRAINT survey_jobs_status_check
    CHECK (status IN ('New', 'In Progress', 'QA', 'Delivered', 'Paid', 'On Hold'));
END $$;

-- 3. Add 'On Hold' to construction_jobs status
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'construction_jobs' AND constraint_name = 'construction_jobs_status_check'
  ) THEN
    ALTER TABLE construction_jobs DROP CONSTRAINT construction_jobs_status_check;
  END IF;
  ALTER TABLE construction_jobs
    ADD CONSTRAINT construction_jobs_status_check
    CHECK (status IN ('Tender', 'Ongoing', 'Completed', 'Handover', 'On Hold'));
END $$;

-- 4. Job notes table (team communications per job)
CREATE TABLE IF NOT EXISTS job_notes (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id      UUID        NOT NULL,
  job_type    TEXT        NOT NULL CHECK (job_type IN ('survey', 'construction')),
  content     TEXT        NOT NULL,
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on job_notes (service client bypasses this anyway)
ALTER TABLE job_notes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all notes
DROP POLICY IF EXISTS "Authenticated users can read job notes" ON job_notes;
CREATE POLICY "Authenticated users can read job notes"
  ON job_notes FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert their own notes
DROP POLICY IF EXISTS "Authenticated users can add job notes" ON job_notes;
CREATE POLICY "Authenticated users can add job notes"
  ON job_notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_survey_jobs_is_archived ON survey_jobs (is_archived);
CREATE INDEX IF NOT EXISTS idx_construction_jobs_is_archived ON construction_jobs (is_archived);
CREATE INDEX IF NOT EXISTS idx_survey_jobs_status ON survey_jobs (status);
CREATE INDEX IF NOT EXISTS idx_construction_jobs_status ON construction_jobs (status);
CREATE INDEX IF NOT EXISTS idx_job_notes_job ON job_notes (job_id, job_type);
CREATE INDEX IF NOT EXISTS idx_job_notes_created_at ON job_notes (created_at DESC);
