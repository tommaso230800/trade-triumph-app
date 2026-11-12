/**
 * Totali di un ordine condivisi da modulo, proforma/PDF e allegato email.
 * pezzi acquistati = cartoni × pezzi per cartone + pezzi sfusi (omaggi esclusi);
 * gli omaggi sono contati a parte e sommati solo nel "da consegnare".
 */
export interface TotalsRow {
  quantita_cartoni: number;
  quantita_pezzi: number;
  pezzi_per_cartone: number | null | undefined;
  is_omaggio?: boolean | null;
  prodotto_id?: string;
}

export const hasPackaging = (r: Pick<TotalsRow, "pezzi_per_cartone">) => Number(r.pezzi_per_cartone) > 0;

/** Pezzi di una riga; null quando ci sono cartoni ma manca il dato pezzi per cartone. */
export function rowPieces(r: TotalsRow): number | null {
  const cart = Math.max(0, Number(r.quantita_cartoni) || 0);
  const sfusi = Math.max(0, Number(r.quantita_pezzi) || 0);
  if (cart > 0 && !hasPackaging(r)) return null;
  return cart * (Number(r.pezzi_per_cartone) || 0) + sfusi;
}

export interface OrderTotals {
  cartoni: number;
  pezziSfusi: number;
  pezzi: number;
  omaggioCartoni: number;
  omaggioPezzi: number;
  daConsegnarePezzi: number;
  daConsegnareCartoni: number;
  referenze: number;
  righeSenzaConfezione: number;
  completo: boolean;
}

export function orderTotals(rows: TotalsRow[]): OrderTotals {
  const t: OrderTotals = { cartoni: 0, pezziSfusi: 0, pezzi: 0, omaggioCartoni: 0, omaggioPezzi: 0, daConsegnarePezzi: 0, daConsegnareCartoni: 0, referenze: 0, righeSenzaConfezione: 0, completo: true };
  const refs = new Set<string>();
  rows.forEach((r, i) => {
    const cart = Math.max(0, Number(r.quantita_cartoni) || 0);
    const sfusi = Math.max(0, Number(r.quantita_pezzi) || 0);
    const pz = rowPieces(r);
    if (pz === null) { t.righeSenzaConfezione += 1; t.completo = false; }
    if (r.is_omaggio) {
      t.omaggioCartoni += cart;
      t.omaggioPezzi += pz ?? sfusi;
    } else {
      t.cartoni += cart;
      t.pezziSfusi += sfusi;
      t.pezzi += pz ?? sfusi;
      refs.add(r.prodotto_id ?? `row-${i}`);
    }
  });
  t.referenze = refs.size;
  t.daConsegnarePezzi = t.pezzi + t.omaggioPezzi;
  t.daConsegnareCartoni = t.cartoni + t.omaggioCartoni;
  return t;
}

/** Valida una quantità digitata: intera, non negativa. */
export function parseQuantity(value: string): { value: number; error: string | null } {
  const v = value.trim();
  if (v === "") return { value: 0, error: null };
  if (!/^\d+$/.test(v)) return { value: 0, error: "Solo numeri interi, zero o maggiori" };
  return { value: Number(v), error: null };
}

/** Riga senza quantità o con prezzo non valido: segnalata prima del salvataggio. */
export function rowProblems(r: TotalsRow & { prezzo: number; sc: number[] }): string[] {
  const out: string[] = [];
  if ((Number(r.quantita_cartoni) || 0) <= 0 && (Number(r.quantita_pezzi) || 0) <= 0) out.push("Quantità mancante");
  if (!r.is_omaggio && (!Number.isFinite(r.prezzo) || r.prezzo <= 0)) out.push("Prezzo non valido");
  if (r.sc.some((s) => !Number.isFinite(s) || s < 0 || s >= 100)) out.push("Sconto tra 0 e 99,99%");
  if ((Number(r.quantita_cartoni) || 0) > 0 && !hasPackaging(r)) out.push("Pezzi per cartone da completare");
  return out;
}
