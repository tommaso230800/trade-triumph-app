import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
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
  status: "in_attesa" | "spedito" | "completato" | "annullato";
  created_at: string;
  clienti?: { nome: string; azienda: string | null } | null;
  aziende?: { nome: string } | null;
};

export function useOrdini(searchTerm?: string, statusFilter?: Ordine["status"] | "tutti") {
  const { user } = useAuth();

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
    enabled: !!user,
  });
}

export function useCreateOrdine() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (ordine: { 
      cliente_id?: string; 
      azienda_id?: string; 
      prodotti: number; 
      totale: number; 
      note?: string 
    }) => {
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
