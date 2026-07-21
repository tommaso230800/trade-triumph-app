-- Fix view cestino: SECURITY INVOKER
DROP VIEW IF EXISTS public.cestino_items;
CREATE VIEW public.cestino_items
WITH (security_invoker = true) AS
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

-- FASE 4B: geolocalizzazione clienti
ALTER TABLE public.clienti
  ADD COLUMN IF NOT EXISTS latitudine numeric,
  ADD COLUMN IF NOT EXISTS longitudine numeric,
  ADD COLUMN IF NOT EXISTS geocoded_at timestamptz;

-- FASE 4C: Pianificazione settimanale
CREATE TABLE IF NOT EXISTS public.pianificazione_settimanale (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  settimana date NOT NULL,
  giorno int NOT NULL CHECK (giorno BETWEEN 1 AND 7),
  ora_prevista time,
  cliente_id uuid REFERENCES public.clienti(id) ON DELETE CASCADE,
  note text,
  stato text NOT NULL DEFAULT 'pianificata',
  ordinamento int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pianificazione_settimanale TO authenticated;
GRANT ALL ON public.pianificazione_settimanale TO service_role;
ALTER TABLE public.pianificazione_settimanale ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pianificazione" ON public.pianificazione_settimanale
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS pianif_sett_idx ON public.pianificazione_settimanale(user_id, settimana);

-- FASE 4D: Comunicazioni log
CREATE TABLE IF NOT EXISTS public.comunicazioni_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cliente_id uuid REFERENCES public.clienti(id) ON DELETE CASCADE,
  canale text NOT NULL,
  template text,
  oggetto text,
  contenuto text,
  destinatario text,
  stato text NOT NULL DEFAULT 'inviato',
  inviata_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comunicazioni_log TO authenticated;
GRANT ALL ON public.comunicazioni_log TO service_role;
ALTER TABLE public.comunicazioni_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own comunicazioni" ON public.comunicazioni_log
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS comunicazioni_cliente_idx ON public.comunicazioni_log(cliente_id, inviata_at DESC);

-- FASE 4E: Follow-up regole
CREATE TABLE IF NOT EXISTS public.follow_up_regole (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  trigger_tipo text NOT NULL, -- 'cliente_senza_ordini','fattura_scaduta','riordino_previsto'
  giorni int NOT NULL DEFAULT 30,
  template text,
  attivo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follow_up_regole TO authenticated;
GRANT ALL ON public.follow_up_regole TO service_role;
ALTER TABLE public.follow_up_regole ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own follow up" ON public.follow_up_regole
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- FASE 6C: Error log per diagnostica
CREATE TABLE IF NOT EXISTS public.error_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  level text NOT NULL DEFAULT 'error',
  source text,
  message text NOT NULL,
  details jsonb,
  route text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.error_log TO authenticated;
GRANT ALL ON public.error_log TO service_role;
ALTER TABLE public.error_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert own errors" ON public.error_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "admin read errors" ON public.error_log FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE INDEX IF NOT EXISTS error_log_created_idx ON public.error_log(created_at DESC);

-- Indici performance
CREATE INDEX IF NOT EXISTS ordini_user_data_idx ON public.ordini(user_id, data_ordine DESC);
CREATE INDEX IF NOT EXISTS scadenziario_stato_idx ON public.scadenziario_fatture(user_id, stato_provvigione, data_scadenza);
CREATE INDEX IF NOT EXISTS clienti_geo_idx ON public.clienti(latitudine, longitudine) WHERE latitudine IS NOT NULL;

-- Trigger updated_at
DROP TRIGGER IF EXISTS pianif_updated ON public.pianificazione_settimanale;
CREATE TRIGGER pianif_updated BEFORE UPDATE ON public.pianificazione_settimanale
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS follow_up_updated ON public.follow_up_regole;
CREATE TRIGGER follow_up_updated BEFORE UPDATE ON public.follow_up_regole
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();