-- Preserva lo storico ordini quando un prodotto viene cancellato DEFINITIVAMENTE.
--
-- Problema: ordini_righe.prodotto_id era ON DELETE CASCADE. La prima eliminazione
-- di un prodotto è un soft delete (trigger soft_delete_intercept), ma una seconda
-- DELETE sullo stesso prodotto (doppio tocco), la cancellazione definitiva dal
-- cestino o lo svuotamento automatico dopo 30 giorni lo cancellavano davvero,
-- portando via in cascata le righe degli ordini storici (descrizioni e importi).
--
-- Correzione:
-- 1. ordini_righe.prodotto_id -> ON DELETE RESTRICT: un prodotto usato in ordini
--    non può più essere cancellato fisicamente (resta archiviato nel cestino).
-- 2. cestino_elimina_definitivo: messaggio chiaro invece dell'errore tecnico.
-- 3. purge_cestino_expired: salta prodotti/aziende ancora usati in ordini.
-- Nessun dato esistente viene modificato.

DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class r ON r.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = r.relnamespace
    JOIN pg_class f ON f.oid = con.confrelid
    WHERE n.nspname = 'public' AND r.relname = 'ordini_righe' AND f.relname = 'prodotti' AND con.contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE public.ordini_righe DROP CONSTRAINT %I', c);
  END LOOP;
  ALTER TABLE public.ordini_righe
    ADD CONSTRAINT ordini_righe_prodotto_id_fkey
    FOREIGN KEY (prodotto_id) REFERENCES public.prodotti(id) ON DELETE RESTRICT;
END $$;

CREATE OR REPLACE FUNCTION public.cestino_elimina_definitivo(p_tipo text, p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non autenticato'; END IF;
  IF p_tipo = 'clienti' THEN
    DELETE FROM public.clienti WHERE id = p_id AND deleted_at IS NOT NULL AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'ordini' THEN
    DELETE FROM public.ordini WHERE id = p_id AND deleted_at IS NOT NULL AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'prodotti' THEN
    IF EXISTS (SELECT 1 FROM public.ordini_righe r WHERE r.prodotto_id = p_id) THEN
      RAISE EXCEPTION 'Prodotto presente in ordini registrati: resta nel cestino per preservare lo storico';
    END IF;
    DELETE FROM public.prodotti WHERE id = p_id AND deleted_at IS NOT NULL AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'aziende' THEN
    IF EXISTS (SELECT 1 FROM public.prodotti p JOIN public.ordini_righe r ON r.prodotto_id = p.id WHERE p.azienda_id = p_id) THEN
      RAISE EXCEPTION 'Azienda con prodotti presenti in ordini registrati: resta nel cestino per preservare lo storico';
    END IF;
    DELETE FROM public.aziende WHERE id = p_id AND deleted_at IS NOT NULL AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'segnalazioni' THEN
    DELETE FROM public.segnalazioni WHERE id = p_id AND deleted_at IS NOT NULL AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'documenti' THEN
    DELETE FROM public.documenti WHERE id = p_id AND deleted_at IS NOT NULL AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'notes' THEN
    DELETE FROM public.notes WHERE id = p_id AND deleted_at IS NOT NULL AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'visite' THEN
    DELETE FROM public.visite WHERE id = p_id AND deleted_at IS NOT NULL AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'contratti_clienti' THEN
    DELETE FROM public.contratti_clienti WHERE id = p_id AND deleted_at IS NOT NULL AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'promo_clienti' THEN
    DELETE FROM public.promo_clienti WHERE id = p_id AND deleted_at IS NOT NULL AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSE
    RAISE EXCEPTION 'Tipo non valido';
  END IF;
END; $function$;

CREATE OR REPLACE FUNCTION public.purge_cestino_expired()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t text;
DECLARE semplici text[] := ARRAY['clienti','segnalazioni','documenti','notes','visite','contratti_clienti','promo_clienti'];
BEGIN
  -- Ordini nel cestino da oltre 30 giorni (con le loro righe).
  DELETE FROM public.ordini WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days';
  -- Prodotti: mai se ancora presenti in righe d'ordine (storico).
  DELETE FROM public.prodotti p
   WHERE p.deleted_at IS NOT NULL AND p.deleted_at < now() - interval '30 days'
     AND NOT EXISTS (SELECT 1 FROM public.ordini_righe r WHERE r.prodotto_id = p.id);
  -- Aziende: mai se hanno prodotti presenti in righe d'ordine.
  DELETE FROM public.aziende a
   WHERE a.deleted_at IS NOT NULL AND a.deleted_at < now() - interval '30 days'
     AND NOT EXISTS (
       SELECT 1 FROM public.prodotti p JOIN public.ordini_righe r ON r.prodotto_id = p.id
        WHERE p.azienda_id = a.id);
  FOREACH t IN ARRAY semplici LOOP
    EXECUTE format('DELETE FROM public.%I WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval ''30 days''', t);
  END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.purge_cestino_expired() FROM PUBLIC, anon, authenticated;
