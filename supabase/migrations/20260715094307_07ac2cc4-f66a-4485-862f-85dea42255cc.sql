ALTER TABLE public.ordini
  ADD COLUMN IF NOT EXISTS stato_provvigione TEXT NOT NULL DEFAULT 'da_pagare',
  ADD COLUMN IF NOT EXISTS importo_provvigione_pagata NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_incasso_provvigione DATE,
  ADD COLUMN IF NOT EXISTS metodo_pagamento_provvigione TEXT,
  ADD COLUMN IF NOT EXISTS note_provvigione TEXT;

ALTER TABLE public.ordini
  DROP CONSTRAINT IF EXISTS ordini_stato_provvigione_check;

ALTER TABLE public.ordini
  ADD CONSTRAINT ordini_stato_provvigione_check
  CHECK (stato_provvigione IN ('da_pagare','pagata','parziale','contestazione','scaduta'));

UPDATE public.ordini
SET stato_provvigione = 'pagata',
    importo_provvigione_pagata = COALESCE(importo_provvigione_pagata, 0)
WHERE provvigione_pagata = true
  AND stato_provvigione = 'da_pagare';