/**
 * Motore metriche centralizzato — FASE 1.2
 * -----------------------------------------
 * Unica fonte di verità per: data di riferimento, fatturato ordine,
 * inclusione negli aggregati, allocazione per riga/prodotto/brand.
 *
 * Regole (decise con l'utente):
 *  - Opzione A: `ordini.totale` è la fonte del fatturato ordine.
 *  - Data di riferimento: `data_conferma` se presente, altrimenti `data_ordine`,
 *    fallback finale `created_at`. Mai `created_at` prima di `data_ordine`.
 *  - Stati esclusi dagli aggregati economici: 'bozza', 'da_confermare',
 *    'stand_by', 'annullato'. Contano: 'confermato', 'evaso' (+ eventuali
 *    stati custom non riconosciuti — trattati come contati per retro-compatibilità).
 *  - Righe con `is_omaggio = true` NON contribuiscono al fatturato e vengono
 *    escluse dall'allocazione (peso 0).
 *  - Allocazione per riga = subtotale riga / somma subtotali righe non-omaggio
 *    dello stesso ordine, moltiplicato per `ordini.totale`. Così la somma
 *    per prodotto/brand riconcilia esattamente col fatturato ordine.
 *  - Se un ordine ha `totale > 0` ma nessuna riga valida, il fatturato
 *    resta sull'ordine ma NON viene allocato ai prodotti (evita divisioni per zero).
 */

export type OrdineLike = {
  id: string;
  totale: number | string | null;
  status?: string | null;
  data_ordine?: string | null;
  data_conferma?: string | null;
  created_at?: string | null;
  ordini_righe?: RigaLike[] | null;
};

export type RigaLike = {
  id?: string;
  prodotto_id?: string | null;
  quantita_pezzi?: number | string | null;
  prezzo_unitario?: number | string | null;
  sc1?: number | string | null;
  sc2?: number | string | null;
  sc3?: number | string | null;
  is_omaggio?: boolean | null;
  prodotti?: { id?: string; nome?: string; brand_id?: string | null } | null;
};

const EXCLUDED_STATUSES = new Set(["bozza", "da_confermare", "stand_by", "annullato"]);

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
};

/** Data economica di riferimento di un ordine (YYYY-MM-DD or ISO). */
export const orderDate = (o: OrdineLike): string | null =>
  o.data_conferma || o.data_ordine || o.created_at || null;

/** Vero se l'ordine deve entrare negli aggregati economici. */
export const isCounted = (o: OrdineLike): boolean => {
  const s = (o.status || "").toLowerCase();
  return !EXCLUDED_STATUSES.has(s);
};

/** Fatturato ordine — Opzione A: sempre `ordini.totale`. */
export const orderRevenue = (o: OrdineLike): number => num(o.totale);

/** Subtotale lordo di una riga (senza sconti applicati). Usato solo come peso. */
const rigaSubtotaleLordo = (r: RigaLike): number =>
  num(r.quantita_pezzi) * num(r.prezzo_unitario);

/** Subtotale netto riga (dopo sconti a cascata). Peso preferito per l'allocazione. */
const rigaSubtotaleNetto = (r: RigaLike): number => {
  const lordo = rigaSubtotaleLordo(r);
  const s1 = 1 - num(r.sc1) / 100;
  const s2 = 1 - num(r.sc2) / 100;
  const s3 = 1 - num(r.sc3) / 100;
  return lordo * s1 * s2 * s3;
};

/**
 * Alloca il fatturato dell'ordine sulle sue righe in proporzione al subtotale
 * netto (post-sconti). Ritorna una mappa rigaIndex → fatturato allocato.
 * Le righe omaggio ricevono 0.
 */
export function allocateRevenueByRiga(o: OrdineLike): number[] {
  const righe = o.ordini_righe ?? [];
  const pesi = righe.map((r) => (r.is_omaggio ? 0 : rigaSubtotaleNetto(r)));
  const totPesi = pesi.reduce((a, b) => a + b, 0);
  const fatturato = orderRevenue(o);
  if (totPesi <= 0 || fatturato <= 0) return righe.map(() => 0);
  return pesi.map((p) => (p / totPesi) * fatturato);
}

/** Aggrega fatturato per prodotto usando l'allocazione proporzionale. */
export function aggregateRevenueByProduct(ordini: OrdineLike[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const o of ordini) {
    if (!isCounted(o)) continue;
    const alloc = allocateRevenueByRiga(o);
    (o.ordini_righe ?? []).forEach((r, i) => {
      const pid = r.prodotto_id ?? r.prodotti?.id;
      if (!pid) return;
      map.set(pid, (map.get(pid) ?? 0) + alloc[i]);
    });
  }
  return map;
}

/** Aggrega fatturato per brand usando l'allocazione proporzionale. */
export function aggregateRevenueByBrand(ordini: OrdineLike[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const o of ordini) {
    if (!isCounted(o)) continue;
    const alloc = allocateRevenueByRiga(o);
    (o.ordini_righe ?? []).forEach((r, i) => {
      const bid = r.prodotti?.brand_id;
      if (!bid) return;
      map.set(bid, (map.get(bid) ?? 0) + alloc[i]);
    });
  }
  return map;
}

/** Aggregato base per KPI globali. */
export function aggregateTotals(ordini: OrdineLike[]) {
  let fatturato = 0;
  let count = 0;
  for (const o of ordini) {
    if (!isCounted(o)) continue;
    fatturato += orderRevenue(o);
    count += 1;
  }
  return { fatturato, count, ticketMedio: count > 0 ? fatturato / count : 0 };
}

/**
 * Diagnostica: per ogni ordine confronta `ordini.totale` con la somma delle
 * righe nette (post-sconti, escluse omaggio). Utile per il Passo 1.5
 * (Integrity Check panel).
 */
export function integrityReport(ordini: OrdineLike[]) {
  const rows = ordini.map((o) => {
    const somRighe = (o.ordini_righe ?? [])
      .filter((r) => !r.is_omaggio)
      .reduce((s, r) => s + rigaSubtotaleNetto(r), 0);
    const totale = orderRevenue(o);
    return {
      id: o.id,
      totale,
      somma_righe: somRighe,
      delta: totale - somRighe,
      ha_righe: (o.ordini_righe ?? []).length > 0,
      counted: isCounted(o),
    };
  });
  const mismatched = rows.filter((r) => Math.abs(r.delta) > 0.01 && r.ha_righe);
  return {
    rows,
    total_orders: rows.length,
    mismatched_count: mismatched.length,
    total_fatturato: rows.reduce((s, r) => s + r.totale, 0),
    total_righe: rows.reduce((s, r) => s + r.somma_righe, 0),
    orders_without_lines: rows.filter((r) => !r.ha_righe && r.totale > 0).length,
  };
}
