
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
      AND (auth.uid() IS NULL OR _user_id = auth.uid())
  )
$function$;

CREATE OR REPLACE FUNCTION public.agency_owner_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT m.user_id FROM public.agency_members m
  WHERE m.is_owner AND m.active
    AND (auth.uid() IS NULL OR public.is_agency_member(auth.uid()))
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.cestino_ripristina(p_tipo text, p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non autenticato'; END IF;
  IF p_tipo = 'clienti' THEN
    UPDATE public.clienti SET deleted_at = NULL WHERE id = p_id AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'ordini' THEN
    UPDATE public.ordini SET deleted_at = NULL WHERE id = p_id AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'prodotti' THEN
    UPDATE public.prodotti SET deleted_at = NULL WHERE id = p_id AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'aziende' THEN
    UPDATE public.aziende SET deleted_at = NULL WHERE id = p_id AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'segnalazioni' THEN
    UPDATE public.segnalazioni SET deleted_at = NULL WHERE id = p_id AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'documenti' THEN
    UPDATE public.documenti SET deleted_at = NULL WHERE id = p_id AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'notes' THEN
    UPDATE public.notes SET deleted_at = NULL WHERE id = p_id AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'visite' THEN
    UPDATE public.visite SET deleted_at = NULL WHERE id = p_id AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'contratti_clienti' THEN
    UPDATE public.contratti_clienti SET deleted_at = NULL WHERE id = p_id AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'promo_clienti' THEN
    UPDATE public.promo_clienti SET deleted_at = NULL WHERE id = p_id AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSE
    RAISE EXCEPTION 'Tipo non valido';
  END IF;
END; $function$;

CREATE OR REPLACE FUNCTION public.cestino_elimina_definitivo(p_tipo text, p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Non autenticato'; END IF;
  IF p_tipo = 'clienti' THEN
    DELETE FROM public.clienti WHERE id = p_id AND deleted_at IS NOT NULL AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'ordini' THEN
    DELETE FROM public.ordini WHERE id = p_id AND deleted_at IS NOT NULL AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'prodotti' THEN
    DELETE FROM public.prodotti WHERE id = p_id AND deleted_at IS NOT NULL AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'aziende' THEN
    DELETE FROM public.aziende WHERE id = p_id AND deleted_at IS NOT NULL AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'segnalazioni' THEN
    DELETE FROM public.segnalazioni WHERE id = p_id AND deleted_at IS NOT NULL AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'documenti' THEN
    DELETE FROM public.documenti WHERE id = p_id AND deleted_at IS NOT NULL AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'notes' THEN
    DELETE FROM public.notes WHERE id = p_id AND deleted_at IS NOT NULL AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'visite' THEN
    DELETE FROM public.visite WHERE id = p_id AND deleted_at IS NOT NULL AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'contratti_clienti' THEN
    DELETE FROM public.contratti_clienti WHERE id = p_id AND deleted_at IS NOT NULL AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSIF p_tipo = 'promo_clienti' THEN
    DELETE FROM public.promo_clienti WHERE id = p_id AND deleted_at IS NOT NULL AND (user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(user_id)));
  ELSE
    RAISE EXCEPTION 'Tipo non valido';
  END IF;
END; $function$;

CREATE OR REPLACE FUNCTION public.correct_fiscal_attributions(p_mandate_id uuid, p_items jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE m public.fiscal_mandates; item jsonb; src text; rid uuid; j jsonb; d date; n integer:=0; v_uid uuid := auth.uid();
BEGIN
 SELECT * INTO m FROM public.fiscal_mandates WHERE id=p_mandate_id AND user_id=v_uid;
 IF v_uid IS NULL OR m.id IS NULL THEN RAISE EXCEPTION 'Mandato non accessibile'; END IF;
 FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
  src := item->>'source'; rid := (item->>'id')::uuid; j := NULL;
  IF src = 'ordine' THEN
    SELECT to_jsonb(x) INTO j FROM public.ordini x WHERE x.id=rid AND x.user_id=v_uid FOR UPDATE;
  ELSIF src = 'fattura' THEN
    SELECT to_jsonb(x) INTO j FROM public.scadenziario_fatture x WHERE x.id=rid AND x.user_id=v_uid FOR UPDATE;
  ELSIF src = 'movimento' THEN
    SELECT to_jsonb(x) INTO j FROM public.movimenti_provvigione x WHERE x.id=rid AND x.user_id=v_uid FOR UPDATE;
  ELSE
    RAISE EXCEPTION 'Fonte non valida';
  END IF;
  IF j IS NULL OR j->>'azienda_id'<>m.company_id::text THEN RAISE EXCEPTION 'Registrazione non coerente'; END IF;
  d:=COALESCE(NULLIF(j->'fiscal_data'->>'competence_from','')::date,NULLIF(j->>'data_ordine','')::date,NULLIF(j->>'data_fattura','')::date);
  IF d IS NULL OR d<m.valid_from OR (m.valid_until IS NOT NULL AND d>m.valid_until) THEN RAISE EXCEPTION 'Competenza esterna al mandato: completa il periodo nella registrazione'; END IF;
  IF j->>'fiscal_subject_id' IS DISTINCT FROM item->>'expected_subject_id' THEN RAISE EXCEPTION 'Attribuzione modificata: aggiorna anteprima'; END IF;
  IF src = 'ordine' THEN
    UPDATE public.ordini SET fiscal_subject_id=m.subject_id, fiscal_mandate_id=m.id WHERE id=rid AND user_id=v_uid;
  ELSIF src = 'fattura' THEN
    UPDATE public.scadenziario_fatture SET fiscal_subject_id=m.subject_id, fiscal_mandate_id=m.id WHERE id=rid AND user_id=v_uid;
  ELSE
    UPDATE public.movimenti_provvigione SET fiscal_subject_id=m.subject_id, fiscal_mandate_id=m.id WHERE id=rid AND user_id=v_uid;
  END IF;
  n:=n+1;
 END LOOP;
 RETURN n;
END $function$;

CREATE OR REPLACE FUNCTION public.save_commission_receipt(p_source text, p_source_id uuid, p_receipt jsonb, p_receipt_id uuid DEFAULT NULL::uuid, p_remove boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE j jsonb; rid uuid; total numeric; v_uid uuid := auth.uid(); v_last date;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Accedi per registrare un incasso'; END IF;
 IF p_source = 'ordine' THEN
   SELECT to_jsonb(x) INTO j FROM public.ordini x WHERE x.id=p_source_id AND x.user_id=v_uid FOR UPDATE;
 ELSIF p_source = 'fattura' THEN
   SELECT to_jsonb(x) INTO j FROM public.scadenziario_fatture x WHERE x.id=p_source_id AND x.user_id=v_uid FOR UPDATE;
 ELSIF p_source = 'movimento' THEN
   SELECT to_jsonb(x) INTO j FROM public.movimenti_provvigione x WHERE x.id=p_source_id AND x.user_id=v_uid FOR UPDATE;
 ELSE
   RAISE EXCEPTION 'Fonte non valida';
 END IF;
 IF j IS NULL OR j->>'deleted_at' IS NOT NULL THEN RAISE EXCEPTION 'Provvigione non accessibile'; END IF;
 IF p_receipt_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.commission_receipts WHERE id=p_receipt_id AND user_id=v_uid AND source=p_source AND source_id=p_source_id) THEN RAISE EXCEPTION 'Incasso non accessibile'; END IF;
 IF p_remove THEN
   DELETE FROM public.commission_receipts WHERE id=p_receipt_id AND user_id=v_uid; rid:=p_receipt_id;
 ELSE
   IF NULLIF(p_receipt->>'document_id','') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.documenti WHERE id=(p_receipt->>'document_id')::uuid AND user_id=v_uid) THEN RAISE EXCEPTION 'Documento non accessibile'; END IF;
   IF NULLIF(p_receipt->>'received_on','') IS NULL OR (p_receipt->>'received_on')::date>CURRENT_DATE THEN RAISE EXCEPTION 'Data incasso non valida'; END IF;
   IF p_receipt_id IS NULL THEN
     INSERT INTO public.commission_receipts(user_id,source,source_id,received_on,gross_amount,enasarco_withheld,withholding,vat,stamp,other_deductions,bank_amount,document_id,verification,request_id,notes)
     VALUES(v_uid,p_source,p_source_id,(p_receipt->>'received_on')::date,(p_receipt->>'gross_amount')::numeric,NULLIF(p_receipt->>'enasarco_withheld','')::numeric,NULLIF(p_receipt->>'withholding','')::numeric,NULLIF(p_receipt->>'vat','')::numeric,NULLIF(p_receipt->>'stamp','')::numeric,NULLIF(p_receipt->>'other_deductions','')::numeric,NULLIF(p_receipt->>'bank_amount','')::numeric,NULLIF(p_receipt->>'document_id','')::uuid,COALESCE(p_receipt->>'verification','dichiarato'),COALESCE(NULLIF(p_receipt->>'request_id','')::uuid,gen_random_uuid()),p_receipt->>'notes')
     ON CONFLICT(user_id,request_id) DO NOTHING RETURNING id INTO rid;
     IF rid IS NULL THEN
       SELECT id INTO rid FROM public.commission_receipts WHERE user_id=v_uid AND request_id=(p_receipt->>'request_id')::uuid AND source=p_source AND source_id=p_source_id;
       IF rid IS NULL THEN RAISE EXCEPTION 'Tentativo incasso non coerente'; END IF;
     END IF;
   ELSE
     UPDATE public.commission_receipts SET received_on=(p_receipt->>'received_on')::date,gross_amount=(p_receipt->>'gross_amount')::numeric,enasarco_withheld=NULLIF(p_receipt->>'enasarco_withheld','')::numeric,withholding=NULLIF(p_receipt->>'withholding','')::numeric,vat=NULLIF(p_receipt->>'vat','')::numeric,stamp=NULLIF(p_receipt->>'stamp','')::numeric,other_deductions=NULLIF(p_receipt->>'other_deductions','')::numeric,bank_amount=NULLIF(p_receipt->>'bank_amount','')::numeric,document_id=NULLIF(p_receipt->>'document_id','')::uuid,verification=COALESCE(p_receipt->>'verification','dichiarato'),notes=p_receipt->>'notes'
     WHERE id=p_receipt_id AND user_id=v_uid;
     rid:=p_receipt_id;
   END IF;
 END IF;
 SELECT COALESCE(sum(gross_amount),0), max(received_on) INTO total, v_last FROM public.commission_receipts WHERE user_id=v_uid AND source=p_source AND source_id=p_source_id;
 IF p_source = 'ordine' THEN
   UPDATE public.ordini SET fiscal_data=jsonb_set(fiscal_data,'{receipts_managed}','true'::jsonb),
     importo_provvigione_pagata=total, data_incasso_provvigione=v_last,
     stato_provvigione=CASE WHEN total=0 THEN 'da_pagare' ELSE 'parziale' END
   WHERE id=p_source_id;
 ELSIF p_source = 'fattura' THEN
   UPDATE public.scadenziario_fatture SET fiscal_data=jsonb_set(fiscal_data,'{receipts_managed}','true'::jsonb),
     importo_provvigione_pagata=total, data_incasso_provvigione=v_last,
     stato_provvigione=CASE WHEN total=0 THEN 'da_pagare' ELSE 'parziale' END
   WHERE id=p_source_id;
 ELSE
   UPDATE public.movimenti_provvigione SET fiscal_data=jsonb_set(fiscal_data,'{receipts_managed}','true'::jsonb),
     stato=CASE WHEN total=0 THEN 'da_pagare' ELSE 'parziale' END
   WHERE id=p_source_id;
 END IF;
 RETURN rid;
END $function$;

CREATE OR REPLACE FUNCTION public.merge_prodotti(p_primary_id uuid, p_duplicate_ids uuid[], p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_primary public.prodotti%ROWTYPE;
  v_dups jsonb;
  v_ids uuid[];
  v_requested int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;

  SELECT * INTO v_primary FROM public.prodotti p
  WHERE p.id = p_primary_id
    AND (p.user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(p.user_id)));
  IF v_primary.id IS NULL THEN
    RAISE EXCEPTION 'Prodotto principale non trovato';
  END IF;

  SELECT count(DISTINCT x) INTO v_requested FROM unnest(p_duplicate_ids) x WHERE x <> p_primary_id;

  SELECT array_agg(p.id), jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome))
    INTO v_ids, v_dups
  FROM public.prodotti p
  WHERE p.id = ANY(p_duplicate_ids) AND p.id <> p_primary_id
    AND p.user_id = v_primary.user_id
    AND (p.user_id = v_uid OR public.is_admin(v_uid) OR (public.is_agency_member(v_uid) AND public.is_agency_member(p.user_id)));

  IF v_ids IS NULL OR array_length(v_ids, 1) = 0 THEN
    RAISE EXCEPTION 'Nessun prodotto duplicato valido';
  END IF;
  IF array_length(v_ids, 1) <> v_requested THEN
    RAISE EXCEPTION 'Alcuni prodotti duplicati non sono accessibili';
  END IF;

  DELETE FROM public.customer_product_prices d
  WHERE d.product_id = ANY(v_ids)
    AND EXISTS (
      SELECT 1 FROM public.customer_product_prices k
      WHERE k.product_id = p_primary_id
        AND k.customer_id IS NOT DISTINCT FROM d.customer_id
        AND k.company_id IS NOT DISTINCT FROM d.company_id
    );

  DELETE FROM public.canvass_prodotti d
  WHERE d.prodotto_id = ANY(v_ids)
    AND EXISTS (
      SELECT 1 FROM public.canvass_prodotti k
      WHERE k.prodotto_id = p_primary_id
        AND k.canvass_id IS NOT DISTINCT FROM d.canvass_id
    );

  UPDATE public.ordini_righe SET prodotto_id = p_primary_id WHERE prodotto_id = ANY(v_ids);
  UPDATE public.provvigioni_condizioni SET prodotto_id = p_primary_id WHERE prodotto_id = ANY(v_ids);
  UPDATE public.omaggi_erogati SET prodotto_id = p_primary_id WHERE prodotto_id = ANY(v_ids);
  UPDATE public.price_anomalies_resolved SET prodotto_id = p_primary_id WHERE prodotto_id = ANY(v_ids);
  UPDATE public.canvass_prodotti SET prodotto_id = p_primary_id WHERE prodotto_id = ANY(v_ids);
  UPDATE public.customer_product_prices SET product_id = p_primary_id WHERE product_id = ANY(v_ids);
  UPDATE public.price_increases SET product_id = p_primary_id WHERE product_id = ANY(v_ids);
  UPDATE public.competitor_products SET nostro_prodotto_id = p_primary_id WHERE nostro_prodotto_id = ANY(v_ids);

  UPDATE public.prodotti SET deleted_at = now() WHERE id = ANY(v_ids) AND deleted_at IS NULL;

  INSERT INTO public.prodotti_merge_log (user_id, azienda_id, primary_prodotto_id, primary_prodotto_nome, merged_prodotti, note)
  VALUES (v_uid, v_primary.azienda_id, v_primary.id, v_primary.nome, v_dups, NULLIF(btrim(coalesce(p_note, '')), ''));
END;
$function$;
