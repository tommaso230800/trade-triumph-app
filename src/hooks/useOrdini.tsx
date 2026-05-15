import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Ordine = {
  id: string;
  user_id: string;
  cliente_id: string | null;
  azienda_id: string | null;
  codice: string;
  prodotti: number;
  totale: number;
  note: string | null;
  sconto: number;
  sconto_merce: number;
  tipo_pagamento: string;
  status: "in_attesa" | "spedito" | "completato" | "annullato";
  provvigione_pagata: boolean;
  created_at: string;
  data_ordine: string | null;
  clienti?: { nome: string; azienda: string | null } | null;
  aziende?: { nome: string } | null;
};

export function useOrdini(
  searchTerm?: string,
  statusFilter?: Ordine["status"] | "tutti",
  monthFilters?: string[] // ["YYYY-MM", ...]
) {
  return useQuery({
    queryKey: ["ordini", searchTerm, statusFilter, monthFilters?.join(",")],
    queryFn: async () => {
      // Se cerchiamo un prodotto, prima troviamo gli ordini che lo contengono
      let ordineIdsByProduct: string[] | null = null;
      const term = (searchTerm || "").trim();
      if (term.length >= 2) {
        const { data: righeMatch } = await supabase
          .from("ordini_righe")
          .select("ordine_id, prodotti!inner(nome, codice)")
          .or(`nome.ilike.%${term}%,codice.ilike.%${term}%`, { foreignTable: "prodotti" });
        if (righeMatch) {
          ordineIdsByProduct = Array.from(new Set(righeMatch.map((r: any) => r.ordine_id)));
        }
      }

      let query = supabase
        .from("ordini")
        .select(`
          *,
          clienti (nome, azienda),
          aziende (nome)
        `)
        .order("data_ordine", { ascending: false });

      if (term) {
        const orParts = [
          `codice.ilike.%${term}%`,
          `clienti.nome.ilike.%${term}%`,
          `clienti.azienda.ilike.%${term}%`,
          `aziende.nome.ilike.%${term}%`,
        ];
        if (ordineIdsByProduct && ordineIdsByProduct.length > 0) {
          orParts.push(`id.in.(${ordineIdsByProduct.join(",")})`);
        }
        query = query.or(orParts.join(","));
      }

      if (statusFilter && statusFilter !== "tutti") {
        query = query.eq("status", statusFilter as Ordine["status"]);
      }

      if (monthFilters && monthFilters.length > 0) {
        // Costruisce range OR: data_ordine compresa in uno dei mesi selezionati
        const ranges = monthFilters.map((m) => {
          const [y, mo] = m.split("-").map(Number);
          const start = new Date(Date.UTC(y, mo - 1, 1)).toISOString().slice(0, 10);
          const end = new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 10);
          return `and(data_ordine.gte.${start},data_ordine.lt.${end})`;
        });
        query = query.or(ranges.join(","));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Ordine[];
    },
  });
}

export function useCreateOrdine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ordine: { 
      cliente_id?: string; 
      azienda_id?: string; 
      prodotti: number; 
      totale: number; 
      note?: string;
      sconto?: number;
      sconto_merce?: number;
      tipo_pagamento?: string;
      data_ordine?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("ordini")
        .insert({ ...ordine, user_id: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordini"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Ordine creato con successo!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useUpdateOrdineStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Ordine["status"] }) => {
      const { error } = await supabase
        .from("ordini")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordini"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Stato ordine aggiornato!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useUpdateProvvigionePagata() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, provvigione_pagata }: { id: string; provvigione_pagata: boolean }) => {
      const { error } = await supabase
        .from("ordini")
        .update({ provvigione_pagata })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordini"] });
      toast.success("Stato provvigione aggiornato!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useUpdateOrdine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ordine: { 
      id: string;
      cliente_id?: string | null; 
      azienda_id?: string | null; 
      sconto?: number;
      sconto_merce?: number;
      tipo_pagamento?: string;
      note?: string | null;
      data_ordine?: string | null;
      totale?: number;
      prodotti?: number;
    }) => {
      const { id, ...updates } = ordine;
      const { error } = await supabase
        .from("ordini")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordini"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["kpi_stats"] });
      queryClient.invalidateQueries({ queryKey: ["cliente_ordini"] });
      toast.success("Ordine aggiornato con successo!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}
