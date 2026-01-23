import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Brand = {
  id: string;
  user_id: string;
  name: string;
  azienda_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function useBrands(aziendaId?: string) {
  return useQuery({
    queryKey: ["brands", aziendaId],
    queryFn: async () => {
      let query = supabase
        .from("brands")
        .select("*")
        .order("name", { ascending: true });

      if (aziendaId) {
        query = query.eq("azienda_id", aziendaId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Brand[];
    },
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (brand: { name: string; azienda_id?: string | null; notes?: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("brands")
        .insert({
          ...brand,
          user_id: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Marchio creato!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Brand> & { id: string }) => {
      const { error } = await supabase
        .from("brands")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Marchio aggiornato!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("brands").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Marchio eliminato!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}
