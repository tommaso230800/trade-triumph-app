// Colore identità azienda: assegna deterministicamente una tinta fissa a ogni
// azienda (per id) da una palette di 8, così lo stesso fornitore ha sempre lo
// stesso colore ovunque compaia in app. Le classi sono elencate per intero
// (non generate con template string) perché Tailwind rileva le utility solo
// come stringhe letterali nel sorgente.
const PALETTE_SIZE = 8;

const BAR_CLASSES = [
  "border-l-azienda-1",
  "border-l-azienda-2",
  "border-l-azienda-3",
  "border-l-azienda-4",
  "border-l-azienda-5",
  "border-l-azienda-6",
  "border-l-azienda-7",
  "border-l-azienda-8",
];

const DOT_CLASSES = [
  "bg-azienda-1",
  "bg-azienda-2",
  "bg-azienda-3",
  "bg-azienda-4",
  "bg-azienda-5",
  "bg-azienda-6",
  "bg-azienda-7",
  "bg-azienda-8",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function aziendaColorIndex(aziendaId: string): number {
  return hashString(aziendaId) % PALETTE_SIZE;
}

export function aziendaBarClass(aziendaId?: string | null): string {
  if (!aziendaId) return "border-l-border";
  return BAR_CLASSES[aziendaColorIndex(aziendaId)];
}

export function aziendaDotClass(aziendaId?: string | null): string {
  if (!aziendaId) return "bg-muted-foreground";
  return DOT_CLASSES[aziendaColorIndex(aziendaId)];
}
