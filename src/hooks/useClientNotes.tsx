import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface ClientNote {
  id: string;
  user_id: string;
  client_id: string;
  category: "payment" | "objections" | "preferences" | "general";
  note: string;
  created_at: string;
}

export function useClientNotes(clientId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["client_notes", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_notes")
        .select("*")
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ClientNote[];
    },
    enabled: !!user && !!clientId,
  });
}

export function useCreateClientNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (note: Omit<ClientNote, "id" | "user_id" | "created_at">) => {
      const { data, error } = await supabase
        .from("client_notes")
        .insert({ ...note, user_id: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_notes"] });
      toast.success("Nota aggiunta");
    },
    onError: () => {
      toast.error("Errore nell'aggiunta della nota");
    },
  });
}

export function useDeleteClientNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_notes"] });
      toast.success("Nota eliminata");
    },
  });
}
