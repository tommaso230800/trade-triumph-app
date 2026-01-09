-- Fix function search_path for update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix function search_path for generate_order_code
CREATE OR REPLACE FUNCTION public.generate_order_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.codice := 'ORD-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('public.order_code_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$;