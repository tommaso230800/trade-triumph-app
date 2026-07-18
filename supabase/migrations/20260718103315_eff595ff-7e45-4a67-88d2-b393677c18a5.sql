ALTER TABLE public.estratti_provvigioni_righe 
  ADD COLUMN IF NOT EXISTS stato_verifica text,
  ADD COLUMN IF NOT EXISTS provvigione_attesa numeric,
  ADD COLUMN IF NOT EXISTS cross_estratto_candidates jsonb;

CREATE INDEX IF NOT EXISTS idx_epr_stato_verifica ON public.estratti_provvigioni_righe(stato_verifica);
CREATE INDEX IF NOT EXISTS idx_epr_crm_only ON public.estratti_provvigioni_righe(crm_only);