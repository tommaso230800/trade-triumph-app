import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface ClientVisit {
  id: string;
  user_id: string;
  client_id: string;
  data_visita: string;
  titolo: string | null;
  esito: string | null;
  note_visita: string | null;
  azioni_future: string | null;
  created_at: string;
  updated_at: string;
  clienti?: {
    id: string;
    nome: string;
    citta: string | null;
  };
}

export function useClientVisits(filters?: {
  clientId?: string;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["client_visits", filters],
    queryFn: async () => {
      let query = supabase
        .from("client_visits")
        .select(`
          *,
          clienti:client_id (
            id,
            nome,
            citta
          )
        `)
        .order("data_visita", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters?.clientId) {
        query = query.eq("client_id", filters.clientId);
      }

      if (filters?.startDate) {
        query = query.gte("data_visita", filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte("data_visita", filters.endDate);
      }

      if (filters?.searchQuery) {
        query = query.or(`titolo.ilike.%${filters.searchQuery}%,note_visita.ilike.%${filters.searchQuery}%,azioni_future.ilike.%${filters.searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ClientVisit[];
    },
    enabled: !!user,
  });
}

export function useClientVisitsByClient(clientId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["client_visits", "by_client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_visits")
        .select("*")
        .eq("client_id", clientId!)
        .order("data_visita", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ClientVisit[];
    },
    enabled: !!user && !!clientId,
  });
}

export function useCreateClientVisit() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (visit: Omit<ClientVisit, "id" | "user_id" | "created_at" | "updated_at" | "clienti">) => {
      const { data, error } = await supabase
        .from("client_visits")
        .insert({ ...visit, user_id: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_visits"] });
      toast.success("Visita registrata con successo");
    },
    onError: () => {
      toast.error("Errore nella registrazione della visita");
    },
  });
}

export function useUpdateClientVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...visit }: Partial<ClientVisit> & { id: string }) => {
      const { data, error } = await supabase
        .from("client_visits")
        .update(visit)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_visits"] });
      toast.success("Visita aggiornata");
    },
    onError: () => {
      toast.error("Errore nell'aggiornamento della visita");
    },
  });
}

export function useDeleteClientVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_visits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_visits"] });
      toast.success("Visita eliminata");
    },
    onError: () => {
      toast.error("Errore nell'eliminazione della visita");
    },
  });
}
