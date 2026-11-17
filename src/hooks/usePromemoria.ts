import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

/**
 * Promemoria personali dell'agente.
 * Usa la tabella esistente `ai_promemoria` (RLS: ognuno vede solo i propri).
 * stato: "da_fare" | "fatto". Un promemoria fatto resta in archivio finché non
 * viene eliminato e può essere riattivato con una nuova data.
 */
export type Promemoria = Database["public"]["Tables"]["ai_promemoria"]["Row"];
export type PromemoriaInsert = Pick<Promemoria, "titolo" | "data_promemoria"> &
  Partial<Pick<Promemoria, "descrizione" | "priorita" | "cliente_id" | "azienda_id">>;

const KEY = ["promemoria"] as const;

export function usePromemoria() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...KEY, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_promemoria")
        .select("*")
        .order("data_promemoria", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: KEY });
}

export function useCreatePromemoria() {
  const { user } = useAuth();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: PromemoriaInsert) => {
      if (!user?.id) throw new Error("Sessione scaduta: accedi di nuovo.");
      const { data, error } = await supabase
        .from("ai_promemoria")
        .insert({ ...input, user_id: user.id, stato: "da_fare" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdatePromemoria() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Promemoria> & { id: string }) => {
      const { error } = await supabase.from("ai_promemoria").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeletePromemoria() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_promemoria").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Ripristina un promemoria appena eliminato (azione "Annulla" del toast). */
export function useRestorePromemoria() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (row: Promemoria) => {
      const { error } = await supabase.from("ai_promemoria").insert(row);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
