
-- Tabella per tracciare la frequenza di riordino per coppia cliente-azienda
CREATE TABLE public.reorder_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cliente_id uuid NOT NULL REFERENCES public.clienti(id) ON DELETE CASCADE,
  azienda_id uuid NOT NULL REFERENCES public.aziende(id) ON DELETE CASCADE,
  ultimo_ordine_data date,
  penultimo_ordine_data date,
  media_giorni_riordino numeric DEFAULT 0,
  numero_ordini integer DEFAULT 0,
  prossimo_riordino_previsto date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, cliente_id, azienda_id)
);

ALTER TABLE public.reorder_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reorder_tracking" ON public.reorder_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reorder_tracking" ON public.reorder_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reorder_tracking" ON public.reorder_tracking FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reorder_tracking" ON public.reorder_tracking FOR DELETE USING (auth.uid() = user_id);

-- Funzione trigger per aggiornare il tracking riordino quando un ordine viene inserito/aggiornato
CREATE OR REPLACE FUNCTION public.update_reorder_tracking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  -- Determina cliente/azienda/user dall'ordine
  IF TG_OP = 'DELETE' THEN
    v_cliente_id := OLD.cliente_id;
    v_azienda_id := OLD.azienda_id;
    v_user_id := OLD.user_id;
  ELSE
    v_cliente_id := NEW.cliente_id;
    v_azienda_id := NEW.azienda_id;
    v_user_id := NEW.user_id;
  END IF;

  -- Skip se manca cliente o azienda
  IF v_cliente_id IS NULL OR v_azienda_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  -- Prendi tutte le date ordine per questa coppia (esclusi annullati)
  SELECT ARRAY_AGG(data_ordine ORDER BY data_ordine ASC)
  INTO v_ordini_dates
  FROM public.ordini
  WHERE cliente_id = v_cliente_id
    AND azienda_id = v_azienda_id
    AND status != 'annullato'
    AND data_ordine IS NOT NULL;

  v_num_ordini := COALESCE(array_length(v_ordini_dates, 1), 0);

  IF v_num_ordini = 0 THEN
    -- Nessun ordine, rimuovi tracking
    DELETE FROM public.reorder_tracking
    WHERE cliente_id = v_cliente_id AND azienda_id = v_azienda_id AND user_id = v_user_id;
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  v_ultimo := v_ordini_dates[v_num_ordini];
  v_penultimo := CASE WHEN v_num_ordini >= 2 THEN v_ordini_dates[v_num_ordini - 1] ELSE NULL END;

  -- Calcola media giorni tra ordini consecutivi
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

  -- Upsert nel tracking
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
$$;

-- Trigger sugli ordini
CREATE TRIGGER trg_update_reorder_tracking
AFTER INSERT OR UPDATE OR DELETE ON public.ordini
FOR EACH ROW
EXECUTE FUNCTION public.update_reorder_tracking();
