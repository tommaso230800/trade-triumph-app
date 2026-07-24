
-- ============================================================
-- 1) STORAGE POLICIES: aziende-logos & prodotti-images
-- ============================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete logos" ON storage.objects;

DROP POLICY IF EXISTS "Product images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;

-- aziende-logos: authenticated-only writes, owner-scoped by first folder = auth.uid()
CREATE POLICY "aziende_logos_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'aziende-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "aziende_logos_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'aziende-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'aziende-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "aziende_logos_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'aziende-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- prodotti-images: authenticated-only writes, owner-scoped by first folder = auth.uid()
CREATE POLICY "prodotti_images_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'prodotti-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "prodotti_images_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'prodotti-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'prodotti-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "prodotti_images_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'prodotti-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- NOTE: no SELECT policy on these buckets. Buckets remain public, so
-- getPublicUrl(...) direct downloads continue to work, but API listing
-- via storage.objects is now blocked for anon/authenticated.

-- ============================================================
-- 2) SECURITY DEFINER functions: revoke EXECUTE from anon/authenticated
--    for trigger and internal helpers. Keep for callable RPCs.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.update_reorder_tracking()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_order_code()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_ricalcola_provvigione_riga()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_ricalcola_provvigione_ordine() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_default_role()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.soft_delete_intercept()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_cestino_expired()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_cliente_stats()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calcola_provvigione_prevista(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trova_condizione_provvigione(uuid, uuid, uuid, uuid, text, date) FROM PUBLIC, anon, authenticated;

-- Also revoke anon from the RPCs (only authenticated should call them)
REVOKE EXECUTE ON FUNCTION public.cestino_ripristina(text, uuid)       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cestino_elimina_definitivo(text, uuid) FROM PUBLIC, anon;

-- has_role / is_admin are used inside RLS policies and must remain executable
-- by authenticated users; revoke from anon only.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid)           FROM PUBLIC, anon;
