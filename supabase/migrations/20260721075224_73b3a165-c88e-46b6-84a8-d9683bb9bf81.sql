-- Fase 2D: campi omaggio su promo e contratti
ALTER TABLE public.promo_clienti
  ADD COLUMN IF NOT EXISTS qta_base numeric,
  ADD COLUMN IF NOT EXISTS qta_omaggio numeric,
  ADD COLUMN IF NOT EXISTS cumulabile_arretrati boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS unita_omaggio text NOT NULL DEFAULT 'cartoni';

ALTER TABLE public.contratti_clienti
  ADD COLUMN IF NOT EXISTS qta_base numeric,
  ADD COLUMN IF NOT EXISTS qta_omaggio numeric,
  ADD COLUMN IF NOT EXISTS cumulabile_arretrati boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS unita_omaggio text NOT NULL DEFAULT 'cartoni';

-- Fase 2E: campi consegna su ordini
ALTER TABLE public.ordini
  ADD COLUMN IF NOT EXISTS data_consegna_prevista date,
  ADD COLUMN IF NOT EXISTS data_consegna_effettiva date,
  ADD COLUMN IF NOT EXISTS stato_consegna text NOT NULL DEFAULT 'da_consegnare',
  ADD COLUMN IF NOT EXISTS problema_consegna text,
  ADD COLUMN IF NOT EXISTS note_consegna text,
  ADD COLUMN IF NOT EXISTS destinazione_consegna text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ordini_stato_consegna_check') THEN
    ALTER TABLE public.ordini ADD CONSTRAINT ordini_stato_consegna_check
    CHECK (stato_consegna IN ('da_consegnare','in_consegna','consegnata','parziale','problema'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ordini_problema_consegna_check') THEN
    ALTER TABLE public.ordini ADD CONSTRAINT ordini_problema_consegna_check
    CHECK (problema_consegna IS NULL OR problema_consegna IN ('ritardo','rottura_stock','danneggiato','indirizzo_errato','rifiutato','altro'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ordini_stato_consegna ON public.ordini(stato_consegna);
CREATE INDEX IF NOT EXISTS idx_ordini_data_consegna_prev ON public.ordini(data_consegna_prevista);

-- Fase 2D: tracking omaggi erogati
CREATE TABLE IF NOT EXISTS public.omaggi_erogati (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  cliente_id uuid NOT NULL,
  prodotto_id uuid NOT NULL,
  promo_id uuid,
  contratto_id uuid,
  ordine_id uuid,
  ordine_riga_id uuid,
  quantita numeric NOT NULL DEFAULT 0,
  unita text NOT NULL DEFAULT 'cartoni',
  data_erogazione date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.omaggi_erogati TO authenticated;
GRANT ALL ON public.omaggi_erogati TO service_role;

ALTER TABLE public.omaggi_erogati ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own omaggi_erogati" ON public.omaggi_erogati
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_omaggi_erogati_updated_at
  BEFORE UPDATE ON public.omaggi_erogati
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_omaggi_cliente_prod ON public.omaggi_erogati(cliente_id, prodotto_id);
CREATE INDEX IF NOT EXISTS idx_omaggi_promo ON public.omaggi_erogati(promo_id);
CREATE INDEX IF NOT EXISTS idx_omaggi_contratto ON public.omaggi_erogati(contratto_id);