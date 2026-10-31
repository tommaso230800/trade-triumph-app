CREATE OR REPLACE FUNCTION public.fiscal_managed_snapshot_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE total numeric; last_date date; base numeric; j jsonb; src text; BEGIN
 IF NOT COALESCE((NEW.fiscal_data->>'receipts_managed')::boolean,false) THEN RETURN NEW; END IF;
 src:=CASE TG_TABLE_NAME WHEN 'ordini' THEN 'ordine' WHEN 'scadenziario_fatture' THEN 'fattura' ELSE 'movimento' END;
 SELECT COALESCE(sum(gross_amount),0),max(received_on) INTO total,last_date FROM public.commission_receipts WHERE source=src AND source_id=NEW.id AND user_id=NEW.user_id;
 j:=to_jsonb(NEW); base:=COALESCE(NULLIF(NEW.fiscal_data->>'gross','')::numeric,NULLIF(j->>'provvigione_riconosciuta','')::numeric,CASE src WHEN 'fattura' THEN (j->>'provvigione_calcolata')::numeric WHEN 'movimento' THEN (j->>'importo')::numeric ELSE NULL END);
 IF src='movimento' THEN j:=j||jsonb_build_object('data_pagamento',last_date,'stato',CASE WHEN total=0 THEN 'da_pagare' WHEN base IS NOT NULL AND total>=base THEN 'pagata' ELSE 'parziale' END);
 ELSE j:=j||jsonb_build_object('data_incasso_provvigione',last_date,'importo_provvigione_pagata',total,'stato_provvigione',CASE WHEN total=0 THEN 'da_pagare' WHEN base IS NOT NULL AND total>=base THEN 'pagata' ELSE 'parziale' END,CASE src WHEN 'ordine' THEN 'provvigione_pagata' ELSE 'provvigione_incassata' END,(base IS NOT NULL AND total>=base AND total>0)); END IF;
 NEW:=jsonb_populate_record(NEW,j); RETURN NEW; END $$;
CREATE TRIGGER fiscal_managed_order BEFORE UPDATE ON public.ordini FOR EACH ROW EXECUTE FUNCTION public.fiscal_managed_snapshot_guard();
CREATE TRIGGER fiscal_managed_invoice BEFORE UPDATE ON public.scadenziario_fatture FOR EACH ROW EXECUTE FUNCTION public.fiscal_managed_snapshot_guard();
CREATE TRIGGER fiscal_managed_movement BEFORE UPDATE ON public.movimenti_provvigione FOR EACH ROW EXECUTE FUNCTION public.fiscal_managed_snapshot_guard();
CREATE OR REPLACE FUNCTION public.fiscal_entry_validate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.amount<0 OR NEW.compensation<0 OR NEW.amount::text IN ('NaN','Infinity','-Infinity') OR NEW.compensation::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Importi non validi'; END IF;
 IF NEW.verification='verificato' AND (NEW.paid_on IS NULL OR NEW.document_id IS NULL) THEN RAISE EXCEPTION 'Pagamento verificato richiede data e documento'; END IF;
 IF NEW.paid_on>CURRENT_DATE THEN RAISE EXCEPTION 'Data pagamento futura: usare Programmato senza data di pagamento'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER fiscal_entry_validate BEFORE INSERT OR UPDATE ON public.fiscal_entries FOR EACH ROW EXECUTE FUNCTION public.fiscal_entry_validate();