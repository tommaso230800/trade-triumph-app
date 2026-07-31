import { useMemo } from "react";
import { useAziende } from "@/hooks/useAziende";

// Colore identità azienda: assegna una tinta fissa a ogni azienda da una
// palette di 12, così lo stesso fornitore ha sempre lo stesso colore ovunque
// compaia in app. L'indice si calcola dalla POSIZIONE dell'azienda nell'elenco
// reale (ordinato per nome), non da un hash dell'id: con un hash, anche con
// 12 colori, la probabilità che due delle 6-10 aziende reali collidano sulla
// stessa tinta resta altissima (paradosso del compleanno). Per posizione,
// invece, ogni azienda ha garantito un colore diverso dalle altre finché sono
// al massimo 12 (oltre le 12 il ciclo si ripete). Le classi sono elencate per
// intero (non generate con template string) perché Tailwind rileva le utility
// solo come stringhe letterali nel sorgente.
const PALETTE_SIZE = 12;

const BAR_CLASSES = [
  "border-l-azienda-1",
  "border-l-azienda-2",
  "border-l-azienda-3",
  "border-l-azienda-4",
  "border-l-azienda-5",
  "border-l-azienda-6",
  "border-l-azienda-7",
  "border-l-azienda-8",
  "border-l-azienda-9",
  "border-l-azienda-10",
  "border-l-azienda-11",
  "border-l-azienda-12",
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
  "bg-azienda-9",
  "bg-azienda-10",
  "bg-azienda-11",
  "bg-azienda-12",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Fallback usato solo se l'elenco aziende non è ancora arrivato (prima del
// caricamento di useAziende): colore provvisorio, sostituito appena la mappa
// per-posizione è pronta.
export function aziendaColorIndex(aziendaId: string): number {
  return hashString(aziendaId) % PALETTE_SIZE;
}

export type AziendaColorIndexMap = Map<string, number>;

export function buildAziendaColorIndex(aziende: { id: string; nome: string }[]): AziendaColorIndexMap {
  const sorted = [...aziende].sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  const map = new Map<string, number>();
  sorted.forEach((a, i) => map.set(a.id, i % PALETTE_SIZE));
  return map;
}

// Da usare in qualunque componente mostri il colore identità di un'azienda:
// legge l'elenco aziende dalla cache condivisa di useAziende() (nessuna nuova
// query se un antenato l'ha già richiesto) e restituisce la mappa id→indice.
export function useAziendaColorIndex(): AziendaColorIndexMap {
  const { data: aziende } = useAziende();
  return useMemo(() => buildAziendaColorIndex(aziende || []), [aziende]);
}

function resolveIndex(aziendaId: string | null | undefined, indexMap?: AziendaColorIndexMap): number | null {
  if (!aziendaId) return null;
  if (indexMap?.has(aziendaId)) return indexMap.get(aziendaId)!;
  return aziendaColorIndex(aziendaId);
}

export function aziendaBarClass(aziendaId?: string | null, indexMap?: AziendaColorIndexMap): string {
  const idx = resolveIndex(aziendaId, indexMap);
  if (idx === null) return "border-l-border";
  return BAR_CLASSES[idx % PALETTE_SIZE];
}

export function aziendaDotClass(aziendaId?: string | null, indexMap?: AziendaColorIndexMap): string {
  const idx = resolveIndex(aziendaId, indexMap);
  if (idx === null) return "bg-muted-foreground";
  return DOT_CLASSES[idx % PALETTE_SIZE];
}
