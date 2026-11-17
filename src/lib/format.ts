/**
 * Formattazione numeri in italiano, unica per tutta l'interfaccia.
 *
 * Perché non solo Intl: con "it-IT" i numeri a 4 cifre escono senza punto delle
 * migliaia (4788,00 € invece di 4.788,00 €) e "useGrouping: 'always'" non è
 * supportato su iOS 16. Raggruppiamo quindi a mano, in modo identico ovunque.
 *
 * Solo presentazione: nessun calcolo di business passa da qui.
 */

const NA = "N/D";

function group(intDigits: string): string {
  return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** 12450.8 → "12.450,80" (decimals = 2). */
export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value == null || !Number.isFinite(Number(value))) return NA;
  const n = Number(value);
  const factor = 10 ** decimals;
  const scaled = Math.round(Math.abs(n) * factor);
  const sign = n < 0 && scaled !== 0 ? "-" : "";
  const intPart = Math.floor(scaled / factor).toString();
  const dec = decimals > 0 ? "," + (scaled % factor).toString().padStart(decimals, "0") : "";
  return `${sign}${group(intPart)}${dec}`;
}

/** 12450.8 → "12.450,80 €". */
export function formatEuro(value: number | null | undefined, decimals = 2): string {
  const s = formatNumber(value, decimals);
  return s === NA ? NA : `${s} €`;
}

/** 12450.8 → "12.451 €" (arrotondato all'euro, per KPI e liste dense). */
export function formatEuroInt(value: number | null | undefined): string {
  return formatEuro(value, 0);
}

/** 12.345 → "12,3%"; con signed: "+12,3%" / "-4,0%". */
export function formatPercent(
  value: number | null | undefined,
  decimals = 1,
  opts: { signed?: boolean } = {},
): string {
  const s = formatNumber(value, decimals);
  if (s === NA) return NA;
  const plus = opts.signed && Number(value) > 0 && !s.startsWith("-") && /[1-9]/.test(s) ? "+" : "";
  return `${plus}${s}%`;
}
