-- ============================================================
-- STORAGE BUCKETS
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Documents bucket (public so getPublicUrl() works for downloads)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('documents', 'documents', true, 52428800)   -- 50 MB limit
ON CONFLICT (id) DO UPDATE SET public = true;

-- Timesheets bucket (site photos uploaded during clock-in/out)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('timesheets', 'timesheets', true, 10485760)  -- 10 MB limit
ON CONFLICT (id) DO UPDATE SET public = true;

-- ── Storage RLS Policies: documents ──────────────────────────

-- Allow authenticated users to upload
CREATE POLICY "documents_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to read/download
CREATE POLICY "documents_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents');

-- Allow authenticated users to delete their own uploads
CREATE POLICY "documents_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents');

-- ── Storage RLS Policies: timesheets ─────────────────────────

-- Allow authenticated users to upload site photos
CREATE POLICY "timesheets_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'timesheets');

-- Allow authenticated users to read site photos
CREATE POLICY "timesheets_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'timesheets');
