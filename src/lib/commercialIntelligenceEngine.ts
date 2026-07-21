// Fase 3 — Intelligenza commerciale
// Motori deterministici per: controllo prezzi, classificazione clienti (RFM), simulatore chiusura mese.

export interface RigaOrdineIC {
  ordine_id: string;
  prodotto_id: string;
  quantita_pezzi: number;
  quantita_cartoni: number;
  prezzo_unitario: number;
  sc1: number;
  sc2: number;
  sc3: number;
  is_omaggio: boolean;
  data_ordine: string; // ISO date del padre
  cliente_id: string;
  azienda_id: string;
  prezzo_listino?: number | null;
}

export interface OrdineIC {
  id: string;
  cliente_id: string | null;
  azienda_id: string | null;
  data_ordine: string | null; // ISO
  totale: number;
  status: string;
  provvigione_prevista?: number | null;
}

// -------- 1) Controllo prezzi -----------------------------------------------

export interface PriceAnomaly {
  prodotto_id: string;
  cliente_id: string;
  azienda_id: string;
  ordine_id: string;
  data_ordine: string;
  prezzo_netto: number;         // dopo sc1/sc2/sc3
  prezzo_lordo: number;         // prezzo_unitario
  sconto_totale_pct: number;    // sconto cascata equivalente
  media_netto_prodotto: number; // media netto sullo storico stesso prodotto
  scostamento_pct: number;      // (prezzo_netto - media)/media * 100
  severita: "critica" | "alta" | "media" | "info";
  motivo: string;
}

export interface PriceProductStat {
  prodotto_id: string;
  n_righe: number;
  min_netto: number;
  max_netto: number;
  avg_netto: number;
  std_netto: number;
  ultimo_netto: number;
  ultimo_data: string;
  clienti_distinti: number;
  prezzo_listino: number | null;
  sconto_medio_pct: number;
}

function cascadeNet(prezzo: number, sc1: number, sc2: number, sc3: number): number {
  return prezzo * (1 - (sc1 || 0) / 100) * (1 - (sc2 || 0) / 100) * (1 - (sc3 || 0) / 100);
}

function cascadeDiscountPct(sc1: number, sc2: number, sc3: number): number {
  const eff = 1 - (1 - (sc1 || 0) / 100) * (1 - (sc2 || 0) / 100) * (1 - (sc3 || 0) / 100);
  return eff * 100;
}

function stddev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const m = nums.reduce((a, b) => a + b, 0) / nums.length;
  const v = nums.reduce((a, b) => a + (b - m) ** 2, 0) / nums.length;
  return Math.sqrt(v);
}

export function computePriceControl(righe: RigaOrdineIC[]): {
  stats: PriceProductStat[];
  anomalies: PriceAnomaly[];
} {
  const clean = righe.filter((r) => !r.is_omaggio && r.prodotto_id && r.prezzo_unitario > 0);
  const perProd = new Map<string, RigaOrdineIC[]>();
  for (const r of clean) {
    if (!perProd.has(r.prodotto_id)) perProd.set(r.prodotto_id, []);
    perProd.get(r.prodotto_id)!.push(r);
  }

  const stats: PriceProductStat[] = [];
  const anomalies: PriceAnomaly[] = [];

  for (const [prodotto_id, rows] of perProd) {
    const netti = rows.map((r) => cascadeNet(r.prezzo_unitario, r.sc1, r.sc2, r.sc3));
    const sconti = rows.map((r) => cascadeDiscountPct(r.sc1, r.sc2, r.sc3));
    const min_netto = Math.min(...netti);
    const max_netto = Math.max(...netti);
    const avg = netti.reduce((a, b) => a + b, 0) / netti.length;
    const std = stddev(netti);
    const ultimoIdx = rows
      .map((r, i) => ({ i, d: r.data_ordine }))
      .sort((a, b) => (a.d < b.d ? 1 : -1))[0].i;
    const listinoVal = rows.find((r) => r.prezzo_listino && r.prezzo_listino > 0)?.prezzo_listino ?? null;

    stats.push({
      prodotto_id,
      n_righe: rows.length,
      min_netto,
      max_netto,
      avg_netto: avg,
      std_netto: std,
      ultimo_netto: netti[ultimoIdx],
      ultimo_data: rows[ultimoIdx].data_ordine,
      clienti_distinti: new Set(rows.map((r) => r.cliente_id)).size,
      prezzo_listino: listinoVal,
      sconto_medio_pct: sconti.reduce((a, b) => a + b, 0) / sconti.length,
    });

    // Anomalie: prezzo < avg - 1.5*std (o sconto > 40%)
    rows.forEach((r, i) => {
      const netto = netti[i];
      const scostamento = avg > 0 ? ((netto - avg) / avg) * 100 : 0;
      const scontoTot = sconti[i];
      let sev: PriceAnomaly["severita"] | null = null;
      let motivo = "";
      if (netto < avg - 1.5 * std && std > 0 && scostamento < -8) {
        sev = scostamento < -20 ? "critica" : scostamento < -12 ? "alta" : "media";
        motivo = `Prezzo netto ${scostamento.toFixed(1)}% sotto la media prodotto`;
      } else if (scontoTot > 45) {
        sev = scontoTot > 60 ? "alta" : "media";
        motivo = `Sconto cascata ${scontoTot.toFixed(1)}% oltre soglia`;
      } else if (listinoVal && netto < listinoVal * 0.5) {
        sev = "alta";
        motivo = `Prezzo netto < 50% del listino`;
      }
      if (sev) {
        anomalies.push({
          prodotto_id,
          cliente_id: r.cliente_id,
          azienda_id: r.azienda_id,
          ordine_id: r.ordine_id,
          data_ordine: r.data_ordine,
          prezzo_netto: netto,
          prezzo_lordo: r.prezzo_unitario,
          sconto_totale_pct: scontoTot,
          media_netto_prodotto: avg,
          scostamento_pct: scostamento,
          severita: sev,
          motivo,
        });
      }
    });
  }

  const sevOrd = { critica: 0, alta: 1, media: 2, info: 3 };
  anomalies.sort((a, b) => sevOrd[a.severita] - sevOrd[b.severita] || (a.data_ordine < b.data_ordine ? 1 : -1));
  return { stats, anomalies };
}

// -------- 2) Classificazione clienti (RFM) ----------------------------------

export interface ClienteRFM {
  cliente_id: string;
  recency_giorni: number;         // giorni dall'ultimo ordine
  frequency: number;              // n ordini periodo
  monetary: number;               // fatturato periodo
  r_score: 1 | 2 | 3 | 4 | 5;     // 5 = migliore
  f_score: 1 | 2 | 3 | 4 | 5;
  m_score: 1 | 2 | 3 | 4 | 5;
  score_totale: number;           // r+f+m (3..15)
  segmento:
    | "Campioni"
    | "Fedeli"
    | "Potenziali"
    | "Nuovi"
    | "Da riattivare"
    | "A rischio"
    | "Persi"
    | "Occasionali";
  primo_ordine: string;
  ultimo_ordine: string;
  ordini_ultimi_90: number;
}

function scoreFromQuintile(values: number[], value: number, higherIsBetter: boolean): 1 | 2 | 3 | 4 | 5 {
  if (values.length === 0) return 3;
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const q20 = q(0.2), q40 = q(0.4), q60 = q(0.6), q80 = q(0.8);
  const raw =
    value <= q20 ? 1 : value <= q40 ? 2 : value <= q60 ? 3 : value <= q80 ? 4 : 5;
  return (higherIsBetter ? raw : (6 - raw)) as 1 | 2 | 3 | 4 | 5;
}

function segmentaCliente(r: 1|2|3|4|5, f: 1|2|3|4|5, m: 1|2|3|4|5, recency: number, freq: number): ClienteRFM["segmento"] {
  if (r >= 4 && f >= 4 && m >= 4) return "Campioni";
  if (r >= 4 && f >= 3) return "Fedeli";
  if (r >= 4 && f <= 2) return "Nuovi";
  if (r === 3 && m >= 3) return "Potenziali";
  if (r === 2 && f >= 3) return "A rischio";
  if (r === 1 && f >= 3) return "Da riattivare";
  if (r === 1 && recency > 180) return "Persi";
  return "Occasionali";
}

export function computeRFM(ordini: OrdineIC[], today: Date = new Date()): ClienteRFM[] {
  const valid = ordini.filter(
    (o) => o.cliente_id && o.data_ordine && !["annullato", "stand_by"].includes(o.status)
  );
  const perCliente = new Map<string, OrdineIC[]>();
  for (const o of valid) {
    if (!perCliente.has(o.cliente_id!)) perCliente.set(o.cliente_id!, []);
    perCliente.get(o.cliente_id!)!.push(o);
  }
  const rows: (Omit<ClienteRFM, "r_score" | "f_score" | "m_score" | "score_totale" | "segmento"> & {})[] = [];
  for (const [cliente_id, list] of perCliente) {
    const sorted = [...list].sort((a, b) => (a.data_ordine! < b.data_ordine! ? -1 : 1));
    const ultimo = sorted[sorted.length - 1].data_ordine!;
    const primo = sorted[0].data_ordine!;
    const recency = Math.max(0, Math.round((today.getTime() - new Date(ultimo).getTime()) / 86400000));
    const monetary = sorted.reduce((s, o) => s + (o.totale || 0), 0);
    const ordini_ultimi_90 = sorted.filter(
      (o) => (today.getTime() - new Date(o.data_ordine!).getTime()) / 86400000 <= 90
    ).length;
    rows.push({
      cliente_id,
      recency_giorni: recency,
      frequency: sorted.length,
      monetary,
      primo_ordine: primo,
      ultimo_ordine: ultimo,
      ordini_ultimi_90,
    });
  }

  const recVals = rows.map((r) => r.recency_giorni);
  const freqVals = rows.map((r) => r.frequency);
  const monVals = rows.map((r) => r.monetary);

  const out: ClienteRFM[] = rows.map((r) => {
    const r_score = scoreFromQuintile(recVals, r.recency_giorni, false);
    const f_score = scoreFromQuintile(freqVals, r.frequency, true);
    const m_score = scoreFromQuintile(monVals, r.monetary, true);
    return {
      ...r,
      r_score,
      f_score,
      m_score,
      score_totale: r_score + f_score + m_score,
      segmento: segmentaCliente(r_score, f_score, m_score, r.recency_giorni, r.frequency),
    };
  });
  out.sort((a, b) => b.score_totale - a.score_totale);
  return out;
}

// -------- 3) Simulatore chiusura mese --------------------------------------

export interface MonthCloseSim {
  mese: string;                 // "YYYY-MM"
  giorni_totali: number;
  giorni_trascorsi: number;
  giorni_rimanenti: number;
  // consolidato mese corrente
  fatturato_mtd: number;
  ordini_mtd: number;
  provvigioni_mtd: number;
  // previsione fine mese
  fatturato_pace: number;         // proiezione lineare (mtd / gg trascorsi * gg totali)
  fatturato_storico: number;      // media stesso mese storico
  fatturato_previsto: number;     // blended
  ordini_previsti: number;
  provvigioni_previste: number;
  // confronti
  fatturato_stesso_mese_anno_prec: number;
  delta_yoy_pct: number;
  fatturato_mese_precedente: number;
  delta_mom_pct: number;
  aliquota_media_prevista: number;
}

function daysInMonth(y: number, m0: number): number {
  return new Date(y, m0 + 1, 0).getDate();
}

export function simulateMonthClose(ordini: OrdineIC[], today: Date = new Date()): MonthCloseSim {
  const valid = ordini.filter(
    (o) => o.data_ordine && !["annullato", "stand_by"].includes(o.status)
  );
  const y = today.getFullYear();
  const m0 = today.getMonth();
  const giorni_totali = daysInMonth(y, m0);
  const giorni_trascorsi = today.getDate();
  const giorni_rimanenti = giorni_totali - giorni_trascorsi;
  const meseCorr = `${y}-${String(m0 + 1).padStart(2, "0")}`;

  const perMese = new Map<string, { fatt: number; n: number; prov: number }>();
  for (const o of valid) {
    const key = o.data_ordine!.slice(0, 7);
    const cur = perMese.get(key) || { fatt: 0, n: 0, prov: 0 };
    cur.fatt += o.totale || 0;
    cur.n += 1;
    cur.prov += o.provvigione_prevista || 0;
    perMese.set(key, cur);
  }

  const cur = perMese.get(meseCorr) || { fatt: 0, n: 0, prov: 0 };
  const fatturato_mtd = cur.fatt;
  const ordini_mtd = cur.n;
  const provvigioni_mtd = cur.prov;

  const fatturato_pace = giorni_trascorsi > 0 ? (fatturato_mtd / giorni_trascorsi) * giorni_totali : 0;

  // media storica stesso mese (ultimi 3 anni disponibili, escluso corrente)
  const stessoMese: number[] = [];
  for (const [k, v] of perMese) {
    if (k === meseCorr) continue;
    if (parseInt(k.slice(5, 7)) === m0 + 1) stessoMese.push(v.fatt);
  }
  const fatturato_storico =
    stessoMese.length > 0 ? stessoMese.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, stessoMese.length) : 0;

  // blended: 60% pace + 40% storico se disponibile, altrimenti pace
  const fatturato_previsto =
    fatturato_storico > 0 ? fatturato_pace * 0.6 + fatturato_storico * 0.4 : fatturato_pace;

  const aliquota = fatturato_mtd > 0 ? provvigioni_mtd / fatturato_mtd : 0;
  const provvigioni_previste = fatturato_previsto * (aliquota || 0);

  const ordini_previsti =
    giorni_trascorsi > 0 ? Math.round((ordini_mtd / giorni_trascorsi) * giorni_totali) : 0;

  const annoPrec = `${y - 1}-${String(m0 + 1).padStart(2, "0")}`;
  const fyPrec = perMese.get(annoPrec)?.fatt || 0;
  const delta_yoy_pct = fyPrec > 0 ? ((fatturato_previsto - fyPrec) / fyPrec) * 100 : 0;

  const prevM0 = m0 === 0 ? 11 : m0 - 1;
  const prevY = m0 === 0 ? y - 1 : y;
  const mesePrec = `${prevY}-${String(prevM0 + 1).padStart(2, "0")}`;
  const fmPrec = perMese.get(mesePrec)?.fatt || 0;
  const delta_mom_pct = fmPrec > 0 ? ((fatturato_previsto - fmPrec) / fmPrec) * 100 : 0;

  return {
    mese: meseCorr,
    giorni_totali,
    giorni_trascorsi,
    giorni_rimanenti,
    fatturato_mtd,
    ordini_mtd,
    provvigioni_mtd,
    fatturato_pace,
    fatturato_storico,
    fatturato_previsto,
    ordini_previsti,
    provvigioni_previste,
    fatturato_stesso_mese_anno_prec: fyPrec,
    delta_yoy_pct,
    fatturato_mese_precedente: fmPrec,
    delta_mom_pct,
    aliquota_media_prevista: aliquota * 100,
  };
}
