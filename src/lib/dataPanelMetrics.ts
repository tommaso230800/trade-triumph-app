import { aggregateTotals, integrityReport, isCounted, orderDate, type OrdineLike, type RigaLike } from "./metricsEngine";
import type { PeriodoFiltro } from "./periodFilter";

export type DataPanelOrder = Omit<OrdineLike, "ordini_righe"> & {
  codice?: string | null;
  clienti?: { nome: string } | null;
  sconto?: number | null;
  sconto_merce?: number | null;
  ordini_righe?: (RigaLike & { prodotti?: (NonNullable<RigaLike["prodotti"]> & { costo_acquisto?: number | null }) | null })[] | null;
};

export function inPeriodo(o: OrdineLike, p: PeriodoFiltro) {
  const prefix = p.kind === "year" ? `${p.year}-` : `${p.year}-${String(p.month).padStart(2, "0")}-`;
  return (orderDate(o) ?? "").startsWith(prefix);
}

export function dataPanelMetrics(orders: DataPanelOrder[]) {
  const counted = orders.filter(isCounted);
  const totals = aggregateTotals(counted);
  const report = integrityReport(counted);
  let cost = 0;
  let missingCostOrders = 0;
  for (const o of counted) {
    const lines = o.ordini_righe ?? [];
    let missing = lines.length === 0;
    for (const r of lines) {
      const pieces = Number(r.quantita_pezzi ?? 0) + Number(r.quantita_cartoni ?? 0) * (Number(r.prodotti?.pezzi_per_cartone) || 1);
      const c = r.prodotti?.costo_acquisto;
      if (pieces > 0 && (c == null || !Number.isFinite(Number(c)) || Number(c) <= 0)) missing = true;
      else cost += pieces * Number(c ?? 0);
    }
    if (missing) missingCostOrders++;
  }
  const margin = missingCostOrders ? null : totals.fatturato - cost;
  return { ...totals, report, cost, missingCostOrders, margin, marginPercent: margin === null || !totals.fatturato ? null : margin / totals.fatturato * 100 };
}

/** Only explicit Italian numbers; absent values never become zero. */
export function parseDocumentNumber(raw: string): number | null {
  const value = raw.trim().replace(/€/g, "").replace(/\s/g, "");
  if (!/^-?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/.test(value)) return null;
  const n = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}