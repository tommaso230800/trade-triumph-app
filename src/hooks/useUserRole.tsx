import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AppRole = "admin" | "agente" | "collaboratore" | "amministrazione" | "brand_ambassador" | "readonly";

export function useUserRoles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-roles", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<AppRole[]> => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.role as AppRole);
    },
  });
}

export function useIsAdmin() {
  const { data } = useUserRoles();
  return !!data?.some((r) => r === "admin" || r === "amministrazione");
}

export function useAllUsersRoles() {
  return useQuery({
    queryKey: ["all-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("id, user_id, role, created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}
