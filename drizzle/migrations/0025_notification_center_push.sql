-- Centro notifiche: one row per recipient so read state stays per user.
CREATE TABLE public.notifiche (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,
  event_key text NOT NULL,
  categoria text NOT NULL CHECK (categoria IN ('nuovo_ordine','ordine_inviato','riordino','test')),
  titolo text NOT NULL,
  testo text NOT NULL,
  link text,
  ordine_id uuid,
  cliente_id uuid,
  azienda_id uuid,
  cliente_nome text,
  azienda_nome text,
  importo numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  push_mode text NOT NULL DEFAULT 'push' CHECK (push_mode IN ('push','silenzioso')),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT notifiche_event_recipient_key UNIQUE (event_key, recipient_id)
);
CREATE INDEX notifiche_recipient_created_idx ON public.notifiche (recipient_id, created_at DESC);
GRANT SELECT ON public.notifiche TO authenticated;
GRANT UPDATE (read_at) ON public.notifiche TO authenticated;
GRANT ALL ON public.notifiche TO service_role;
ALTER TABLE public.notifiche ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own notifications" ON public.notifiche FOR SELECT TO authenticated USING (recipient_id = auth.uid());
CREATE POLICY "Mark own notifications read" ON public.notifiche FOR UPDATE TO authenticated USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifiche;

CREATE TABLE public.notifiche_preferenze (
  user_id uuid NOT NULL,
  categoria text NOT NULL CHECK (categoria IN ('nuovo_ordine','ordine_inviato','riordino')),
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, categoria)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifiche_preferenze TO authenticated;
GRANT ALL ON public.notifiche_preferenze TO service_role;
ALTER TABLE public.notifiche_preferenze ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own notification preferences" ON public.notifiche_preferenze FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.push_dispositivi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  nome text,
  user_agent text,
  piattaforma text,
  enabled boolean NOT NULL DEFAULT true,
  disabled_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz,
  last_accepted_at timestamptz,
  last_received_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  failure_count integer NOT NULL DEFAULT 0
);
CREATE INDEX push_dispositivi_user_idx ON public.push_dispositivi (user_id) WHERE enabled;
GRANT SELECT, DELETE ON public.push_dispositivi TO authenticated;
GRANT UPDATE (enabled, nome, updated_at) ON public.push_dispositivi TO authenticated;
GRANT ALL ON public.push_dispositivi TO service_role;
ALTER TABLE public.push_dispositivi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own devices" ON public.push_dispositivi FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Update own devices" ON public.push_dispositivi FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Delete own devices" ON public.push_dispositivi FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.notifiche_consegne (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notifica_id uuid NOT NULL REFERENCES public.notifiche(id) ON DELETE CASCADE,
  dispositivo_id uuid NOT NULL REFERENCES public.push_dispositivi(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_coda' CHECK (status IN ('in_coda','invio','accettata','fallita','scaduta','annullata')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  http_status integer,
  error text,
  accepted_at timestamptz,
  received_at timestamptz,
  clicked_at timestamptz,
  receipt_token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifiche_consegne_unique UNIQUE (notifica_id, dispositivo_id)
);
CREATE INDEX notifiche_consegne_queue_idx ON public.notifiche_consegne (status, next_attempt_at);
GRANT SELECT ON public.notifiche_consegne TO authenticated;
GRANT ALL ON public.notifiche_consegne TO service_role;
ALTER TABLE public.notifiche_consegne ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own deliveries" ON public.notifiche_consegne FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.notifiche n WHERE n.id = notifica_id AND n.recipient_id = auth.uid()));

CREATE TABLE public.notifiche_sistema_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job text NOT NULL,
  status text NOT NULL CHECK (status IN ('in_corso','ok','errore')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text
);
CREATE INDEX notifiche_sistema_log_job_idx ON public.notifiche_sistema_log (job, started_at DESC);
GRANT SELECT ON public.notifiche_sistema_log TO authenticated;
GRANT ALL ON public.notifiche_sistema_log TO service_role;
ALTER TABLE public.notifiche_sistema_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read notification system log" ON public.notifiche_sistema_log FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Shared reorder tolerance: the Riordino page and the scheduled check read the same value.
CREATE TABLE public.riordino_impostazioni (
  owner_id uuid PRIMARY KEY,
  tolleranza integer NOT NULL DEFAULT 6 CHECK (tolleranza BETWEEN 5 AND 7),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.riordino_impostazioni TO authenticated;
GRANT ALL ON public.riordino_impostazioni TO service_role;
ALTER TABLE public.riordino_impostazioni ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read shared reorder settings" ON public.riordino_impostazioni FOR SELECT TO authenticated USING (owner_id = public.agency_data_owner(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_riordino_tolleranza(p_tolleranza integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid := public.agency_data_owner(auth.uid());
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Accesso richiesto'; END IF;
  IF p_tolleranza IS NULL OR p_tolleranza < 5 OR p_tolleranza > 7 THEN RAISE EXCEPTION 'Tolleranza fuori intervallo (5-7 giorni)'; END IF;
  INSERT INTO public.riordino_impostazioni (owner_id, tolleranza, updated_by, updated_at)
  VALUES (v_owner, p_tolleranza, auth.uid(), now())
  ON CONFLICT (owner_id) DO UPDATE SET tolleranza = EXCLUDED.tolleranza, updated_by = EXCLUDED.updated_by, updated_at = now();
  RETURN p_tolleranza;
END $$;
REVOKE ALL ON FUNCTION public.set_riordino_tolleranza(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_riordino_tolleranza(integer) TO authenticated, service_role;

-- Device registration: the endpoint belongs to whoever enabled it last on that device.
CREATE OR REPLACE FUNCTION public.register_push_device(p_endpoint text, p_p256dh text, p_auth text, p_nome text, p_user_agent text, p_piattaforma text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Accesso richiesto'; END IF;
  IF p_endpoint IS NULL OR p_endpoint !~ '^https://' OR length(p_endpoint) > 2000 THEN RAISE EXCEPTION 'Endpoint non valido'; END IF;
  IF coalesce(p_p256dh,'') = '' OR coalesce(p_auth,'') = '' OR length(p_p256dh) > 200 OR length(p_auth) > 100 THEN RAISE EXCEPTION 'Chiavi non valide'; END IF;
  INSERT INTO public.push_dispositivi (user_id, endpoint, p256dh, auth_key, nome, user_agent, piattaforma, last_seen_at)
  VALUES (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_nome, 80), left(p_user_agent, 400), left(p_piattaforma, 40), now())
  ON CONFLICT (endpoint) DO UPDATE SET user_id = auth.uid(), p256dh = EXCLUDED.p256dh, auth_key = EXCLUDED.auth_key,
    nome = coalesce(EXCLUDED.nome, push_dispositivi.nome), user_agent = EXCLUDED.user_agent, piattaforma = EXCLUDED.piattaforma,
    enabled = true, disabled_reason = NULL, failure_count = 0, last_seen_at = now(), updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.register_push_device(text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_push_device(text,text,text,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.format_euro_it(p numeric)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT translate(to_char(round(coalesce(p,0), 2), 'FM999,999,999,990.00'), ',.', '.,') || ' €'
$$;

-- Everyone allowed to read the owner's data receives its events.
CREATE OR REPLACE FUNCTION public.notifica_destinatari(p_owner uuid)
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN p_owner IS NOT NULL AND p_owner = public.agency_owner_id()
      THEN (SELECT array_agg(user_id) FROM public.agency_members WHERE active)
    ELSE ARRAY[p_owner]
  END
$$;

CREATE OR REPLACE FUNCTION public.enqueue_notifica(
  p_event_key text, p_categoria text, p_recipients uuid[], p_titolo text, p_testo text, p_link text,
  p_ordine_id uuid, p_cliente_id uuid, p_azienda_id uuid, p_cliente_nome text, p_azienda_nome text,
  p_importo numeric, p_metadata jsonb, p_push_mode text DEFAULT 'push')
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  INSERT INTO public.notifiche (recipient_id, event_key, categoria, titolo, testo, link, ordine_id, cliente_id, azienda_id,
    cliente_nome, azienda_nome, importo, metadata, push_mode)
  SELECT r, p_event_key, p_categoria, p_titolo, p_testo, p_link, p_ordine_id, p_cliente_id, p_azienda_id,
    p_cliente_nome, p_azienda_nome, p_importo, coalesce(p_metadata, '{}'::jsonb), coalesce(p_push_mode, 'push')
  FROM unnest(p_recipients) AS r
  WHERE r IS NOT NULL
    AND (p_categoria = 'test' OR NOT EXISTS (
      SELECT 1 FROM public.notifiche_preferenze np WHERE np.user_id = r AND np.categoria = p_categoria AND NOT np.enabled))
  ON CONFLICT (event_key, recipient_id) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.enqueue_notifica(text,text,uuid[],text,text,text,uuid,uuid,uuid,text,text,numeric,jsonb,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_notifica(text,text,uuid[],text,text,text,uuid,uuid,uuid,text,text,numeric,jsonb,text) TO service_role;
REVOKE ALL ON FUNCTION public.notifica_destinatari(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notifica_destinatari(uuid) TO service_role;

-- Fan-out to every enabled device of the recipient (or only the device a test targets).
CREATE OR REPLACE FUNCTION public.trg_notifiche_fanout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.push_mode <> 'push' THEN RETURN NEW; END IF;
  INSERT INTO public.notifiche_consegne (notifica_id, dispositivo_id)
  SELECT NEW.id, d.id FROM public.push_dispositivi d
  WHERE d.user_id = NEW.recipient_id AND d.enabled
    AND (NOT (NEW.metadata ? 'solo_dispositivo') OR d.id::text = NEW.metadata->>'solo_dispositivo')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER notifiche_fanout AFTER INSERT ON public.notifiche FOR EACH ROW EXECUTE FUNCTION public.trg_notifiche_fanout();

CREATE OR REPLACE FUNCTION public.ordine_notificabile(p_status text, p_deleted_at timestamptz, p_note text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT p_deleted_at IS NULL
    AND coalesce(p_status, '') NOT IN ('annullato','stand_by','bozza','draft','da_confermare')
    AND coalesce(btrim(p_note), '') <> 'Storico 2025 ricostruito'
$$;

-- New order: once per order, after the header is saved in a confirmed state.
CREATE OR REPLACE FUNCTION public.trg_notifica_nuovo_ordine()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cliente text; v_azienda text;
BEGIN
  IF NOT public.ordine_notificabile(NEW.status::text, NEW.deleted_at, NEW.note) THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND public.ordine_notificabile(OLD.status::text, OLD.deleted_at, OLD.note) THEN RETURN NEW; END IF;
  BEGIN
    SELECT nome INTO v_cliente FROM public.clienti WHERE id = NEW.cliente_id;
    SELECT nome INTO v_azienda FROM public.aziende WHERE id = NEW.azienda_id;
    PERFORM public.enqueue_notifica(
      'nuovo_ordine:' || NEW.id, 'nuovo_ordine', public.notifica_destinatari(NEW.user_id),
      'Inserito ordine · ' || coalesce(v_cliente, 'Cliente N/D') || ' · ' || coalesce(v_azienda, 'Azienda N/D'),
      'È stato inserito un ordine del valore di ' || public.format_euro_it(NEW.totale) || '.',
      '/ordini?ordine=' || NEW.id, NEW.id, NEW.cliente_id, NEW.azienda_id, v_cliente, v_azienda, NEW.totale,
      jsonb_build_object('codice', NEW.codice, 'data_ordine', NEW.data_ordine, 'creato_da', auth.uid()), 'push');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.notifiche_sistema_log (job, status, finished_at, error, details)
    VALUES ('evento_nuovo_ordine', 'errore', now(), SQLERRM, jsonb_build_object('ordine_id', NEW.id));
  END;
  RETURN NEW;
END $$;
CREATE TRIGGER zz_notifica_nuovo_ordine AFTER INSERT OR UPDATE OF status, deleted_at ON public.ordini
  FOR EACH ROW EXECUTE FUNCTION public.trg_notifica_nuovo_ordine();

-- Order sent: only after the email service accepted the message.
CREATE OR REPLACE FUNCTION public.trg_notifica_ordine_inviato()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o record; v_cliente text; v_azienda text;
BEGIN
  IF NEW.status <> 'sent' OR (TG_OP = 'UPDATE' AND OLD.status = 'sent') THEN RETURN NEW; END IF;
  BEGIN
    SELECT id, codice, totale, cliente_id, azienda_id, user_id INTO o FROM public.ordini WHERE id = NEW.ordine_id;
    IF o.id IS NULL THEN RETURN NEW; END IF;
    SELECT nome INTO v_cliente FROM public.clienti WHERE id = o.cliente_id;
    SELECT nome INTO v_azienda FROM public.aziende WHERE id = o.azienda_id;
    PERFORM public.enqueue_notifica(
      'ordine_inviato:' || NEW.id, 'ordine_inviato', public.notifica_destinatari(o.user_id),
      'Ordine inviato · ' || coalesce(v_cliente, 'Cliente N/D') || ' · ' || coalesce(v_azienda, 'Azienda N/D'),
      'L’ordine n. ' || coalesce(o.codice, left(o.id::text, 8)) || ', del valore di ' || public.format_euro_it(o.totale) || ', è stato inviato a ' || coalesce(v_azienda, 'Azienda N/D') || '.',
      '/ordini?ordine=' || o.id, o.id, o.cliente_id, o.azienda_id, v_cliente, v_azienda, o.totale,
      jsonb_build_object('codice', o.codice, 'invio_id', NEW.id, 'sent_at', NEW.sent_at, 'destinatari', NEW.to_addresses,
        'esito', 'accettato_dal_servizio_email', 'consegna', 'non_verificabile'), 'push');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.notifiche_sistema_log (job, status, finished_at, error, details)
    VALUES ('evento_ordine_inviato', 'errore', now(), SQLERRM, jsonb_build_object('invio_id', NEW.id));
  END;
  RETURN NEW;
END $$;
CREATE TRIGGER zz_notifica_ordine_inviato AFTER INSERT OR UPDATE OF status ON public.order_email_sends
  FOR EACH ROW EXECUTE FUNCTION public.trg_notifica_ordine_inviato();

-- Dispatcher queue claim: concurrent runs never pick the same delivery.
CREATE OR REPLACE FUNCTION public.claim_push_consegne(p_limit integer DEFAULT 100)
RETURNS SETOF public.notifiche_consegne LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH c AS (
    SELECT id FROM public.notifiche_consegne
    WHERE (status = 'in_coda' AND next_attempt_at <= now())
       OR (status = 'invio' AND updated_at < now() - interval '5 minutes')
    ORDER BY created_at
    LIMIT greatest(1, least(coalesce(p_limit, 100), 500))
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.notifiche_consegne d SET status = 'invio', attempts = d.attempts + 1, updated_at = now()
  FROM c WHERE d.id = c.id
  RETURNING d.*;
END $$;
REVOKE ALL ON FUNCTION public.claim_push_consegne(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_push_consegne(integer) TO service_role;

-- Admin diagnostics summary.
CREATE OR REPLACE FUNCTION public.notifiche_diagnostica()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Accesso riservato agli admin'; END IF;
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
END $$;
REVOKE ALL ON FUNCTION public.notifiche_diagnostica() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notifiche_diagnostica() TO authenticated;