import { reorderExclusion } from "@/lib/reorderEligibility";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import {
  analyzePair,
  computePortfolioKPIs,
  type IntelligenceOrder,
  type IntelligenceRiga,
  type PairIntelligence,
  type PortfolioKPIs,
} from "@/lib/reorderIntelligence";

export interface EnrichedPair extends PairIntelligence {
  cliente_nome: string;
  azienda_nome: string;
}

export interface ReorderIntelligenceData {
  pairs: EnrichedPair[];
  kpi: PortfolioKPIs;
  // ordini grezzi per coppia: servono al grafico portafoglio per ricalcolare
  // gli stati ai mesi passati senza nuove query
  ordersByPair: Record<string, IntelligenceOrder[]>;
  prodottiNomi: Record<string, string>;
}

export function getTolleranza(): number {
  const v = Number(localStorage.getItem("riordino_tolleranza"));
  return v >= 5 && v <= 7 ? v : 6;
}

export function setTolleranza(t: number) {
  localStorage.setItem("riordino_tolleranza", String(Math.min(7, Math.max(5, Math.round(t)))));
}

export function useReorderIntelligence() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reorder_intelligence_v1", user?.id, getTolleranza()],
    enabled: !!user,
    staleTime: 60_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<ReorderIntelligenceData> => {
     try {
      // 1. Ordini validi (esclude annullati/stand_by/bozze), paginati
      const ordini: Array<{
        id: string; cliente_id: string | null; azienda_id: string | null;
        data_ordine: string | null; status: string; totale: number | string | null; note: string | null; deleted_at: string | null; codice: string;
      }> = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from("ordini")
          .select("id, cliente_id, azienda_id, data_ordine, status, totale, note, deleted_at, codice")
          .order("id")
          .range(from, from + 999);
        if (error) throw error;
        ordini.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      if (!ordini.length) return { pairs: [], kpi: computePortfolioKPIs([]), ordersByPair: {}, prodottiNomi: {} };

      const excluded = ordini.filter(o => reorderExclusion(o));
      const valid = ordini.filter(o => !reorderExclusion(o));
      const ordineIds = valid.map((o) => o.id);

      // 2. Righe paginate (per volumi e prodotti non riordinati)
      const righeAll: any[] = [];
      const CHUNK = 500;
      for (let i = 0; i < ordineIds.length; i += CHUNK) {
        const slice = ordineIds.slice(i, i + CHUNK);
        for (let from = 0; ; from += 1000) {
          const { data, error } = await supabase
            .from("ordini_righe")
            .select("ordine_id, prodotto_id, quantita_cartoni, quantita_pezzi, is_omaggio, prezzo_unitario")
            .in("ordine_id", slice)
            .order("id")
            .range(from, from + 999);
          if (error) throw error;
          righeAll.push(...(data || []));
          if (!data || data.length < 1000) break;
        }
      }

      // 3. Aggrega per coppia cliente–azienda
      const pairOrders = new Map<string, IntelligenceOrder[]>();
      const pairRighe = new Map<string, IntelligenceRiga[]>();
      const righeByOrdine = new Map<string, any[]>();
      for (const r of righeAll) {
        if (!righeByOrdine.has(r.ordine_id)) righeByOrdine.set(r.ordine_id, []);
        righeByOrdine.get(r.ordine_id)?.push(r);
      }

      for (const o of valid) {
        if (!o.cliente_id || !o.azienda_id || !o.data_ordine) continue;
        const key = `${o.cliente_id}|${o.azienda_id}`;
        const righe = righeByOrdine.get(o.id) || [];
        const cartoni = righe.reduce((s, r) => s + (Number(r.quantita_cartoni) || 0), 0);
        const pezzi = righe.reduce((s, r) => s + (Number(r.quantita_pezzi) || 0), 0);
        if (!pairOrders.has(key)) pairOrders.set(key, []);
        pairOrders.get(key)?.push({
          id: o.id,
          data_ordine: o.data_ordine.slice(0, 10),
          totale: Number(o.totale) || 0,
          cartoni,
          pezzi,
        });
        if (!pairRighe.has(key)) pairRighe.set(key, []);
        for (const r of righe) {
          pairRighe.get(key)?.push({
            prodotto_id: r.prodotto_id,
            data_ordine: o.data_ordine.slice(0, 10),
            ordine_id: o.id,
            quantita_cartoni: Number(r.quantita_cartoni) || 0,
            quantita_pezzi: Number(r.quantita_pezzi) || 0,
            prezzo_unitario: Number(r.prezzo_unitario) || 0,
            is_omaggio: !!r.is_omaggio,
          });
        }
      }

      for (const o of excluded) {
        if (o.cliente_id && o.azienda_id && !pairOrders.has(`${o.cliente_id}|${o.azienda_id}`)) pairOrders.set(`${o.cliente_id}|${o.azienda_id}`, []);
      }
      const tolleranza = getTolleranza();
      const pairs: PairIntelligence[] = [];
      for (const [key, orders] of pairOrders) {
        const [cliente_id, azienda_id] = key.split("|");
        const result = analyzePair(cliente_id, azienda_id, orders, pairRighe.get(key) || [], { tolleranza });
        result.ordini_esclusi = excluded.filter(o => o.cliente_id === cliente_id && o.azienda_id === azienda_id).map(o => ({ id:o.id, codice:o.codice, data_ordine:o.data_ordine, motivo:reorderExclusion(o) || '' }));
        pairs.push(result);
      }

      // 4. Enrichment nomi
      const clienteIds = [...new Set(pairs.map((p) => p.cliente_id))];
      const aziendaIds = [...new Set(pairs.map((p) => p.azienda_id))];
      const [cli, az] = await Promise.all([
        clienteIds.length
          ? supabase.from("clienti").select("id, nome").in("id", clienteIds)
          : Promise.resolve({ data: [] as any[], error: null }),
        aziendaIds.length
          ? supabase.from("aziende").select("id, nome").in("id", aziendaIds)
          : Promise.resolve({ data: [] as any[], error: null }),
      ]);
      if (cli.error) throw cli.error;
      if (az.error) throw az.error;
      const cliMap = new Map((cli.data || []).map((c: any) => [c.id, c.nome]));
      const azMap = new Map((az.data || []).map((a: any) => [a.id, a.nome]));

      const enriched: EnrichedPair[] = pairs
        .map((p) => ({
          ...p,
          cliente_nome: cliMap.get(p.cliente_id) || "—",
          azienda_nome: azMap.get(p.azienda_id) || "—",
        }))
        .sort((a, b) => {
          const rank = { alta: 0, media: 1, bassa: 2 };
          if (rank[a.priorita] !== rank[b.priorita]) return rank[a.priorita] - rank[b.priorita];
          return b.giorni_ritardo - a.giorni_ritardo;
        });

      const ordersByPair: Record<string, IntelligenceOrder[]> = {};
      for (const [key, orders] of pairOrders) ordersByPair[key] = orders;

      // nomi dei prodotti non riordinati (per il dettaglio)
      const prodIds = [...new Set(enriched.flatMap((p) => p.prodotti_non_riordinati.map((x) => x.prodotto_id)))];
      const prodottiNomi: Record<string, string> = {};
      if (prodIds.length) {
        const { data: prods } = await supabase.from("prodotti").select("id, nome, codice").in("id", prodIds);
        for (const p of prods || []) prodottiNomi[p.id] = p.codice ? `${p.nome} (${p.codice})` : p.nome;
      }

      return { pairs: enriched, kpi: computePortfolioKPIs(enriched), ordersByPair, prodottiNomi };
     } catch (e) {
       console.error("reorder intelligence error", e);
       throw e;
     }
    },
  });
}
