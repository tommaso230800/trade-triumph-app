
ALTER TABLE public.estratti_provvigioni_righe
  ADD COLUMN IF NOT EXISTS esito_economico text,
  ADD COLUMN IF NOT EXISTS azione_consigliata text,
  ADD COLUMN IF NOT EXISTS motivo text,
  ADD COLUMN IF NOT EXISTS score_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS crm_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verificata boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verificata_at timestamptz,
  ADD COLUMN IF NOT EXISTS verificata_by uuid,
  ADD COLUMN IF NOT EXISTS verificata_note text,
  ADD COLUMN IF NOT EXISTS ordine_snapshot jsonb;

CREATE INDEX IF NOT EXISTS estratti_righe_estratto_idx ON public.estratti_provvigioni_righe(estratto_id);
CREATE INDEX IF NOT EXISTS estratti_righe_verificata_idx ON public.estratti_provvigioni_righe(verificata);
