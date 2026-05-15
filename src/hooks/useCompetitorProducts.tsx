import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface CompetitorProduct {
  id: string;
  user_id: string;
  cliente_id: string;
  categoria: string | null;
  nome: string;
  marca: string | null;
  formato: string | null;
  prezzo_acquisto: number;
  prezzo_vendita: number;
  margine_stimato: number;
  sconto: number;
  omaggi: string | null;
  condizioni: string | null;
  pagamento: string | null;
  frequenza: string | null;
  quantita_abituale: string | null;
  agente_concorrente: string | null;
  soddisfazione: number | null;
  punti_forti: string | null;
  punti_deboli: string | null;
  nostro_prodotto_id: string | null;
  nostro_prezzo: number | null;
  vantaggio: string | null;
  priorita: "alta" | "media" | "bassa";
  stato: "da_attaccare" | "da_monitorare" | "difficile" | "sostituito" | "perso";
  foto_url: string | null;
  note: string | null;
  last_updated_at: string;
  created_at: string;
  updated_at: string;
}

export function useCompetitorProducts(clienteId?: string) {
  return useQuery({
    queryKey: ["competitor_products", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase
        .from("competitor_products" as any)
        .select("*")
        .eq("cliente_id", clienteId)
        .order("priorita", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as CompetitorProduct[];
    },
    enabled: !!clienteId,
  });
}

export function useUpsertCompetitorProduct() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<CompetitorProduct> & { cliente_id: string; nome: string }) => {
      const payload = { ...input, user_id: user?.id, last_updated_at: new Date().toISOString() };
      if (input.id) {
        const { error } = await supabase.from("competitor_products" as any).update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("competitor_products" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["competitor_products", v.cliente_id] });
      toast.success("Concorrente salvato");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCompetitorProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("competitor_products" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitor_products"] });
      toast.success("Eliminato");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
