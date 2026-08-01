import type { Prodotto } from "@/hooks/useProdotti";

// Rileva possibili prodotti duplicati nella stessa azienda: match esatto sul
// nome normalizzato (trim + lowercase + spazi collassati) o sul codice/SKU.
// Nessuna similarità fuzzy (niente pg_trgm nel DB): solo match quasi-esatti,
// verificabili a colpo d'occhio dall'utente prima di unificare.
export type DuplicateGroup = { key: string; prodotti: Prodotto[] };

function normalizeNome(nome: string): string {
  return nome.trim().toLowerCase().replace(/\s+/g, " ");
}

export function findDuplicateGroups(prodotti: Prodotto[]): DuplicateGroup[] {
  const byName = new Map<string, Prodotto[]>();
  const byCode = new Map<string, Prodotto[]>();

  for (const p of prodotti) {
    const nameKey = `nome:${normalizeNome(p.nome)}`;
    byName.set(nameKey, [...(byName.get(nameKey) ?? []), p]);
    if (p.codice?.trim()) {
      const codeKey = `codice:${p.codice.trim().toLowerCase()}`;
      byCode.set(codeKey, [...(byCode.get(codeKey) ?? []), p]);
    }
  }

  const groups: DuplicateGroup[] = [];
  const seen = new Set<string>();

  for (const [key, list] of [...byName, ...byCode]) {
    if (list.length < 2) continue;
    const unseen = list.filter((p) => !seen.has(p.id));
    if (unseen.length < 2) continue;
    unseen.forEach((p) => seen.add(p.id));
    groups.push({ key, prodotti: unseen });
  }

  return groups;
}
