CREATE OR REPLACE FUNCTION public.trg_notifica_ordine_inviato()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o record; v_cliente text; v_azienda text; v_dest text;
BEGIN
  IF NEW.status <> 'sent' OR (TG_OP = 'UPDATE' AND OLD.status = 'sent') THEN RETURN NEW; END IF;
  BEGIN
    SELECT id, codice, totale, cliente_id, azienda_id, user_id INTO o FROM public.ordini WHERE id = NEW.ordine_id;
    IF o.id IS NULL THEN RETURN NEW; END IF;
    SELECT nome INTO v_cliente FROM public.clienti WHERE id = o.cliente_id;
    SELECT nome INTO v_azienda FROM public.aziende WHERE id = o.azienda_id;
    v_dest := coalesce(v_azienda, 'Azienda N/D');
    PERFORM public.enqueue_notifica(
      'ordine_inviato:' || NEW.id, 'ordine_inviato', public.notifica_destinatari(o.user_id),
      'Ordine inviato · ' || coalesce(v_cliente, 'Cliente N/D') || ' · ' || v_dest,
      'L’ordine n. ' || coalesce(o.codice, left(o.id::text, 8)) || ', del valore di ' || public.format_euro_it(o.totale) || ', è stato inviato a ' || v_dest || CASE WHEN right(v_dest, 1) = '.' THEN '' ELSE '.' END,
      '/ordini?ordine=' || o.id, o.id, o.cliente_id, o.azienda_id, v_cliente, v_azienda, o.totale,
      jsonb_build_object('codice', o.codice, 'invio_id', NEW.id, 'sent_at', NEW.sent_at, 'destinatari', NEW.to_addresses,
        'esito', 'accettato_dal_servizio_email', 'consegna', 'non_verificabile'), 'push');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.notifiche_sistema_log (job, status, finished_at, error, details)
    VALUES ('evento_ordine_inviato', 'errore', now(), SQLERRM, jsonb_build_object('invio_id', NEW.id));
  END;
  RETURN NEW;
END $$;