-- Agente email ordini: configurazione (tolleranze e finestra di matching)
CREATE TABLE public.email_agente_config (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tolleranza_imponibile_euro NUMERIC(10,2) NOT NULL DEFAULT 0.05,
  giorni_finestra_matching INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_agente_config TO authenticated;
GRANT ALL ON public.email_agente_config TO service_role;

ALTER TABLE public.email_agente_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own email_agente_config"
  ON public.email_agente_config FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins full access"
  ON public.email_agente_config FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_email_agente_config_updated_at
  BEFORE UPDATE ON public.email_agente_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
