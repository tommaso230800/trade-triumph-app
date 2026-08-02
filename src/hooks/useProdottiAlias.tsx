import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Alcune tabelle usate qui non sono ancora presenti nei tipi generati.
const db = supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args?: any) => any };
import { toast } from "sonner";

export type ProdottoAlias = {
  id: string;
  user_id: string;
  prodotto_id: string;
  azienda_id: string;
  codice_fornitore: string | null;
  descrizione_fornitore: string | null;
  source: "manual" | "auto" | "import";
  match_count: number;
  ultimo_match: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export function useProdottiAlias(aziendaId?: string) {
  return useQuery({
    queryKey: ["prodotti_alias", aziendaId],
    queryFn: async () => {
      let q = db.from("prodotti_alias").select("*").order("updated_at", { ascending: false });
      if (aziendaId) q = q.eq("azienda_id", aziendaId);
      const { data, error } = await q;
      if (error) throw error;
      return data as ProdottoAlias[];
    },
    enabled: !!aziendaId,
  });
}

export function useUpsertProdottoAlias() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      prodotto_id: string;
      azienda_id: string;
      codice_fornitore?: string | null;
      descrizione_fornitore?: string | null;
      note?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");
      const { data, error } = await supabase
        .from("prodotti_alias")
        .upsert(
          {
            user_id: user.id,
            prodotto_id: input.prodotto_id,
            azienda_id: input.azienda_id,
            codice_fornitore: input.codice_fornitore || null,
            descrizione_fornitore: input.descrizione_fornitore || null,
            note: input.note || null,
            source: "manual",
          },
          { onConflict: "azienda_id,prodotto_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data as ProdottoAlias;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prodotti_alias"] });
      toast.success("Alias prodotto salvato: le prossime conferme di questa azienda lo riconosceranno in automatico");
    },
    onError: (e: any) => toast.error("Errore: " + e.message),
  });
}

// Incrementa match_count/ultimo_match per gli alias effettivamente usati in una
// verifica salvata (non ad ogni analisi/preview, solo quando l'esito viene
// confermato): stessa logica di resolveCliente.ts per clienti_alias.
export function useMarkAliasUsati() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const uniche = Array.from(new Set(ids));
      if (uniche.length === 0) return;
      const { data: correnti, error: readErr } = await supabase
        .from("prodotti_alias")
        .select("id, match_count")
        .in("id", uniche);
      if (readErr) throw readErr;
      const now = new Date().toISOString();
      await Promise.all(
        (correnti || []).map((a) =>
          supabase
            .from("prodotti_alias")
            .update({ match_count: (a.match_count || 0) + 1, ultimo_match: now })
            .eq("id", a.id)
        )
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prodotti_alias"] }),
  });
}

export function useDeleteProdottoAlias() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("prodotti_alias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prodotti_alias"] });
      toast.success("Alias eliminato");
    },
    onError: (e: any) => toast.error("Errore: " + e.message),
  });
}
