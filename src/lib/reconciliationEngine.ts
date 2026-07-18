/**
 * Motore di riconciliazione many-to-many — FASE 2
 * ------------------------------------------------
 * Input: righe estratto (PDF) + ordini CRM già filtrati per finestra temporale.
 * Output: allocazioni (M:N) fra righe estratto e ordini, più residui non spiegati.
 *
 * Regole:
 *  - Fonte di verità importo ordine: `ordini.totale` (Fase 1, Opzione A).
 *  - Ogni allocazione ha `percentuale` e `quota_imponibile` che sommano al totale
 *    dell'ordine (lato CRM) e al totale della riga estratto (lato PDF).
 *  - Cluster: (azienda × cliente_effettivo). Gli alias risolvono `cliente_effettivo`.
 *  - Il solver è deterministico e testabile in isolamento (no I/O).
 */
import { orderRevenue, orderDate, isCounted, type OrdineLike } from "./metricsEngine";

// ---------- Tipi input ----------

export type EstrattoRiga = {
  id: string;
  cliente_id: string | null; // già risolto da alias upstream
  azienda_id: string | null;
  ordine_codice_pdf?: string | null;
  imponibile_pdf: number | string | null;
  provvigione_pdf: number | string | null;
  aliquota_pdf?: number | string | null;
  data_documento?: string | null;
  descrizione?: string | null;
  tipo_movimento?: string | null; // es. "bonus", "abbuono", "nota_credito"
};

export type OrdineForRec = OrdineLike & {
  codice?: string | null;
  cliente_id?: string | null;
  azienda_id?: string | null;
  provvigione_prevista?: number | string | null;
};

// ---------- Tipi output ----------

export type Allocazione = {
  estratto_riga_id: string;
  ordine_id: string;
  quota_imponibile: number;
  quota_provvigione: number;
  percentuale: number; // 0-100 rispetto all'ordine
  tipo: "intero" | "parziale" | "acconto" | "saldo" | "abbuono" | "bonus" | "rettifica";
  confidence: number; // 0-100
  reasons: string[];
};

export type Cluster = {
  cliente_id: string | null;
  azienda_id: string | null;
  righe_pdf: EstrattoRiga[];
  ordini: OrdineForRec[];
  allocazioni: Allocazione[];
  residuo_pdf: number; // importo PDF non allocato a ordini (bonus/abbuono)
  residuo_crm: number; // importo ordini non coperto dal PDF (scoperto)
  totale_pdf: number;
  totale_crm: number;
};

export type ReconciliationResult = {
  clusters: Cluster[];
  allocazioni: Allocazione[];
  righe_pdf_orphan: EstrattoRiga[]; // nessun cluster (dati incompleti)
  ordini_orphan: OrdineForRec[];
  kpi: {
    totale_pdf: number;
    totale_crm: number;
    coperto: number;
    scoperto: number;
    sovrapagato: number;
    bonus_abbuoni: number;
    perfect_matches: number;
    allocazioni_totali: number;
  };
};

// ---------- Utilità ----------

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

const AMOUNT_TOL_PCT = 0.02; // 2%
const AMOUNT_TOL_ABS = 1.0;  // 1 €
const DATE_WINDOW_DAYS = 180;

const closeAmount = (a: number, b: number): boolean => {
  if (a === 0 && b === 0) return true;
  const diff = Math.abs(a - b);
  const base = Math.max(Math.abs(a), Math.abs(b), 1);
  return diff <= AMOUNT_TOL_ABS || diff / base <= AMOUNT_TOL_PCT;
};

const daysBetween = (a?: string | null, b?: string | null): number => {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (!Number.isFinite(da) || !Number.isFinite(db)) return Number.POSITIVE_INFINITY;
  return Math.abs(da - db) / 86400000;
};

const normalizeCodice = (s?: string | null): string =>
  (s ?? "").toString().toLowerCase().replace(/[^a-z0-9]/g, "");

const isBonusMovement = (r: EstrattoRiga): boolean => {
  const t = (r.tipo_movimento || "").toLowerCase();
  if (t.includes("bonus") || t.includes("premio") || t.includes("abbuono") || t.includes("nota")) return true;
  const desc = (r.descrizione || "").toLowerCase();
  return /(bonus|premio|abbuono|nota\s?credito|rettifica)/i.test(desc);
};

// ---------- Cluster ----------

function keyOf(cliente_id: string | null, azienda_id: string | null): string {
  return `${cliente_id ?? "?"}::${azienda_id ?? "?"}`;
}

function buildClusters(righe: EstrattoRiga[], ordini: OrdineForRec[]): {
  clusters: Map<string, Cluster>;
  ordini_orphan: OrdineForRec[];
  righe_orphan: EstrattoRiga[];
} {
  const clusters = new Map<string, Cluster>();
  const righe_orphan: EstrattoRiga[] = [];
  const ordini_orphan: OrdineForRec[] = [];

  const ensure = (cliId: string | null, aziId: string | null): Cluster => {
    const k = keyOf(cliId, aziId);
    let c = clusters.get(k);
    if (!c) {
      c = {
        cliente_id: cliId,
        azienda_id: aziId,
        righe_pdf: [],
        ordini: [],
        allocazioni: [],
        residuo_pdf: 0,
        residuo_crm: 0,
        totale_pdf: 0,
        totale_crm: 0,
      };
      clusters.set(k, c);
    }
    return c;
  };

  for (const r of righe) {
    if (!r.cliente_id || !r.azienda_id) {
      righe_orphan.push(r);
      continue;
    }
    ensure(r.cliente_id, r.azienda_id).righe_pdf.push(r);
  }

  for (const o of ordini) {
    if (!isCounted(o)) continue;
    if (!o.cliente_id || !o.azienda_id) {
      ordini_orphan.push(o);
      continue;
    }
    const k = keyOf(o.cliente_id, o.azienda_id);
    if (clusters.has(k)) clusters.get(k)!.ordini.push(o);
    // ordini senza controparte PDF → li tratteremo cluster-per-cluster; qui li
    // aggiungiamo solo se esiste già il cluster (matching lato PDF).
    // Gli ordini "senza cluster" verranno considerati orphan globali.
    else ordini_orphan.push(o);
  }

  return { clusters, ordini_orphan, righe_orphan };
}

// ---------- Scoring ----------

function scoreOrderForRiga(r: EstrattoRiga, o: OrdineForRec): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // codice ordine (fortissimo)
  const codePdf = normalizeCodice(r.ordine_codice_pdf);
  const codeCrm = normalizeCodice(o.codice ?? null);
  if (codePdf && codeCrm && (codePdf === codeCrm || codePdf.includes(codeCrm) || codeCrm.includes(codePdf))) {
    score += 50;
    reasons.push("codice ordine coincidente");
  }

  // importo
  const impPdf = num(r.imponibile_pdf);
  const totCrm = orderRevenue(o);
  if (closeAmount(impPdf, totCrm)) {
    score += 30;
    reasons.push("importo entro tolleranza");
  } else if (impPdf > 0 && totCrm > 0) {
    const ratio = Math.min(impPdf, totCrm) / Math.max(impPdf, totCrm);
    score += Math.round(ratio * 15);
  }

  // data
  const d = daysBetween(r.data_documento, orderDate(o));
  if (d <= 30) { score += 15; reasons.push("data entro 30gg"); }
  else if (d <= 90) { score += 8; reasons.push("data entro 90gg"); }
  else if (d <= DATE_WINDOW_DAYS) { score += 3; }

  // provvigione attesa vs pagata
  const provPdf = num(r.provvigione_pdf);
  const provCrm = num(o.provvigione_prevista);
  if (provCrm > 0 && closeAmount(provPdf, provCrm)) {
    score += 10;
    reasons.push("provvigione coerente");
  }

  return { score, reasons };
}

// ---------- Solver per cluster ----------

/**
 * Trova un sottoinsieme di ordini la cui somma dei totali è ~ target.
 * Ritorna gli id degli ordini scelti (o null se non trova).
 * Bound: fino a 20 ordini per cluster per evitare esplosione 2^N.
 */
function findSubset(ordini: OrdineForRec[], target: number): string[] | null {
  const items = ordini.filter((o) => orderRevenue(o) > 0).slice(0, 20);
  const n = items.length;
  if (n === 0) return null;
  // greedy + backtrack limitato
  const sorted = [...items].sort((a, b) => orderRevenue(b) - orderRevenue(a));
  const chosen: OrdineForRec[] = [];
  let best: OrdineForRec[] | null = null;
  const search = (idx: number, running: number) => {
    if (best) return;
    if (closeAmount(running, target)) { best = [...chosen]; return; }
    if (idx >= sorted.length || running > target * 1.02 + AMOUNT_TOL_ABS) return;
    const it = sorted[idx];
    chosen.push(it);
    search(idx + 1, running + orderRevenue(it));
    chosen.pop();
    search(idx + 1, running);
  };
  search(0, 0);
  return best ? (best as OrdineForRec[]).map((o) => o.id) : null;
}

function solveCluster(cluster: Cluster): void {
  const { righe_pdf, ordini } = cluster;
  cluster.totale_pdf = righe_pdf.reduce((s, r) => s + num(r.imponibile_pdf), 0);
  cluster.totale_crm = ordini.reduce((s, o) => s + orderRevenue(o), 0);

  // Set di ordini "consumati" (percentuale rimanente da allocare per ordine)
  const remainingByOrder = new Map<string, number>();
  for (const o of ordini) remainingByOrder.set(o.id, orderRevenue(o));

  // Processa righe: bonus/abbuoni prima (li marchiamo come residuo PDF)
  const righeNormali: EstrattoRiga[] = [];
  for (const r of righe_pdf) {
    if (isBonusMovement(r)) {
      cluster.residuo_pdf += num(r.imponibile_pdf);
      // Allocazione simbolica al miglior ordine (per tracciabilità) se esiste
      const best = ordini
        .map((o) => ({ o, s: scoreOrderForRiga(r, o) }))
        .sort((a, b) => b.s.score - a.s.score)[0];
      if (best && best.s.score > 20) {
        cluster.allocazioni.push({
          estratto_riga_id: r.id,
          ordine_id: best.o.id,
          quota_imponibile: num(r.imponibile_pdf),
          quota_provvigione: num(r.provvigione_pdf),
          percentuale: 0,
          tipo: (r.tipo_movimento || "").toLowerCase().includes("abbuono") ? "abbuono" : "bonus",
          confidence: Math.min(80, best.s.score),
          reasons: ["movimento extra ordine", ...best.s.reasons],
        });
      }
      continue;
    }
    righeNormali.push(r);
  }

  // Passo 1: 1↔1 esatti (codice + importo)
  for (const r of righeNormali.slice()) {
    const impPdf = num(r.imponibile_pdf);
    const candidates = ordini
      .filter((o) => (remainingByOrder.get(o.id) ?? 0) > 0)
      .map((o) => ({ o, s: scoreOrderForRiga(r, o) }))
      .sort((a, b) => b.s.score - a.s.score);
    const top = candidates[0];
    if (!top || top.s.score < 55) continue;
    const rem = remainingByOrder.get(top.o.id) ?? 0;
    if (closeAmount(rem, impPdf)) {
      cluster.allocazioni.push({
        estratto_riga_id: r.id,
        ordine_id: top.o.id,
        quota_imponibile: round2(impPdf),
        quota_provvigione: round2(num(r.provvigione_pdf)),
        percentuale: 100,
        tipo: "intero",
        confidence: Math.min(100, top.s.score + 15),
        reasons: top.s.reasons,
      });
      remainingByOrder.set(top.o.id, 0);
      righeNormali.splice(righeNormali.indexOf(r), 1);
    }
  }

  // Passo 2: 1↔N (una riga PDF copre più ordini) → subset-sum
  for (const r of righeNormali.slice()) {
    const impPdf = num(r.imponibile_pdf);
    if (impPdf <= 0) continue;
    const available = ordini.filter((o) => (remainingByOrder.get(o.id) ?? 0) > 0);
    if (available.length < 2) continue;
    const availableFull: OrdineForRec[] = available.map((o) => ({
      ...o,
      totale: remainingByOrder.get(o.id) ?? 0,
    }));
    const subset = findSubset(availableFull, impPdf);
    if (subset && subset.length >= 2) {
      const provPdf = num(r.provvigione_pdf);
      const totalSubset = subset.reduce((s, id) => s + (remainingByOrder.get(id) ?? 0), 0);
      for (const oid of subset) {
        const rem = remainingByOrder.get(oid) ?? 0;
        const pct = totalSubset > 0 ? (rem / totalSubset) * 100 : 0;
        cluster.allocazioni.push({
          estratto_riga_id: r.id,
          ordine_id: oid,
          quota_imponibile: round2(rem),
          quota_provvigione: round2((rem / totalSubset) * provPdf),
          percentuale: round2(pct),
          tipo: "parziale",
          confidence: 70,
          reasons: ["subset-sum su cluster", "importo aggregato coincide"],
        });
        remainingByOrder.set(oid, 0);
      }
      righeNormali.splice(righeNormali.indexOf(r), 1);
    }
  }

  // Passo 3: N↔1 (più righe PDF su un ordine) e residui parziali
  // Ordino ordini per residuo desc; per ogni ordine con residuo, prendo le
  // righe PDF migliori finché non arrivo a coprire il residuo.
  for (const o of ordini) {
    let rem = remainingByOrder.get(o.id) ?? 0;
    if (rem <= 0) continue;
    const candidates = righeNormali
      .map((r) => ({ r, s: scoreOrderForRiga(r, o) }))
      .filter((c) => c.s.score >= 30)
      .sort((a, b) => b.s.score - a.s.score);
    for (const c of candidates) {
      if (rem <= 0.01) break;
      const impPdf = num(c.r.imponibile_pdf);
      if (impPdf <= 0) continue;
      const quota = Math.min(impPdf, rem);
      const pct = orderRevenue(o) > 0 ? (quota / orderRevenue(o)) * 100 : 0;
      cluster.allocazioni.push({
        estratto_riga_id: c.r.id,
        ordine_id: o.id,
        quota_imponibile: round2(quota),
        quota_provvigione: round2(num(c.r.provvigione_pdf) * (impPdf > 0 ? quota / impPdf : 0)),
        percentuale: round2(pct),
        tipo: pct >= 99 ? "saldo" : "acconto",
        confidence: Math.min(85, c.s.score),
        reasons: ["allocazione parziale", ...c.s.reasons],
      });
      rem -= quota;
      remainingByOrder.set(o.id, rem);
      // Rimuovi la riga se completamente consumata
      if (impPdf <= quota + 0.01) {
        const idx = righeNormali.indexOf(c.r);
        if (idx >= 0) righeNormali.splice(idx, 1);
      }
    }
  }

  // Residui finali
  cluster.residuo_pdf += righeNormali.reduce((s, r) => s + num(r.imponibile_pdf), 0);
  cluster.residuo_crm = Array.from(remainingByOrder.values()).reduce((s, v) => s + v, 0);
}

// ---------- Entry point ----------

export function reconcile(
  righeEstratto: EstrattoRiga[],
  ordini: OrdineForRec[]
): ReconciliationResult {
  const { clusters, ordini_orphan, righe_orphan } = buildClusters(righeEstratto, ordini);

  for (const c of clusters.values()) solveCluster(c);

  const allocazioni: Allocazione[] = [];
  let coperto = 0;
  let scoperto = 0;
  let sovrapagato = 0;
  let bonus_abbuoni = 0;
  let perfect = 0;
  let totale_pdf = 0;
  let totale_crm = 0;

  for (const c of clusters.values()) {
    for (const a of c.allocazioni) allocazioni.push(a);
    totale_pdf += c.totale_pdf;
    totale_crm += c.totale_crm;
    coperto += c.totale_crm - c.residuo_crm;
    scoperto += c.residuo_crm;
    if (c.residuo_pdf > 0.01) {
      // sovrapagamento (residuo PDF senza ordine CRM da coprire)
      // ↳ se sono bonus/abbuoni li contiamo a parte
      bonus_abbuoni += c.allocazioni
        .filter((a) => a.tipo === "bonus" || a.tipo === "abbuono")
        .reduce((s, a) => s + a.quota_imponibile, 0);
      sovrapagato += Math.max(0, c.residuo_pdf - bonus_abbuoni);
    }
    perfect += c.allocazioni.filter((a) => a.tipo === "intero" && a.confidence >= 90).length;
  }

  return {
    clusters: Array.from(clusters.values()),
    allocazioni,
    righe_pdf_orphan: righe_orphan,
    ordini_orphan,
    kpi: {
      totale_pdf: round2(totale_pdf),
      totale_crm: round2(totale_crm),
      coperto: round2(coperto),
      scoperto: round2(scoperto),
      sovrapagato: round2(sovrapagato),
      bonus_abbuoni: round2(bonus_abbuoni),
      perfect_matches: perfect,
      allocazioni_totali: allocazioni.length,
    },
  };
}
