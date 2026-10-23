CREATE TABLE public.data_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  fingerprint TEXT NOT NULL,
  tipo TEXT NOT NULL,
  gravita TEXT NOT NULL DEFAULT 'media',
  descrizione TEXT NOT NULL,
  ordine_id UUID,
  ordine_codice TEXT,
  cliente_nome TEXT,
  azienda_nome TEXT,
  periodo TEXT,
  valore_rilevato TEXT,
  valore_atteso TEXT,
  differenza TEXT,
  causa TEXT,
  causa_verificata BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  stato TEXT NOT NULL DEFAULT 'da_verificare',
  controllato_il TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, fingerprint)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_issues TO authenticated;
GRANT ALL ON public.data_issues TO service_role;
ALTER TABLE public.data_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Utente gestisce le proprie segnalazioni"
  ON public.data_issues
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());