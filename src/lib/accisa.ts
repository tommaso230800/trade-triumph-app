/**
 * Accisa per prodotto: importo in € a bottiglia (pezzo), inserito a mano
 * dall'agente solo sui prodotti che la prevedono.
 *
 * Il prezzo di listino è già l'IMPONIBILE: l'accisa si somma a parte e non
 * entra in fatturato, sconti o provvigioni. Le righe omaggio sono escluse.
 */

export interface AccisaRiga {
  quantita_cartoni: number;
  quantita_pezzi?: number;
  pezzi_per_cartone: number | null | undefined;
  accisa_pezzo?: number | null;
  is_omaggio?: boolean | null;
}

/** Accisa a pezzo valida (> 0) oppure null. */
export function accisaValida(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 10000) / 10000 : null;
}

export function accisaDellaRiga(r: AccisaRiga): number {
  const a = accisaValida(r.accisa_pezzo);
  if (!a || r.is_omaggio) return 0;
  const pezzi = Math.max(0, Number(r.quantita_cartoni) || 0) * Math.max(0, Number(r.pezzi_per_cartone) || 0)
    + Math.max(0, Number(r.quantita_pezzi) || 0);
  return Math.round(pezzi * a * 100) / 100;
}

export function accisaTotale(righe: AccisaRiga[]): number {
  return Math.round(righe.reduce((s, r) => s + accisaDellaRiga(r), 0) * 100) / 100;
}
