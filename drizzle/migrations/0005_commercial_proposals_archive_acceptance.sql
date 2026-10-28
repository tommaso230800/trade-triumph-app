CREATE TABLE public.commercial_proposals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, company_id uuid NOT NULL REFERENCES public.aziende(id), customer_id uuid REFERENCES public.clienti(id), year integer NOT NULL, kind text NOT NULL DEFAULT 'proposta' CHECK(kind IN ('proposta','locandina')), title text NOT NULL, status text NOT NULL DEFAULT 'bozza' CHECK(status IN ('bozza','inviata','accettata','rifiutata')), valid_from date, valid_until date, version integer NOT NULL DEFAULT 1, content jsonb NOT NULL DEFAULT '{}'::jsonb, apply_prices boolean, apply_conditions boolean, parent_id uuid REFERENCES public.commercial_proposals(id), pdf_document_id uuid REFERENCES public.documenti(id), pdf_version integer, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE ON public.commercial_proposals TO authenticated;
GRANT ALL ON public.commercial_proposals TO service_role;
ALTER TABLE public.commercial_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY proposals_owner ON public.commercial_proposals FOR ALL TO authenticated USING(user_id=auth.uid() OR public.is_admin(auth.uid())) WITH CHECK(user_id=auth.uid() OR public.is_admin(auth.uid()));
CREATE TABLE public.proposal_acceptances (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), proposal_id uuid NOT NULL UNIQUE REFERENCES public.commercial_proposals(id), user_id uuid NOT NULL, accepted_on date NOT NULL, apply_prices boolean NOT NULL, apply_conditions boolean NOT NULL, notes text, evidence_document_id uuid REFERENCES public.documenti(id), snapshot jsonb NOT NULL, pdf_document_id uuid NOT NULL REFERENCES public.documenti(id), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.proposal_acceptances TO authenticated;
GRANT ALL ON public.proposal_acceptances TO service_role;
ALTER TABLE public.proposal_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY acceptances_read ON public.proposal_acceptances FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.commercial_proposals p WHERE p.id=proposal_id AND (p.user_id=auth.uid() OR public.is_admin(auth.uid()))));
CREATE TABLE public.customer_price_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, customer_id uuid NOT NULL REFERENCES public.clienti(id), company_id uuid NOT NULL REFERENCES public.aziende(id), product_id uuid NOT NULL REFERENCES public.prodotti(id), custom_price numeric NOT NULL, valid_from date, valid_until date, proposal_id uuid REFERENCES public.commercial_proposals(id), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.customer_price_history TO authenticated;
GRANT ALL ON public.customer_price_history TO service_role;
ALTER TABLE public.customer_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY price_history_read ON public.customer_price_history FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_admin(auth.uid()));
CREATE TABLE public.accepted_commercial_conditions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, proposal_id uuid NOT NULL UNIQUE REFERENCES public.commercial_proposals(id), company_id uuid NOT NULL REFERENCES public.aziende(id), customer_id uuid NOT NULL REFERENCES public.clienti(id), year integer NOT NULL, accepted_on date NOT NULL, content jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.accepted_commercial_conditions TO authenticated;
GRANT ALL ON public.accepted_commercial_conditions TO service_role;
ALTER TABLE public.accepted_commercial_conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY conditions_read ON public.accepted_commercial_conditions FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_admin(auth.uid()));
ALTER TABLE public.documenti ADD COLUMN company_id uuid REFERENCES public.aziende(id), ADD COLUMN customer_id uuid REFERENCES public.clienti(id), ADD COLUMN reference_year integer, ADD COLUMN category text, ADD COLUMN valid_from date, ADD COLUMN valid_until date, ADD COLUMN proposal_id uuid REFERENCES public.commercial_proposals(id), ADD COLUMN proposal_version integer;
UPDATE public.documenti SET company_id=entita_id WHERE entita='azienda' AND EXISTS(SELECT 1 FROM public.aziende a WHERE a.id=documenti.entita_id);
UPDATE public.documenti SET customer_id=entita_id WHERE entita='cliente' AND EXISTS(SELECT 1 FROM public.clienti c WHERE c.id=documenti.entita_id);
ALTER TABLE public.customer_product_prices ADD COLUMN proposal_id uuid REFERENCES public.commercial_proposals(id);
ALTER TABLE public.canvass ADD COLUMN proposal_id uuid REFERENCES public.commercial_proposals(id), ADD COLUMN commercial_terms jsonb;
ALTER TABLE public.contratti_clienti ADD COLUMN proposal_id uuid REFERENCES public.commercial_proposals(id);
CREATE OR REPLACE FUNCTION public.guard_commercial_proposal() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.status='accettata' THEN RAISE EXCEPTION 'Registrare l accettazione con il comando dedicato'; END IF;
  IF NEW.kind='proposta' AND NEW.customer_id IS NULL THEN RAISE EXCEPTION 'Selezionare il cliente destinatario'; END IF;
  RETURN NEW;
 END IF;
 IF OLD.status='accettata' THEN RAISE EXCEPTION 'La proposta accettata è immutabile: creare una revisione'; END IF;
 IF NEW.status='accettata' AND NOT EXISTS(SELECT 1 FROM public.proposal_acceptances a WHERE a.proposal_id=NEW.id) THEN RAISE EXCEPTION 'Usare Registra accettazione'; END IF;
 IF NEW.kind='proposta' AND NEW.customer_id IS NULL THEN RAISE EXCEPTION 'Selezionare il cliente'; END IF;
 IF (NEW.content,NEW.company_id,NEW.customer_id,NEW.year,NEW.title,NEW.kind,NEW.valid_from,NEW.valid_until) IS DISTINCT FROM (OLD.content,OLD.company_id,OLD.customer_id,OLD.year,OLD.title,OLD.kind,OLD.valid_from,OLD.valid_until) THEN
  NEW.version:=OLD.version+1; NEW.pdf_document_id:=NULL; NEW.pdf_version:=NULL;
 ELSE NEW.version:=OLD.version;
 END IF;
 NEW.updated_at:=now(); RETURN NEW;
END; $$;
CREATE TRIGGER guard_commercial_proposal BEFORE INSERT OR UPDATE ON public.commercial_proposals FOR EACH ROW EXECUTE FUNCTION public.guard_commercial_proposal();
CREATE OR REPLACE FUNCTION public.protect_accepted_document() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.proposal_acceptances WHERE pdf_document_id=OLD.id OR evidence_document_id=OLD.id) THEN RAISE EXCEPTION 'Documento di accettazione conservato nello storico'; END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END; $$;
CREATE TRIGGER protect_accepted_document BEFORE UPDATE OR DELETE ON public.documenti FOR EACH ROW EXECUTE FUNCTION public.protect_accepted_document();
CREATE OR REPLACE FUNCTION public.accept_commercial_proposal(p_proposal_id uuid,p_accepted_on date,p_apply_prices boolean,p_apply_conditions boolean,p_notes text DEFAULT NULL,p_evidence_document_id uuid DEFAULT NULL,p_expected_version integer DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.commercial_proposals; a_id uuid; r jsonb; t jsonb; prod public.prodotti; old_price public.customer_product_prices; unit_count numeric; net_price numeric; v_canvass uuid; v_contract uuid; idx integer:=0;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Accesso richiesto'; END IF;
 SELECT * INTO p FROM public.commercial_proposals WHERE id=p_proposal_id FOR UPDATE;
 IF p.id IS NULL OR NOT (p.user_id=auth.uid() OR public.is_admin(auth.uid())) THEN RAISE EXCEPTION 'Proposta non accessibile'; END IF;
 SELECT id INTO a_id FROM public.proposal_acceptances WHERE proposal_id=p.id;
 IF a_id IS NOT NULL THEN RETURN a_id; END IF;
 IF p.kind<>'proposta' OR p.customer_id IS NULL OR p.status NOT IN ('bozza','inviata') THEN RAISE EXCEPTION 'Proposta non accettabile'; END IF;
 IF p_expected_version IS DISTINCT FROM p.version THEN RAISE EXCEPTION 'Proposta modificata: riaprire l accettazione'; END IF;
 IF p_accepted_on IS NULL OR p_accepted_on>CURRENT_DATE OR (p.valid_until IS NOT NULL AND p_accepted_on>p.valid_until) THEN RAISE EXCEPTION 'Data di accettazione non valida o oltre la validità'; END IF;
 IF p_apply_prices IS NULL OR p_apply_conditions IS NULL THEN RAISE EXCEPTION 'Confermare entrambe le opzioni'; END IF;
 IF p.pdf_document_id IS NULL OR p.pdf_version IS DISTINCT FROM p.version OR NOT EXISTS(SELECT 1 FROM public.documenti d WHERE d.id=p.pdf_document_id AND d.user_id=p.user_id AND d.proposal_id=p.id AND d.proposal_version=p.version AND d.mime_type='application/pdf') THEN RAISE EXCEPTION 'Generare e archiviare il PDF della versione corrente'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.aziende WHERE id=p.company_id AND deleted_at IS NULL AND (user_id=p.user_id OR public.is_admin(auth.uid()))) OR NOT EXISTS(SELECT 1 FROM public.clienti WHERE id=p.customer_id AND deleted_at IS NULL AND (user_id=p.user_id OR public.is_admin(auth.uid()))) THEN RAISE EXCEPTION 'Azienda o cliente non accessibile'; END IF;
 IF p_evidence_document_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.documenti WHERE id=p_evidence_document_id AND user_id=p.user_id AND company_id=p.company_id AND customer_id=p.customer_id) THEN RAISE EXCEPTION 'Allegato di conferma non accessibile'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p.user_id::text||p.customer_id::text||p.company_id::text,0));
 INSERT INTO public.proposal_acceptances(proposal_id,user_id,accepted_on,apply_prices,apply_conditions,notes,evidence_document_id,snapshot,pdf_document_id) VALUES(p.id,auth.uid(),p_accepted_on,p_apply_prices,p_apply_conditions,p_notes,p_evidence_document_id,to_jsonb(p),p.pdf_document_id) RETURNING id INTO a_id;
 IF p_apply_prices THEN
  IF jsonb_array_length(COALESCE(p.content->'rows','[]'::jsonb))=0 THEN RAISE EXCEPTION 'Listino vuoto'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p.content->'rows') x GROUP BY x->>'product_id' HAVING count(*)>1) THEN RAISE EXCEPTION 'Prodotti duplicati nel listino'; END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(p.content->'rows') LOOP
   SELECT * INTO prod FROM public.prodotti WHERE id=(r->>'product_id')::uuid AND azienda_id=p.company_id AND deleted_at IS NULL AND (user_id=p.user_id OR public.is_admin(auth.uid()));
   IF prod.id IS NULL THEN RAISE EXCEPTION 'Prodotto non associato all azienda'; END IF;
   unit_count:=CASE r->>'unit' WHEN 'pezzo' THEN 1 WHEN 'cartone' THEN prod.pezzi_per_cartone WHEN 'strato' THEN prod.pezzi_per_cartone*prod.cartoni_per_strato WHEN 'pallet' THEN prod.pezzi_per_cartone*prod.cartoni_per_strato*prod.strati ELSE NULL END;
   IF unit_count IS NULL OR unit_count<=0 OR NULLIF(r->>'price','') IS NULL OR (r->>'price')::numeric<0 OR r->>'vat_mode' NOT IN ('esclusa','inclusa') OR NULLIF(r->>'vat_rate','') IS NULL OR (r->>'vat_rate')::numeric<0 THEN RAISE EXCEPTION 'Compilare prezzo, unità, IVA e conversioni'; END IF;
   net_price:=(r->>'price')::numeric/unit_count;
   IF r->>'vat_mode'='inclusa' THEN net_price:=net_price/(1+(r->>'vat_rate')::numeric/100); END IF;
   SELECT * INTO old_price FROM public.customer_product_prices WHERE customer_id=p.customer_id AND company_id=p.company_id AND product_id=prod.id FOR UPDATE;
   IF old_price.id IS NOT NULL THEN
    IF old_price.valid_from>p_accepted_on THEN RAISE EXCEPTION 'Decorrenza precedente al listino corrente'; END IF;
    INSERT INTO public.customer_price_history(user_id,customer_id,company_id,product_id,custom_price,valid_from,valid_until,proposal_id) VALUES(old_price.user_id,p.customer_id,p.company_id,prod.id,old_price.custom_price,old_price.valid_from,p_accepted_on-1,old_price.proposal_id);
   END IF;
   INSERT INTO public.customer_product_prices(user_id,customer_id,company_id,product_id,custom_price,valid_from,note,proposal_id) VALUES(p.user_id,p.customer_id,p.company_id,prod.id,net_price,p_accepted_on,'Proposta accettata: '||p.title,p.id) ON CONFLICT(customer_id,company_id,product_id) DO UPDATE SET custom_price=EXCLUDED.custom_price,valid_from=EXCLUDED.valid_from,note=EXCLUDED.note,proposal_id=EXCLUDED.proposal_id,updated_at=now();
  END LOOP;
 END IF;
 IF p_apply_conditions THEN
  INSERT INTO public.accepted_commercial_conditions(user_id,proposal_id,company_id,customer_id,year,accepted_on,content) VALUES(p.user_id,p.id,p.company_id,p.customer_id,p.year,p_accepted_on,p.content-'rows');
  FOR t IN SELECT * FROM jsonb_array_elements(COALESCE(p.content->'promotions','[]'::jsonb)) LOOP
   IF NULLIF(t->>'start','') IS NOT NULL AND NULLIF(t->>'end','') IS NOT NULL THEN
    IF (t->>'end')::date<(t->>'start')::date THEN RAISE EXCEPTION 'Periodo promozionale non valido'; END IF;
    INSERT INTO public.canvass(user_id,azienda_id,nome,descrizione,tipo,valore,data_inizio,data_fine,attivo,tutti_clienti,cartoni_acquisto,cartoni_omaggio,proposal_id,commercial_terms) VALUES(p.user_id,p.company_id,t->>'title',t->>'notes','sconto_percentuale',0,(t->>'start')::date,(t->>'end')::date,true,false,CASE WHEN t->>'unit'='cartone' THEN COALESCE((t->>'buy')::integer,0) ELSE 0 END,CASE WHEN t->>'unit'='cartone' THEN COALESCE((t->>'gift')::integer,0) ELSE 0 END,p.id,t) RETURNING id INTO v_canvass;
    INSERT INTO public.canvass_clienti(user_id,canvass_id,cliente_id) VALUES(p.user_id,v_canvass,p.customer_id);
    FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(t->'product_ids','[]'::jsonb)) LOOP
     IF NOT EXISTS(SELECT 1 FROM public.prodotti WHERE id=(r#>>'{}')::uuid AND azienda_id=p.company_id AND (user_id=p.user_id OR public.is_admin(auth.uid()))) THEN RAISE EXCEPTION 'Prodotto promozionale non valido'; END IF;
     INSERT INTO public.canvass_prodotti(user_id,canvass_id,prodotto_id) VALUES(p.user_id,v_canvass,(r#>>'{}')::uuid);
    END LOOP;
   END IF;
  END LOOP;
  IF jsonb_array_length(COALESCE(p.content->'rewards','[]'::jsonb))>0 THEN
   INSERT INTO public.contratti_clienti(user_id,cliente_id,azienda_id,anno,percentuale_premio,soglia_fatturato,note,proposal_id) VALUES(p.user_id,p.customer_id,p.company_id,p.year,0,0,p.content->>'reward_rules',p.id) RETURNING id INTO v_contract;
   FOR t IN SELECT * FROM jsonb_array_elements(p.content->'rewards') LOOP
    IF t->>'unit'='percentuale' THEN
     INSERT INTO public.contratti_obbiettivi(user_id,contratto_id,tipo,percentuale_premio,soglia_fatturato,descrizione,ordine) VALUES(p.user_id,v_contract,CASE WHEN COALESCE((t->>'threshold')::numeric,0)=0 THEN 'incondizionato' ELSE 'condizionato' END,(t->>'value')::numeric,COALESCE((t->>'threshold')::numeric,0),t->>'description',idx); idx:=idx+1;
    END IF;
   END LOOP;
  END IF;
 END IF;
 UPDATE public.commercial_proposals SET status='accettata',apply_prices=p_apply_prices,apply_conditions=p_apply_conditions WHERE id=p.id;
 RETURN a_id;
END; $$;
REVOKE ALL ON FUNCTION public.accept_commercial_proposal(uuid,date,boolean,boolean,text,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.accept_commercial_proposal(uuid,date,boolean,boolean,text,uuid,integer) TO authenticated;
CREATE INDEX commercial_proposals_scope ON public.commercial_proposals(user_id,company_id,customer_id);
CREATE INDEX documenti_company_customer ON public.documenti(company_id,customer_id);
