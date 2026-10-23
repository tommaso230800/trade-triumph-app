/**
 * Selettore Periodo condiviso (Ordini + Analytics).
 * Un unico filtro: un ANNO intero oppure un MESE specifico con anno.
 * Opzioni generate automaticamente dalla data corrente (fuso locale del
 * dispositivo, che per questo progetto e' Europe/Rome): i mesi arrivano fino
 * al mese in corso, gli anni coprono tutto lo storico presente.
 * La selezione esplicita dell'utente e' conservata in localStorage e
 * sopravvive alla navigazione; il predefinito e' l'anno corrente.
 */

export type PeriodoFiltro =
  | { kind: "year"; year: number }
  | { kind: "month"; year: number; month: number }; // month: 1-12

const STORAGE_KEY = "amg_periodo_filtro_v1";

export function defaultPeriodo(now: Date = new Date()): PeriodoFiltro {
  return { kind: "year", year: now.getFullYear() };
}

export function isDefaultPeriodo(p: PeriodoFiltro, now: Date = new Date()): boolean {
  return p.kind === "year" && p.year === now.getFullYear();
}

export function encodePeriodo(p: PeriodoFiltro): string {
  return p.kind === "year" ? `y:${p.year}` : `m:${p.year}-${String(p.month).padStart(2, "0")}`;
}

export function decodePeriodo(value: string | null | undefined): PeriodoFiltro | null {
  if (!value) return null;
  const y = /^y:(\d{4})$/.exec(value);
  if (y) return { kind: "year", year: Number(y[1]) };
  const m = /^m:(\d{4})-(\d{2})$/.exec(value);
  if (m) {
    const month = Number(m[2]);
    if (month >= 1 && month <= 12) return { kind: "month", year: Number(m[1]), month };
  }
  return null;
}

export function loadPeriodo(): PeriodoFiltro {
  try {
    const saved = decodePeriodo(window.localStorage.getItem(STORAGE_KEY));
    if (saved) return saved;
  } catch {
    /* localStorage non disponibile */
  }
  return defaultPeriodo();
}

export function savePeriodo(p: PeriodoFiltro): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, encodePeriodo(p));
  } catch {
    /* localStorage non disponibile */
  }
}

/**
 * Intervallo [start, end] inclusivo del periodo, in date locali.
 * L'anno copre 1 gen - 31 dic, il mese tutto il mese solare: cosi' Ordini e
 * Analytics, filtrando su data_ordine, producono insiemi identici.
 */
export function periodoRange(p: PeriodoFiltro): { start: Date; end: Date } {
  if (p.kind === "year") {
    return { start: new Date(p.year, 0, 1), end: new Date(p.year, 11, 31) };
  }
  return { start: new Date(p.year, p.month - 1, 1), end: new Date(p.year, p.month, 0) };
}

const MESI_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export function periodoLabel(p: PeriodoFiltro): string {
  return p.kind === "year" ? String(p.year) : `${MESI_IT[p.month - 1]} ${p.year}`;
}

export type PeriodoOption = { value: string; label: string; group: "year" | "month" };

/**
 * Opzioni del selettore: anni (dal piu' recente) e mesi con anno esplicito.
 * Per l'anno corrente i mesi si fermano al mese in corso; al cambio di mese
 * o di anno le nuove opzioni compaiono da sole, senza modifiche al codice.
 */
export function periodoOptions(minYear: number, now: Date = new Date()): PeriodoOption[] {
  const currYear = now.getFullYear();
  const currMonth = now.getMonth() + 1;
  const firstYear = Math.min(minYear, currYear);
  const opts: PeriodoOption[] = [];
  for (let y = currYear; y >= firstYear; y--) {
    opts.push({ value: `y:${y}`, label: `Anno ${y}`, group: "year" });
    const lastMonth = y === currYear ? currMonth : 12;
    for (let m = lastMonth; m >= 1; m--) {
      opts.push({
        value: `m:${y}-${String(m).padStart(2, "0")}`,
        label: `${MESI_IT[m - 1]} ${y}`,
        group: "month",
      });
    }
  }
  return opts;
}
