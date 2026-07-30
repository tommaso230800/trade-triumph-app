import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ConfrontoEsito, CRMRiga } from "@/lib/orderMatchEngine";

export type OrdineConferma = {
  id: string;
  user_id: string;
  ordine_id: string;
  documento_id: string | null;
  nome_sorgente: string | null;
  esito: ConfrontoEsito;
  score: number;
  righe_ok: number;
  righe_diff: number;
  righe_mancanti: number;
  righe_extra: number;
  note: string | null;
  verificato_manualmente: boolean;
  created_at: string;
  updated_at: string;
};

export function useOrdineConferme(ordine_id?: string) {
  return useQuery({
    queryKey: ["ordini_conferme", ordine_id],
    queryFn: async () => {
      if (!ordine_id) return [];
      const { data, error } = await supabase
        .from("ordini_conferme")
        .select("*")
        .eq("ordine_id", ordine_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OrdineConferma[];
    },
    enabled: !!ordine_id,
  });
}

export async function loadCRMRighe(ordine_id: string): Promise<CRMRiga[]> {
  const { data, error } = await supabase
    .from("ordini_righe")
    .select("id, prodotto_id, quantita_cartoni, quantita_pezzi, prezzo_unitario, sc1, sc2, sc3, is_omaggio, prodotti(nome, codice, pezzi_per_cartone)")
    .eq("ordine_id", ordine_id);
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    prodotto_id: r.prodotto_id,
    prodotto_nome: r.prodotti?.nome ?? null,
    prodotto_codice: r.prodotti?.codice ?? null,
    quantita_cartoni: Number(r.quantita_cartoni ?? 0),
    quantita_pezzi: Number(r.quantita_pezzi ?? 0),
    pezzi_per_cartone: Number(r.prodotti?.pezzi_per_cartone ?? 1) || 1,
    prezzo_unitario: Number(r.prezzo_unitario ?? 0),
    sc1: Number(r.sc1 ?? 0),
    sc2: Number(r.sc2 ?? 0),
    sc3: Number(r.sc3 ?? 0),
    is_omaggio: !!r.is_omaggio,
  }));
}

export function useSaveOrdineConferma() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      ordine_id: string;
      documento_id?: string | null;
      nome_sorgente?: string | null;
      esito: ConfrontoEsito;
      note?: string | null;
      verificato_manualmente?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");

      const { data, error } = await supabase
        .from("ordini_conferme")
        .insert({
          user_id: user.id,
          ordine_id: input.ordine_id,
          documento_id: input.documento_id ?? null,
          nome_sorgente: input.nome_sorgente ?? null,
          esito: input.esito as any,
          score: input.esito.score,
          righe_ok: input.esito.righe_ok,
          righe_diff: input.esito.righe_diff,
          righe_mancanti: input.esito.righe_mancanti,
          righe_extra: input.esito.righe_extra,
          note: input.note ?? null,
          verificato_manualmente: !!input.verificato_manualmente,
        })
        .select()
        .single();
      if (error) throw error;

      // aggiorna flag su ordini se verifica manuale
      if (input.verificato_manualmente) {
        await supabase
          .from("ordini")
          .update({ verificato_conferma: true, verificato_conferma_at: new Date().toISOString() })
          .eq("id", input.ordine_id);
      }
      return data as OrdineConferma;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["ordini_conferme", v.ordine_id] });
      qc.invalidateQueries({ queryKey: ["ordini"] });
      toast.success("Confronto conferma salvato");
    },
    onError: (e: any) => toast.error("Errore: " + e.message),
  });
}

// Segna/rimuove la verifica di un ordine in base al solo caricamento (o
// rimozione) della conferma d'ordine, senza passare da un confronto AI.
export function useSetOrdineVerificatoConferma() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ordine_id, verificato }: { ordine_id: string; verificato: boolean }) => {
      const { error } = await supabase
        .from("ordini")
        .update({
          verificato_conferma: verificato,
          verificato_conferma_at: verificato ? new Date().toISOString() : null,
        })
        .eq("id", ordine_id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["ordini"] });
      toast.success(v.verificato ? "Ordine segnato come verificato" : "Verifica rimossa");
    },
    onError: (e: any) => toast.error("Errore: " + e.message),
  });
}
