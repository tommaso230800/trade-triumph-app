import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Prodotto = {
  id: string;
  azienda_id: string;
  user_id: string;
  nome: string;
  codice: string | null;
  prezzo_listino: number;
  quantita_pezzi: number;
  pezzi_per_cartone: number;
  strati: number;
  cartoni_per_strato: number;
  immagine_url: string | null;
  formato: string | null;
  sc1_default: number;
  sc2_default: number;
  sc3_default: number;
  brand_id: string | null;
  created_at: string;
  updated_at: string;
};

export function useProdotti(aziendaId?: string) {
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
  });
}

export function useCreateProdotto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prodotto: Omit<Prodotto, "id" | "user_id" | "created_at" | "updated_at" | "immagine_url" | "formato" | "sc1_default" | "sc2_default" | "sc3_default" | "brand_id"> & { 
      immagine_url?: string | null;
      formato?: string | null;
      sc1_default?: number;
      sc2_default?: number;
      sc3_default?: number;
      brand_id?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("prodotti")
        .insert({ 
          ...prodotto, 
          user_id: user?.id,
          formato: prodotto.formato ?? null,
          sc1_default: prodotto.sc1_default ?? 0,
          sc2_default: prodotto.sc2_default ?? 0,
          sc3_default: prodotto.sc3_default ?? 0,
          brand_id: prodotto.brand_id ?? null,
        })
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
