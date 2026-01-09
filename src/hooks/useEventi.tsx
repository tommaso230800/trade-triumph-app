import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type Evento = {
  id: string;
  user_id: string;
  titolo: string;
  descrizione: string | null;
  data: string;
  orario_inizio: string | null;
  orario_fine: string | null;
  luogo: string | null;
  cliente_id: string | null;
  tipo: "meeting" | "presentazione" | "visita" | "altro";
  created_at: string;
  clienti?: { nome: string } | null;
};

export function useEventi(selectedDate?: Date) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["eventi", selectedDate?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("eventi")
        .select(`
          *,
          clienti (nome)
        `)
        .order("data", { ascending: true })
        .order("orario_inizio", { ascending: true });

      if (selectedDate) {
        const dateStr = selectedDate.toISOString().split("T")[0];
        query = query.eq("data", dateStr);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Evento[];
    },
    enabled: !!user,
  });
}

export function useCreateEvento() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (evento: Omit<Evento, "id" | "user_id" | "created_at" | "clienti">) => {
      const { data, error } = await supabase
        .from("eventi")
        .insert({ ...evento, user_id: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventi"] });
      toast.success("Evento creato!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useDeleteEvento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("eventi").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventi"] });
      toast.success("Evento eliminato!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}
