
CREATE TYPE public.documento_tipo AS ENUM (
  'ordine_originale','conferma_ordine','fattura','nota_credito','contratto',
  'listino','accordo_provv','promo','email','estratto_provv','altro'
);

CREATE TYPE public.documento_entita AS ENUM (
  'ordine','cliente','azienda','provvigione','segnalazione','generico'
);

CREATE TABLE public.documenti (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entita public.documento_entita NOT NULL DEFAULT 'generico',
  entita_id UUID,
  tipo public.documento_tipo NOT NULL DEFAULT 'altro',
  nome_file TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  dimensione BIGINT,
  hash_sha256 TEXT,
  tags TEXT[] DEFAULT '{}',
  note TEXT,
  classificazione_ai JSONB,
  suggerimenti_ai JSONB,
  verificato BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documenti_user ON public.documenti(user_id);
CREATE INDEX idx_documenti_entita ON public.documenti(entita, entita_id);
CREATE INDEX idx_documenti_tipo ON public.documenti(tipo);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documenti TO authenticated;
GRANT ALL ON public.documenti TO service_role;

ALTER TABLE public.documenti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own documenti"
  ON public.documenti FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_documenti_updated_at
  BEFORE UPDATE ON public.documenti
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies on documenti bucket (user-scoped by first path segment = user_id)
CREATE POLICY "Users read own documenti files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documenti' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own documenti files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documenti' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own documenti files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documenti' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own documenti files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documenti' AND auth.uid()::text = (storage.foldername(name))[1]);
