import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toLocalISODate, parseLocalDate } from "@/lib/periodRange";
import { allocateRevenueByRiga, type OrdineLike } from "@/lib/metricsEngine";
import { applyOrdiniFilters, filterOrdiniByBrand, filteredOrderRevenue, rigaMatchesBrand, RIGHE_SELECT } from "@/lib/analyticsFilters";

export type KPIYoYFilters = {
  clienteIds: string[];
  aziendaIds: string[];
  brandIds: string[];
  startDate: Date | null;
  endDate: Date | null;
};

export type DimensionYoY = {
  id: string;
  curr: number;
  prev: number;
  delta: number;
  deltaPct: number;
};

type KPIYoYResult = {
  curr: Awaited<ReturnType<typeof fetchAggregates>>;
  prev: Awaited<ReturnType<typeof fetchAggregates>>;
  delta: number;
  deltaPct: number;
  yearCurr: number;
  yearPrev: number;
  monthlyComparison: Array<{
    mese: string;
    curr: number;
    prev: number;
    delta: number;
    deltaPct: number;
    ordiniCurr: number;
    ordiniPrev: number;
  }>;
  clientiYoY: Map<string, DimensionYoY>;
  aziendeYoY: Map<string, DimensionYoY>;
  brandsYoY: Map<string, DimensionYoY>;
  prodottiYoY: Map<string, DimensionYoY>;
};

function restoreDimensionMap(value: unknown): Map<string, DimensionYoY> {
  if (value instanceof Map) return value;
  if (Array.isArray(value)) return new Map(value as Array<[string, DimensionYoY]>);
  if (value && typeof value === "object") {
    return new Map(Object.entries(value as Record<string, DimensionYoY>));
  }
  return new Map();
}

// Confini di periodo nel fuso locale: usare toISOString() farebbe rientrare
// gli ordini dell'ultimo giorno del mese precedente.
const toISO = (d: Date) => toLocalISODate(d);

const monthsIT = ["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"];


async function fetchAggregates(start: Date, end: Date, filters: KPIYoYFilters) {
  const q = applyOrdiniFilters(
    supabase
      .from("ordini")
      .select(`id, totale, data_ordine, cliente_id, azienda_id, ${RIGHE_SELECT}`)
      .not("status", "in", "(annullato,stand_by)"),
    filters, start, end
  );
  const { data, error } = await q;
  if (error) throw error;
  const ordini = filterOrdiniByBrand((data || []) as any[], filters.brandIds);

  let fatturato = 0;
  let pezzi = 0;
  const ordiniCount = ordini.length;
  const perCliente = new Map<string, number>();
  const perAzienda = new Map<string, number>();
  const perBrand = new Map<string, number>();
  const perProdotto = new Map<string, { fatt: number; pezzi: number }>();
  const monthly: Record<string, number> = {};
  monthsIT.forEach(m => monthly[m] = 0);

  ordini.forEach((o: any) => {
    const tot = filteredOrderRevenue(o, filters.brandIds);
    fatturato += tot;
    const alloc = allocateRevenueByRiga(o as OrdineLike);
    const d = parseLocalDate(o.data_ordine);
    if (d) monthly[monthsIT[d.getMonth()]] += tot;


    if (o.cliente_id) perCliente.set(o.cliente_id, (perCliente.get(o.cliente_id) || 0) + tot);
    if (o.azienda_id) perAzienda.set(o.azienda_id, (perAzienda.get(o.azienda_id) || 0) + tot);

    o.ordini_righe?.forEach((r: any, idx: number) => {
      if (!r.prodotti) return;
      if (!rigaMatchesBrand(r, filters.brandIds)) return;
      const cart = r.quantita_cartoni || 0;
      const pz = (r.quantita_pezzi || 0) + cart * (r.prodotti.pezzi_per_cartone || 1);
      const rf = alloc[idx] || 0;
      pezzi += pz;
      if (r.prodotti.brand_id) {
        perBrand.set(r.prodotti.brand_id, (perBrand.get(r.prodotti.brand_id) || 0) + rf);
      }
      const ex = perProdotto.get(r.prodotto_id);
      if (ex) { ex.fatt += rf; ex.pezzi += pz; }
      else perProdotto.set(r.prodotto_id, { fatt: rf, pezzi: pz });
    });
  });

  return { fatturato, pezzi, ordiniCount, perCliente, perAzienda, perBrand, perProdotto, monthly };
}

export function useKPIYoY(filters: KPIYoYFilters) {
  return useQuery<KPIYoYResult, Error, KPIYoYResult>({
    queryKey: ["kpi_yoy", filters],
    enabled: !!filters.startDate && !!filters.endDate,
    queryFn: async () => {
      const start = filters.startDate!;
      const end = filters.endDate!;
      const prevStart = new Date(start); prevStart.setFullYear(prevStart.getFullYear() - 1);
      const prevEnd = new Date(end); prevEnd.setFullYear(prevEnd.getFullYear() - 1);

      const [curr, prev] = await Promise.all([
        fetchAggregates(start, end, filters),
        fetchAggregates(prevStart, prevEnd, filters),
      ]);

      // Build full-year monthly comparison for the year of `end`
      const yearCurr = end.getFullYear();
      const yearPrev = yearCurr - 1;

      // Due anni interi, senza filtro cliente/azienda/brand: può facilmente
      // superare le 1000 righe che Supabase restituisce di default per
      // risposta. Senza ORDER BY + paginazione, l'ordinamento di ritorno non
      // è garantito: la risposta troncata poteva escludere ordini reali
      // recenti in modo silenzioso, nessun errore, nessun avviso. Si pagina
      // finché non arrivano meno righe di quelle richieste.
      let yearOrdini: any[] = [];
      {
        const pageSize = 1000;
        let from = 0;
        while (true) {
          const { data, error } = await applyOrdiniFilters(
            supabase
              .from("ordini")
              .select(`id, totale, data_ordine, ${RIGHE_SELECT}`)
              .not("status", "in", "(annullato,stand_by)"),
            filters,
            new Date(yearPrev, 0, 1),
            new Date(yearCurr, 11, 31)
          )
            .order("data_ordine", { ascending: true })
            .range(from, from + pageSize - 1);
          if (error) throw error;
          if (!data || data.length === 0) break;
          yearOrdini = yearOrdini.concat(data);
          if (data.length < pageSize) break;
          from += pageSize;
        }
      }

      const monthlyCurr: Record<string, number> = {};
      const monthlyPrev: Record<string, number> = {};
      const monthlyOrdiniCurr: Record<string, number> = {};
      const monthlyOrdiniPrev: Record<string, number> = {};
      monthsIT.forEach(m => { monthlyCurr[m] = 0; monthlyPrev[m] = 0; monthlyOrdiniCurr[m] = 0; monthlyOrdiniPrev[m] = 0; });
      filterOrdiniByBrand(yearOrdini, filters.brandIds).forEach((o: any) => {
        const tot = filteredOrderRevenue(o, filters.brandIds);
        const d = parseLocalDate(o.data_ordine);
        if (!d) return;
        const m = monthsIT[d.getMonth()];
        const y = d.getFullYear();

        if (y === yearCurr) { monthlyCurr[m] += tot; monthlyOrdiniCurr[m] += 1; }
        else if (y === yearPrev) { monthlyPrev[m] += tot; monthlyOrdiniPrev[m] += 1; }
      });

      const monthlyComparison = monthsIT.map(m => ({
        mese: m.charAt(0).toUpperCase() + m.slice(1),
        curr: monthlyCurr[m],
        prev: monthlyPrev[m],
        delta: monthlyCurr[m] - monthlyPrev[m],
        deltaPct: monthlyPrev[m] > 0 ? ((monthlyCurr[m] - monthlyPrev[m]) / monthlyPrev[m]) * 100 : 0,
        ordiniCurr: monthlyOrdiniCurr[m],
        ordiniPrev: monthlyOrdiniPrev[m],
      }));

      const buildDim = (c: Map<string, number>, p: Map<string, number>): Map<string, DimensionYoY> => {
        const ids = new Set([...c.keys(), ...p.keys()]);
        const out = new Map<string, DimensionYoY>();
        ids.forEach(id => {
          const cv = c.get(id) || 0;
          const pv = p.get(id) || 0;
          out.set(id, {
            id,
            curr: cv,
            prev: pv,
            delta: cv - pv,
            deltaPct: pv > 0 ? ((cv - pv) / pv) * 100 : (cv > 0 ? 100 : 0),
          });
        });
        return out;
      };

      const delta = curr.fatturato - prev.fatturato;
      const deltaPct = prev.fatturato > 0
        ? ((curr.fatturato - prev.fatturato) / prev.fatturato) * 100
        : (curr.fatturato > 0 ? 100 : 0);

      return {
        curr,
        prev,
        delta,
        deltaPct,
        yearCurr,
        yearPrev,
        monthlyComparison,
        clientiYoY: buildDim(curr.perCliente, prev.perCliente),
        aziendeYoY: buildDim(curr.perAzienda, prev.perAzienda),
        brandsYoY: buildDim(curr.perBrand, prev.perBrand),
        prodottiYoY: buildDim(
          new Map(Array.from(curr.perProdotto.entries()).map(([k,v]) => [k, v.fatt])),
          new Map(Array.from(prev.perProdotto.entries()).map(([k,v]) => [k, v.fatt])),
        ),
      };
    },
    // Le Map diventano oggetti quando React Query ripristina la cache JSON.
    // Le ricostruiamo sempre prima di consegnare i dati alle schermate.
    select: (data) => ({
      ...data,
      clientiYoY: restoreDimensionMap(data.clientiYoY),
      aziendeYoY: restoreDimensionMap(data.aziendeYoY),
      brandsYoY: restoreDimensionMap(data.brandsYoY),
      prodottiYoY: restoreDimensionMap(data.prodottiYoY),
    }),
  });
}
