import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Alcune tabelle usate qui non sono ancora presenti nei tipi generati.
const db = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args?: any) => any };
import { toast } from "sonner";

export function useMergeProdotti() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      primaryId,
      duplicateIds,
      note,
    }: {
      primaryId: string;
      duplicateIds: string[];
      note?: string;
    }) => {
      const { error } = await db.rpc("merge_prodotti", {
        p_primary_id: primaryId,
        p_duplicate_ids: duplicateIds,
        p_note: note ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prodotti"] });
      queryClient.invalidateQueries({ queryKey: ["ordini_righe"] });
      queryClient.invalidateQueries({ queryKey: ["ordini"] });
      queryClient.invalidateQueries({ queryKey: ["client_product_history"] });
      queryClient.invalidateQueries({ queryKey: ["customer_product_prices"] });
      queryClient.invalidateQueries({ queryKey: ["canvass"] });
      queryClient.invalidateQueries({ queryKey: ["price_increases"] });
      queryClient.invalidateQueries({ queryKey: ["active_price_increases"] });
      queryClient.invalidateQueries({ queryKey: ["prodotti_merge_log"] });
      toast.success("Prodotti unificati con successo");
    },
    onError: (error: Error) => {
      toast.error("Errore durante l'unificazione: " + error.message);
    },
  });
}

export type ProdottiMergeLogEntry = {
  id: string;
  azienda_id: string;
  primary_prodotto_id: string;
  primary_prodotto_nome: string;
  merged_prodotti: { id: string; nome: string }[];
  note: string | null;
  user_id: string;
  created_at: string;
  utente: string;
};

export function useProdottiMergeLog(aziendaId?: string) {
  return useQuery({
    queryKey: ["prodotti_merge_log", aziendaId],
    queryFn: async () => {
      let query = db
        .from("prodotti_merge_log")
        .select("*")
        .order("created_at", { ascending: false });
      if (aziendaId) query = query.eq("azienda_id", aziendaId);

      const { data, error } = await query;
      if (error) throw error;
      const rows = data ?? [];

      const userIds = [...new Set(rows.map((r) => r.user_id))];
      const profileMap = new Map<string, { full_name: string | null; email: string | null }>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        (profiles ?? []).forEach((p) => profileMap.set(p.id, p));
      }

      return rows.map((r) => ({
        ...r,
        merged_prodotti: r.merged_prodotti as unknown as { id: string; nome: string }[],
        utente: profileMap.get(r.user_id)?.full_name || profileMap.get(r.user_id)?.email || "—",
      })) as ProdottiMergeLogEntry[];
    },
    enabled: !!aziendaId,
  });
}
