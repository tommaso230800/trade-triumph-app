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

export function useOrdini(searchTerm?: string, statusFilter?: Ordine["status"] | "tutti") {
  return useQuery({
    queryKey: ["ordini", searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("ordini")
        .select(`
          *,
          clienti (nome, azienda),
          aziende (nome)
        `)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`codice.ilike.%${searchTerm}%`);
      }

      if (statusFilter && statusFilter !== "tutti") {
        query = query.eq("status", statusFilter as Ordine["status"]);
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
