// Motore statistico Intelligence Riordini.
// Deterministico, nessuna dipendenza esterna, nessun dato inventato.
// Regole chiave:
// - baseline storica (mediana) separata dalla frequenza recente: due intervalli
//   anomali non aggiornano subito la baseline, altrimenti un rallentamento
//   diventerebbe subito "normale".
// - un nuovo ordine non cancella un rallentamento persistente: servono almeno
//   2 cicli regolari consecutivi per rientrare.
// - nessun allarme con storico insufficiente.

export const TOLLERANZA_DEFAULT = 6;
export const TOLLERANZA_MIN = 5;
export const TOLLERANZA_MAX = 7;

export interface IntelligenceOrder {
  id: string;
  data_ordine: string; // ISO date
  totale: number;
  cartoni: number;
  pezzi: number;
}

export interface IntelligenceRiga {
  prodotto_id: string;
  data_ordine: string;
  ordine_id: string;
  quantita_cartoni: number;
  quantita_pezzi: number;
  prezzo_unitario: number;
  is_omaggio: boolean;
}

export type StatoRiordino = "regolare" | "tolleranza" | "ritardo" | "storico_insufficiente";
export type TipoRallentamento = "nessuno" | "anomalo" | "persistente" | "in_recupero";
export type Affidabilita = "alta" | "media" | "bassa" | "insufficiente";
export type Priorita = "alta" | "media" | "bassa";
export type StatoIntervallo = "regolare" | "anomalo" | "persistente";

export interface IntervalloPoint {
  from_data: string;
  to_data: string;
  from_ordine_id: string;
  to_ordine_id: string;
  giorni: number;
  stato: StatoIntervallo;
  scostamento_giorni: number;
  scostamento_pct: number;
}

export interface ProdottoNonRiordinato {
  prodotto_id: string;
  numero_acquisti: number;
  ultimo_acquisto: string;
  frequenza_giorni: number;
  giorni_senza_acquisto: number;
  giorni_ritardo: number;
  quantita_media_cartoni: number;
  prossima_data_prevista: string;
}

export interface VolumePoint {
  data: string;
  ordine_id: string;
  cartoni: number;
  pezzi: number;
  valore: number;
}

export interface PairIntelligence {
  key: string; // cliente|azienda
  cliente_id: string;
  azienda_id: string;
  numero_ordini: number;
  primo_ordine: string;
  ultimo_ordine: string;
  ultimo_ordine_id: string;
  intervalli: IntervalloPoint[];
  frequenza_abituale: number | null; // mediana storica (baseline)
  frequenza_recente: number | null; // media ultimi 4 intervalli
  media_giorni: number | null;
  deviazione_giorni: number;
  tolleranza: number;
  soglia_anomalia: number | null; // frequenza + max(7, 30%, deviazione)
  giorni_da_ultimo: number;
  prossimo_riordino_previsto: string | null;
  finestra_fine: string | null; // previsto + tolleranza
  giorni_ritardo: number;
  stato: StatoRiordino;
  rallentamento: TipoRallentamento;
  intervalli_anomali_consecutivi: number;
  cicli_regolari_dopo_rallentamento: number;
  variazione_recente_pct: number | null; // frequenza recente vs abituale
  calo_volumi: boolean;
  calo_volumi_pct: number | null;
  valore_medio_ordine: number;
  volumi: VolumePoint[];
  prodotti_non_riordinati: ProdottoNonRiordinato[];
  affidabilita: Affidabilita;
  priorita: Priorita;
  priorita_motivi: string[];
}

export interface IntelligenceOptions {
  tolleranza?: number;
  today?: string; // ISO date, default oggi
}

export function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function mean(nums: number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function stddev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const m = mean(nums);
  return Math.sqrt(nums.reduce((a, b) => a + (b - m) ** 2, 0) / nums.length);
}

export function dayOf(date: string): number {
  return Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / 86400000;
}

function isoFromDay(d: number): string {
  return new Date(d * 86400000).toISOString().slice(0, 10);
}

function clampTolleranza(t: number | undefined): number {
  if (t === undefined || Number.isNaN(t)) return TOLLERANZA_DEFAULT;
  return Math.min(TOLLERANZA_MAX, Math.max(TOLLERANZA_MIN, Math.round(t)));
}

/** Soglia oltre la quale un intervallo è anomalo: frequenza + max(7 gg, 30%, deviazione storica). */
export function sogliaAnomalia(frequenza: number, deviazione: number): number {
  return frequenza + Math.max(7, frequenza * 0.3, deviazione);
}

export function analyzePair(
  cliente_id: string,
  azienda_id: string,
  orders: IntelligenceOrder[],
  righe: IntelligenceRiga[],
  opts: IntelligenceOptions = {}
): PairIntelligence {
  const tolleranza = clampTolleranza(opts.tolleranza);
  const today = opts.today || new Date().toISOString().slice(0, 10);

  // Un ordine per giorno: stesso giorno non crea falsi intervalli.
  const byDay = new Map<string, IntelligenceOrder>();
  for (const o of orders) {
    const d = o.data_ordine.slice(0, 10);
    const cur = byDay.get(d);
    if (!cur) byDay.set(d, { ...o, data_ordine: d });
    else {
      cur.totale += o.totale;
      cur.cartoni += o.cartoni;
      cur.pezzi += o.pezzi;
    }
  }
  const giorni = Array.from(byDay.values()).sort((a, b) => a.data_ordine.localeCompare(b.data_ordine));
  const numero_ordini = giorni.length;

  const base: PairIntelligence = {
    key: `${cliente_id}|${azienda_id}`,
    cliente_id,
    azienda_id,
    numero_ordini,
    primo_ordine: giorni[0]?.data_ordine || "",
    ultimo_ordine: giorni[numero_ordini - 1]?.data_ordine || "",
    ultimo_ordine_id: giorni[numero_ordini - 1]?.id || "",
    intervalli: [],
    frequenza_abituale: null,
    frequenza_recente: null,
    media_giorni: null,
    deviazione_giorni: 0,
    tolleranza,
    soglia_anomalia: null,
    giorni_da_ultimo: numero_ordini ? dayOf(today) - dayOf(giorni[numero_ordini - 1].data_ordine) : 0,
    prossimo_riordino_previsto: null,
    finestra_fine: null,
    giorni_ritardo: 0,
    stato: "storico_insufficiente",
    rallentamento: "nessuno",
    intervalli_anomali_consecutivi: 0,
    cicli_regolari_dopo_rallentamento: 0,
    variazione_recente_pct: null,
    calo_volumi: false,
    calo_volumi_pct: null,
    valore_medio_ordine: mean(giorni.map((g) => g.totale)),
    volumi: giorni.map((g) => ({ data: g.data_ordine, ordine_id: g.id, cartoni: g.cartoni, pezzi: g.pezzi, valore: g.totale })),
    prodotti_non_riordinati: [],
    affidabilita: "insufficiente",
    priorita: "bassa",
    priorita_motivi: [],
  };

  if (numero_ordini < 3) return base; // storico insufficiente: nessun allarme

  const rawIntervals: number[] = [];
  for (let i = 1; i < giorni.length; i++) {
    rawIntervals.push(dayOf(giorni[i].data_ordine) - dayOf(giorni[i - 1].data_ordine));
  }

  // Baseline: mediana storica. Con almeno 6 intervalli esclude gli ultimi 2,
  // così un rallentamento recente non riscrive subito la frequenza abituale.
  const baselineSet = rawIntervals.length >= 6 ? rawIntervals.slice(0, -2) : rawIntervals;
  const frequenza = median(baselineSet);
  const deviazione = stddev(baselineSet);
  const recenti = rawIntervals.slice(-4);
  const frequenza_recente = mean(recenti);
  const soglia = sogliaAnomalia(frequenza, deviazione);

  // Classifica ogni intervallo; "persistente" = parte di una coda di 2+ anomali.
  const anomalo = rawIntervals.map((g) => g > soglia);
  const intervalli: IntervalloPoint[] = rawIntervals.map((g, i) => {
    let stato: StatoIntervallo = "regolare";
    if (anomalo[i]) {
      const prev = i > 0 && anomalo[i - 1];
      const next = i < anomalo.length - 1 && anomalo[i + 1];
      stato = prev || next ? "persistente" : "anomalo";
    }
    return {
      from_data: giorni[i].data_ordine,
      to_data: giorni[i + 1].data_ordine,
      from_ordine_id: giorni[i].id,
      to_ordine_id: giorni[i + 1].id,
      giorni: g,
      stato,
      scostamento_giorni: Math.round(g - frequenza),
      scostamento_pct: frequenza > 0 ? Math.round(((g - frequenza) / frequenza) * 100) : 0,
    };
  });

  // Coda di anomalie consecutive e cicli regolari successivi.
  let codaAnomali = 0;
  for (let i = anomalo.length - 1; i >= 0 && anomalo[i]; i--) codaAnomali++;
  let cicliRegolariDopo = 0;
  if (codaAnomali === 0) {
    // cerca l'ultima serie anomala e conta i regolari dopo di essa
    let lastAnomalo = -1;
    for (let i = anomalo.length - 1; i >= 0; i--) if (anomalo[i]) { lastAnomalo = i; break; }
    if (lastAnomalo >= 0) {
      // la serie era persistente se comprende almeno 2 anomali consecutivi
      const eraPersistente = lastAnomalo > 0 && anomalo[lastAnomalo - 1];
      cicliRegolariDopo = eraPersistente ? anomalo.length - 1 - lastAnomalo : 0;
    }
  }

  let rallentamento: TipoRallentamento = "nessuno";
  if (codaAnomali >= 2) rallentamento = "persistente";
  else if (codaAnomali === 1) rallentamento = "anomalo";
  else if (cicliRegolariDopo > 0 && cicliRegolariDopo < 2) rallentamento = "in_recupero";

  // Stato riordino rispetto a oggi.
  const giorniDaUltimo = base.giorni_da_ultimo;
  let stato: StatoRiordino = "regolare";
  if (giorniDaUltimo > frequenza + tolleranza) stato = "ritardo";
  else if (giorniDaUltimo > frequenza) stato = "tolleranza";

  const prossimo = isoFromDay(dayOf(base.ultimo_ordine) + Math.round(frequenza));
  const finestra = isoFromDay(dayOf(prossimo) + tolleranza);

  // Calo dei volumi: media ultimi 3 ordini vs media storica precedente.
  let calo_volumi = false;
  let calo_volumi_pct: number | null = null;
  if (numero_ordini >= 6) {
    const recentiV = giorni.slice(-3);
    const storiciV = giorni.slice(0, -3);
    const mRecente = mean(recentiV.map((g) => g.totale));
    const mStorica = mean(storiciV.map((g) => g.totale));
    if (mStorica > 0) {
      calo_volumi_pct = Math.round(((mRecente - mStorica) / mStorica) * 100);
      calo_volumi = mRecente < mStorica * 0.7;
    }
  }

  // Affidabilità statistica.
  const cv = frequenza > 0 ? deviazione / frequenza : 1;
  let affidabilita: Affidabilita = "bassa";
  if (numero_ordini >= 8 && cv <= 0.4) affidabilita = "alta";
  else if (numero_ordini >= 5 && cv <= 0.6) affidabilita = "media";

  // Prodotti non riordinati: almeno 3 acquisti distinti, in ritardo oltre
  // la propria frequenza + tolleranza mentre il cliente compra altro.
  const prodotti = analyzeProdotti(righe, tolleranza, today, base.ultimo_ordine);

  const variazione_recente_pct = frequenza > 0 ? Math.round(((frequenza_recente - frequenza) / frequenza) * 100) : null;

  // Priorità commerciale con spiegazione.
  const giorni_ritardo = stato === "ritardo" ? Math.round(giorniDaUltimo - frequenza - tolleranza) : 0;
  const motivi: string[] = [];
  let score = 0;
  if (giorni_ritardo > 0) { score += Math.min(40, giorni_ritardo * 2); motivi.push(`${giorni_ritardo} giorni di ritardo oltre la tolleranza`); }
  if (rallentamento === "persistente") { score += 30; motivi.push("rallentamento persistente (2+ intervalli anomali consecutivi)"); }
  else if (rallentamento === "anomalo") { score += 15; motivi.push("ultimo intervallo anomalo rispetto alla frequenza abituale"); }
  else if (rallentamento === "in_recupero") { score += 8; motivi.push("rallentamento in fase di rientro, ancora da verificare"); }
  if (calo_volumi) { score += 20; motivi.push(`calo dei volumi del ${Math.abs(calo_volumi_pct || 0)}% negli ultimi ordini`); }
  if (prodotti.length > 0) { score += Math.min(20, prodotti.length * 10); motivi.push(`${prodotti.length} prodotti abituali non più riordinati`); }
  if (base.valore_medio_ordine > 0) { score += Math.min(20, base.valore_medio_ordine / 100); motivi.push(`valore medio ordine ${Math.round(base.valore_medio_ordine)} €`); }
  if (affidabilita === "bassa") { score = Math.round(score * 0.6); motivi.push("previsione a bassa affidabilità (storico variabile)"); }
  const priorita: Priorita = score >= 60 ? "alta" : score >= 30 ? "media" : "bassa";
  if (!motivi.length) motivi.push("nessun fattore di rischio rilevato");

  return {
    ...base,
    intervalli,
    frequenza_abituale: Math.round(frequenza * 10) / 10,
    frequenza_recente: Math.round(frequenza_recente * 10) / 10,
    media_giorni: Math.round(mean(rawIntervals) * 10) / 10,
    deviazione_giorni: Math.round(deviazione * 10) / 10,
    soglia_anomalia: Math.round(soglia * 10) / 10,
    prossimo_riordino_previsto: prossimo,
    finestra_fine: finestra,
    giorni_ritardo,
    stato,
    rallentamento,
    intervalli_anomali_consecutivi: codaAnomali,
    cicli_regolari_dopo_rallentamento: cicliRegolariDopo,
    variazione_recente_pct,
    calo_volumi,
    calo_volumi_pct,
    prodotti_non_riordinati: prodotti,
    affidabilita,
    priorita,
    priorita_motivi: motivi,
  };
}

function analyzeProdotti(
  righe: IntelligenceRiga[],
  tolleranza: number,
  today: string,
  ultimoOrdinePair: string
): ProdottoNonRiordinato[] {
  const byProdotto = new Map<string, Map<string, { cartoni: number }>>();
  for (const r of righe) {
    if (r.is_omaggio || !r.prodotto_id) continue;
    const d = r.data_ordine.slice(0, 10);
    if (!byProdotto.has(r.prodotto_id)) byProdotto.set(r.prodotto_id, new Map());
    const perDay = byProdotto.get(r.prodotto_id)!;
    const cur = perDay.get(d) || { cartoni: 0 };
    cur.cartoni += r.quantita_cartoni || 0;
    perDay.set(d, cur);
  }

  const out: ProdottoNonRiordinato[] = [];
  for (const [prodotto_id, perDay] of byProdotto) {
    const dates = Array.from(perDay.keys()).sort();
    if (dates.length < 3) continue; // un acquisto occasionale non è un'abitudine
    const intervals: number[] = [];
    for (let i = 1; i < dates.length; i++) intervals.push(dayOf(dates[i]) - dayOf(dates[i - 1]));
    const frequenza = median(intervals);
    if (frequenza <= 0) continue;
    const ultimo = dates[dates.length - 1];
    const giorniSenza = dayOf(today) - dayOf(ultimo);
    const ritardo = Math.round(giorniSenza - frequenza - tolleranza);
    // segnala solo se il prodotto è in ritardo E il cliente ha continuato
    // ad ordinare altro dopo l'ultimo acquisto di questo prodotto
    if (ritardo > 0 && ultimo < ultimoOrdinePair) {
      const cartoniTot = dates.reduce((s, d) => s + (perDay.get(d)?.cartoni || 0), 0);
      out.push({
        prodotto_id,
        numero_acquisti: dates.length,
        ultimo_acquisto: ultimo,
        frequenza_giorni: Math.round(frequenza * 10) / 10,
        giorni_senza_acquisto: giorniSenza,
        giorni_ritardo: ritardo,
        quantita_media_cartoni: Math.round((cartoniTot / dates.length) * 10) / 10,
        prossima_data_prevista: isoFromDay(dayOf(ultimo) + Math.round(frequenza)),
      });
    }
  }
  return out.sort((a, b) => b.giorni_ritardo - a.giorni_ritardo);
}

export interface PortfolioKPIs {
  clienti_monitorati: number;
  riordini_previsti_30gg: number;
  clienti_in_ritardo: number;
  clienti_sospetti: number; // rallentamento anomalo o in recupero
  rallentamenti_persistenti: number;
  prodotti_non_riordinati: number;
  calo_volumi: number;
  inattivita_prolungata: number; // ritardo > 2x frequenza
}

export function computePortfolioKPIs(pairs: PairIntelligence[], today?: string): PortfolioKPIs {
  const t = today || new Date().toISOString().slice(0, 10);
  const kpi: PortfolioKPIs = {
    clienti_monitorati: 0,
    riordini_previsti_30gg: 0,
    clienti_in_ritardo: 0,
    clienti_sospetti: 0,
    rallentamenti_persistenti: 0,
    prodotti_non_riordinati: 0,
    calo_volumi: 0,
    inattivita_prolungata: 0,
  };
  for (const p of pairs) {
    if (p.affidabilita === "insufficiente") continue;
    kpi.clienti_monitorati++;
    if (p.prossimo_riordino_previsto && p.prossimo_riordino_previsto >= t && dayOf(p.prossimo_riordino_previsto) - dayOf(t) <= 30) kpi.riordini_previsti_30gg++;
    if (p.stato === "ritardo") kpi.clienti_in_ritardo++;
    if (p.rallentamento === "anomalo" || p.rallentamento === "in_recupero") kpi.clienti_sospetti++;
    if (p.rallentamento === "persistente") kpi.rallentamenti_persistenti++;
    kpi.prodotti_non_riordinati += p.prodotti_non_riordinati.length;
    if (p.calo_volumi) kpi.calo_volumi++;
    if (p.frequenza_abituale && p.giorni_da_ultimo > p.frequenza_abituale * 2) kpi.inattivita_prolungata++;
  }
  return kpi;
}
