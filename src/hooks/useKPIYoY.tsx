import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toLocalISODate, parseLocalDate } from "@/lib/periodRange";

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

// Confini di periodo nel fuso locale: usare toISOString() farebbe rientrare
// gli ordini dell'ultimo giorno del mese precedente.
const toISO = (d: Date) => toLocalISODate(d);

const monthsIT = ["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"];


async function fetchAggregates(start: Date, end: Date, filters: KPIYoYFilters) {
  let q = supabase
    .from("ordini")
    .select(`
      id, totale, data_ordine, cliente_id, azienda_id,
      ordini_righe ( prodotto_id, quantita_pezzi, quantita_cartoni, prezzo_unitario,
        prodotti ( id, pezzi_per_cartone, brand_id, azienda_id ) )
    `)
    .not("status","in","(annullato,stand_by)")
    .gte("data_ordine", toISO(start))
    .lte("data_ordine", toISO(end));

  if (filters.clienteIds.length > 0) q = q.in("cliente_id", filters.clienteIds);
  if (filters.aziendaIds.length > 0) q = q.in("azienda_id", filters.aziendaIds);

  const { data, error } = await q;
  if (error) throw error;
  let ordini = data || [];
  if (filters.brandIds.length > 0) {
    ordini = ordini.filter((o: any) =>
      o.ordini_righe?.some((r: any) => filters.brandIds.includes(r.prodotti?.brand_id))
    );
  }

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
    const tot = Number(o.totale) || 0;
    fatturato += tot;
    const d = parseLocalDate(o.data_ordine);
    if (d) monthly[monthsIT[d.getMonth()]] += tot;


    if (o.cliente_id) perCliente.set(o.cliente_id, (perCliente.get(o.cliente_id) || 0) + tot);
    if (o.azienda_id) perAzienda.set(o.azienda_id, (perAzienda.get(o.azienda_id) || 0) + tot);

    o.ordini_righe?.forEach((r: any) => {
      if (!r.prodotti) return;
      if (filters.brandIds.length > 0 && !filters.brandIds.includes(r.prodotti.brand_id)) return;
      const cart = r.quantita_cartoni || 0;
      const pz = (r.quantita_pezzi || 0) + cart * (r.prodotti.pezzi_per_cartone || 1);
      const rf = pz * Number(r.prezzo_unitario);
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
  return useQuery({
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

      const { data: yearOrdini } = await supabase
        .from("ordini")
        .select("totale, data_ordine")
        .not("status","in","(annullato,stand_by)")
        .gte("data_ordine", `${yearPrev}-01-01`)
        .lte("data_ordine", `${yearCurr}-12-31`);

      const monthlyCurr: Record<string, number> = {};
      const monthlyPrev: Record<string, number> = {};
      const monthlyOrdiniCurr: Record<string, number> = {};
      const monthlyOrdiniPrev: Record<string, number> = {};
      monthsIT.forEach(m => { monthlyCurr[m] = 0; monthlyPrev[m] = 0; monthlyOrdiniCurr[m] = 0; monthlyOrdiniPrev[m] = 0; });
      (yearOrdini || []).forEach((o: any) => {
        const d = new Date(o.data_ordine);
        const m = monthsIT[d.getMonth()];
        const y = d.getFullYear();
        if (y === yearCurr) { monthlyCurr[m] += Number(o.totale) || 0; monthlyOrdiniCurr[m] += 1; }
        else if (y === yearPrev) { monthlyPrev[m] += Number(o.totale) || 0; monthlyOrdiniPrev[m] += 1; }
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
  });
}
