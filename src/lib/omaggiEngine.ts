// Fase 2D — Motore omaggi automatici (deterministico).
// Regola: promo/contratti hanno qta_base + qta_omaggio (es. 80+4).
// Per ogni tripla cliente × prodotto × sorgente (promo o contratto attivo alla data),
// calcolo quantità acquistata nel periodo di validità (in cartoni), applico la formula:
//   omaggi_spettanti = floor(acquistato_cartoni / qta_base) * qta_omaggio
// e sottraggo gli omaggi già erogati (tracked in `omaggi_erogati`).
// Se cumulabile_arretrati = false, considero solo l'ordine più recente.

export type SorgenteOmaggio = "promo" | "contratto";

export interface RegolaOmaggio {
  id: string;
  sorgente: SorgenteOmaggio;
  cliente_id: string | null;   // null = tutti i clienti (promo generica)
  azienda_id: string;
  prodotto_id: string | null;  // null = qualsiasi prodotto (raro)
  qta_base: number;
  qta_omaggio: number;
  unita: string;               // "cartoni" | "pezzi"
  cumulabile_arretrati: boolean;
  data_inizio: string;         // ISO
  data_fine: string;           // ISO
  nome: string;
}

export interface AcquistoRiga {
  cliente_id: string;
  azienda_id: string;
  prodotto_id: string;
  data_ordine: string;         // ISO
  quantita_cartoni: number;
  quantita_pezzi: number;
  pezzi_per_cartone: number;
  is_omaggio: boolean;
  ordine_id: string;
}

export interface OmaggioErogatoRow {
  cliente_id: string;
  prodotto_id: string;
  promo_id: string | null;
  contratto_id: string | null;
  quantita: number;
  unita: string;
}

export interface OmaggioSpettante {
  cliente_id: string;
  prodotto_id: string;
  regola_id: string;
  sorgente: SorgenteOmaggio;
  regola_nome: string;
  qta_base: number;
  qta_omaggio: number;
  unita: string;
  acquistato: number;              // in unità della regola
  spettanti_totali: number;
  gia_erogati: number;
  spettanti_residui: number;
  progresso_prossimo_pct: number;  // 0..100 verso il prossimo scaglione
  mancano_al_prossimo: number;
}

function toUnit(riga: AcquistoRiga, unita: string): number {
  const pezziTot = (riga.quantita_pezzi || 0) + (riga.quantita_cartoni || 0) * (riga.pezzi_per_cartone || 0);
  if (unita === "pezzi") return pezziTot;
  const ppc = riga.pezzi_per_cartone > 0 ? riga.pezzi_per_cartone : 1;
  return pezziTot / ppc;
}

export function computeOmaggiSpettanti(
  regole: RegolaOmaggio[],
  acquisti: AcquistoRiga[],
  erogati: OmaggioErogatoRow[]
): OmaggioSpettante[] {
  const out: OmaggioSpettante[] = [];
  const paidRows = acquisti.filter((r) => !r.is_omaggio);

  for (const reg of regole) {
    if (!reg.prodotto_id) continue;
    if (reg.qta_base <= 0 || reg.qta_omaggio <= 0) continue;

    // Righe eleggibili: stesso prodotto, azienda, nella finestra di validità, cliente coerente
    const eligibili = paidRows.filter(
      (r) =>
        r.prodotto_id === reg.prodotto_id &&
        r.azienda_id === reg.azienda_id &&
        (reg.cliente_id === null || reg.cliente_id === r.cliente_id) &&
        r.data_ordine >= reg.data_inizio &&
        r.data_ordine <= reg.data_fine
    );

    // Aggrego per cliente
    const perCliente = new Map<string, AcquistoRiga[]>();
    for (const r of eligibili) {
      if (!perCliente.has(r.cliente_id)) perCliente.set(r.cliente_id, []);
      perCliente.get(r.cliente_id)!.push(r);
    }

    for (const [cliente_id, rows] of perCliente) {
      let acquistato = 0;
      if (reg.cumulabile_arretrati) {
        acquistato = rows.reduce((s, r) => s + toUnit(r, reg.unita), 0);
      } else {
        // solo l'ordine più recente
        const sorted = [...rows].sort((a, b) => (a.data_ordine < b.data_ordine ? 1 : -1));
        acquistato = sorted.length > 0 ? toUnit(sorted[0], reg.unita) : 0;
      }

      const spettantiTotali = Math.floor(acquistato / reg.qta_base) * reg.qta_omaggio;

      const giaErogati = erogati
        .filter((e) => {
          if (e.cliente_id !== cliente_id) return false;
          if (e.prodotto_id !== reg.prodotto_id) return false;
          if (reg.sorgente === "promo") return e.promo_id === reg.id;
          return e.contratto_id === reg.id;
        })
        .reduce((s, e) => s + (e.quantita || 0), 0);

      const residui = Math.max(0, spettantiTotali - giaErogati);

      const restoBase = acquistato % reg.qta_base;
      const progresso = reg.qta_base > 0 ? (restoBase / reg.qta_base) * 100 : 0;
      const mancano = Math.max(0, reg.qta_base - restoBase);

      if (acquistato > 0 || giaErogati > 0) {
        out.push({
          cliente_id,
          prodotto_id: reg.prodotto_id,
          regola_id: reg.id,
          sorgente: reg.sorgente,
          regola_nome: reg.nome,
          qta_base: reg.qta_base,
          qta_omaggio: reg.qta_omaggio,
          unita: reg.unita,
          acquistato,
          spettanti_totali: spettantiTotali,
          gia_erogati: giaErogati,
          spettanti_residui: residui,
          progresso_prossimo_pct: progresso,
          mancano_al_prossimo: mancano,
        });
      }
    }
  }

  // Ordine: residui > 0 in cima, poi per progresso decrescente
  out.sort((a, b) => {
    if ((b.spettanti_residui > 0 ? 1 : 0) - (a.spettanti_residui > 0 ? 1 : 0) !== 0) {
      return (b.spettanti_residui > 0 ? 1 : 0) - (a.spettanti_residui > 0 ? 1 : 0);
    }
    return b.progresso_prossimo_pct - a.progresso_prossimo_pct;
  });

  return out;
}
