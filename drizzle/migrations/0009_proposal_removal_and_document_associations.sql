CREATE TABLE public.proposal_removals (proposal_id uuid PRIMARY KEY REFERENCES public.commercial_proposals(id), user_id uuid NOT NULL, removed_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.proposal_removals TO authenticated;
GRANT ALL ON public.proposal_removals TO service_role;
ALTER TABLE public.proposal_removals ENABLE ROW LEVEL SECURITY;
CREATE POLICY proposal_removals_owner ON public.proposal_removals FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_admin(auth.uid()));
ALTER TABLE public.documenti ADD COLUMN association_status text NOT NULL DEFAULT 'review' CHECK(association_status IN ('automatic','manual','review')), ADD COLUMN association_details jsonb NOT NULL DEFAULT '{}'::jsonb;
UPDATE public.documenti SET association_status='manual' WHERE company_id IS NOT NULL OR customer_id IS NOT NULL OR entita_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.remove_commercial_proposal(p_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.commercial_proposals;
BEGIN
 SELECT * INTO p FROM public.commercial_proposals WHERE id=p_id FOR UPDATE;
 IF auth.uid() IS NULL OR p.id IS NULL OR NOT(p.user_id=auth.uid() OR public.is_admin(auth.uid())) THEN RAISE EXCEPTION 'Documento non accessibile'; END IF;
 INSERT INTO public.proposal_removals(proposal_id,user_id) VALUES(p.id,p.user_id) ON CONFLICT(proposal_id) DO NOTHING;
 IF p.status<>'accettata' THEN
  UPDATE public.documenti d SET deleted_at=now() WHERE d.proposal_id=p.id AND d.deleted_at IS NULL
   AND NOT EXISTS(SELECT 1 FROM public.proposal_acceptances a WHERE a.pdf_document_id=d.id OR a.evidence_document_id=d.id)
   AND NOT EXISTS(SELECT 1 FROM public.commercial_proposals other WHERE other.id<>p.id AND (other.pdf_document_id=d.id OR COALESCE(other.content->'attachment_ids','[]'::jsonb) ? d.id::text));
 END IF;
END; $$;
REVOKE ALL ON FUNCTION public.remove_commercial_proposal(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.remove_commercial_proposal(uuid) TO authenticated;