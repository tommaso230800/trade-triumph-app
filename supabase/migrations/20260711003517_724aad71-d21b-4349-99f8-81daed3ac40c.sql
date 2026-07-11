
-- Table: ai_attivita (visite/attività registrate dall'Assistente AI)
CREATE TABLE public.ai_attivita (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cliente_id uuid REFERENCES public.clienti(id) ON DELETE SET NULL,
  azienda_id uuid REFERENCES public.aziende(id) ON DELETE SET NULL,
  data_attivita timestamptz NOT NULL DEFAULT now(),
  tipo_attivita text NOT NULL DEFAULT 'altro',
  riepilogo text NOT NULL,
  priorita text NOT NULL DEFAULT 'media',
  stato text NOT NULL DEFAULT 'da_fare',
  prossima_azione text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_attivita TO authenticated;
GRANT ALL ON public.ai_attivita TO service_role;
ALTER TABLE public.ai_attivita ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ai_attivita" ON public.ai_attivita FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_ai_attivita_updated BEFORE UPDATE ON public.ai_attivita FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table: ai_promemoria (promemoria generati dall'Assistente AI)
CREATE TABLE public.ai_promemoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cliente_id uuid REFERENCES public.clienti(id) ON DELETE SET NULL,
  azienda_id uuid REFERENCES public.aziende(id) ON DELETE SET NULL,
  attivita_id uuid REFERENCES public.ai_attivita(id) ON DELETE SET NULL,
  titolo text NOT NULL,
  descrizione text,
  data_promemoria timestamptz NOT NULL,
  priorita text NOT NULL DEFAULT 'media',
  stato text NOT NULL DEFAULT 'da_fare',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_promemoria TO authenticated;
GRANT ALL ON public.ai_promemoria TO service_role;
ALTER TABLE public.ai_promemoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ai_promemoria" ON public.ai_promemoria FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_ai_promemoria_updated BEFORE UPDATE ON public.ai_promemoria FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table: ai_activity_log
CREATE TABLE public.ai_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  input_originale text NOT NULL,
  risultato_analisi jsonb,
  azioni_proposte jsonb,
  azioni_confermate jsonb,
  stato text NOT NULL DEFAULT 'analizzato',
  messaggio_errore text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_activity_log TO authenticated;
GRANT ALL ON public.ai_activity_log TO service_role;
ALTER TABLE public.ai_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ai_activity_log" ON public.ai_activity_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_ai_attivita_user_data ON public.ai_attivita(user_id, data_attivita DESC);
CREATE INDEX idx_ai_promemoria_user_data ON public.ai_promemoria(user_id, data_promemoria);
CREATE INDEX idx_ai_activity_log_user ON public.ai_activity_log(user_id, created_at DESC);
