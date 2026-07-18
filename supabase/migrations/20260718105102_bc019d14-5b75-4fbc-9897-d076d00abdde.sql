
-- =========================================================================
-- 1) MATRICE PROVVIGIONALE
-- =========================================================================
CREATE TABLE public.provvigioni_condizioni (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  azienda_id UUID NOT NULL REFERENCES public.aziende(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clienti(id) ON DELETE CASCADE,
  prodotto_id UUID REFERENCES public.prodotti(id) ON DELETE CASCADE,
  categoria TEXT,
  percentuale NUMERIC(6,3) NOT NULL DEFAULT 0,
  calcolo_su TEXT NOT NULL DEFAULT 'netto' CHECK (calcolo_su IN ('lordo','netto','imponibile_fattura')),
  applica_su_resi BOOLEAN NOT NULL DEFAULT false,
  arrotondamento TEXT NOT NULL DEFAULT 'nessuno' CHECK (arrotondamento IN ('nessuno','2dec','intero')),
  valido_da DATE NOT NULL,
  valido_a DATE,
  priorita INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provvigioni_condizioni TO authenticated;
GRANT ALL ON public.provvigioni_condizioni TO service_role;
ALTER TABLE public.provvigioni_condizioni ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_condizioni" ON public.provvigioni_condizioni FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_cond_azienda ON public.provvigioni_condizioni(azienda_id, valido_da, valido_a);
CREATE INDEX idx_cond_cliente ON public.provvigioni_condizioni(cliente_id) WHERE cliente_id IS NOT NULL;
CREATE INDEX idx_cond_prodotto ON public.provvigioni_condizioni(prodotto_id) WHERE prodotto_id IS NOT NULL;
CREATE TRIGGER trg_cond_updated BEFORE UPDATE ON public.provvigioni_condizioni
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 2) PREMI / BONUS
-- =========================================================================
CREATE TABLE public.provvigioni_premi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  azienda_id UUID NOT NULL REFERENCES public.aziende(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('trimestrale','annuale','bonus','conguaglio','altro')),
  modalita TEXT NOT NULL DEFAULT 'importo_fisso' CHECK (modalita IN ('importo_fisso','percentuale_fatturato','scaglioni')),
  valore NUMERIC(14,2),
  percentuale NUMERIC(6,3),
  scaglioni JSONB,
  periodo_da DATE,
  periodo_a DATE,
  condizioni JSONB,
  attivo BOOLEAN NOT NULL DEFAULT true,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provvigioni_premi TO authenticated;
GRANT ALL ON public.provvigioni_premi TO service_role;
ALTER TABLE public.provvigioni_premi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_premi" ON public.provvigioni_premi FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_premi_updated BEFORE UPDATE ON public.provvigioni_premi
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 3) RUBRICA CORRISPONDENZE CLIENTI
-- =========================================================================
CREATE TABLE public.clienti_alias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.clienti(id) ON DELETE CASCADE,
  azienda_id UUID REFERENCES public.aziende(id) ON DELETE CASCADE,
  codice_cliente_aziendale TEXT,
  denominazione_alternativa TEXT,
  partita_iva TEXT,
  codice_fiscale TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','auto','import')),
  match_count INTEGER NOT NULL DEFAULT 0,
  ultimo_match TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clienti_alias TO authenticated;
GRANT ALL ON public.clienti_alias TO service_role;
ALTER TABLE public.clienti_alias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_alias" ON public.clienti_alias FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_alias_cliente ON public.clienti_alias(cliente_id);
CREATE INDEX idx_alias_azienda ON public.clienti_alias(azienda_id);
CREATE INDEX idx_alias_piva ON public.clienti_alias(partita_iva) WHERE partita_iva IS NOT NULL;
CREATE INDEX idx_alias_codice ON public.clienti_alias(codice_cliente_aziendale) WHERE codice_cliente_aziendale IS NOT NULL;
CREATE TRIGGER trg_alias_updated BEFORE UPDATE ON public.clienti_alias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 4) TRE STATI DI PROVVIGIONE SUGLI ORDINI
-- =========================================================================
ALTER TABLE public.ordini
  ADD COLUMN IF NOT EXISTS provvigione_prevista NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS provvigione_riconosciuta NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS aliquota_prevista NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS condizione_applicata_id UUID REFERENCES public.provvigioni_condizioni(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provvigione_stato TEXT NOT NULL DEFAULT 'prevista'
    CHECK (provvigione_stato IN ('prevista','riconosciuta_parziale','riconosciuta','pagata_parziale','pagata','contestata','non_dovuta'));
CREATE INDEX IF NOT EXISTS idx_ordini_prov_stato ON public.ordini(provvigione_stato);

-- =========================================================================
-- 5) FUNZIONE: trova la condizione più specifica valida alla data
-- =========================================================================
CREATE OR REPLACE FUNCTION public.trova_condizione_provvigione(
  p_user_id UUID, p_azienda_id UUID, p_cliente_id UUID,
  p_prodotto_id UUID, p_categoria TEXT, p_data DATE
) RETURNS public.provvigioni_condizioni
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.provvigioni_condizioni;
BEGIN
  SELECT * INTO v_row FROM public.provvigioni_condizioni c
  WHERE c.user_id = p_user_id
    AND c.azienda_id = p_azienda_id
    AND c.valido_da <= p_data
    AND (c.valido_a IS NULL OR c.valido_a >= p_data)
    AND (
      (c.cliente_id = p_cliente_id AND c.prodotto_id = p_prodotto_id) OR
      (c.cliente_id = p_cliente_id AND c.categoria IS NOT DISTINCT FROM p_categoria AND c.prodotto_id IS NULL) OR
      (c.cliente_id = p_cliente_id AND c.prodotto_id IS NULL AND c.categoria IS NULL) OR
      (c.cliente_id IS NULL AND c.prodotto_id = p_prodotto_id) OR
      (c.cliente_id IS NULL AND c.prodotto_id IS NULL AND c.categoria IS NOT DISTINCT FROM p_categoria AND p_categoria IS NOT NULL) OR
      (c.cliente_id IS NULL AND c.prodotto_id IS NULL AND c.categoria IS NULL)
    )
  ORDER BY (CASE
      WHEN c.cliente_id IS NOT NULL AND c.prodotto_id IS NOT NULL THEN 100
      WHEN c.cliente_id IS NOT NULL AND c.categoria IS NOT NULL THEN 80
      WHEN c.cliente_id IS NOT NULL THEN 60
      WHEN c.prodotto_id IS NOT NULL THEN 40
      WHEN c.categoria IS NOT NULL THEN 20
      ELSE 0 END) DESC,
    c.priorita DESC, c.valido_da DESC
  LIMIT 1;
  RETURN v_row;
END;
$$;

-- =========================================================================
-- 6) FUNZIONE: calcola provvigione prevista di un ordine
-- =========================================================================
CREATE OR REPLACE FUNCTION public.calcola_provvigione_prevista(p_ordine_id UUID)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ord public.ordini;
  v_totale_prov NUMERIC := 0;
  v_totale_imponibile NUMERIC := 0;
  v_dominant_cond UUID;
  v_dominant_amount NUMERIC := 0;
  v_data DATE;
  r RECORD;
  v_cond public.provvigioni_condizioni;
  v_imponibile_riga NUMERIC;
  v_prov_riga NUMERIC;
BEGIN
  SELECT * INTO v_ord FROM public.ordini WHERE id = p_ordine_id;
  IF v_ord.id IS NULL OR v_ord.azienda_id IS NULL THEN RETURN NULL; END IF;
  v_data := COALESCE(v_ord.data_conferma, v_ord.data_ordine, CURRENT_DATE);

  FOR r IN
    SELECT rg.* FROM public.ordini_righe rg
    WHERE rg.ordine_id = p_ordine_id AND COALESCE(rg.is_omaggio,false) = false
  LOOP
    v_cond := public.trova_condizione_provvigione(
      v_ord.user_id, v_ord.azienda_id, v_ord.cliente_id,
      r.prodotto_id, NULL, v_data
    );
    v_imponibile_riga := COALESCE(r.quantita_pezzi,0) * COALESCE(r.prezzo_unitario,0)
      * (1 - COALESCE(r.sc1,0)/100.0) * (1 - COALESCE(r.sc2,0)/100.0) * (1 - COALESCE(r.sc3,0)/100.0);

    IF v_cond.id IS NOT NULL THEN
      IF v_cond.calcolo_su = 'lordo' THEN
        v_prov_riga := COALESCE(r.quantita_pezzi,0) * COALESCE(r.prezzo_unitario,0) * v_cond.percentuale / 100.0;
      ELSE
        v_prov_riga := v_imponibile_riga * v_cond.percentuale / 100.0;
      END IF;
      IF v_cond.arrotondamento = '2dec' THEN v_prov_riga := ROUND(v_prov_riga::numeric, 2);
      ELSIF v_cond.arrotondamento = 'intero' THEN v_prov_riga := ROUND(v_prov_riga::numeric, 0); END IF;
      v_totale_prov := v_totale_prov + v_prov_riga;
      IF v_prov_riga > v_dominant_amount THEN
        v_dominant_amount := v_prov_riga; v_dominant_cond := v_cond.id;
      END IF;
    END IF;
    v_totale_imponibile := v_totale_imponibile + v_imponibile_riga;
  END LOOP;

  UPDATE public.ordini SET
    provvigione_prevista = v_totale_prov,
    aliquota_prevista = CASE WHEN v_totale_imponibile > 0
      THEN ROUND((v_totale_prov / v_totale_imponibile * 100)::numeric, 3) ELSE NULL END,
    condizione_applicata_id = v_dominant_cond
  WHERE id = p_ordine_id;
  RETURN v_totale_prov;
END;
$$;

-- =========================================================================
-- 7) TRIGGER di ricalcolo
-- =========================================================================
CREATE OR REPLACE FUNCTION public.trg_ricalcola_provvigione_riga()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  v_id := COALESCE(NEW.ordine_id, OLD.ordine_id);
  PERFORM public.calcola_provvigione_prevista(v_id);
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $$;
DROP TRIGGER IF EXISTS trg_righe_ricalcola_prov ON public.ordini_righe;
CREATE TRIGGER trg_righe_ricalcola_prov
  AFTER INSERT OR UPDATE OR DELETE ON public.ordini_righe
  FOR EACH ROW EXECUTE FUNCTION public.trg_ricalcola_provvigione_riga();

CREATE OR REPLACE FUNCTION public.trg_ricalcola_provvigione_ordine()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.azienda_id IS DISTINCT FROM OLD.azienda_id)
     OR (NEW.cliente_id IS DISTINCT FROM OLD.cliente_id)
     OR (NEW.data_ordine IS DISTINCT FROM OLD.data_ordine)
     OR (NEW.data_conferma IS DISTINCT FROM OLD.data_conferma) THEN
    PERFORM public.calcola_provvigione_prevista(NEW.id);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_ordine_ricalcola_prov ON public.ordini;
CREATE TRIGGER trg_ordine_ricalcola_prov
  AFTER UPDATE ON public.ordini
  FOR EACH ROW EXECUTE FUNCTION public.trg_ricalcola_provvigione_ordine();

-- =========================================================================
-- 8) BACKFILL
-- =========================================================================
INSERT INTO public.provvigioni_condizioni
  (user_id, azienda_id, percentuale, valido_da, note)
SELECT a.user_id, a.id, COALESCE(a.provvigione_percentuale, 0), DATE '2000-01-01',
       'Condizione base generata automaticamente dalla percentuale azienda'
FROM public.aziende a
WHERE NOT EXISTS (
  SELECT 1 FROM public.provvigioni_condizioni c
  WHERE c.azienda_id = a.id AND c.cliente_id IS NULL AND c.prodotto_id IS NULL AND c.categoria IS NULL
);

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.ordini WHERE azienda_id IS NOT NULL LOOP
    PERFORM public.calcola_provvigione_prevista(r.id);
  END LOOP;
END $$;

UPDATE public.ordini SET provvigione_stato =
  CASE
    WHEN stato_provvigione = 'pagata' THEN 'pagata'
    WHEN stato_provvigione = 'parziale' THEN 'pagata_parziale'
    WHEN stato_provvigione = 'contestazione' THEN 'contestata'
    ELSE 'prevista'
  END
WHERE provvigione_stato = 'prevista';
