/**
 * Regole di presentazione dei promemoria (solo date, nessun dato di business).
 */

export type GruppoPromemoria = "scaduti" | "oggi" | "domani" | "prossimi" | "fatti";

export const GRUPPI_LABEL: Record<GruppoPromemoria, string> = {
  scaduti: "Scaduti",
  oggi: "Oggi",
  domani: "Domani",
  prossimi: "Prossimi",
  fatti: "Fatti",
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function gruppoDi(p: { stato: string; data_promemoria: string }, now = new Date()): GruppoPromemoria {
  if (p.stato === "fatto") return "fatti";
  const when = new Date(p.data_promemoria);
  if (when.getTime() < now.getTime()) return "scaduti";
  const days = Math.round((startOfDay(when).getTime() - startOfDay(now).getTime()) / 86_400_000);
  if (days <= 0) return "oggi";
  if (days === 1) return "domani";
  return "prossimi";
}

/** Opzioni rapide "ricordamelo": data/ora risultante a partire da `now`. */
export type Rinvio = "stasera" | "domani" | "settimana" | "mese";

export const RINVII: { value: Rinvio; label: string }[] = [
  { value: "stasera", label: "Stasera alle 18" },
  { value: "domani", label: "Domani alle 9" },
  { value: "settimana", label: "Tra una settimana" },
  { value: "mese", label: "Tra un mese" },
];

export function dataRinvio(r: Rinvio, now = new Date()): Date {
  const d = new Date(now);
  switch (r) {
    case "stasera":
      d.setHours(18, 0, 0, 0);
      if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
      return d;
    case "domani":
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    case "settimana":
      d.setDate(d.getDate() + 7);
      d.setHours(9, 0, 0, 0);
      return d;
    case "mese":
      d.setMonth(d.getMonth() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
  }
}

/** Valore per <input type="datetime-local"> nell'ora locale. */
export function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function quandoLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const ora = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  const days = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / 86_400_000);
  if (days === 0) return `Oggi, ${ora}`;
  if (days === 1) return `Domani, ${ora}`;
  if (days === -1) return `Ieri, ${ora}`;
  const data = d.toLocaleDateString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
  return `${data}, ${ora}`;
}
