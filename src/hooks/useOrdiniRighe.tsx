import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type OrdineRiga = {
  id: string;
  ordine_id: string;
  prodotto_id: string;
  user_id: string;
  quantita_pezzi: number;
  quantita_cartoni: number;
  prezzo_unitario: number;
  created_at: string;
  prodotti?: { nome: string; pezzi_per_cartone: number; prezzo_listino: number } | null;
};

export function useOrdiniRighe(ordineId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ordini_righe", ordineId],
    queryFn: async () => {
      let query = supabase
        .from("ordini_righe")
        .select(`
          *,
          prodotti (nome, pezzi_per_cartone, prezzo_listino)
        `)
        .order("created_at", { ascending: true });

      if (ordineId) {
        query = query.eq("ordine_id", ordineId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as OrdineRiga[];
    },
    enabled: !!user && !!ordineId,
  });
}

export function useCreateOrdineRiga() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (riga: Omit<OrdineRiga, "id" | "user_id" | "created_at" | "prodotti">) => {
      const { data, error } = await supabase
        .from("ordini_righe")
        .insert({ ...riga, user_id: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordini_righe"] });
      queryClient.invalidateQueries({ queryKey: ["ordini"] });
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useCreateOrdineRigheBatch() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (righe: Omit<OrdineRiga, "id" | "user_id" | "created_at" | "prodotti">[]) => {
      const { data, error } = await supabase
        .from("ordini_righe")
        .insert(righe.map(r => ({ ...r, user_id: user?.id })))
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordini_righe"] });
      queryClient.invalidateQueries({ queryKey: ["ordini"] });
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useDeleteOrdineRiga() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ordini_righe").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordini_righe"] });
      queryClient.invalidateQueries({ queryKey: ["ordini"] });
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}
