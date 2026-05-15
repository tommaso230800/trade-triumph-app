import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface VisitReport {
  id: string;
  user_id: string;
  cliente_id: string;
  visit_preparation_id: string | null;
  data_visita: string;
  esito: string | null;
  ordine_preso: boolean;
  valore_ordine: number;
  prodotti_ordinati: any[];
  prodotti_proposti: any[];
  prodotti_proposti_non_ordinati: any[];
  concorrenza_rilevata: any[];
  obiezioni: string | null;
  risposte_date: string | null;
  interesse_cliente: string | null;
  umore_cliente: string | null;
  promozioni_discusse: string | null;
  campioni_lasciati: string | null;
  espositori_richiesti: string | null;
  materiale_promozionale: string | null;
  prossima_azione: string | null;
  data_follow_up: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export function useVisitReports(clienteId?: string) {
  return useQuery({
    queryKey: ["visit_reports", clienteId],
    queryFn: async () => {
      let q = supabase.from("visit_reports" as any).select("*").order("data_visita", { ascending: false });
      if (clienteId) q = q.eq("cliente_id", clienteId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as VisitReport[];
    },
  });
}

export function useCreateVisitReport() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<VisitReport> & { cliente_id: string }) => {
      const { concorrenza_rilevata, visit_preparation_id, ...rest } = input;
      const { data, error } = await supabase
        .from("visit_reports" as any)
        .insert({ ...rest, concorrenza_rilevata: concorrenza_rilevata || [], visit_preparation_id: visit_preparation_id || null, user_id: user?.id })
        .select()
        .single();
      if (error) throw error;

      // Sync concorrenza rilevata in competitor_products (upsert per nome)
      if (Array.isArray(concorrenza_rilevata) && concorrenza_rilevata.length > 0 && user?.id) {
        for (const c of concorrenza_rilevata) {
          if (!c?.nome) continue;
          // Check existing
          const { data: existing } = await supabase
            .from("competitor_products" as any)
            .select("id")
            .eq("cliente_id", input.cliente_id)
            .ilike("nome", c.nome)
            .maybeSingle();
          const payload: any = {
            user_id: user.id,
            cliente_id: input.cliente_id,
            nome: c.nome,
            marca: c.marca || null,
            prezzo_acquisto: c.prezzo_acquisto || c.prezzo || 0,
            condizioni: c.condizioni || null,
            note: c.note || null,
            last_updated_at: new Date().toISOString(),
          };
          if (existing) {
            await supabase.from("competitor_products" as any).update(payload).eq("id", (existing as any).id);
          } else {
            await supabase.from("competitor_products" as any).insert(payload);
          }
        }
      }

      // Mark preparation as report_compilato
      if (visit_preparation_id) {
        await supabase.from("visit_preparations" as any).update({ status: "report_compilato" }).eq("id", visit_preparation_id);
      }

      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["visit_reports", v.cliente_id] });
      qc.invalidateQueries({ queryKey: ["visit_reports"] });
      qc.invalidateQueries({ queryKey: ["competitor_products", v.cliente_id] });
      qc.invalidateQueries({ queryKey: ["visit_preparations"] });
      toast.success("Report visita salvato");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteVisitReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("visit_reports" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["visit_reports"] }),
  });
}
