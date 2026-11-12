import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const REORDER_TOLERANCE_DEFAULT = 6;
const LOCAL_KEY = "riordino_tolleranza";

/** Shared agency tolerance (same value used by the scheduled reorder alerts); cached locally for sync readers. */
export function useReorderTolerance() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["riordino_tolleranza", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("riordino_impostazioni").select("tolleranza").maybeSingle();
      if (error) throw error;
      const t = data?.tolleranza ?? REORDER_TOLERANCE_DEFAULT;
      try { localStorage.setItem(LOCAL_KEY, String(t)); } catch { /* storage unavailable */ }
      return t;
    },
  });
}

export async function saveReorderTolerance(t: number): Promise<void> {
  const { error } = await supabase.rpc("set_riordino_tolleranza", { p_tolleranza: t });
  if (error) throw error;
}
