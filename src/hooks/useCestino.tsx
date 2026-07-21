import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CestinoItem = {
  tipo: string;
  id: string;
  nome: string;
  user_id: string;
  deleted_at: string;
};

export function useCestino() {
  return useQuery({
    queryKey: ["cestino"],
    queryFn: async (): Promise<CestinoItem[]> => {
      const { data, error } = await (supabase as any).from("cestino_items").select("*").order("deleted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CestinoItem[];
    },
  });
}

export function useRipristinaCestino() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tipo, id }: { tipo: string; id: string }) => {
      const { error } = await (supabase as any).rpc("cestino_ripristina", { p_tipo: tipo, p_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Elemento ripristinato");
      qc.invalidateQueries({ queryKey: ["cestino"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Errore ripristino"),
  });
}

export function useEliminaDefinitivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tipo, id }: { tipo: string; id: string }) => {
      const { error } = await (supabase as any).rpc("cestino_elimina_definitivo", { p_tipo: tipo, p_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Eliminato definitivamente");
      qc.invalidateQueries({ queryKey: ["cestino"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Errore eliminazione"),
  });
}
