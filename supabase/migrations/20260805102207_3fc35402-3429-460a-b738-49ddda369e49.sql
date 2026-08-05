CREATE TABLE public.email_ingest (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT NOT NULL UNIQUE,
  from_email TEXT,
  from_name TEXT,
  to_email TEXT,
  subject TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  body_text TEXT,
  stato TEXT NOT NULL DEFAULT 'ricevuta',
  errore_testo TEXT,
  ordine_id UUID REFERENCES public.ordini(id) ON DELETE SET NULL,
  match_score NUMERIC,
  match_motivo TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_ingest TO authenticated;
GRANT ALL ON public.email_ingest TO service_role;
ALTER TABLE public.email_ingest ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view email_ingest" ON public.email_ingest FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update email_ingest" ON public.email_ingest FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete email_ingest" ON public.email_ingest FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated can insert email_ingest" ON public.email_ingest FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_email_ingest_stato ON public.email_ingest(stato);
CREATE INDEX idx_email_ingest_received ON public.email_ingest(received_at DESC);

CREATE TRIGGER trg_email_ingest_updated
BEFORE UPDATE ON public.email_ingest
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.email_allegati (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES public.email_ingest(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  content_type TEXT,
  file_size INTEGER,
  storage_path TEXT,
  parsed_data JSONB,
  documento_id UUID REFERENCES public.documenti(id) ON DELETE SET NULL,
  stato TEXT NOT NULL DEFAULT 'da_elaborare',
  errore_testo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_allegati TO authenticated;
GRANT ALL ON public.email_allegati TO service_role;
ALTER TABLE public.email_allegati ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view email_allegati" ON public.email_allegati FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert email_allegati" ON public.email_allegati FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update email_allegati" ON public.email_allegati FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete email_allegati" ON public.email_allegati FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_email_allegati_email ON public.email_allegati(email_id);

CREATE TRIGGER trg_email_allegati_updated
BEFORE UPDATE ON public.email_allegati
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();