import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

/**
 * Promemoria personali dell'agente.
 * Usa la tabella `ai_promemoria`, PERSONALE per account (diversamente dal resto
 * dell'app, condiviso in agenzia): RLS + trigger nel database (0033) e filtro
 * esplicito qui. Cache non salvata sul dispositivo (App.tsx).
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
    // Stesso account su più dispositivi: si riallinea al ritorno sull'app e ogni minuto.
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_promemoria")
        .select("*")
        .eq("user_id", user!.id) // personali: oltre alle regole del database, filtro esplicito
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
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Promemoria> & { id: string }) => {
      if (!user?.id) throw new Error("Sessione scaduta: accedi di nuovo.");
      // Il proprietario non si cambia mai dall'app.
      const { user_id: _ignora, ...modifiche } = patch;
      const { error } = await supabase.from("ai_promemoria").update(modifiche).eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeletePromemoria() {
  const invalidate = useInvalidate();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Sessione scaduta: accedi di nuovo.");
      const { error } = await supabase.from("ai_promemoria").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Ripristina un promemoria appena eliminato (azione "Annulla" del toast). */
export function useRestorePromemoria() {
  const invalidate = useInvalidate();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (row: Promemoria) => {
      // Il database riassegna comunque il proprietario all'utente collegato.
      const { error } = await supabase.from("ai_promemoria").insert({ ...row, user_id: user?.id ?? row.user_id });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
