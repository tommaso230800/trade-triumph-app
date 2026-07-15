
-- Movimenti provvigione autonomi (bonus, conguagli, ecc.)
CREATE TABLE IF NOT EXISTS public.movimenti_provvigione (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  azienda_id uuid,
  anno integer,
  trimestre integer,
  tipo text NOT NULL DEFAULT 'bonus',
  descrizione text,
  importo numeric NOT NULL DEFAULT 0,
  stato text NOT NULL DEFAULT 'pagata',
  data_pagamento date,
  metodo_pagamento text,
  riferimento_pagamento text,
  note text,
  estratto_id uuid REFERENCES public.estratti_provvigioni(id) ON DELETE SET NULL,
  estratto_riga_id uuid REFERENCES public.estratti_provvigioni_righe(id) ON DELETE SET NULL,
  riconciliazione_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimenti_provvigione TO authenticated;
GRANT ALL ON public.movimenti_provvigione TO service_role;
ALTER TABLE public.movimenti_provvigione ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own movimenti" ON public.movimenti_provvigione FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER movimenti_provvigione_updated_at BEFORE UPDATE ON public.movimenti_provvigione FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS movimenti_provv_user_idx ON public.movimenti_provvigione(user_id);
CREATE INDEX IF NOT EXISTS movimenti_provv_estratto_idx ON public.movimenti_provvigione(estratto_id);
CREATE UNIQUE INDEX IF NOT EXISTS movimenti_provv_riga_uk ON public.movimenti_provvigione(estratto_riga_id) WHERE estratto_riga_id IS NOT NULL;

-- Header di ogni conferma pagamento
CREATE TABLE IF NOT EXISTS public.riconciliazioni_pagamenti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  estratto_id uuid NOT NULL REFERENCES public.estratti_provvigioni(id) ON DELETE CASCADE,
  data_pagamento date NOT NULL,
  importo_totale numeric NOT NULL DEFAULT 0,
  metodo_pagamento text,
  riferimento_pagamento text,
  note text,
  tipo_pagamento text NOT NULL DEFAULT 'completo',
  num_righe integer NOT NULL DEFAULT 0,
  righe_ids jsonb,
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.riconciliazioni_pagamenti TO authenticated;
GRANT ALL ON public.riconciliazioni_pagamenti TO service_role;
ALTER TABLE public.riconciliazioni_pagamenti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own riconciliazioni" ON public.riconciliazioni_pagamenti FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER riconciliazioni_pagamenti_updated_at BEFORE UPDATE ON public.riconciliazioni_pagamenti FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS riconc_pag_estratto_idx ON public.riconciliazioni_pagamenti(estratto_id);

-- Estensione righe estratto
ALTER TABLE public.estratti_provvigioni_righe
  ADD COLUMN IF NOT EXISTS pagata boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pagata_at timestamptz,
  ADD COLUMN IF NOT EXISTS pagata_importo numeric,
  ADD COLUMN IF NOT EXISTS pagamento_target_type text,
  ADD COLUMN IF NOT EXISTS pagamento_target_id uuid,
  ADD COLUMN IF NOT EXISTS riconciliazione_pagamento_id uuid REFERENCES public.riconciliazioni_pagamenti(id) ON DELETE SET NULL;

-- Collegamenti sugli ordini e sullo scadenziario
ALTER TABLE public.ordini
  ADD COLUMN IF NOT EXISTS riferimento_pagamento_provvigione text,
  ADD COLUMN IF NOT EXISTS estratto_riga_id uuid REFERENCES public.estratti_provvigioni_righe(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS riconciliazione_pagamento_id uuid REFERENCES public.riconciliazioni_pagamenti(id) ON DELETE SET NULL;

ALTER TABLE public.scadenziario_fatture
  ADD COLUMN IF NOT EXISTS riferimento_pagamento_provvigione text,
  ADD COLUMN IF NOT EXISTS estratto_riga_id uuid REFERENCES public.estratti_provvigioni_righe(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS riconciliazione_pagamento_id uuid REFERENCES public.riconciliazioni_pagamenti(id) ON DELETE SET NULL;
