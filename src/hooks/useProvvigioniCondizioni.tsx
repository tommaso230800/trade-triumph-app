import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CondizioneProvvigione = {
  id: string;
  user_id: string;
  azienda_id: string;
  cliente_id: string | null;
  prodotto_id: string | null;
  categoria: string | null;
  percentuale: number;
  calcolo_su: "lordo" | "netto" | "imponibile_fattura";
  applica_su_resi: boolean;
  arrotondamento: "nessuno" | "2dec" | "intero";
  valido_da: string;
  valido_a: string | null;
  priorita: number;
  note: string | null;
  created_at: string;
  updated_at: string;
  aziende?: { nome: string } | null;
  clienti?: { nome: string } | null;
  prodotti?: { nome: string } | null;
};

export function useProvvigioniCondizioni(aziendaId?: string) {
  return useQuery({
    queryKey: ["provvigioni_condizioni", aziendaId],
    queryFn: async () => {
      let q = supabase
        .from("provvigioni_condizioni")
        .select("*, aziende(nome), clienti(nome), prodotti(nome)")
        .order("valido_da", { ascending: false });
      if (aziendaId) q = q.eq("azienda_id", aziendaId);
      const { data, error } = await q;
      if (error) throw error;
      return data as CondizioneProvvigione[];
    },
  });
}

export function useUpsertCondizione() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CondizioneProvvigione> & { azienda_id: string; percentuale: number; valido_da: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");
      const payload: any = {
        user_id: user.id,
        azienda_id: input.azienda_id,
        cliente_id: input.cliente_id || null,
        prodotto_id: input.prodotto_id || null,
        categoria: input.categoria || null,
        percentuale: input.percentuale,
        calcolo_su: input.calcolo_su || "netto",
        applica_su_resi: !!input.applica_su_resi,
        arrotondamento: input.arrotondamento || "nessuno",
        valido_da: input.valido_da,
        valido_a: input.valido_a || null,
        priorita: input.priorita ?? 0,
        note: input.note || null,
      };
      if (input.id) {
        const { error } = await supabase.from("provvigioni_condizioni").update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("provvigioni_condizioni").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["provvigioni_condizioni"] });
      qc.invalidateQueries({ queryKey: ["ordini"] });
      toast.success("Condizione salvata");
    },
    onError: (e: any) => toast.error("Errore: " + e.message),
  });
}

export function useDeleteCondizione() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("provvigioni_condizioni").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["provvigioni_condizioni"] });
      toast.success("Condizione eliminata");
    },
    onError: (e: any) => toast.error("Errore: " + e.message),
  });
}

export async function ricalcolaProvvigioneOrdine(ordineId: string) {
  const { data, error } = await supabase.rpc("calcola_provvigione_prevista", { p_ordine_id: ordineId });
  if (error) throw error;
  return data;
}
