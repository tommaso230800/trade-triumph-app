import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import {
  computeReorderForecast,
  computeForecastKPIs,
  type ProductForecast,
  type RawRigaOrdine,
} from "@/lib/reorderForecastEngine";

export interface EnrichedForecast extends ProductForecast {
  cliente_nome: string;
  azienda_nome: string;
  prodotto_nome: string;
  prodotto_codice: string | null;
  prodotto_brand: string | null;
}

export function useReorderForecast() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reorder_forecast_v1", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      // 1. Ordini validi (esclude annullati/stand_by)
      const { data: ordini, error: eOrd } = await supabase
        .from("ordini")
        .select("id, cliente_id, azienda_id, data_ordine, status")
        .not("status", "in", '("annullato","stand_by")')
        .not("data_ordine", "is", null);
      if (eOrd) throw eOrd;
      if (!ordini || ordini.length === 0) {
        return { forecasts: [] as EnrichedForecast[], kpi: computeForecastKPIs([]) };
      }

      const ordiniMap = new Map(
        ordini.map((o) => [o.id, o] as const)
      );
      const ordineIds = ordini.map((o) => o.id);

      // 2. Righe (paginate se molte)
      const righeAll: any[] = [];
      const CHUNK = 500;
      for (let i = 0; i < ordineIds.length; i += CHUNK) {
        const slice = ordineIds.slice(i, i + CHUNK);
        const { data, error } = await supabase
          .from("ordini_righe")
          .select("ordine_id, prodotto_id, quantita_cartoni, quantita_pezzi, is_omaggio, prezzo_unitario")
          .in("ordine_id", slice);
        if (error) throw error;
        if (data) righeAll.push(...data);
      }

      const raw: RawRigaOrdine[] = righeAll
        .map((r) => {
          const o = ordiniMap.get(r.ordine_id);
          if (!o || !o.cliente_id || !o.azienda_id) return null;
          return {
            ordine_id: r.ordine_id,
            prodotto_id: r.prodotto_id,
            quantita_cartoni: Number(r.quantita_cartoni) || 0,
            quantita_pezzi: Number(r.quantita_pezzi) || 0,
            is_omaggio: !!r.is_omaggio,
            prezzo_unitario: Number(r.prezzo_unitario) || 0,
            data_ordine: o.data_ordine as string,
            cliente_id: o.cliente_id,
            azienda_id: o.azienda_id,
          } as RawRigaOrdine;
        })
        .filter(Boolean) as RawRigaOrdine[];

      const forecasts = computeReorderForecast(raw);

      // 3. Enrichment
      const clienteIds = [...new Set(forecasts.map((f) => f.cliente_id))];
      const aziendaIds = [...new Set(forecasts.map((f) => f.azienda_id))];
      const prodIds = [...new Set(forecasts.map((f) => f.prodotto_id))];

      const [cli, az, pr] = await Promise.all([
        clienteIds.length
          ? supabase.from("clienti").select("id, nome").in("id", clienteIds)
          : Promise.resolve({ data: [] as any[], error: null }),
        aziendaIds.length
          ? supabase.from("aziende").select("id, nome").in("id", aziendaIds)
          : Promise.resolve({ data: [] as any[], error: null }),
        prodIds.length
          ? supabase
              .from("prodotti")
              .select("id, nome, codice, brands(nome)")
              .in("id", prodIds)
          : Promise.resolve({ data: [] as any[], error: null }),
      ]);

      const cliMap = new Map((cli.data || []).map((c: any) => [c.id, c.nome]));
      const azMap = new Map((az.data || []).map((a: any) => [a.id, a.nome]));
      const prMap = new Map(
        (pr.data || []).map((p: any) => [
          p.id,
          { nome: p.nome, codice: p.codice, brand: p.brands?.nome || null },
        ])
      );

      const enriched: EnrichedForecast[] = forecasts.map((f) => ({
        ...f,
        cliente_nome: cliMap.get(f.cliente_id) || "—",
        azienda_nome: azMap.get(f.azienda_id) || "—",
        prodotto_nome: prMap.get(f.prodotto_id)?.nome || "—",
        prodotto_codice: prMap.get(f.prodotto_id)?.codice || null,
        prodotto_brand: prMap.get(f.prodotto_id)?.brand || null,
      }));

      return { forecasts: enriched, kpi: computeForecastKPIs(forecasts) };
    },
  });
}
