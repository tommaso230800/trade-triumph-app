import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface AgencyMember {
  user_id: string;
  username: string;
  full_name: string;
  is_owner: boolean;
  active: boolean;
  internal_identity: boolean;
}

/** Members of the shared agency workspace (visible only to members). */
export function useAgencyMembers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["agency-members", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<AgencyMember[]> => {
      const { data, error } = await supabase
        .from("agency_members")
        .select("user_id, username, full_name, is_owner, active, internal_identity")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as AgencyMember[];
    },
  });
}

export function useCurrentMember() {
  const { user } = useAuth();
  const members = useAgencyMembers();
  const me = members.data?.find((m) => m.user_id === user?.id) ?? null;
  return { me, members: members.data ?? [], isLoading: members.isLoading };
}

/** Display name for an audit user id (created_by, updated_by, sent_by). */
export function memberName(members: AgencyMember[], userId?: string | null): string | null {
  if (!userId) return null;
  return members.find((m) => m.user_id === userId)?.full_name ?? null;
}
