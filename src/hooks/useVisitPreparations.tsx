import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface VisitPreparation {
  id: string;
  user_id: string;
  cliente_id: string;
  visit_date: string | null;
  status: "preparata" | "visita_fatta" | "report_compilato" | "archiviata";
  riepilogo_cliente: string | null;
  storico_commerciale: string | null;
  analisi_concorrenza: string | null;
  obiettivo_visita: string | null;
  proposta_consigliata: string | null;
  argomenti_vendita: string | null;
  obiezioni_previste: string | null;
  domande_consigliate: string | null;
  prossima_azione: string | null;
  contenuto_completo: any;
  created_at: string;
  updated_at: string;
}

export function useVisitPreparations(clienteId?: string) {
  return useQuery({
    queryKey: ["visit_preparations", clienteId],
    queryFn: async () => {
      let q = supabase.from("visit_preparations" as any).select("*").order("created_at", { ascending: false });
      if (clienteId) q = q.eq("cliente_id", clienteId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as VisitPreparation[];
    },
  });
}

export function usePrepareVisitAI() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { cliente_id: string; visit_date?: string }) => {
      const { data, error } = await supabase.functions.invoke("prepare-visit", { body: input });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return (data as any).preparation as VisitPreparation;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["visit_preparations", v.cliente_id] });
      qc.invalidateQueries({ queryKey: ["visit_preparations"] });
      toast.success("Preparazione AI generata");
    },
    onError: (e: Error) => toast.error("AI: " + e.message),
  });
}

export function useUpdateVisitPreparation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<VisitPreparation> & { id: string }) => {
      const { error } = await supabase.from("visit_preparations" as any).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visit_preparations"] });
      toast.success("Preparazione aggiornata");
    },
  });
}

export function useDeleteVisitPreparation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("visit_preparations" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["visit_preparations"] }),
  });
}
