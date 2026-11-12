import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "./useAuth";

export interface OrderDraftRow {
  id: string;
  cliente_id: string | null;
  azienda_id: string | null;
  payload: Json;
  righe_count: number;
  totale: number;
  version: number;
  created_by: string | null;
  updated_by: string | null;
  updated_at: string;
}

const KEY = ["ordini-bozze"];

/** Order drafts (never counted in KPI, statistics, reorder or commissions). */
export function useOrderDrafts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...KEY, user?.id],
    enabled: !!user,
    queryFn: async (): Promise<OrderDraftRow[]> => {
      const { data, error } = await supabase
        .from("ordini_bozze")
        .select("id, cliente_id, azienda_id, payload, righe_count, totale, version, created_by, updated_by, updated_at")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as OrderDraftRow[];
    },
  });
}

export async function saveOrderDraft(input: { id?: string | null; cliente_id: string | null; azienda_id: string | null; payload: unknown; righe_count: number; totale: number }) {
  const row = {
    cliente_id: input.cliente_id || null,
    azienda_id: input.azienda_id || null,
    payload: input.payload as Json,
    righe_count: input.righe_count,
    totale: Math.round(input.totale * 100) / 100,
  };
  if (input.id) {
    const { data, error } = await supabase.from("ordini_bozze").update(row).eq("id", input.id).select("id").maybeSingle();
    if (error) throw error;
    if (data) return data.id as string;
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessione scaduta");
  const { data, error } = await supabase.from("ordini_bozze").insert({ ...row, user_id: user.id }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteOrderDraft(id: string) {
  const { error } = await supabase.from("ordini_bozze").delete().eq("id", id);
  if (error) throw error;
}

export function useDeleteOrderDraft() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: deleteOrderDraft, onSuccess: () => qc.invalidateQueries({ queryKey: KEY }) });
}

export function invalidateOrderDrafts(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ queryKey: KEY });
}
