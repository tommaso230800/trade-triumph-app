
-- Add competenza vs pagamento tracking to scadenziario_fatture
ALTER TABLE public.scadenziario_fatture
  ADD COLUMN IF NOT EXISTS anno_competenza integer,
  ADD COLUMN IF NOT EXISTS trimestre_competenza integer CHECK (trimestre_competenza BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS anno_pagamento integer,
  ADD COLUMN IF NOT EXISTS trimestre_pagamento integer CHECK (trimestre_pagamento BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS estratto_id uuid REFERENCES public.estratti_provvigioni(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS note_pagamento text;

-- Backfill competenza from data_fattura
UPDATE public.scadenziario_fatture
SET anno_competenza = EXTRACT(YEAR FROM data_fattura)::int,
    trimestre_competenza = EXTRACT(QUARTER FROM data_fattura)::int
WHERE anno_competenza IS NULL AND data_fattura IS NOT NULL;

-- Backfill pagamento from data_incasso_provvigione where paid
UPDATE public.scadenziario_fatture
SET anno_pagamento = EXTRACT(YEAR FROM data_incasso_provvigione)::int,
    trimestre_pagamento = EXTRACT(QUARTER FROM data_incasso_provvigione)::int
WHERE stato_provvigione IN ('pagata','parziale')
  AND data_incasso_provvigione IS NOT NULL
  AND anno_pagamento IS NULL;

-- Backfill estratto_id from estratto_riga_id when possible
UPDATE public.scadenziario_fatture s
SET estratto_id = r.estratto_id
FROM public.estratti_provvigioni_righe r
WHERE s.estratto_riga_id = r.id AND s.estratto_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_scadenziario_competenza
  ON public.scadenziario_fatture(user_id, anno_competenza, trimestre_competenza);
CREATE INDEX IF NOT EXISTS idx_scadenziario_pagamento
  ON public.scadenziario_fatture(user_id, anno_pagamento, trimestre_pagamento);

-- New table: archiviate price anomalies (verified / excluded)
CREATE TABLE IF NOT EXISTS public.price_anomalies_resolved (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  anomaly_key text NOT NULL,
  ordine_id uuid,
  cliente_id uuid,
  prodotto_id uuid,
  azienda_id uuid,
  tipo text NOT NULL,
  azione text NOT NULL CHECK (azione IN ('verificato','escluso')),
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, anomaly_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_anomalies_resolved TO authenticated;
GRANT ALL ON public.price_anomalies_resolved TO service_role;

ALTER TABLE public.price_anomalies_resolved ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own price_anomalies_resolved"
  ON public.price_anomalies_resolved
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_price_anomalies_user ON public.price_anomalies_resolved(user_id, anomaly_key);
