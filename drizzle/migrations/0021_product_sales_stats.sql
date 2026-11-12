COMMENT ON COLUMN public.ordini_righe.pezzi_sfusi IS 'DEPRECATED: unused; loose pieces are stored in quantita_pezzi.';
COMMENT ON COLUMN public.ordini_righe.quantita_pezzi IS 'Loose purchased pieces beyond whole cartons (total pieces = quantita_pezzi + quantita_cartoni * pezzi_per_cartone).';

-- Freeze pieces-per-carton on existing rows so later catalog edits do not rewrite history
UPDATE public.ordini_righe r SET pezzi_per_cartone = p.pezzi_per_cartone
FROM public.prodotti p
WHERE p.id = r.prodotto_id AND r.pezzi_per_cartone IS NULL AND p.pezzi_per_cartone IS NOT NULL AND p.pezzi_per_cartone > 0;

CREATE INDEX IF NOT EXISTS ordini_righe_ordine_id_idx ON public.ordini_righe (ordine_id);
CREATE INDEX IF NOT EXISTS ordini_data_ordine_idx ON public.ordini (data_ordine);

-- Per-product sales from real order rows; revenue = ordini.totale allocated by net row value.
CREATE OR REPLACE FUNCTION public.product_sales_stats(
  p_from date, p_to date,
  p_azienda_id uuid DEFAULT NULL, p_cliente_id uuid DEFAULT NULL, p_prodotto_id uuid DEFAULT NULL
)
RETURNS TABLE (
  prodotto_id uuid, nome text, codice text, formato text, azienda_id uuid, azienda_nome text, attivo boolean,
  fatturato numeric, cartoni numeric, pezzi_sfusi numeric, pezzi numeric, righe_senza_confezione integer,
  omaggio_cartoni numeric, omaggio_pezzi numeric, righe integer, ordini integer
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH o AS (
    SELECT o.id, COALESCE(o.totale, 0) AS totale
    FROM public.ordini o
    WHERE o.deleted_at IS NULL
      AND o.status NOT IN ('annullato', 'stand_by')
      AND COALESCE(o.data_ordine, o.data_conferma, o.created_at::date) BETWEEN p_from AND p_to
      AND (p_azienda_id IS NULL OR o.azienda_id = p_azienda_id)
      AND (p_cliente_id IS NULL OR o.cliente_id = p_cliente_id)
      AND (NOT public.is_agency_member(auth.uid()) OR public.is_agency_member(o.user_id))
  ), r AS (
    SELECT r.id, r.ordine_id, r.prodotto_id, COALESCE(r.is_omaggio, false) AS omaggio,
      COALESCE(r.quantita_cartoni, 0)::numeric AS cart, COALESCE(r.quantita_pezzi, 0)::numeric AS sfusi,
      NULLIF(COALESCE(r.pezzi_per_cartone, p.pezzi_per_cartone), 0)::numeric AS ppc,
      (COALESCE(r.quantita_pezzi, 0) + COALESCE(r.quantita_cartoni, 0) * COALESCE(NULLIF(COALESCE(r.pezzi_per_cartone, p.pezzi_per_cartone), 0), 1))
        * COALESCE(r.prezzo_unitario, 0) * (1 - COALESCE(r.sc1, 0) / 100.0) * (1 - COALESCE(r.sc2, 0) / 100.0) * (1 - COALESCE(r.sc3, 0) / 100.0) AS netto,
      o.totale
    FROM public.ordini_righe r
    JOIN o ON o.id = r.ordine_id
    LEFT JOIN public.prodotti p ON p.id = r.prodotto_id
  ), w AS (
    SELECT ordine_id, SUM(CASE WHEN omaggio THEN 0 ELSE netto END) AS tot FROM r GROUP BY ordine_id
  ), a AS (
    SELECT r.*, CASE WHEN r.omaggio OR w.tot <= 0 OR r.totale <= 0 THEN 0 ELSE r.netto / w.tot * r.totale END AS alloc
    FROM r JOIN w USING (ordine_id)
    WHERE r.prodotto_id IS NOT NULL AND (p_prodotto_id IS NULL OR r.prodotto_id = p_prodotto_id)
  )
  SELECT a.prodotto_id, p.nome, p.codice, p.formato, p.azienda_id, az.nome, (p.deleted_at IS NULL),
    ROUND(SUM(a.alloc), 2),
    SUM(CASE WHEN a.omaggio THEN 0 ELSE a.cart END),
    SUM(CASE WHEN a.omaggio THEN 0 ELSE a.sfusi END),
    SUM(CASE WHEN a.omaggio THEN 0 ELSE a.sfusi + a.cart * COALESCE(a.ppc, 0) END),
    COUNT(*) FILTER (WHERE a.cart > 0 AND a.ppc IS NULL)::integer,
    SUM(CASE WHEN a.omaggio THEN a.cart ELSE 0 END),
    SUM(CASE WHEN a.omaggio THEN a.sfusi + a.cart * COALESCE(a.ppc, 0) ELSE 0 END),
    COUNT(*)::integer,
    COUNT(DISTINCT a.ordine_id)::integer
  FROM a
  LEFT JOIN public.prodotti p ON p.id = a.prodotto_id
  LEFT JOIN public.aziende az ON az.id = p.azienda_id
  GROUP BY a.prodotto_id, p.nome, p.codice, p.formato, p.azienda_id, az.nome, p.deleted_at
$$;

-- Reconciliation of the same order selection: how much order value has product detail.
CREATE OR REPLACE FUNCTION public.product_sales_coverage(
  p_from date, p_to date, p_azienda_id uuid DEFAULT NULL, p_cliente_id uuid DEFAULT NULL
)
RETURNS TABLE (ordini_inclusi integer, valore_ordini numeric, ordini_con_righe integer, valore_con_righe numeric, ordini_senza_righe integer, valore_senza_righe numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH o AS (
    SELECT o.id, COALESCE(o.totale, 0) AS totale,
      EXISTS (SELECT 1 FROM public.ordini_righe r WHERE r.ordine_id = o.id AND r.prodotto_id IS NOT NULL AND NOT COALESCE(r.is_omaggio, false)) AS has_rows
    FROM public.ordini o
    WHERE o.deleted_at IS NULL
      AND o.status NOT IN ('annullato', 'stand_by')
      AND COALESCE(o.data_ordine, o.data_conferma, o.created_at::date) BETWEEN p_from AND p_to
      AND (p_azienda_id IS NULL OR o.azienda_id = p_azienda_id)
      AND (p_cliente_id IS NULL OR o.cliente_id = p_cliente_id)
      AND (NOT public.is_agency_member(auth.uid()) OR public.is_agency_member(o.user_id))
  )
  SELECT COUNT(*)::integer, COALESCE(ROUND(SUM(totale), 2), 0),
    COUNT(*) FILTER (WHERE has_rows)::integer, COALESCE(ROUND(SUM(totale) FILTER (WHERE has_rows), 2), 0),
    COUNT(*) FILTER (WHERE NOT has_rows)::integer, COALESCE(ROUND(SUM(totale) FILTER (WHERE NOT has_rows), 2), 0)
  FROM o
$$;

-- Earliest year with orders, used to offer the available years dynamically.
CREATE OR REPLACE FUNCTION public.order_years()
RETURNS TABLE (anno integer, ordini integer, ordini_con_righe integer)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXTRACT(YEAR FROM COALESCE(o.data_ordine, o.data_conferma, o.created_at::date))::integer,
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM public.ordini_righe r WHERE r.ordine_id = o.id AND r.prodotto_id IS NOT NULL))::integer
  FROM public.ordini o
  WHERE o.deleted_at IS NULL AND (NOT public.is_agency_member(auth.uid()) OR public.is_agency_member(o.user_id))
  GROUP BY 1 ORDER BY 1
$$;

GRANT EXECUTE ON FUNCTION public.product_sales_stats(date, date, uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.product_sales_coverage(date, date, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.order_years() TO authenticated;
