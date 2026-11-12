/**
 * Statistiche prodotto e confronto annuale.
 * I totali arrivano dal database (righe reali degli ordini); qui si calcolano
 * solo i periodi di confronto, l'unione con il catalogo e le variazioni.
 */

export interface ProductStatRow {
  prodotto_id: string;
  nome: string | null;
  codice: string | null;
  formato: string | null;
  azienda_id: string | null;
  azienda_nome: string | null;
  attivo: boolean | null;
  fatturato: number;
  cartoni: number;
  pezzi_sfusi: number;
  pezzi: number;
  righe_senza_confezione: number;
  omaggio_cartoni: number;
  omaggio_pezzi: number;
  righe: number;
  ordini: number;
}

export interface DateRange { from: string; to: string }

export type PeriodMode = "ytd" | "year" | "month" | "custom";

const pad = (n: number) => String(n).padStart(2, "0");
export const isoDate = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Same calendar day in another year; 29 February becomes 28 when missing. */
export function shiftYear(iso: string, targetYear: number): string {
  const [, m, d] = iso.split("-").map(Number);
  return isoDate(targetYear, m, Math.min(d, daysInMonth(targetYear, m)));
}

/** Default compared year: always the year before the selected one. */
export const defaultCompareYear = (year: number) => year - 1;

/**
 * Selected period. "ytd" covers 1 January → today when the year is the current
 * one, otherwise the full year (a closed year has no "today").
 */
export function periodRange(mode: PeriodMode, year: number, today: string, month = 1, custom?: DateRange): DateRange {
  const currentYear = Number(today.slice(0, 4));
  if (mode === "year") return { from: isoDate(year, 1, 1), to: isoDate(year, 12, 31) };
  if (mode === "month") return { from: isoDate(year, month, 1), to: isoDate(year, month, daysInMonth(year, month)) };
  if (mode === "custom" && custom) return custom;
  if (year === currentYear) return { from: isoDate(year, 1, 1), to: today };
  if (year > currentYear) return { from: isoDate(year, 1, 1), to: isoDate(year, 1, 1) };
  return { from: isoDate(year, 1, 1), to: isoDate(year, 12, 31) };
}

/** Equivalent period in the compared year (same days and months). */
export function comparisonRange(range: DateRange, compareYear: number): DateRange {
  const fromYear = Number(range.from.slice(0, 4));
  const toYear = Number(range.to.slice(0, 4));
  return { from: shiftYear(range.from, compareYear), to: shiftYear(range.to, compareYear + (toYear - fromYear)) };
}

export type Variation =
  | { kind: "na" }
  | { kind: "none" }
  | { kind: "new"; diff: number }
  | { kind: "pct"; diff: number; pct: number };

/**
 * Variation between two values. `previousAvailable` is false when the compared
 * period has no product-level data at all: that is missing data, not zero sales.
 */
export function variation(current: number, previous: number, previousAvailable: boolean): Variation {
  if (!previousAvailable) return { kind: "na" };
  if (current === 0 && previous === 0) return { kind: "none" };
  if (previous === 0) return { kind: "new", diff: current };
  return { kind: "pct", diff: current - previous, pct: ((current - previous) / Math.abs(previous)) * 100 };
}

export interface CatalogProduct { id: string; nome: string; codice: string | null; formato: string | null; azienda_id: string }

export interface MergedProductRow extends ProductStatRow {
  prev: Pick<ProductStatRow, "fatturato" | "cartoni" | "pezzi"> | null;
}

const zeroRow = (p: CatalogProduct, aziendaNome: string | null): ProductStatRow => ({
  prodotto_id: p.id, nome: p.nome, codice: p.codice, formato: p.formato, azienda_id: p.azienda_id, azienda_nome: aziendaNome,
  attivo: true, fatturato: 0, cartoni: 0, pezzi_sfusi: 0, pezzi: 0, righe_senza_confezione: 0, omaggio_cartoni: 0, omaggio_pezzi: 0, righe: 0, ordini: 0,
});

/**
 * Joins current and previous period by stable product id (names may change).
 * Products sold only in the previous period stay in the list with zero current values.
 */
export function mergeStats(
  current: ProductStatRow[],
  previous: ProductStatRow[] | null,
  catalog: CatalogProduct[],
  opts: { includeUnsold: boolean; aziendaNames: Map<string, string> },
): MergedProductRow[] {
  const prevMap = new Map((previous ?? []).map((r) => [r.prodotto_id, r]));
  const rows = new Map<string, MergedProductRow>();
  for (const r of current) rows.set(r.prodotto_id, { ...r, prev: null });
  for (const r of previous ?? []) {
    if (!rows.has(r.prodotto_id)) rows.set(r.prodotto_id, { ...r, fatturato: 0, cartoni: 0, pezzi_sfusi: 0, pezzi: 0, righe_senza_confezione: 0, omaggio_cartoni: 0, omaggio_pezzi: 0, righe: 0, ordini: 0, prev: null });
  }
  if (opts.includeUnsold) {
    for (const p of catalog) if (!rows.has(p.id)) rows.set(p.id, { ...zeroRow(p, opts.aziendaNames.get(p.azienda_id) ?? null), prev: null });
  }
  for (const row of rows.values()) {
    const p = prevMap.get(row.prodotto_id);
    row.prev = previous ? { fatturato: p?.fatturato ?? 0, cartoni: p?.cartoni ?? 0, pezzi: p?.pezzi ?? 0 } : null;
  }
  return [...rows.values()];
}

export type SortKey = "fatturato" | "cartoni" | "pezzi" | "nome";

export function sortRows(rows: MergedProductRow[], key: SortKey, dir: "asc" | "desc"): MergedProductRow[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (key === "nome") return sign * (a.nome ?? "").localeCompare(b.nome ?? "", "it");
    return sign * ((a[key] ?? 0) - (b[key] ?? 0)) || (a.nome ?? "").localeCompare(b.nome ?? "", "it");
  });
}

export function matchesSearch(row: Pick<ProductStatRow, "nome" | "codice">, term: string): boolean {
  const t = term.trim().toLocaleLowerCase("it");
  if (!t) return true;
  return (row.nome ?? "").toLocaleLowerCase("it").includes(t) || (row.codice ?? "").toLocaleLowerCase("it").includes(t);
}

export function totals(rows: ProductStatRow[]) {
  return rows.reduce(
    (acc, r) => ({
      fatturato: acc.fatturato + r.fatturato,
      cartoni: acc.cartoni + r.cartoni,
      pezzi: acc.pezzi + r.pezzi,
      pezzi_sfusi: acc.pezzi_sfusi + r.pezzi_sfusi,
      omaggio_pezzi: acc.omaggio_pezzi + r.omaggio_pezzi,
      venduti: acc.venduti + (r.righe > 0 && (r.cartoni > 0 || r.pezzi_sfusi > 0) ? 1 : 0),
      incompleti: acc.incompleti + (r.righe_senza_confezione > 0 ? 1 : 0),
    }),
    { fatturato: 0, cartoni: 0, pezzi: 0, pezzi_sfusi: 0, omaggio_pezzi: 0, venduti: 0, incompleti: 0 },
  );
}
