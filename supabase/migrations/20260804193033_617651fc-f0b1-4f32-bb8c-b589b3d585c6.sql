
CREATE TABLE IF NOT EXISTS public.prodotti_merge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  azienda_id uuid,
  primary_prodotto_id uuid NOT NULL,
  primary_prodotto_nome text NOT NULL,
  merged_prodotti jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.prodotti_merge_log TO authenticated;
GRANT ALL ON public.prodotti_merge_log TO service_role;

ALTER TABLE public.prodotti_merge_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own merge log" ON public.prodotti_merge_log;
CREATE POLICY "Users view own merge log" ON public.prodotti_merge_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own merge log" ON public.prodotti_merge_log;
CREATE POLICY "Users insert own merge log" ON public.prodotti_merge_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_prodotti_merge_log_updated_at ON public.prodotti_merge_log;
CREATE TRIGGER update_prodotti_merge_log_updated_at
  BEFORE UPDATE ON public.prodotti_merge_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.merge_prodotti(
  p_primary_id uuid,
  p_duplicate_ids uuid[],
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_primary public.prodotti%ROWTYPE;
  v_dups jsonb;
  v_ids uuid[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;

  SELECT * INTO v_primary FROM public.prodotti WHERE id = p_primary_id;
  IF v_primary.id IS NULL THEN
    RAISE EXCEPTION 'Prodotto principale non trovato';
  END IF;

  SELECT array_agg(id), jsonb_agg(jsonb_build_object('id', id, 'nome', nome))
    INTO v_ids, v_dups
  FROM public.prodotti
  WHERE id = ANY(p_duplicate_ids) AND id <> p_primary_id;

  IF v_ids IS NULL OR array_length(v_ids, 1) = 0 THEN
    RAISE EXCEPTION 'Nessun prodotto duplicato valido';
  END IF;

  -- Rimuove i conflitti sui vincoli di unicità prima di ripuntare
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

  -- Soft delete dei duplicati (finiscono nel cestino)
  UPDATE public.prodotti SET deleted_at = now() WHERE id = ANY(v_ids) AND deleted_at IS NULL;

  INSERT INTO public.prodotti_merge_log (user_id, azienda_id, primary_prodotto_id, primary_prodotto_nome, merged_prodotti, note)
  VALUES (v_uid, v_primary.azienda_id, v_primary.id, v_primary.nome, v_dups, NULLIF(btrim(coalesce(p_note, '')), ''));
END;
$$;

REVOKE ALL ON FUNCTION public.merge_prodotti(uuid, uuid[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_prodotti(uuid, uuid[], text) TO authenticated;
