import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
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
  created_at: string;
};

export function useAziende(searchTerm?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["aziende", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("aziende")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`nome.ilike.%${searchTerm}%,settore.ilike.%${searchTerm}%,citta.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Azienda[];
    },
    enabled: !!user,
  });
}

export function useCreateAzienda() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (azienda: Omit<Azienda, "id" | "user_id" | "created_at">) => {
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
