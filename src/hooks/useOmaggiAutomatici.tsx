import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  computeOmaggiSpettanti,
  RegolaOmaggio,
  AcquistoRiga,
  OmaggioErogatoRow,
  OmaggioSpettante,
} from "@/lib/omaggiEngine";

export interface OmaggioRegistrazione {
  cliente_id: string;
  prodotto_id: string;
  promo_id?: string | null;
  contratto_id?: string | null;
  quantita: number;
  unita: string;
  ordine_id?: string | null;
  note?: string | null;
}

export function useOmaggiSpettanti(clienteId?: string, aziendaId?: string) {
  return useQuery({
    queryKey: ["omaggi-spettanti", clienteId, aziendaId],
    queryFn: async () => {
      // 1) regole da promo_clienti (con qta_base > 0)
      const { data: promoRows, error: e1 } = await supabase
        .from("promo_clienti")
        .select("id, cliente_id, azienda_id, prodotto_id, qta_base, qta_omaggio, unita_omaggio, cumulabile_arretrati, data_inizio, data_fine, nome, attiva")
        .not("qta_base", "is", null)
        .not("qta_omaggio", "is", null)
        .eq("attiva", true);
      if (e1) throw e1;

      // 2) regole da contratti_clienti (con qta_base > 0). I contratti valgono per l'anno indicato.
      const { data: contrattiRows, error: e2 } = await supabase
        .from("contratti_clienti")
        .select("id, cliente_id, azienda_id, anno, qta_base, qta_omaggio, unita_omaggio, cumulabile_arretrati, note")
        .not("qta_base", "is", null)
        .not("qta_omaggio", "is", null);
      if (e2) throw e2;

      const regole: RegolaOmaggio[] = [];
      for (const p of (promoRows || []) as any[]) {
        if (!p.prodotto_id || !p.azienda_id) continue;
        regole.push({
          id: p.id,
          sorgente: "promo",
          cliente_id: p.cliente_id,
          azienda_id: p.azienda_id,
          prodotto_id: p.prodotto_id,
          qta_base: Number(p.qta_base),
          qta_omaggio: Number(p.qta_omaggio),
          unita: p.unita_omaggio || "cartoni",
          cumulabile_arretrati: p.cumulabile_arretrati ?? true,
          data_inizio: p.data_inizio,
          data_fine: p.data_fine,
          nome: p.nome || "Promo",
        });
      }
      for (const c of (contrattiRows || []) as any[]) {
        if (!c.azienda_id) continue;
        // I contratti nel DB attuale non hanno prodotto_id: li ignoriamo qui
        // (le regole omaggio "per contratto" richiedono prodotto specifico).
        // Se in futuro estendiamo il modello, aggiungiamo il ramo qui.
      }

      // 3) Filtri opzionali
      const regoleFilt = regole.filter(
        (r) =>
          (!aziendaId || r.azienda_id === aziendaId) &&
          (!clienteId || r.cliente_id === null || r.cliente_id === clienteId)
      );

      if (regoleFilt.length === 0) {
        return [] as OmaggioSpettante[];
      }

      const prodottiIds = Array.from(new Set(regoleFilt.map((r) => r.prodotto_id!).filter(Boolean)));
      const aziendeIds = Array.from(new Set(regoleFilt.map((r) => r.azienda_id)));

      // 4) Righe ordini rilevanti (solo confermati/attivi)
      let ordQuery = supabase
        .from("ordini_righe")
        .select(`
          prodotto_id, quantita_cartoni, quantita_pezzi, pezzi_per_cartone, is_omaggio, ordine_id,
          ordini!inner(id, cliente_id, azienda_id, data_ordine, data_conferma, status)
        `)
        .in("prodotto_id", prodottiIds);
      if (clienteId) ordQuery = ordQuery.eq("ordini.cliente_id", clienteId);
      const { data: righeRows, error: e3 } = await ordQuery;
      if (e3) throw e3;

      const acquisti: AcquistoRiga[] = ((righeRows || []) as any[])
        .filter((r) => {
          const o = r.ordini;
          if (!o) return false;
          if (["annullato", "stand_by"].includes(o.status)) return false;
          if (!aziendeIds.includes(o.azienda_id)) return false;
          return true;
        })
        .map((r) => ({
          cliente_id: r.ordini.cliente_id,
          azienda_id: r.ordini.azienda_id,
          prodotto_id: r.prodotto_id,
          data_ordine: (r.ordini.data_conferma || r.ordini.data_ordine || "").slice(0, 10),
          quantita_cartoni: Number(r.quantita_cartoni) || 0,
          quantita_pezzi: Number(r.quantita_pezzi) || 0,
          pezzi_per_cartone: Number(r.pezzi_per_cartone) || 1,
          is_omaggio: !!r.is_omaggio,
          ordine_id: r.ordine_id,
        }));

      // 5) Omaggi già erogati
      let erogQuery = supabase
        .from("omaggi_erogati")
        .select("cliente_id, prodotto_id, promo_id, contratto_id, quantita, unita");
      if (clienteId) erogQuery = erogQuery.eq("cliente_id", clienteId);
      const { data: erogRows, error: e4 } = await erogQuery;
      if (e4) throw e4;
      const erogati: OmaggioErogatoRow[] = ((erogRows || []) as any[]).map((e) => ({
        cliente_id: e.cliente_id,
        prodotto_id: e.prodotto_id,
        promo_id: e.promo_id,
        contratto_id: e.contratto_id,
        quantita: Number(e.quantita) || 0,
        unita: e.unita || "cartoni",
      }));

      return computeOmaggiSpettanti(regoleFilt, acquisti, erogati);
    },
  });
}

export function useRegistraOmaggio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: OmaggioRegistrazione) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("omaggi_erogati").insert({
        user_id: user?.id,
        cliente_id: input.cliente_id,
        prodotto_id: input.prodotto_id,
        promo_id: input.promo_id ?? null,
        contratto_id: input.contratto_id ?? null,
        quantita: input.quantita,
        unita: input.unita,
        ordine_id: input.ordine_id ?? null,
        note: input.note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["omaggi-spettanti"] });
      toast.success("Omaggio registrato");
    },
    onError: (e: any) => toast.error("Errore: " + e.message),
  });
}
