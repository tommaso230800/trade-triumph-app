import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "./useUserRole";

export function useErrorLog() {
  const isAdmin = useIsAdmin();
  return useQuery({
    queryKey: ["error-log"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("error_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBackendHealth() {
  return useQuery({
    queryKey: ["backend-health"],
    refetchInterval: 30000,
    queryFn: async () => {
      const start = performance.now();
      try {
        const { error } = await supabase.from("profiles").select("id").limit(1);
        const latency = Math.round(performance.now() - start);
        return { ok: !error, latency, error: error?.message ?? null };
      } catch (e: any) {
        return { ok: false, latency: Math.round(performance.now() - start), error: e.message };
      }
    },
  });
}

export async function logClientError(source: string, message: string, details?: any) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase as any).from("error_log").insert({
      user_id: user?.id ?? null,
      source, message,
      details: details ?? null,
      route: typeof window !== "undefined" ? window.location.pathname : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch {}
}
