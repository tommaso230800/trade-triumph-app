-- Unifica prodotti duplicati della stessa azienda: log di audit + funzione
-- transazionale che riassegna ogni riferimento dai duplicati al prodotto
-- principale, poi rimuove i duplicati (intercettati da soft_delete_intercept,
-- quindi recuperabili dal Cestino come una normale eliminazione prodotto).

CREATE TABLE public.prodotti_merge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  azienda_id uuid NOT NULL REFERENCES public.aziende(id) ON DELETE CASCADE,
  primary_prodotto_id uuid NOT NULL REFERENCES public.prodotti(id) ON DELETE CASCADE,
  primary_prodotto_nome text NOT NULL,
  merged_prodotti jsonb NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prodotti_merge_log TO authenticated;
GRANT ALL ON public.prodotti_merge_log TO service_role;

ALTER TABLE public.prodotti_merge_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_prodotti_merge_log" ON public.prodotti_merge_log FOR ALL
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE INDEX idx_prodotti_merge_log_azienda ON public.prodotti_merge_log(azienda_id, created_at DESC);
CREATE INDEX idx_prodotti_merge_log_user ON public.prodotti_merge_log(user_id);

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
  v_primary record;
  v_dup_id uuid;
  v_dup_name text;
  v_merged_names jsonb := '[]'::jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;

  IF p_duplicate_ids IS NULL OR array_length(p_duplicate_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Nessun prodotto duplicato specificato';
  END IF;

  IF p_primary_id = ANY(p_duplicate_ids) THEN
    RAISE EXCEPTION 'Il prodotto principale non puo essere tra i duplicati';
  END IF;

  SELECT * INTO v_primary FROM public.prodotti
    WHERE id = p_primary_id AND deleted_at IS NULL
      AND (user_id = v_uid OR public.is_admin(v_uid))
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prodotto principale non trovato o non autorizzato';
  END IF;

  FOREACH v_dup_id IN ARRAY p_duplicate_ids LOOP
    SELECT nome INTO v_dup_name FROM public.prodotti
      WHERE id = v_dup_id AND deleted_at IS NULL
        AND azienda_id = v_primary.azienda_id
        AND (user_id = v_uid OR public.is_admin(v_uid))
      FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Prodotto duplicato % non trovato, gia rimosso o di azienda diversa', v_dup_id;
    END IF;

    v_merged_names := v_merged_names || jsonb_build_object('id', v_dup_id, 'nome', v_dup_name);

    -- ordini_righe: NOT NULL, ON DELETE CASCADE, nessun vincolo unique -> reassign diretto
    UPDATE public.ordini_righe SET prodotto_id = p_primary_id WHERE prodotto_id = v_dup_id;

    -- canvass_prodotti: UNIQUE(canvass_id, prodotto_id) -> dedupe poi reassign
    DELETE FROM public.canvass_prodotti cp
      WHERE cp.prodotto_id = v_dup_id
        AND EXISTS (SELECT 1 FROM public.canvass_prodotti p2
                    WHERE p2.prodotto_id = p_primary_id AND p2.canvass_id = cp.canvass_id);
    UPDATE public.canvass_prodotti SET prodotto_id = p_primary_id WHERE prodotto_id = v_dup_id;

    -- prodotti_alias: UNIQUE(azienda_id, prodotto_id) -> dedupe poi reassign
    DELETE FROM public.prodotti_alias pa
      WHERE pa.prodotto_id = v_dup_id
        AND EXISTS (SELECT 1 FROM public.prodotti_alias p2
                    WHERE p2.prodotto_id = p_primary_id AND p2.azienda_id = pa.azienda_id);
    UPDATE public.prodotti_alias SET prodotto_id = p_primary_id WHERE prodotto_id = v_dup_id;

    -- provvigioni_condizioni: nullable, ON DELETE CASCADE, nessuna uniqueness -> reassign diretto
    UPDATE public.provvigioni_condizioni SET prodotto_id = p_primary_id WHERE prodotto_id = v_dup_id;

    -- price_increases: nullable, ON DELETE SET NULL -> reassign diretto
    UPDATE public.price_increases SET product_id = p_primary_id WHERE product_id = v_dup_id;

    -- omaggi_erogati: NOT NULL, nessuna FK reale -> reassign manuale
    UPDATE public.omaggi_erogati SET prodotto_id = p_primary_id WHERE prodotto_id = v_dup_id;

    -- price_anomalies_resolved: nullable, nessuna FK reale -> reassign manuale
    UPDATE public.price_anomalies_resolved SET prodotto_id = p_primary_id WHERE prodotto_id = v_dup_id;

    -- competitor_products: nullable, nessuna FK reale -> reassign manuale
    UPDATE public.competitor_products SET nostro_prodotto_id = p_primary_id WHERE nostro_prodotto_id = v_dup_id;

    -- customer_product_prices: UNIQUE(customer_id, company_id, product_id) -> dedupe poi reassign
    DELETE FROM public.customer_product_prices cpp
      WHERE cpp.product_id = v_dup_id
        AND EXISTS (SELECT 1 FROM public.customer_product_prices p2
                    WHERE p2.product_id = p_primary_id
                      AND p2.customer_id = cpp.customer_id
                      AND p2.company_id = cpp.company_id);
    UPDATE public.customer_product_prices SET product_id = p_primary_id WHERE product_id = v_dup_id;

    -- rimuove il duplicato: intercettato da soft_delete_intercept() -> soft delete,
    -- stesso comportamento del pulsante "Elimina" prodotto gia' esistente.
    DELETE FROM public.prodotti WHERE id = v_dup_id;
  END LOOP;

  INSERT INTO public.prodotti_merge_log (
    user_id, azienda_id, primary_prodotto_id, primary_prodotto_nome, merged_prodotti, note
  ) VALUES (
    v_uid, v_primary.azienda_id, p_primary_id, v_primary.nome, v_merged_names, p_note
  );
END;
$$;

REVOKE ALL ON FUNCTION public.merge_prodotti(uuid, uuid[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_prodotti(uuid, uuid[], text) TO authenticated;
