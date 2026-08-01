-- Ripristina bucket e policy storage per i loghi aziende, in modo idempotente
-- (fix per drift: garantisce che bucket + policy owner-scoped esistano davvero)

INSERT INTO storage.buckets (id, name, public)
VALUES ('aziende-logos', 'aziende-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete logos" ON storage.objects;
DROP POLICY IF EXISTS "aziende_logos_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "aziende_logos_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "aziende_logos_owner_delete" ON storage.objects;

CREATE POLICY "aziende_logos_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'aziende-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "aziende_logos_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'aziende-logos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'aziende-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "aziende_logos_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'aziende-logos' AND (storage.foldername(name))[1] = auth.uid()::text);
