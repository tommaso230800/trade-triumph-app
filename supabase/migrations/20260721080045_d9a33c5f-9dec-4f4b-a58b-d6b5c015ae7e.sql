-- FASE 4A: Affidabilità cliente
ALTER TABLE public.clienti
  ADD COLUMN IF NOT EXISTS affidabilita_score integer,
  ADD COLUMN IF NOT EXISTS blocco_provvigione boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivo_blocco text,
  ADD COLUMN IF NOT EXISTS affidabilita_updated_at timestamptz;

-- FASE 6A: Soft delete
DO $$
DECLARE t text;
DECLARE tables text[] := ARRAY[
  'clienti','ordini','prodotti','aziende','segnalazioni','documenti',
  'notes','visite','contratti_clienti','promo_clienti'
];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_at timestamptz', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (deleted_at) WHERE deleted_at IS NULL',
      t || '_active_idx', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.soft_delete_intercept()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.deleted_at IS NOT NULL THEN
    RETURN OLD;
  END IF;
  EXECUTE format('UPDATE public.%I SET deleted_at = now() WHERE id = $1', TG_TABLE_NAME) USING OLD.id;
  RETURN NULL;
END; $$;

DO $$
DECLARE t text;
DECLARE tables text[] := ARRAY[
  'clienti','ordini','prodotti','aziende','segnalazioni','documenti',
  'notes','visite','contratti_clienti','promo_clienti'
];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS soft_delete_%I ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER soft_delete_%I BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.soft_delete_intercept()', t, t);
  END LOOP;
END $$;

-- View cestino (usa solo colonne esistenti)
CREATE OR REPLACE VIEW public.cestino_items AS
  SELECT 'clienti'::text AS tipo, id, COALESCE(nome, 'Cliente') AS nome, user_id, deleted_at FROM public.clienti WHERE deleted_at IS NOT NULL
  UNION ALL
  SELECT 'ordini', id, COALESCE(codice, id::text), user_id, deleted_at FROM public.ordini WHERE deleted_at IS NOT NULL
  UNION ALL
  SELECT 'prodotti', id, COALESCE(nome, codice, id::text), user_id, deleted_at FROM public.prodotti WHERE deleted_at IS NOT NULL
  UNION ALL
  SELECT 'aziende', id, COALESCE(nome, id::text), user_id, deleted_at FROM public.aziende WHERE deleted_at IS NOT NULL
  UNION ALL
  SELECT 'segnalazioni', id, id::text, user_id, deleted_at FROM public.segnalazioni WHERE deleted_at IS NOT NULL
  UNION ALL
  SELECT 'documenti', id, COALESCE(nome_file, id::text), user_id, deleted_at FROM public.documenti WHERE deleted_at IS NOT NULL
  UNION ALL
  SELECT 'notes', id, COALESCE(titolo, LEFT(contenuto, 60), id::text), user_id, deleted_at FROM public.notes WHERE deleted_at IS NOT NULL
  UNION ALL
  SELECT 'visite', id, id::text, user_id, deleted_at FROM public.visite WHERE deleted_at IS NOT NULL
  UNION ALL
  SELECT 'contratti_clienti', id, id::text, user_id, deleted_at FROM public.contratti_clienti WHERE deleted_at IS NOT NULL
  UNION ALL
  SELECT 'promo_clienti', id, id::text, user_id, deleted_at FROM public.promo_clienti WHERE deleted_at IS NOT NULL;

GRANT SELECT ON public.cestino_items TO authenticated;

CREATE OR REPLACE FUNCTION public.cestino_ripristina(p_tipo text, p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_tipo NOT IN ('clienti','ordini','prodotti','aziende','segnalazioni','documenti','notes','visite','contratti_clienti','promo_clienti') THEN
    RAISE EXCEPTION 'Tipo non valido';
  END IF;
  EXECUTE format('UPDATE public.%I SET deleted_at = NULL WHERE id = $1 AND (user_id = $2 OR public.is_admin($2))', p_tipo) USING p_id, auth.uid();
END; $$;

CREATE OR REPLACE FUNCTION public.cestino_elimina_definitivo(p_tipo text, p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_tipo NOT IN ('clienti','ordini','prodotti','aziende','segnalazioni','documenti','notes','visite','contratti_clienti','promo_clienti') THEN
    RAISE EXCEPTION 'Tipo non valido';
  END IF;
  EXECUTE format('DELETE FROM public.%I WHERE id = $1 AND deleted_at IS NOT NULL AND (user_id = $2 OR public.is_admin($2))', p_tipo) USING p_id, auth.uid();
END; $$;

REVOKE ALL ON FUNCTION public.cestino_ripristina(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cestino_elimina_definitivo(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cestino_ripristina(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cestino_elimina_definitivo(text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.purge_cestino_expired()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t text;
DECLARE tables text[] := ARRAY[
  'clienti','ordini','prodotti','aziende','segnalazioni','documenti',
  'notes','visite','contratti_clienti','promo_clienti'
];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DELETE FROM public.%I WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval ''30 days''', t);
  END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.purge_cestino_expired() FROM PUBLIC, anon, authenticated;