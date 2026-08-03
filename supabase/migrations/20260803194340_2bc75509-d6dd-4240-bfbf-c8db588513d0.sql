CREATE TABLE public.customer_product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.clienti(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.aziende(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.prodotti(id) ON DELETE CASCADE,
  custom_price numeric NOT NULL CHECK (custom_price >= 0),
  valid_from date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, company_id, product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_product_prices TO authenticated;
GRANT ALL ON public.customer_product_prices TO service_role;

ALTER TABLE public.customer_product_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_customer_product_prices" ON public.customer_product_prices FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE INDEX idx_customer_product_prices_lookup ON public.customer_product_prices(customer_id, company_id);
CREATE INDEX idx_customer_product_prices_product ON public.customer_product_prices(product_id);

CREATE TRIGGER trg_customer_product_prices_updated
  BEFORE UPDATE ON public.customer_product_prices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();