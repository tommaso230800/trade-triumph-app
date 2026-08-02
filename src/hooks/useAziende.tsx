import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Azienda = {
  id: string;
  user_id: string;
  nome: string;
  settore: string | null;
  citta: string | null;
  indirizzo: string | null;
  telefono: string | null;
  email: string | null;
  status: "attivo" | "in_pausa";
  prodotti: number;
  logo_url: string | null;
  colore: string | null;
  partita_iva: string | null;
  provvigione_percentuale: number;
  default_sc1: number;
  default_sc2: number;
  default_sc3: number;
  created_at: string;
};

export function useAziende(searchTerm?: string) {
  return useQuery({
    queryKey: ["aziende", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("aziende")
        .select("*")
        .order("created_at", { ascending: false });

      const safeTerm = searchTerm?.trim().slice(0, 100);
      if (safeTerm) {
        query = query.or(`nome.ilike.%${safeTerm}%,settore.ilike.%${safeTerm}%,citta.ilike.%${safeTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Azienda[];
    },
  });
}

export function useCreateAzienda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (azienda: Omit<Azienda, "id" | "user_id" | "created_at" | "logo_url">) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("aziende")
        .insert({ ...azienda, user_id: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aziende"] });
      toast.success("Azienda creata con successo!");
    },
    onError: (error) => {
      toast.error("Errore nella creazione: " + error.message);
    },
  });
}

export function useUpdateAzienda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Azienda> & { id: string }) => {
      const { error } = await supabase
        .from("aziende")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aziende"] });
      toast.success("Azienda aggiornata!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useDeleteAzienda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("aziende").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aziende"] });
      toast.success("Azienda eliminata!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}
