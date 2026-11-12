-- OneDrive documents: authorise through the agency data owner's allowlist entry
DROP POLICY IF EXISTS onedrive_document_authorization ON public.documenti;
CREATE POLICY onedrive_document_authorization ON public.documenti AS RESTRICTIVE FOR ALL TO public
  USING ((onedrive_item_id IS NULL) OR EXISTS (SELECT 1 FROM public.onedrive_access a WHERE a.user_id = public.agency_data_owner(auth.uid()) AND a.user_id = documenti.user_id))
  WITH CHECK ((onedrive_item_id IS NULL) OR EXISTS (SELECT 1 FROM public.onedrive_access a WHERE a.user_id = public.agency_data_owner(auth.uid()) AND a.user_id = documenti.user_id));

-- Tables whose owner policies were combined with the admin check
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['customer_product_prices','comunicazioni_log','follow_up_regole','pianificazione_settimanale','price_anomalies_resolved','product_import_jobs','product_import_rows','email_ingest']
  LOOP
    EXECUTE format('CREATE POLICY "Agency shared all" ON public.%I FOR ALL TO authenticated USING (public.is_agency_member(auth.uid()) AND public.is_agency_member(user_id)) WITH CHECK (public.is_agency_member(auth.uid()) AND public.is_agency_member(user_id))', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['customer_price_history','accepted_commercial_conditions','commercial_proposals','proposal_removals']
  LOOP
    EXECUTE format('CREATE POLICY "Agency shared select" ON public.%I FOR SELECT TO authenticated USING (public.is_agency_member(auth.uid()) AND public.is_agency_member(user_id))', t);
  END LOOP;
END $$;

CREATE POLICY "Agency shared select" ON public.proposal_acceptances FOR SELECT TO authenticated
  USING (public.is_agency_member(auth.uid()) AND EXISTS (SELECT 1 FROM public.commercial_proposals p WHERE p.id = proposal_acceptances.proposal_id AND public.is_agency_member(p.user_id)));

-- Company order-email settings: shared like the rest of the company record
CREATE POLICY "Agency shared settings select" ON public.azienda_order_email_settings FOR SELECT TO authenticated
  USING (public.is_agency_member(auth.uid()) AND public.is_agency_member(user_id));
