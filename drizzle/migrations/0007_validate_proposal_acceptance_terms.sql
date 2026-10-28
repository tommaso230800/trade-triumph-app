CREATE OR REPLACE FUNCTION public.validate_proposal_acceptance_terms() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE p public.commercial_proposals; r jsonb; t jsonb;
BEGIN
 SELECT * INTO p FROM public.commercial_proposals WHERE id=NEW.proposal_id;
 IF p.pdf_document_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.documenti d WHERE d.id=p.pdf_document_id AND d.deleted_at IS NULL AND d.proposal_id=p.id AND d.proposal_version=p.version) THEN RAISE EXCEPTION 'PDF corrente non disponibile'; END IF;
 IF NEW.evidence_document_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.documenti d WHERE d.id=NEW.evidence_document_id AND d.deleted_at IS NULL) THEN RAISE EXCEPTION 'Documento di conferma non disponibile'; END IF;
 FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p.content->'rows','[]'::jsonb)) LOOP
  IF NULLIF(r->>'price','') IS NULL OR (r->>'price')::numeric<0 OR COALESCE(r->>'unit','') NOT IN ('pezzo','cartone','strato','pallet') OR COALESCE(r->>'vat_mode','') NOT IN ('esclusa','inclusa') OR NULLIF(r->>'vat_rate','') IS NULL OR (r->>'vat_rate')::numeric<0 OR (r->>'vat_rate')::numeric>100 THEN RAISE EXCEPTION 'Completare prezzo, unità e trattamento IVA per ogni prodotto'; END IF;
 END LOOP;
 FOR t IN SELECT * FROM jsonb_array_elements(COALESCE(p.content->'promotions','[]'::jsonb)) LOOP
  IF NULLIF(btrim(t->>'title'),'') IS NULL OR COALESCE(t->>'unit','') NOT IN ('pezzo','cartone','strato','pallet') OR NULLIF(t->>'buy','') IS NULL OR NULLIF(t->>'gift','') IS NULL OR NULLIF(t->>'minimum','') IS NULL OR (t->>'buy')::numeric<=0 OR (t->>'gift')::numeric<0 OR (t->>'minimum')::numeric<0 THEN RAISE EXCEPTION 'Completare quantità acquistate, omaggi, minimo e unità delle promozioni'; END IF;
  IF (NULLIF(t->>'start','') IS NULL) IS DISTINCT FROM (NULLIF(t->>'end','') IS NULL) THEN RAISE EXCEPTION 'Indicare entrambe le date della promozione'; END IF;
  IF NULLIF(t->>'start','') IS NULL THEN
   IF COALESCE(NULLIF(t->>'periods','')::numeric,0)<=0 OR COALESCE(NULLIF(t->>'months','')::numeric,0)<=0 THEN RAISE EXCEPTION 'Indicare numero e durata dei periodi da concordare'; END IF;
  ELSIF (t->>'end')::date<(t->>'start')::date THEN RAISE EXCEPTION 'Date promozione non valide'; END IF;
 END LOOP;
 FOR t IN SELECT * FROM jsonb_array_elements(COALESCE(p.content->'rewards','[]'::jsonb)) LOOP
  IF NULLIF(t->>'value','') IS NULL OR (t->>'value')::numeric<0 OR COALESCE(t->>'unit','') NOT IN ('percentuale','euro') OR NULLIF(t->>'threshold','') IS NULL OR (t->>'threshold')::numeric<0 THEN RAISE EXCEPTION 'Completare premio, tipo e soglia PFA'; END IF;
 END LOOP;
 RETURN NEW;
END; $$;
CREATE TRIGGER validate_proposal_acceptance_terms BEFORE INSERT ON public.proposal_acceptances FOR EACH ROW EXECUTE FUNCTION public.validate_proposal_acceptance_terms();