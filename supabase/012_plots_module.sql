-- ============================================================
-- 012_plots_module.sql
-- Plots tracking module: projects, plots, photos, buyers,
-- reservations, payments
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── plot_projects ───────────────────────────────────────────

CREATE TABLE plot_projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  location    TEXT NOT NULL,
  county      TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'completed')),
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── plots ───────────────────────────────────────────────────

CREATE TABLE plots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES plot_projects(id) ON DELETE CASCADE,
  plot_no      TEXT NOT NULL,
  size_desc    TEXT,                    -- e.g. "50x100 ft"
  area_sqm     NUMERIC(10,2),
  price        NUMERIC(12,2) NOT NULL,
  gps_lat      NUMERIC(10,7),
  gps_lng      NUMERIC(10,7),
  title_status TEXT,                    -- e.g. "Freehold", "Leasehold", "Pending"
  status       TEXT NOT NULL DEFAULT 'available'
               CHECK (status IN ('available', 'reserved', 'sold', 'transferred')),
  notes        TEXT,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, plot_no)
);

-- ── plot_photos ─────────────────────────────────────────────

CREATE TABLE plot_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id     UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  caption     TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── plot_buyers ─────────────────────────────────────────────

CREATE TABLE plot_buyers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT,
  national_id TEXT,
  notes       TEXT,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── plot_reservations ───────────────────────────────────────

CREATE TABLE plot_reservations (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id                UUID NOT NULL REFERENCES plots(id) ON DELETE RESTRICT,
  buyer_id               UUID NOT NULL REFERENCES plot_buyers(id) ON DELETE RESTRICT,
  reserved_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sale_price             NUMERIC(12,2) NOT NULL,
  reservation_fee        NUMERIC(12,2) NOT NULL DEFAULT 0,
  reservation_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  approved_at            TIMESTAMPTZ,
  approved_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- set to approved_at + 14 days by the app when approving
  reservation_expires_at TIMESTAMPTZ,
  payment_plan           TEXT NOT NULL DEFAULT 'installment'
                         CHECK (payment_plan IN ('lump_sum', 'installment')),
  installment_count      INT,
  installment_amount     NUMERIC(12,2),
  installment_frequency  TEXT DEFAULT 'monthly'
                         CHECK (installment_frequency IN ('monthly', 'quarterly')),
  -- M-Pesa details for the reservation fee payment
  mpesa_code             TEXT,
  mpesa_name             TEXT,
  status                 TEXT NOT NULL DEFAULT 'pending_approval'
                         CHECK (status IN ('pending_approval', 'active', 'completed', 'defaulted', 'cancelled')),
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── plot_payments ───────────────────────────────────────────

CREATE TABLE plot_payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES plot_reservations(id) ON DELETE CASCADE,
  amount         NUMERIC(12,2) NOT NULL,
  payment_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  method         TEXT NOT NULL DEFAULT 'M-Pesa'
                 CHECK (method IN ('M-Pesa', 'Bank Transfer', 'Cash', 'Cheque')),
  reference      TEXT,           -- M-Pesa code / bank reference
  mpesa_name     TEXT,           -- sender name from M-Pesa SMS
  payment_type   TEXT NOT NULL DEFAULT 'installment'
                 CHECK (payment_type IN ('reservation_fee', 'installment', 'lump_sum', 'other')),
  recorded_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ─────────────────────────────────────────────────

CREATE INDEX ON plots(project_id);
CREATE INDEX ON plots(status);
CREATE INDEX ON plot_photos(plot_id);
CREATE INDEX ON plot_reservations(plot_id);
CREATE INDEX ON plot_reservations(buyer_id);
CREATE INDEX ON plot_reservations(status);
CREATE INDEX ON plot_payments(reservation_id);
CREATE INDEX ON plot_payments(payment_date);

-- ── updated_at triggers ─────────────────────────────────────

CREATE TRIGGER trg_plot_projects_updated_at
  BEFORE UPDATE ON plot_projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_plots_updated_at
  BEFORE UPDATE ON plots
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_plot_buyers_updated_at
  BEFORE UPDATE ON plot_buyers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_plot_reservations_updated_at
  BEFORE UPDATE ON plot_reservations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS Policies ────────────────────────────────────────────

ALTER TABLE plot_projects   ENABLE ROW LEVEL SECURITY;
ALTER TABLE plots           ENABLE ROW LEVEL SECURITY;
ALTER TABLE plot_photos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE plot_buyers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE plot_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE plot_payments   ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read everything; write access enforced at app layer
CREATE POLICY "plot_projects_select" ON plot_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "plot_projects_insert" ON plot_projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "plot_projects_update" ON plot_projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "plot_projects_delete" ON plot_projects FOR DELETE TO authenticated USING (true);

CREATE POLICY "plots_select" ON plots FOR SELECT TO authenticated USING (true);
CREATE POLICY "plots_insert" ON plots FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "plots_update" ON plots FOR UPDATE TO authenticated USING (true);
CREATE POLICY "plots_delete" ON plots FOR DELETE TO authenticated USING (true);

CREATE POLICY "plot_photos_select" ON plot_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "plot_photos_insert" ON plot_photos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "plot_photos_delete" ON plot_photos FOR DELETE TO authenticated USING (true);

CREATE POLICY "plot_buyers_select" ON plot_buyers FOR SELECT TO authenticated USING (true);
CREATE POLICY "plot_buyers_insert" ON plot_buyers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "plot_buyers_update" ON plot_buyers FOR UPDATE TO authenticated USING (true);

CREATE POLICY "plot_reservations_select" ON plot_reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "plot_reservations_insert" ON plot_reservations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "plot_reservations_update" ON plot_reservations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "plot_reservations_delete" ON plot_reservations FOR DELETE TO authenticated USING (true);

CREATE POLICY "plot_payments_select" ON plot_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "plot_payments_insert" ON plot_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "plot_payments_delete" ON plot_payments FOR DELETE TO authenticated USING (true);

-- ── Storage bucket for plot photos ──────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('plot-photos', 'plot-photos', true, 10485760)  -- 10 MB per photo
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "plot_photos_storage_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'plot-photos');

CREATE POLICY "plot_photos_storage_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'plot-photos');

CREATE POLICY "plot_photos_storage_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'plot-photos');
