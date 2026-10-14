import { allocateRevenueByRiga, type OrdineLike } from "@/lib/metricsEngine";
import { toLocalISODate } from "@/lib/periodRange";

/**
 * Logica filtri unica della pagina Analytics.
 * Unione dentro lo stesso filtro, intersezione tra filtri diversi.
 * I filtri si applicano PRIMA di ogni aggregazione (anche sulle righe prodotto).
 */
export type AnalyticsFilters = {
  clienteIds: string[];
  aziendaIds: string[];
  brandIds: string[];
  startDate: Date | null;
  endDate: Date | null;
};

export const SENZA_MARCHIO_ID = "__senza_marchio__";

/** Applica cliente/azienda/periodo a una query Supabase sugli ordini. */
export function applyOrdiniFilters<Q extends { in: any; gte: any; lte: any }>(
  q: Q,
  f: Pick<AnalyticsFilters, "clienteIds" | "aziendaIds">,
  start: Date | null,
  end: Date | null
): Q {
  let out: any = q;
  if (start) out = out.gte("data_ordine", toLocalISODate(start));
  if (end) out = out.lte("data_ordine", toLocalISODate(end));
  if (f.clienteIds.length > 0) out = out.in("cliente_id", f.clienteIds);
  if (f.aziendaIds.length > 0) out = out.in("azienda_id", f.aziendaIds);
  return out as Q;
}

export function rigaMatchesBrand(riga: any, brandIds: string[]): boolean {
  if (brandIds.length === 0) return true;
  return brandIds.includes(riga?.prodotti?.brand_id);
}

/**
 * Fatturato dell'ordine che rientra nel filtro marchio. Senza filtro marchio
 * è il totale dell'ordine; con filtro, la quota allocata alle sole righe dei
 * marchi selezionati (stessa allocazione del motore metriche).
 */
export function filteredOrderRevenue(o: any, brandIds: string[]): number {
  if (brandIds.length === 0) return Number(o.totale) || 0;
  const alloc = allocateRevenueByRiga(o as OrdineLike);
  return (o.ordini_righe || []).reduce(
    (s: number, r: any, i: number) => (rigaMatchesBrand(r, brandIds) ? s + (alloc[i] || 0) : s),
    0
  );
}

/** Ordini che hanno almeno una riga nel filtro marchio. */
export function filterOrdiniByBrand<T extends { ordini_righe?: any[] | null }>(ordini: T[], brandIds: string[]): T[] {
  if (brandIds.length === 0) return ordini;
  return ordini.filter((o) => o.ordini_righe?.some((r) => rigaMatchesBrand(r, brandIds)));
}

/** Variazione % sicura: null se la base è zero (mai percentuali infinite). */
export function safePct(curr: number, prev: number): number | null {
  if (!(prev > 0)) return null;
  return ((curr - prev) / prev) * 100;
}

export const RIGHE_SELECT = `ordini_righe ( id, prodotto_id, quantita_pezzi, quantita_cartoni, prezzo_unitario, sc1, sc2, sc3, is_omaggio,
  prodotti ( id, pezzi_per_cartone, brand_id, azienda_id ) )`;
