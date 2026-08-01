import { useMemo } from "react";
import { useAziende } from "@/hooks/useAziende";

// Colore identità azienda: ogni azienda ha un colore scelto dall'utente
// (aziende.colore, es. "#111111") usato ovunque l'azienda è rappresentata
// nei dati (KPI, barre fatturato, grafici, badge ordini). Se un'azienda non
// ha ancora un colore impostato si usa un fallback dalla palette posizionale
// (ordinata per nome): garantisce comunque un colore stabile e diverso dalle
// altre finché sono al massimo 12 (oltre le 12 il ciclo si ripete).
const PALETTE_SIZE = 12;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function fallbackColor(aziendaId: string, index?: number): string {
  const i = index ?? hashString(aziendaId) % PALETTE_SIZE;
  return `hsl(var(--azienda-${(i % PALETTE_SIZE) + 1}))`;
}

export type AziendaColorMap = Map<string, string>;

export function buildAziendaColorMap(
  aziende: { id: string; nome: string; colore?: string | null }[]
): AziendaColorMap {
  const sorted = [...aziende].sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  const map = new Map<string, string>();
  sorted.forEach((a, i) => {
    map.set(a.id, a.colore?.trim() || fallbackColor(a.id, i));
  });
  return map;
}

// Da usare in qualunque componente mostri il colore identità di un'azienda:
// legge l'elenco aziende dalla cache condivisa di useAziende() (nessuna nuova
// query se un antenato l'ha già richiesto) e restituisce la mappa id→colore.
export function useAziendaColorMap(): AziendaColorMap {
  const { data: aziende } = useAziende();
  return useMemo(() => buildAziendaColorMap(aziende || []), [aziende]);
}

export function aziendaColorValue(aziendaId?: string | null, colorMap?: AziendaColorMap): string {
  if (!aziendaId) return "hsl(var(--muted-foreground))";
  if (colorMap?.has(aziendaId)) return colorMap.get(aziendaId)!;
  return fallbackColor(aziendaId);
}

// Stesse 12 tinte di --azienda-1..12 in index.css, duplicate qui solo per
// calcolare il contrasto senza dover leggere il DOM (il colore mostrato resta
// comunque pilotato dalla CSS var, questa copia serve solo alla scelta testo).
const FALLBACK_HSL: [number, number, number][] = [
  [72, 60, 34], [92, 55, 46], [112, 52, 32], [176, 65, 30],
  [196, 68, 48], [245, 62, 46], [260, 58, 58], [275, 66, 40],
  [291, 55, 56], [306, 64, 42], [320, 58, 58], [20, 75, 44],
];

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const f = (c: number) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

// Testo leggibile (bianco o quasi-nero) sopra un colore identità azienda
// arbitrario: calcola il contrasto WCAG con bianco e con nero e sceglie il
// migliore. Generico per qualunque tinta scelta dall'utente, non solo per i
// pochi casi noti (giallo C&C, verde fluo Ricola, azzurro Maniva → testo
// scuro; blu Zuegg, bordeaux Schenk → testo bianco).
export function readableTextColor(color: string): "#12141a" | "#ffffff" {
  let rgb: [number, number, number] | null = null;
  const hexMatch = color.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    rgb = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  } else {
    const varMatch = color.match(/--azienda-(\d+)/);
    if (varMatch) {
      const idx = (parseInt(varMatch[1], 10) - 1) % FALLBACK_HSL.length;
      rgb = hslToRgb(...FALLBACK_HSL[idx]);
    }
  }
  if (!rgb) return "#ffffff";
  const L = relativeLuminance(...rgb);
  const contrastWithWhite = 1.05 / (L + 0.05);
  const contrastWithBlack = (L + 0.05) / 0.05;
  return contrastWithBlack > contrastWithWhite ? "#12141a" : "#ffffff";
}
