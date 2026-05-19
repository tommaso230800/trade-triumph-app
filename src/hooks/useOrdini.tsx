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
  status: "in_attesa" | "spedito" | "completato" | "annullato" | "stand_by";
  stand_by_motivo?: string | null;
  stand_by_prodotto_bloccato?: string | null;
  stand_by_data_prevista?: string | null;
  stand_by_note?: string | null;
  stand_by_data_inizio?: string | null;
  data_conferma?: string | null;
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
      const term = (searchTerm || "").trim().slice(0, 100);

      // Quando l'utente cerca: troviamo gli ID degli ordini il cui cliente,
      // azienda o prodotto corrispondono. Poi filtriamo per ID.
      let restrictIds: string[] | null = null;
      if (term.length >= 1) {
        const like = `%${term}%`;
        const [clRes, azRes, righeRes, codRes] = await Promise.all([
          supabase.from("clienti").select("id").or(`nome.ilike.${like},azienda.ilike.${like}`),
          supabase.from("aziende").select("id").ilike("nome", like),
          supabase
            .from("ordini_righe")
            .select("ordine_id, prodotti!inner(nome, codice)")
            .or(`nome.ilike.${like},codice.ilike.${like}`, { foreignTable: "prodotti" }),
          supabase.from("ordini").select("id").ilike("codice", like),
        ]);

        const clienteIds = (clRes.data || []).map((r: any) => r.id);
        const aziendaIds = (azRes.data || []).map((r: any) => r.id);
        const ordineIdsFromProducts = Array.from(
          new Set((righeRes.data || []).map((r: any) => r.ordine_id))
        );
        const ordineIdsFromCode = (codRes.data || []).map((r: any) => r.id);

        const idSet = new Set<string>(ordineIdsFromProducts);
        ordineIdsFromCode.forEach((id) => idSet.add(id));

        // Aggiungi tutti gli ordini collegati ai clienti/aziende trovati
        if (clienteIds.length > 0 || aziendaIds.length > 0) {
          const orParts: string[] = [];
          if (clienteIds.length > 0) orParts.push(`cliente_id.in.(${clienteIds.join(",")})`);
          if (aziendaIds.length > 0) orParts.push(`azienda_id.in.(${aziendaIds.join(",")})`);
          const { data: more } = await supabase
            .from("ordini")
            .select("id")
            .or(orParts.join(","));
          (more || []).forEach((o: any) => idSet.add(o.id));
        }

        restrictIds = Array.from(idSet);
        if (restrictIds.length === 0) return [] as Ordine[];
      }

      let query = supabase
        .from("ordini")
        .select(`
          *,
          clienti (nome, azienda),
          aziende (nome)
        `)
        .order("data_ordine", { ascending: false });

      if (restrictIds) {
        query = query.in("id", restrictIds);
      }

      if (statusFilter && statusFilter !== "tutti") {
        query = query.eq("status", statusFilter as Ordine["status"]);
      }

      if (monthFilters && monthFilters.length > 0) {
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
