-- 1. Promemoria: stop rewriting the owner to the agency data owner
DROP TRIGGER IF EXISTS aaa_agency_data_owner ON public.ai_promemoria;
DROP TRIGGER IF EXISTS aaa_agency_data_owner ON public.promemoria;

-- 2. Owner guard: the owner is always the signed-in user and cannot be changed by a user
CREATE OR REPLACE FUNCTION public.promemoria_owner_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL THEN
      NEW.user_id := auth.uid();
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF auth.uid() IS NOT NULL AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Il proprietario del promemoria non può essere cambiato';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS aaa_promemoria_owner_guard ON public.ai_promemoria;
CREATE TRIGGER aaa_promemoria_owner_guard BEFORE INSERT OR UPDATE ON public.ai_promemoria
  FOR EACH ROW EXECUTE FUNCTION public.promemoria_owner_guard();
DROP TRIGGER IF EXISTS aaa_promemoria_owner_guard ON public.promemoria;
CREATE TRIGGER aaa_promemoria_owner_guard BEFORE INSERT OR UPDATE ON public.promemoria
  FOR EACH ROW EXECUTE FUNCTION public.promemoria_owner_guard();

-- 3. Grants: signed-in users only
REVOKE ALL ON public.ai_promemoria FROM anon;
REVOKE ALL ON public.promemoria FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_promemoria TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promemoria TO authenticated;
GRANT ALL ON public.ai_promemoria TO service_role;
GRANT ALL ON public.promemoria TO service_role;

-- 4. Policies: strictly own rows (no agency-wide or admin-wide access)
ALTER TABLE public.ai_promemoria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agency shared all" ON public.ai_promemoria;
DROP POLICY IF EXISTS "Admins full access" ON public.ai_promemoria;
DROP POLICY IF EXISTS "Users manage own ai_promemoria" ON public.ai_promemoria;
CREATE POLICY "Own reminders read" ON public.ai_promemoria FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own reminders create" ON public.ai_promemoria FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own reminders update" ON public.ai_promemoria FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own reminders delete" ON public.ai_promemoria FOR DELETE TO authenticated USING (user_id = auth.uid());

ALTER TABLE public.promemoria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agency shared select" ON public.promemoria;
DROP POLICY IF EXISTS "Agency shared insert" ON public.promemoria;
DROP POLICY IF EXISTS "Agency shared update" ON public.promemoria;
DROP POLICY IF EXISTS "Agency shared delete" ON public.promemoria;
DROP POLICY IF EXISTS "Users can update own promemoria" ON public.promemoria;
CREATE POLICY "Users can update own promemoria" ON public.promemoria FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Diagnostics: same access for every agency member
DROP POLICY IF EXISTS "Agency members read errors" ON public.error_log;
CREATE POLICY "Agency members read errors" ON public.error_log FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid()));
DROP POLICY IF EXISTS "Agency members read notification system log" ON public.notifiche_sistema_log;
CREATE POLICY "Agency members read notification system log" ON public.notifiche_sistema_log FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid()));

CREATE OR REPLACE FUNCTION public.notifiche_diagnostica()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.is_agency_member(auth.uid()) OR public.is_admin(auth.uid())) THEN RAISE EXCEPTION 'Accesso riservato ai membri dell''agenzia'; END IF;
  RETURN jsonb_build_object(
    'consegne_7gg', (SELECT coalesce(jsonb_object_agg(status, n), '{}'::jsonb) FROM (
      SELECT status, count(*) n FROM public.notifiche_consegne WHERE created_at > now() - interval '7 days' GROUP BY status) s),
    'ricevute_7gg', (SELECT count(*) FROM public.notifiche_consegne WHERE received_at > now() - interval '7 days'),
    'dispositivi', (SELECT coalesce(jsonb_agg(jsonb_build_object('utente', coalesce(m.full_name, m.username, 'Utente'), 'attivi', x.attivi, 'disattivati', x.disattivati)), '[]'::jsonb)
      FROM (SELECT user_id, count(*) FILTER (WHERE enabled) attivi, count(*) FILTER (WHERE NOT enabled) disattivati FROM public.push_dispositivi GROUP BY user_id) x
      LEFT JOIN public.agency_members m ON m.user_id = x.user_id),
    'notifiche_7gg', (SELECT count(*) FROM public.notifiche WHERE created_at > now() - interval '7 days'),
    'errori_recenti', (SELECT coalesce(jsonb_agg(e ORDER BY e.at DESC), '[]'::jsonb) FROM (
      SELECT d.updated_at at, 'Invio push' fonte, coalesce(d.error, 'Errore') messaggio FROM public.notifiche_consegne d
        WHERE d.status IN ('fallita','scaduta') AND d.updated_at > now() - interval '7 days'
      UNION ALL
      SELECT l.started_at, l.job, coalesce(l.error, 'Errore') FROM public.notifiche_sistema_log l
        WHERE l.status = 'errore' AND l.started_at > now() - interval '7 days'
      ORDER BY 1 DESC LIMIT 20) e)
  );
END $function$;

-- 6. Device detach on sign-out (by endpoint, own device only)
CREATE OR REPLACE FUNCTION public.unregister_push_device(p_endpoint text)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  DELETE FROM public.push_dispositivi WHERE endpoint = p_endpoint AND user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.unregister_push_device(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.unregister_push_device(text) TO authenticated;