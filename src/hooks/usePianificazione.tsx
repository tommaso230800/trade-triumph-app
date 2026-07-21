import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type Pianificazione = {
  id: string;
  user_id: string;
  settimana: string;
  giorno: number;
  ora_prevista: string | null;
  cliente_id: string | null;
  note: string | null;
  stato: string;
  ordinamento: number;
};

export function usePianificazione(settimana: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pianificazione", settimana, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pianificazione_settimanale")
        .select("*")
        .eq("settimana", settimana)
        .order("giorno")
        .order("ordinamento");
      if (error) throw error;
      return (data ?? []) as Pianificazione[];
    },
  });
}

export function useSavePianificazione() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (p: Partial<Pianificazione> & { settimana: string; giorno: number }) => {
      const payload = { ...p, user_id: user!.id };
      if (p.id) {
        const { error } = await (supabase as any).from("pianificazione_settimanale").update(payload).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("pianificazione_settimanale").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Salvato");
      qc.invalidateQueries({ queryKey: ["pianificazione"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeletePianificazione() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("pianificazione_settimanale").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pianificazione"] });
    },
  });
}
