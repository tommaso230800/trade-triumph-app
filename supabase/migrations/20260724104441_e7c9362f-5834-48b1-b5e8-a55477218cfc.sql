
ALTER TABLE public.ordini
  ADD COLUMN IF NOT EXISTS trimestre_pagamento integer,
  ADD COLUMN IF NOT EXISTS anno_pagamento integer;

CREATE INDEX IF NOT EXISTS idx_ordini_trimestre_pagamento ON public.ordini(anno_pagamento, trimestre_pagamento);
CREATE INDEX IF NOT EXISTS idx_scadenziario_trimestre_pagamento ON public.scadenziario_fatture(anno_pagamento, trimestre_pagamento);
