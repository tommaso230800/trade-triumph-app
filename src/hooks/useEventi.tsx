import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  // Format date to YYYY-MM-DD for query key
  const dateKey = selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : undefined;
  
  return useQuery({
    queryKey: ["eventi", dateKey],
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
        // Format date as YYYY-MM-DD without timezone issues
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        query = query.eq("data", dateStr);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Evento[];
    },
  });
}

// Hook per recuperare tutti gli eventi futuri
export function useUpcomingEventi() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  return useQuery({
    queryKey: ["eventi", "upcoming"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventi")
        .select(`
          *,
          clienti (nome)
        `)
        .gte("data", todayStr)
        .order("data", { ascending: true })
        .order("orario_inizio", { ascending: true });

      if (error) throw error;
      return data as Evento[];
    },
  });
}

// Hook per recuperare tutti gli eventi passati
export function usePastEventi() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  return useQuery({
    queryKey: ["eventi", "past"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventi")
        .select(`
          *,
          clienti (nome)
        `)
        .lt("data", todayStr)
        .order("data", { ascending: false })
        .order("orario_inizio", { ascending: false });

      if (error) throw error;
      return data as Evento[];
    },
  });
}

export function useCreateEvento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (evento: Omit<Evento, "id" | "user_id" | "created_at" | "clienti">) => {
      const { data: { user } } = await supabase.auth.getUser();
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
