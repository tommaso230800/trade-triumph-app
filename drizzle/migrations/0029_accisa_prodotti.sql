-- Accisa per prodotto (€ a bottiglia/pezzo), scelta dall'agente prodotto per prodotto.
-- Il prezzo di listino resta l'imponibile: l'accisa è informazione a parte e
-- NON entra in totale ordine, fatturato o provvigioni. Solo colonne nuove e
-- facoltative: nessun dato esistente modificato, RLS invariata. Idempotente.
ALTER TABLE public.prodotti
  ADD COLUMN IF NOT EXISTS ha_accisa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accisa_pezzo numeric(12,4);

ALTER TABLE public.ordini_righe
  ADD COLUMN IF NOT EXISTS accisa_pezzo numeric(12,4);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prodotti_accisa_pezzo_non_negativa') THEN
    ALTER TABLE public.prodotti
      ADD CONSTRAINT prodotti_accisa_pezzo_non_negativa CHECK (accisa_pezzo IS NULL OR accisa_pezzo >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ordini_righe_accisa_pezzo_non_negativa') THEN
    ALTER TABLE public.ordini_righe
      ADD CONSTRAINT ordini_righe_accisa_pezzo_non_negativa CHECK (accisa_pezzo IS NULL OR accisa_pezzo >= 0);
  END IF;
END $$;
