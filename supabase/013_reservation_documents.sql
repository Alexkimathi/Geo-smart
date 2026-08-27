-- Reservation documents for title deed checklist
CREATE TABLE IF NOT EXISTS reservation_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES plot_reservations(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  url           TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  uploaded_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reservation_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read reservation documents"
  ON reservation_documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated insert reservation documents"
  ON reservation_documents FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated delete reservation documents"
  ON reservation_documents FOR DELETE TO authenticated USING (true);

-- Storage bucket for reservation documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('reservation-docs', 'reservation-docs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read reservation docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reservation-docs');

CREATE POLICY "Authenticated upload reservation docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reservation-docs');

CREATE POLICY "Authenticated delete reservation docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'reservation-docs');
