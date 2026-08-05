-- ============================================================
-- Migration 002: Documents, Equipment, Timesheets
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─── DOCUMENTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type      TEXT CHECK (job_type IN ('survey', 'construction')),
  job_id        UUID,
  client_id     UUID REFERENCES clients(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'Other',
  file_url      TEXT NOT NULL,
  file_size     BIGINT,
  mime_type     TEXT,
  version       INT NOT NULL DEFAULT 1,
  uploaded_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage documents"
  ON documents FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── EQUIPMENT ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipment (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  serial_no             TEXT,
  type                  TEXT NOT NULL DEFAULT 'other',
  purchase_date         DATE,
  condition             TEXT NOT NULL DEFAULT 'good',
  assigned_to_user_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  last_calibration_date DATE,
  stock_qty             INT NOT NULL DEFAULT 1,
  min_stock_qty         INT NOT NULL DEFAULT 1,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage equipment"
  ON equipment FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── MAINTENANCE LOGS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id  UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  description   TEXT NOT NULL,
  done_by       TEXT,
  next_due_date DATE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage maintenance logs"
  ON maintenance_logs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── TIMESHEETS (with GPS clock-in/out) ──────────────────────
CREATE TABLE IF NOT EXISTS timesheets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_type        TEXT CHECK (job_type IN ('survey', 'construction')),
  job_id          UUID,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in_time   TIMESTAMPTZ,
  clock_in_lat    FLOAT,
  clock_in_lng    FLOAT,
  clock_out_time  TIMESTAMPTZ,
  clock_out_lat   FLOAT,
  clock_out_lng   FLOAT,
  hours           FLOAT,
  notes           TEXT,
  site_photo_url  TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own timesheets, managers see all"
  ON timesheets FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );
