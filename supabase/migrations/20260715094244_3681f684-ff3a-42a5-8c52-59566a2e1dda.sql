ALTER TABLE public.scadenziario_fatture
  DROP CONSTRAINT IF EXISTS scadenziario_fatture_stato_provvigione_check;

ALTER TABLE public.scadenziario_fatture
  ADD CONSTRAINT scadenziario_fatture_stato_provvigione_check
  CHECK (stato_provvigione IN ('da_pagare','pagata','parziale','contestazione','scaduta'));

UPDATE public.scadenziario_fatture
SET stato_provvigione = 'pagata',
    importo_provvigione_pagata = provvigione_calcolata
WHERE provvigione_incassata = true
  AND stato_provvigione = 'da_pagare';