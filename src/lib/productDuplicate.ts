export interface DuplicateCandidate {
  id: string;
  nome: string;
  codice?: string | null;
  formato?: string | null;
  azienda_id: string;
}

const norm = (v?: string | null) => (v ?? "").trim().toLowerCase().replace(/\s+/g, " ");

/** Cerca un possibile duplicato nella stessa azienda: stesso codice articolo
 *  oppure stesso nome e formato. Codice vuoto non conta mai come duplicato. */
export function findProductDuplicate<T extends DuplicateCandidate>(
  products: T[],
  draft: { nome: string; codice?: string | null; formato?: string | null },
  aziendaId: string,
): T | null {
  const codice = norm(draft.codice);
  const nome = norm(draft.nome);
  const formato = norm(draft.formato);
  if (!nome && !codice) return null;
  for (const p of products) {
    if (p.azienda_id !== aziendaId) continue;
    if (codice && norm(p.codice) === codice) return p;
    if (nome && norm(p.nome) === nome && norm(p.formato) === formato) return p;
  }
  return null;
}
