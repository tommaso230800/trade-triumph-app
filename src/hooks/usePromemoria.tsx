import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Promemoria = {
  id: string;
  user_id: string;
  titolo: string;
  descrizione: string | null;
  data: string;
  orario: string | null;
  tipo: "call" | "email" | "documento" | "scadenza";
  priorita: "alta" | "media" | "bassa";
  completato: boolean;
  created_at: string;
};

export function usePromemoria() {
  return useQuery({
    queryKey: ["promemoria"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promemoria")
        .select("*")
        .order("data", { ascending: true })
        .order("orario", { ascending: true });

      if (error) throw error;
      return data as Promemoria[];
    },
  });
}

export function useCreatePromemoria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (promemoria: Omit<Promemoria, "id" | "user_id" | "created_at" | "completato">) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("promemoria")
        .insert({ ...promemoria, user_id: user?.id, completato: false })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promemoria"] });
      toast.success("Promemoria creato!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useTogglePromemoria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, completato }: { id: string; completato: boolean }) => {
      const { error } = await supabase
        .from("promemoria")
        .update({ completato })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { completato }) => {
      queryClient.invalidateQueries({ queryKey: ["promemoria"] });
      toast.success(completato ? "Completato!" : "Riaperto");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useDeletePromemoria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promemoria").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promemoria"] });
      toast.success("Promemoria eliminato!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}
