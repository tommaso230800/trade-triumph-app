import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Cliente = {
  id: string;
  user_id: string;
  nome: string;
  azienda: string | null;
  email: string | null;
  telefono: string | null;
  fatturato: number;
  ordini_count: number;
  status: "premium" | "standard" | "nuovo";
  partita_iva: string | null;
  created_at: string;
};

export function useClienti(searchTerm?: string, statusFilter?: Cliente["status"] | "tutti") {
  return useQuery({
    queryKey: ["clienti", searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("clienti")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`nome.ilike.%${searchTerm}%,azienda.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      if (statusFilter && statusFilter !== "tutti") {
        query = query.eq("status", statusFilter as Cliente["status"]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Cliente[];
    },
  });
}

export function useCreateCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cliente: Omit<Cliente, "id" | "user_id" | "created_at">) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("clienti")
        .insert({ ...cliente, user_id: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clienti"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Cliente aggiunto con successo!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useDeleteCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clienti").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clienti"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Cliente eliminato!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}
