ALTER TABLE public.documenti
  ADD COLUMN IF NOT EXISTS titolo text,
  ADD COLUMN IF NOT EXISTS riepilogo text,
  ADD COLUMN IF NOT EXISTS data_documento date,
  ADD COLUMN IF NOT EXISTS numero_documento text,
  ADD COLUMN IF NOT EXISTS keywords text[],
  ADD COLUMN IF NOT EXISTS testo_estratto text,
  ADD COLUMN IF NOT EXISTS stato_elaborazione text NOT NULL DEFAULT 'archiviato',
  ADD COLUMN IF NOT EXISTS errore_elaborazione text,
  ADD COLUMN IF NOT EXISTS versione_di uuid REFERENCES public.documenti(id);

ALTER TABLE public.documenti
  ADD CONSTRAINT documenti_stato_elaborazione_check
  CHECK (stato_elaborazione IN ('in_elaborazione','archiviato','da_verificare','errore'));

CREATE TABLE public.aziende_alias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  azienda_id uuid not null references public.aziende(id) on delete cascade,
  denominazione_alternativa text not null,
  partita_iva text,
  source text not null default 'manuale',
  match_count integer not null default 0,
  ultimo_match timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (azienda_id, denominazione_alternativa)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aziende_alias TO authenticated;
GRANT ALL ON public.aziende_alias TO service_role;
ALTER TABLE public.aziende_alias ENABLE ROW LEVEL SECURITY;
CREATE POLICY aziende_alias_owner ON public.aziende_alias FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.documenti_aziende (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references public.documenti(id) on delete cascade,
  azienda_id uuid not null references public.aziende(id) on delete cascade,
  ruolo text not null default 'menzionata',
  created_at timestamptz not null default now(),
  unique (documento_id, azienda_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documenti_aziende TO authenticated;
GRANT ALL ON public.documenti_aziende TO service_role;
ALTER TABLE public.documenti_aziende ENABLE ROW LEVEL SECURITY;
CREATE POLICY documenti_aziende_owner ON public.documenti_aziende FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.documenti d WHERE d.id = documento_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.documenti d WHERE d.id = documento_id AND d.user_id = auth.uid()));

CREATE INDEX documenti_company_category_idx ON public.documenti (company_id, category);
CREATE INDEX documenti_stato_idx ON public.documenti (stato_elaborazione);