-- Aggiungi colonne alla tabella clienti per gestire budget promo e scoring
ALTER TABLE public.clienti
ADD COLUMN IF NOT EXISTS tipologia_cliente text DEFAULT 'bar',
ADD COLUMN IF NOT EXISTS fatturato_target numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS budget_promo_percentuale numeric DEFAULT 3,
ADD COLUMN IF NOT EXISTS sconto_max_policy numeric DEFAULT 15,
ADD COLUMN IF NOT EXISTS n_promo_concesse integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS costo_promo_totale numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS condizioni_attive text[] DEFAULT '{}';

-- Crea tabella per tracciare le singole promo concesse ai clienti
CREATE TABLE IF NOT EXISTS public.promo_clienti (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  cliente_id uuid NOT NULL REFERENCES public.clienti(id) ON DELETE CASCADE,
  data_concessione date NOT NULL DEFAULT CURRENT_DATE,
  tipo_promo text NOT NULL, -- 'sconto_percentuale', 'sconto_euro', 'omaggio', 'materiale', 'dilazione'
  valore numeric NOT NULL DEFAULT 0,
  descrizione text,
  costo_stimato numeric DEFAULT 0,
  quantita_cartoni integer DEFAULT 0,
  quantita_pezzi integer DEFAULT 0,
  prodotto_nome text,
  contropartita text, -- cosa hai ottenuto in cambio
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promo_clienti ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own promo_clienti" ON public.promo_clienti
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own promo_clienti" ON public.promo_clienti
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own promo_clienti" ON public.promo_clienti
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own promo_clienti" ON public.promo_clienti
FOR DELETE USING (auth.uid() = user_id);