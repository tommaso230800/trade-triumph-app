import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type ChecklistItem = { id: string; text: string; done: boolean };

export type Note = {
  id: string;
  user_id: string;
  titolo: string;
  contenuto: string | null;
  categoria: string;
  cliente_id: string | null;
  azienda_id: string | null;
  pinned: boolean;
  priorita: "alta" | "media" | "bassa";
  checklist: ChecklistItem[];
  completata: boolean;
  colore: string | null;
  data_promemoria: string | null;
  created_at: string;
  updated_at: string;
};

export const NOTE_CATEGORIES = [
  { value: "generale", label: "Generale" },
  { value: "todo", label: "Da fare" },
  { value: "cliente", label: "Cliente" },
  { value: "azienda", label: "Azienda" },
  { value: "idea", label: "Idea" },
  { value: "promemoria", label: "Promemoria" },
  { value: "trattativa", label: "Trattativa" },
];

export function useNotes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notes", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes" as any)
        .select("*")
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Note[];
    },
  });
}

export function useUpsertNote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (note: Partial<Note> & { id?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const payload: any = { ...note, user_id: user.id };
      if (note.id) {
        const { data, error } = await supabase
          .from("notes" as any)
          .update(payload)
          .eq("id", note.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("notes" as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Errore salvataggio nota"),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notes" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Nota eliminata");
    },
    onError: (e: any) => toast.error(e.message ?? "Errore eliminazione"),
  });
}
