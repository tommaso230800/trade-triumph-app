-- Add stand_by to order_status enum
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'stand_by';

-- Add stand-by metadata columns
ALTER TABLE public.ordini
  ADD COLUMN IF NOT EXISTS stand_by_motivo text,
  ADD COLUMN IF NOT EXISTS stand_by_prodotto_bloccato text,
  ADD COLUMN IF NOT EXISTS stand_by_data_prevista date,
  ADD COLUMN IF NOT EXISTS stand_by_note text,
  ADD COLUMN IF NOT EXISTS data_conferma date,
  ADD COLUMN IF NOT EXISTS stand_by_data_inizio date;

-- Update stats trigger to also exclude stand_by orders
CREATE OR REPLACE FUNCTION public.update_cliente_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  old_cliente_id uuid;
  new_cliente_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    old_cliente_id := OLD.cliente_id;
    new_cliente_id := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    old_cliente_id := NULL;
    new_cliente_id := NEW.cliente_id;
  ELSE
    old_cliente_id := OLD.cliente_id;
    new_cliente_id := NEW.cliente_id;
  END IF;

  IF old_cliente_id IS NOT NULL THEN
    UPDATE public.clienti
    SET 
      fatturato = COALESCE((
        SELECT SUM(totale) FROM public.ordini 
        WHERE cliente_id = old_cliente_id AND status NOT IN ('annullato','stand_by')
      ), 0),
      ordini_count = COALESCE((
        SELECT COUNT(*) FROM public.ordini 
        WHERE cliente_id = old_cliente_id AND status NOT IN ('annullato','stand_by')
      ), 0)
    WHERE id = old_cliente_id;
  END IF;

  IF new_cliente_id IS NOT NULL AND (old_cliente_id IS NULL OR new_cliente_id != old_cliente_id) THEN
    UPDATE public.clienti
    SET 
      fatturato = COALESCE((
        SELECT SUM(totale) FROM public.ordini 
        WHERE cliente_id = new_cliente_id AND status NOT IN ('annullato','stand_by')
      ), 0),
      ordini_count = COALESCE((
        SELECT COUNT(*) FROM public.ordini 
        WHERE cliente_id = new_cliente_id AND status NOT IN ('annullato','stand_by')
      ), 0)
    WHERE id = new_cliente_id;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$function$;

-- Update reorder tracking to ignore stand_by orders
CREATE OR REPLACE FUNCTION public.update_reorder_tracking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cliente_id uuid;
  v_azienda_id uuid;
  v_user_id uuid;
  v_ordini_dates date[];
  v_num_ordini integer;
  v_media_giorni numeric;
  v_ultimo date;
  v_penultimo date;
  v_prossimo date;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_cliente_id := OLD.cliente_id;
    v_azienda_id := OLD.azienda_id;
    v_user_id := OLD.user_id;
  ELSE
    v_cliente_id := NEW.cliente_id;
    v_azienda_id := NEW.azienda_id;
    v_user_id := NEW.user_id;
  END IF;

  IF v_cliente_id IS NULL OR v_azienda_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  SELECT ARRAY_AGG(data_ordine ORDER BY data_ordine ASC)
  INTO v_ordini_dates
  FROM public.ordini
  WHERE cliente_id = v_cliente_id
    AND azienda_id = v_azienda_id
    AND status NOT IN ('annullato','stand_by')
    AND data_ordine IS NOT NULL;

  v_num_ordini := COALESCE(array_length(v_ordini_dates, 1), 0);

  IF v_num_ordini = 0 THEN
    DELETE FROM public.reorder_tracking
    WHERE cliente_id = v_cliente_id AND azienda_id = v_azienda_id AND user_id = v_user_id;
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  v_ultimo := v_ordini_dates[v_num_ordini];
  v_penultimo := CASE WHEN v_num_ordini >= 2 THEN v_ordini_dates[v_num_ordini - 1] ELSE NULL END;

  IF v_num_ordini >= 2 THEN
    SELECT AVG(diff)::numeric INTO v_media_giorni
    FROM (
      SELECT (v_ordini_dates[i+1] - v_ordini_dates[i]) AS diff
      FROM generate_series(1, v_num_ordini - 1) AS i
    ) sub;
    v_prossimo := v_ultimo + ROUND(v_media_giorni)::integer;
  ELSE
    v_media_giorni := 0;
    v_prossimo := NULL;
  END IF;

  INSERT INTO public.reorder_tracking (user_id, cliente_id, azienda_id, ultimo_ordine_data, penultimo_ordine_data, media_giorni_riordino, numero_ordini, prossimo_riordino_previsto, updated_at)
  VALUES (v_user_id, v_cliente_id, v_azienda_id, v_ultimo, v_penultimo, v_media_giorni, v_num_ordini, v_prossimo, now())
  ON CONFLICT (user_id, cliente_id, azienda_id)
  DO UPDATE SET
    ultimo_ordine_data = EXCLUDED.ultimo_ordine_data,
    penultimo_ordine_data = EXCLUDED.penultimo_ordine_data,
    media_giorni_riordino = EXCLUDED.media_giorni_riordino,
    numero_ordini = EXCLUDED.numero_ordini,
    prossimo_riordino_previsto = EXCLUDED.prossimo_riordino_previsto,
    updated_at = now();

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$function$;