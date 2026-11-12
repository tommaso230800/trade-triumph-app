-- 1. Agency membership ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agency_members (
  user_id uuid PRIMARY KEY,
  username text NOT NULL,
  username_norm text GENERATED ALWAYS AS (lower(btrim(username))) STORED,
  full_name text NOT NULL,
  is_owner boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  internal_identity boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS agency_members_username_norm_key ON public.agency_members (username_norm);
CREATE UNIQUE INDEX IF NOT EXISTS agency_members_single_owner ON public.agency_members ((true)) WHERE is_owner;
GRANT SELECT ON public.agency_members TO authenticated;
GRANT ALL ON public.agency_members TO service_role;
ALTER TABLE public.agency_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username_norm text NOT NULL,
  ip text,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_attempts_lookup ON public.login_attempts (username_norm, created_at DESC);
CREATE INDEX IF NOT EXISTS login_attempts_ip ON public.login_attempts (ip, created_at DESC);
GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_agency_member(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid IS NOT NULL AND EXISTS (SELECT 1 FROM public.agency_members m WHERE m.user_id = _uid AND m.active)
$$;

CREATE OR REPLACE FUNCTION public.is_agency_member_text(_uid text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid IS NOT NULL AND EXISTS (SELECT 1 FROM public.agency_members m WHERE m.user_id::text = _uid AND m.active)
$$;

CREATE OR REPLACE FUNCTION public.agency_owner_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id FROM public.agency_members WHERE is_owner AND active LIMIT 1
$$;

-- Maps any agency member to the agency data owner; other users are unchanged.
CREATE OR REPLACE FUNCTION public.agency_data_owner(_uid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.is_agency_member(_uid) THEN COALESCE(public.agency_owner_id(), _uid) ELSE _uid END
$$;

GRANT EXECUTE ON FUNCTION public.is_agency_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_agency_member_text(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.agency_owner_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.agency_data_owner(uuid) TO authenticated, service_role;

CREATE POLICY "Agency members read members" ON public.agency_members
  FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid()));

CREATE OR REPLACE FUNCTION public.agency_assign_data_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    NEW.user_id := public.agency_data_owner(NEW.user_id);
  END IF;
  RETURN NEW;
END $$;

-- 2. Shared policies + owner mapping on every user-scoped table -----------
DO $$
DECLARE
  t record;
  c text;
BEGIN
  FOR t IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables tb ON tb.table_schema = 'public' AND tb.table_name = c.table_name AND tb.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public' AND c.column_name = 'user_id'
      AND c.table_name NOT IN ('user_roles','agency_members','login_attempts','onedrive_worker_keys')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS aaa_agency_data_owner ON public.%I', t.table_name);
    EXECUTE format('CREATE TRIGGER aaa_agency_data_owner BEFORE INSERT OR UPDATE OF user_id ON public.%I FOR EACH ROW EXECUTE FUNCTION public.agency_assign_data_owner()', t.table_name);

    FOR c IN
      SELECT DISTINCT p.cmd FROM pg_policies p
      WHERE p.schemaname = 'public' AND p.tablename = t.table_name
        AND COALESCE(p.qual,'') || COALESCE(p.with_check,'') NOT ILIKE '%is_admin%'
    LOOP
      IF c = 'SELECT' THEN
        EXECUTE format('CREATE POLICY "Agency shared select" ON public.%I FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid()) AND public.is_agency_member(user_id))', t.table_name);
      ELSIF c = 'DELETE' THEN
        EXECUTE format('CREATE POLICY "Agency shared delete" ON public.%I FOR DELETE TO authenticated USING (public.is_agency_member(auth.uid()) AND public.is_agency_member(user_id))', t.table_name);
      ELSIF c = 'INSERT' THEN
        EXECUTE format('CREATE POLICY "Agency shared insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_agency_member(auth.uid()) AND public.is_agency_member(user_id))', t.table_name);
      ELSIF c = 'UPDATE' THEN
        EXECUTE format('CREATE POLICY "Agency shared update" ON public.%I FOR UPDATE TO authenticated USING (public.is_agency_member(auth.uid()) AND public.is_agency_member(user_id)) WITH CHECK (public.is_agency_member(auth.uid()) AND public.is_agency_member(user_id))', t.table_name);
      ELSIF c = 'ALL' THEN
        EXECUTE format('CREATE POLICY "Agency shared all" ON public.%I FOR ALL TO authenticated USING (public.is_agency_member(auth.uid()) AND public.is_agency_member(user_id)) WITH CHECK (public.is_agency_member(auth.uid()) AND public.is_agency_member(user_id))', t.table_name);
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Child tables without user_id
CREATE POLICY "Agency shared documenti_aziende" ON public.documenti_aziende FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid()) AND EXISTS (SELECT 1 FROM public.documenti d WHERE d.id = documenti_aziende.documento_id AND public.is_agency_member(d.user_id)))
  WITH CHECK (public.is_agency_member(auth.uid()) AND EXISTS (SELECT 1 FROM public.documenti d WHERE d.id = documenti_aziende.documento_id AND public.is_agency_member(d.user_id)));
CREATE POLICY "Agency shared email_allegati" ON public.email_allegati FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid()) AND EXISTS (SELECT 1 FROM public.email_ingest e WHERE e.id = email_allegati.email_id AND public.is_agency_member(e.user_id)))
  WITH CHECK (public.is_agency_member(auth.uid()) AND EXISTS (SELECT 1 FROM public.email_ingest e WHERE e.id = email_allegati.email_id AND public.is_agency_member(e.user_id)));
CREATE POLICY "Agency members read profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_agency_member(auth.uid()) AND public.is_agency_member(id));

-- Storage: agency members share files stored under any member folder
CREATE POLICY "Agency shared files select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('documenti','aziende-logos','prodotti-images','estratti-provvigioni','product-imports')
    AND public.is_agency_member(auth.uid()) AND public.is_agency_member_text((storage.foldername(name))[1]));
CREATE POLICY "Agency shared files insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('documenti','aziende-logos','prodotti-images','estratti-provvigioni','product-imports')
    AND public.is_agency_member(auth.uid()) AND public.is_agency_member_text((storage.foldername(name))[1]));
CREATE POLICY "Agency shared files update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('documenti','aziende-logos','prodotti-images','estratti-provvigioni','product-imports')
    AND public.is_agency_member(auth.uid()) AND public.is_agency_member_text((storage.foldername(name))[1]));
CREATE POLICY "Agency shared files delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('documenti','aziende-logos','prodotti-images','estratti-provvigioni','product-imports')
    AND public.is_agency_member(auth.uid()) AND public.is_agency_member_text((storage.foldername(name))[1]));

-- Trash functions respect agency sharing
CREATE OR REPLACE FUNCTION public.cestino_ripristina(p_tipo text, p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF p_tipo NOT IN ('clienti','ordini','prodotti','aziende','segnalazioni','documenti','notes','visite','contratti_clienti','promo_clienti') THEN
    RAISE EXCEPTION 'Tipo non valido';
  END IF;
  EXECUTE format('UPDATE public.%I SET deleted_at = NULL WHERE id = $1 AND (user_id = $2 OR public.is_admin($2) OR (public.is_agency_member($2) AND public.is_agency_member(user_id)))', p_tipo) USING p_id, auth.uid();
END; $function$;

CREATE OR REPLACE FUNCTION public.cestino_elimina_definitivo(p_tipo text, p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF p_tipo NOT IN ('clienti','ordini','prodotti','aziende','segnalazioni','documenti','notes','visite','contratti_clienti','promo_clienti') THEN
    RAISE EXCEPTION 'Tipo non valido';
  END IF;
  EXECUTE format('DELETE FROM public.%I WHERE id = $1 AND deleted_at IS NOT NULL AND (user_id = $2 OR public.is_admin($2) OR (public.is_agency_member($2) AND public.is_agency_member(user_id)))', p_tipo) USING p_id, auth.uid();
END; $function$;

-- 3. Order audit + optimistic version ------------------------------------
ALTER TABLE public.ordini ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.ordini ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.ordini ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE public.ordini ADD COLUMN IF NOT EXISTS condizioni_commerciali text;
ALTER TABLE public.ordini_righe ADD COLUMN IF NOT EXISTS pezzi_sfusi integer NOT NULL DEFAULT 0;
ALTER TABLE public.ordini_righe ADD COLUMN IF NOT EXISTS pezzi_per_cartone integer;
ALTER TABLE public.order_email_sends ADD COLUMN IF NOT EXISTS sent_by uuid;
COMMENT ON COLUMN public.ordini_righe.pezzi_per_cartone IS 'Snapshot of pieces per carton at sale time; NULL for rows saved before the snapshot existed.';
COMMENT ON COLUMN public.ordini_righe.pezzi_sfusi IS 'Loose purchased pieces beyond whole cartons; quantita_pezzi stays the total pieces.';

CREATE OR REPLACE FUNCTION public.ordini_audit_version()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(NEW.created_by, auth.uid());
    NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by, NEW.created_by);
    NEW.version := 1;
  ELSE
    NEW.created_by := OLD.created_by;
    IF pg_trigger_depth() = 1 THEN
      NEW.version := OLD.version + 1;
      NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);
    ELSE
      NEW.version := OLD.version;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS aab_ordini_audit_version ON public.ordini;
CREATE TRIGGER aab_ordini_audit_version BEFORE INSERT OR UPDATE ON public.ordini
  FOR EACH ROW EXECUTE FUNCTION public.ordini_audit_version();

-- 4. Company email address book -------------------------------------------
CREATE TABLE IF NOT EXISTS public.aziende_email_contatti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  azienda_id uuid NOT NULL REFERENCES public.aziende(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  ruolo text,
  default_to boolean NOT NULL DEFAULT false,
  default_cc boolean NOT NULL DEFAULT false,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aziende_email_contatti_single_default CHECK (NOT (default_to AND default_cc)),
  CONSTRAINT aziende_email_contatti_email_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);
CREATE UNIQUE INDEX IF NOT EXISTS aziende_email_contatti_unique ON public.aziende_email_contatti (azienda_id, lower(email));
CREATE INDEX IF NOT EXISTS aziende_email_contatti_azienda ON public.aziende_email_contatti (azienda_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aziende_email_contatti TO authenticated;
GRANT ALL ON public.aziende_email_contatti TO service_role;
ALTER TABLE public.aziende_email_contatti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages email contacts" ON public.aziende_email_contatti FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Agency shared all" ON public.aziende_email_contatti FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid()) AND public.is_agency_member(user_id))
  WITH CHECK (public.is_agency_member(auth.uid()) AND public.is_agency_member(user_id));
CREATE TRIGGER aaa_agency_data_owner BEFORE INSERT OR UPDATE OF user_id ON public.aziende_email_contatti
  FOR EACH ROW EXECUTE FUNCTION public.agency_assign_data_owner();
CREATE TRIGGER update_aziende_email_contatti_updated_at BEFORE UPDATE ON public.aziende_email_contatti
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill from existing order email settings and company emails (no duplicates)
INSERT INTO public.aziende_email_contatti (user_id, azienda_id, nome, email, default_to, default_cc, created_by)
SELECT DISTINCT ON (s.azienda_id, lower(btrim(addr)))
  s.user_id, s.azienda_id, split_part(btrim(addr), '@', 1), lower(btrim(addr)), kind = 'to', kind = 'cc', s.user_id
FROM (
  SELECT azienda_id, user_id, unnest(to_addresses) AS addr, 'to' AS kind FROM public.azienda_order_email_settings
  UNION ALL
  SELECT azienda_id, user_id, unnest(cc_addresses), 'cc' FROM public.azienda_order_email_settings
) s
WHERE btrim(addr) ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
ORDER BY s.azienda_id, lower(btrim(addr)), (kind = 'to') DESC
ON CONFLICT DO NOTHING;

INSERT INTO public.aziende_email_contatti (user_id, azienda_id, nome, email, created_by)
SELECT a.user_id, a.id, a.nome, lower(btrim(a.email)), a.user_id
FROM public.aziende a
WHERE a.email IS NOT NULL AND btrim(a.email) ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND a.deleted_at IS NULL
ON CONFLICT DO NOTHING;
