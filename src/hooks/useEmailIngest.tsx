import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EmailAllegato = {
  id: string;
  file_name: string;
  content_type: string | null;
  file_size: number | null;
  storage_path: string | null;
  stato: string;
  errore_testo: string | null;
  parsed_data: any;
};

export type EmailIngest = {
  id: string;
  message_id: string;
  from_email: string | null;
  from_name: string | null;
  subject: string | null;
  received_at: string;
  stato: string;
  errore_testo: string | null;
  ordine_id: string | null;
  match_score: number | null;
  match_motivo: string | null;
  email_allegati: EmailAllegato[];
  ordini?: { codice: string; totale: number | null } | null;
};

export function useEmailIngest() {
  return useQuery({
    queryKey: ["email-ingest"],
    queryFn: async (): Promise<EmailIngest[]> => {
      const { data, error } = await supabase
        .from("email_ingest")
        .select("*, email_allegati(*), ordini(codice, totale)")
        .order("received_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as unknown as EmailIngest[];
    },
  });
}

export function useEmailIngestActions() {
  const qc = useQueryClient();

  const aggiornaStato = useMutation({
    mutationFn: async ({ id, stato, ordine_id }: { id: string; stato?: string; ordine_id?: string | null }) => {
      const payload: Record<string, unknown> = {};
      if (stato) payload.stato = stato;
      if (ordine_id !== undefined) payload.ordine_id = ordine_id;
      const { error } = await supabase.from("email_ingest").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-ingest"] });
      toast.success("Email aggiornata");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const elimina = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_ingest").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-ingest"] });
      toast.success("Email eliminata");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const apriAllegato = async (path: string | null) => {
    if (!path) return;
    const { data, error } = await supabase.storage.from("documenti").createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      toast.error("Impossibile aprire l'allegato");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return { aggiornaStato, elimina, apriAllegato };
}
