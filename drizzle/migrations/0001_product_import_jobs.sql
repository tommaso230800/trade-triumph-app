CREATE TABLE public.product_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  azienda_id uuid NOT NULL REFERENCES public.aziende(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  total_pages integer NOT NULL DEFAULT 0,
  chunk_status jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_import_jobs TO authenticated;
GRANT ALL ON public.product_import_jobs TO service_role;
ALTER TABLE public.product_import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_or_admin_select" ON public.product_import_jobs FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "owner_or_admin_insert" ON public.product_import_jobs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "owner_or_admin_update" ON public.product_import_jobs FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "owner_or_admin_delete" ON public.product_import_jobs FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE TABLE public.product_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.product_import_jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  azienda_id uuid NOT NULL,
  page integer,
  data jsonb NOT NULL,
  row_hash text NOT NULL,
  imported boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_import_rows TO authenticated;
GRANT ALL ON public.product_import_rows TO service_role;
ALTER TABLE public.product_import_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_or_admin_select" ON public.product_import_rows FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "owner_or_admin_insert" ON public.product_import_rows FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "owner_or_admin_update" ON public.product_import_rows FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "owner_or_admin_delete" ON public.product_import_rows FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

ALTER TABLE public.prodotti ADD COLUMN prezzo_vendita numeric;
ALTER TABLE public.prodotti ADD COLUMN iva numeric;
ALTER TABLE public.prodotti ADD COLUMN prezzo_riferimento text;