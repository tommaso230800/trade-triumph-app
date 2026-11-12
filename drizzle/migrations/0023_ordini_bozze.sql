-- Order drafts live apart from ordini so they never enter KPI, statistics, reorder or commissions.
CREATE TABLE public.ordini_bozze (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid DEFAULT auth.uid(),
  cliente_id uuid,
  azienda_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  righe_count integer NOT NULL DEFAULT 0,
  totale numeric NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordini_bozze TO authenticated;
GRANT ALL ON public.ordini_bozze TO service_role;

ALTER TABLE public.ordini_bozze ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages order drafts" ON public.ordini_bozze FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Agency shared all" ON public.ordini_bozze FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid()) AND public.is_agency_member(user_id))
  WITH CHECK (public.is_agency_member(auth.uid()) AND public.is_agency_member(user_id));

CREATE INDEX ordini_bozze_user_updated_idx ON public.ordini_bozze (user_id, updated_at DESC);

CREATE OR REPLACE FUNCTION public.ordini_bozze_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.version := OLD.version + 1;
    NEW.created_by := OLD.created_by;
  END IF;
  NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER aaa_agency_data_owner BEFORE INSERT OR UPDATE OF user_id ON public.ordini_bozze
  FOR EACH ROW EXECUTE FUNCTION public.agency_assign_data_owner();
CREATE TRIGGER aab_ordini_bozze_touch BEFORE INSERT OR UPDATE ON public.ordini_bozze
  FOR EACH ROW EXECUTE FUNCTION public.ordini_bozze_touch();