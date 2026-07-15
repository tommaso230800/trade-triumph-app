
-- =========================================================
-- ESTRATTI PROVVIGIONI (documenti PDF caricati)
-- =========================================================
CREATE TABLE public.estratti_provvigioni (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  azienda_id uuid REFERENCES public.aziende(id) ON DELETE SET NULL,
  anno integer NOT NULL,
  trimestre integer NOT NULL CHECK (trimestre BETWEEN 1 AND 4),
  tipo_documento text NOT NULL DEFAULT 'principale',
  data_documento date,
  data_pagamento date,
  file_path text,
  file_name text,
  file_hash text,
  totale_dichiarato numeric DEFAULT 0,
  num_righe integer DEFAULT 0,
  stato text NOT NULL DEFAULT 'caricato',
  raw_extraction jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estratti_provvigioni TO authenticated;
GRANT ALL ON public.estratti_provvigioni TO service_role;
ALTER TABLE public.estratti_provvigioni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own estratti select" ON public.estratti_provvigioni FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own estratti insert" ON public.estratti_provvigioni FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own estratti update" ON public.estratti_provvigioni FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own estratti delete" ON public.estratti_provvigioni FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_estratti_user_az_anno ON public.estratti_provvigioni(user_id, azienda_id, anno, trimestre);
CREATE INDEX idx_estratti_hash ON public.estratti_provvigioni(user_id, file_hash);

CREATE TRIGGER trg_estratti_updated
BEFORE UPDATE ON public.estratti_provvigioni
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- RIGHE ESTRATTE
-- =========================================================
CREATE TABLE public.estratti_provvigioni_righe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  estratto_id uuid NOT NULL REFERENCES public.estratti_provvigioni(id) ON DELETE CASCADE,
  ordine_id uuid REFERENCES public.ordini(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES public.clienti(id) ON DELETE SET NULL,
  cliente_nome text,
  cliente_codice text,
  numero_ordine text,
  numero_fattura text,
  data_riga date,
  imponibile numeric,
  aliquota numeric,
  provvigione numeric,
  tipo_movimento text DEFAULT 'ordinaria',
  descrizione text,
  note text,
  match_status text NOT NULL DEFAULT 'da_verificare',
  match_score numeric DEFAULT 0,
  match_candidates jsonb,
  anomalia_stato text,
  anomalia_note text,
  correzioni jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estratti_provvigioni_righe TO authenticated;
GRANT ALL ON public.estratti_provvigioni_righe TO service_role;
ALTER TABLE public.estratti_provvigioni_righe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own righe select" ON public.estratti_provvigioni_righe FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own righe insert" ON public.estratti_provvigioni_righe FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own righe update" ON public.estratti_provvigioni_righe FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own righe delete" ON public.estratti_provvigioni_righe FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_righe_estratto ON public.estratti_provvigioni_righe(estratto_id);
CREATE INDEX idx_righe_ordine ON public.estratti_provvigioni_righe(ordine_id);
CREATE INDEX idx_righe_user_match ON public.estratti_provvigioni_righe(user_id, match_status);

CREATE TRIGGER trg_righe_updated
BEFORE UPDATE ON public.estratti_provvigioni_righe
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- REGOLE CLIENTE (memorizza mappings nome PDF -> cliente CRM)
-- =========================================================
CREATE TABLE public.estratti_provvigioni_regole_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  azienda_id uuid REFERENCES public.aziende(id) ON DELETE CASCADE,
  nome_pdf text NOT NULL,
  codice_pdf text,
  cliente_id uuid REFERENCES public.clienti(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, azienda_id, nome_pdf)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estratti_provvigioni_regole_cliente TO authenticated;
GRANT ALL ON public.estratti_provvigioni_regole_cliente TO service_role;
ALTER TABLE public.estratti_provvigioni_regole_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own regole select" ON public.estratti_provvigioni_regole_cliente FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own regole insert" ON public.estratti_provvigioni_regole_cliente FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own regole update" ON public.estratti_provvigioni_regole_cliente FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own regole delete" ON public.estratti_provvigioni_regole_cliente FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_regole_updated
BEFORE UPDATE ON public.estratti_provvigioni_regole_cliente
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- STORAGE POLICIES per bucket 'estratti-provvigioni'
-- (cartella per utente: {user_id}/{file})
-- =========================================================
CREATE POLICY "user can read own estratti files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'estratti-provvigioni' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "user can upload own estratti files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'estratti-provvigioni' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "user can update own estratti files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'estratti-provvigioni' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "user can delete own estratti files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'estratti-provvigioni' AND (storage.foldername(name))[1] = auth.uid()::text);
