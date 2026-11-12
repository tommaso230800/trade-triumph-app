REVOKE EXECUTE ON FUNCTION public.is_agency_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_agency_member_text(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.agency_owner_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.agency_data_owner(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.agency_assign_data_owner() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_agency_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_agency_member_text(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.agency_owner_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.agency_data_owner(uuid) TO authenticated, service_role;