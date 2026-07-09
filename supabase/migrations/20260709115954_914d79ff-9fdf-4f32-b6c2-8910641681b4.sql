
ALTER TABLE public.scadenziario_fatture
  ADD COLUMN IF NOT EXISTS stato_provvigione TEXT NOT NULL DEFAULT 'da_pagare',
  ADD COLUMN IF NOT EXISTS importo_provvigione_pagata NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metodo_pagamento_provvigione TEXT,
  ADD COLUMN IF NOT EXISTS note_provvigione TEXT;

ALTER TABLE public.scadenziario_fatture
  DROP CONSTRAINT IF EXISTS scadenziario_fatture_stato_provvigione_check;
ALTER TABLE public.scadenziario_fatture
  ADD CONSTRAINT scadenziario_fatture_stato_provvigione_check
  CHECK (stato_provvigione IN ('da_pagare','pagata','parziale','contestazione'));

UPDATE public.scadenziario_fatture
SET stato_provvigione = 'pagata',
    importo_provvigione_pagata = provvigione_calcolata
WHERE provvigione_incassata = true
  AND stato_provvigione = 'da_pagare';
