/**
 * Utility condivise per i periodi della dashboard/KPI.
 * Tutte le date sono trattate nel fuso locale (Europe/Rome), MAI in UTC:
 * `toISOString()` sposterebbe il 1° agosto 00:00 Roma al 31 luglio 22:00 UTC,
 * facendo entrare nel periodo gli ordini del mese precedente.
 */

/** YYYY-MM-DD nel fuso locale. */
export const toLocalISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Parsa una data DB (YYYY-MM-DD o ISO) come data locale, senza slittamenti di fuso. */
export const parseLocalDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

export type DashboardPeriod = "mese" | "trimestre" | "anno";

/**
 * Inizio periodo: 1° del mese / 1° del mese di 3 mesi fa / 1° gennaio.
 * "trimestre" = ULTIMI 3 MESI (rolling), identico alla pagina KPI:
 * il trimestre solare dava numeri diversi tra Dashboard e KPI.
 */
export function periodStart(period: DashboardPeriod, now: Date): Date {
  if (period === "mese") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "trimestre") return new Date(now.getFullYear(), now.getMonth() - 2, 1);
  return new Date(now.getFullYear(), 0, 1);
}

/** Fine periodo: oggi (giorno corrente incluso). */
export function periodEnd(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
