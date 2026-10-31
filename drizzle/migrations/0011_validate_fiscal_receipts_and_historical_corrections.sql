CREATE OR REPLACE FUNCTION public.fiscal_receipt_validate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE j jsonb; t text; k text; base numeric; total numeric; BEGIN
 t:=CASE NEW.source WHEN 'ordine' THEN 'ordini' WHEN 'fattura' THEN 'scadenziario_fatture' WHEN 'movimento' THEN 'movimenti_provvigione' END;
 EXECUTE format('SELECT to_jsonb(x) FROM public.%I x WHERE id=$1 AND user_id=$2',t) INTO j USING NEW.source_id,NEW.user_id;
 IF j IS NULL THEN RAISE EXCEPTION 'Provvigione non accessibile'; END IF;
 FOREACH k IN ARRAY ARRAY['gross_amount','enasarco_withheld','withholding','vat','stamp','other_deductions','bank_amount'] LOOP IF (to_jsonb(NEW)->>k)::numeric<0 OR (to_jsonb(NEW)->>k) IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Importi incasso non validi'; END IF; END LOOP;
 IF NEW.enasarco_withheld IS NOT NULL AND NEW.enasarco_withheld>NEW.gross_amount THEN RAISE EXCEPTION 'Enasarco superiore al lordo'; END IF;
 IF NEW.verification='verificato' AND NEW.document_id IS NULL THEN RAISE EXCEPTION 'Collega il documento che verifica il pagamento'; END IF;
 IF NEW.bank_amount IS NOT NULL AND NEW.enasarco_withheld IS NOT NULL AND NEW.withholding IS NOT NULL AND NEW.vat IS NOT NULL AND NEW.stamp IS NOT NULL AND NEW.other_deductions IS NOT NULL AND abs(NEW.bank_amount-(NEW.gross_amount-NEW.enasarco_withheld-NEW.withholding+NEW.vat+NEW.stamp-NEW.other_deductions))>0.02 THEN RAISE EXCEPTION 'Lordo, trattenute e accredito non si riconciliano'; END IF;
 base:=COALESCE(NULLIF(j->'fiscal_data'->>'gross','')::numeric,NULLIF(j->>'provvigione_riconosciuta','')::numeric,CASE NEW.source WHEN 'fattura' THEN (j->>'provvigione_calcolata')::numeric WHEN 'movimento' THEN (j->>'importo')::numeric ELSE NULL END);
 SELECT COALESCE(sum(gross_amount),0)+NEW.gross_amount INTO total FROM public.commission_receipts WHERE user_id=NEW.user_id AND source=NEW.source AND source_id=NEW.source_id AND id<>NEW.id;
 IF base IS NOT NULL AND base>=0 AND total>base+0.02 THEN RAISE EXCEPTION 'Incassi superiori alla provvigione documentata: correggi il lordo prima di procedere'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER fiscal_receipt_validate BEFORE INSERT OR UPDATE ON public.commission_receipts FOR EACH ROW EXECUTE FUNCTION public.fiscal_receipt_validate();
CREATE OR REPLACE FUNCTION public.fiscal_source_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d date; m public.fiscal_mandates; j jsonb; n integer; BEGIN
 j:=to_jsonb(NEW); d:=COALESCE(NULLIF(NEW.fiscal_data->>'competence_from','')::date,NULLIF(j->>'data_ordine','')::date,NULLIF(j->>'data_fattura','')::date);
 IF TG_OP='INSERT' AND NEW.fiscal_subject_id IS NULL AND d IS NOT NULL THEN SELECT count(*) INTO n FROM public.fiscal_mandates WHERE company_id=NEW.azienda_id AND user_id=NEW.user_id AND valid_from<=d AND (valid_until IS NULL OR valid_until>=d); IF n=1 THEN SELECT * INTO m FROM public.fiscal_mandates WHERE company_id=NEW.azienda_id AND user_id=NEW.user_id AND valid_from<=d AND (valid_until IS NULL OR valid_until>=d); NEW.fiscal_subject_id:=m.subject_id; NEW.fiscal_mandate_id:=m.id; END IF; END IF;
 IF NEW.fiscal_subject_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.fiscal_subjects WHERE id=NEW.fiscal_subject_id AND user_id=NEW.user_id) THEN RAISE EXCEPTION 'Intestatario non accessibile'; END IF;
 IF NEW.fiscal_mandate_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.fiscal_mandates WHERE id=NEW.fiscal_mandate_id AND user_id=NEW.user_id AND company_id=NEW.azienda_id AND subject_id=NEW.fiscal_subject_id AND d IS NOT NULL AND valid_from<=d AND (valid_until IS NULL OR valid_until>=d)) THEN RAISE EXCEPTION 'Mandato non coerente con intestatario, azienda o competenza'; END IF;
 IF NEW.fiscal_subject_id IS NOT NULL AND NEW.azienda_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.aziende WHERE id=NEW.azienda_id AND user_id=NEW.user_id) THEN RAISE EXCEPTION 'Azienda non accessibile'; END IF;
 IF NULLIF(NEW.fiscal_data->>'gross','') IS NOT NULL AND ((NEW.fiscal_data->>'gross')::numeric<0 OR NEW.fiscal_data->>'gross' IN ('NaN','Infinity','-Infinity')) THEN RAISE EXCEPTION 'Lordo non valido'; END IF;
 IF NULLIF(NEW.fiscal_data->>'competence_until','') IS NOT NULL AND (NEW.fiscal_data->>'competence_until')::date<d THEN RAISE EXCEPTION 'Periodo di competenza non valido'; END IF;
 IF NULLIF(NEW.fiscal_data->>'document_id','') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.documenti WHERE id=(NEW.fiscal_data->>'document_id')::uuid AND user_id=NEW.user_id) THEN RAISE EXCEPTION 'Documento non accessibile'; END IF;
 RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.correct_fiscal_attributions(p_mandate_id uuid,p_items jsonb) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m public.fiscal_mandates; item jsonb; t text; j jsonb; d date; n integer:=0; BEGIN
 SELECT * INTO m FROM public.fiscal_mandates WHERE id=p_mandate_id AND user_id=auth.uid(); IF auth.uid() IS NULL OR m.id IS NULL THEN RAISE EXCEPTION 'Mandato non accessibile'; END IF;
 FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
 t:=CASE item->>'source' WHEN 'ordine' THEN 'ordini' WHEN 'fattura' THEN 'scadenziario_fatture' WHEN 'movimento' THEN 'movimenti_provvigione' END; IF t IS NULL THEN RAISE EXCEPTION 'Fonte non valida'; END IF;
 EXECUTE format('SELECT to_jsonb(x) FROM public.%I x WHERE id=$1 AND user_id=$2 FOR UPDATE',t) INTO j USING (item->>'id')::uuid,auth.uid();
 IF j IS NULL OR j->>'azienda_id'<>m.company_id::text THEN RAISE EXCEPTION 'Registrazione non coerente'; END IF;
 d:=COALESCE(NULLIF(j->'fiscal_data'->>'competence_from','')::date,NULLIF(j->>'data_ordine','')::date,NULLIF(j->>'data_fattura','')::date);
 IF d IS NULL OR d<m.valid_from OR (m.valid_until IS NOT NULL AND d>m.valid_until) THEN RAISE EXCEPTION 'Competenza esterna al mandato: completa il periodo nella registrazione'; END IF;
 IF j->>'fiscal_subject_id' IS DISTINCT FROM item->>'expected_subject_id' THEN RAISE EXCEPTION 'Attribuzione modificata: aggiorna anteprima'; END IF;
 EXECUTE format('UPDATE public.%I SET fiscal_subject_id=$1,fiscal_mandate_id=$2 WHERE id=$3',t) USING m.subject_id,m.id,(item->>'id')::uuid; n:=n+1;
 END LOOP; RETURN n; END $$;
REVOKE ALL ON FUNCTION public.correct_fiscal_attributions(uuid,jsonb) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.correct_fiscal_attributions(uuid,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.fiscal_receipt_sync() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t text; source_name text; source_uuid uuid; uid uuid; total numeric; base numeric; j jsonb; last_date date; BEGIN
 source_name:=COALESCE(NEW.source,OLD.source); source_uuid:=COALESCE(NEW.source_id,OLD.source_id); uid:=COALESCE(NEW.user_id,OLD.user_id);
 t:=CASE source_name WHEN 'ordine' THEN 'ordini' WHEN 'fattura' THEN 'scadenziario_fatture' WHEN 'movimento' THEN 'movimenti_provvigione' END;
 EXECUTE format('SELECT to_jsonb(x) FROM public.%I x WHERE id=$1',t) INTO j USING source_uuid;
 SELECT COALESCE(sum(gross_amount),0),max(received_on) INTO total,last_date FROM public.commission_receipts WHERE source=source_name AND source_id=source_uuid AND user_id=uid;
 base:=COALESCE(NULLIF(j->'fiscal_data'->>'gross','')::numeric,NULLIF(j->>'provvigione_riconosciuta','')::numeric,CASE source_name WHEN 'fattura' THEN (j->>'provvigione_calcolata')::numeric WHEN 'movimento' THEN (j->>'importo')::numeric ELSE NULL END);
 IF source_name='movimento' THEN UPDATE public.movimenti_provvigione SET data_pagamento=last_date,stato=CASE WHEN total=0 THEN 'da_pagare' WHEN base IS NOT NULL AND total>=base THEN 'pagata' ELSE 'parziale' END WHERE id=source_uuid;
 ELSE EXECUTE format('UPDATE public.%I SET importo_provvigione_pagata=$1,data_incasso_provvigione=$2,stato_provvigione=CASE WHEN $1=0 THEN ''da_pagare'' WHEN $3 IS NOT NULL AND $1>=$3 THEN ''pagata'' ELSE ''parziale'' END,%I=($3 IS NOT NULL AND $1>=$3 AND $1>0) WHERE id=$4',t,CASE source_name WHEN 'ordine' THEN 'provvigione_pagata' ELSE 'provvigione_incassata' END) USING total,last_date,base,source_uuid; END IF;
 RETURN COALESCE(NEW,OLD); END $$;
CREATE TRIGGER fiscal_receipt_sync AFTER INSERT OR UPDATE OR DELETE ON public.commission_receipts FOR EACH ROW EXECUTE FUNCTION public.fiscal_receipt_sync();