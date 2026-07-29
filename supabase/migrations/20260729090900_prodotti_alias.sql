-- =========================================================================
-- RUBRICA CORRISPONDENZE PRODOTTI (fornitore <-> CRM)
-- Stesso modello di clienti_alias: quando il motore di verifica conferma non
-- riesce ad abbinare un prodotto per codice/nome ma l'utente conferma
-- manualmente che si tratta dello stesso prodotto (dedotto da quantità e
-- imponibile coincidenti), l'abbinamento viene salvato qui così le conferme
-- FUTURE della stessa azienda fornitrice matchano quel prodotto in automatico.
-- =========================================================================
CREATE TABLE public.prodotti_alias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prodotto_id UUID NOT NULL REFERENCES public.prodotti(id) ON DELETE CASCADE,
  azienda_id UUID NOT NULL REFERENCES public.aziende(id) ON DELETE CASCADE,
  codice_fornitore TEXT,
  descrizione_fornitore TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto', 'import')),
  match_count INTEGER NOT NULL DEFAULT 0,
  ultimo_match TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (azienda_id, prodotto_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prodotti_alias TO authenticated;
GRANT ALL ON public.prodotti_alias TO service_role;
ALTER TABLE public.prodotti_alias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_prodotti_alias" ON public.prodotti_alias FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_prodotti_alias_prodotto ON public.prodotti_alias(prodotto_id);
CREATE INDEX idx_prodotti_alias_azienda ON public.prodotti_alias(azienda_id);
CREATE INDEX idx_prodotti_alias_codice ON public.prodotti_alias(azienda_id, codice_fornitore) WHERE codice_fornitore IS NOT NULL;
CREATE TRIGGER trg_prodotti_alias_updated BEFORE UPDATE ON public.prodotti_alias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
