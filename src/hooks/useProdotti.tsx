import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type Prodotto = {
  id: string;
  azienda_id: string;
  user_id: string;
  nome: string;
  prezzo_listino: number;
  quantita_pezzi: number;
  pezzi_per_cartone: number;
  created_at: string;
  updated_at: string;
};

export function useProdotti(aziendaId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["prodotti", aziendaId],
    queryFn: async () => {
      let query = supabase
        .from("prodotti")
        .select("*")
        .order("nome", { ascending: true });

      if (aziendaId) {
        query = query.eq("azienda_id", aziendaId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Prodotto[];
    },
    enabled: !!user,
  });
}

export function useCreateProdotto() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (prodotto: Omit<Prodotto, "id" | "user_id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("prodotti")
        .insert({ ...prodotto, user_id: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prodotti"] });
      toast.success("Prodotto aggiunto!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useUpdateProdotto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Prodotto> & { id: string }) => {
      const { error } = await supabase
        .from("prodotti")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prodotti"] });
      toast.success("Prodotto aggiornato!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useDeleteProdotto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prodotti").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prodotti"] });
      toast.success("Prodotto eliminato!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}
