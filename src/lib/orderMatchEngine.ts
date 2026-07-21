// Compares CRM order lines against a parsed confirmation document.
// Pure TS, no I/O. Reuses the shape returned by parse-order-multi.

export type CRMRiga = {
  id: string;
  prodotto_id: string | null;
  prodotto_nome: string | null;
  prodotto_codice: string | null;
  quantita_cartoni: number;
  quantita_pezzi: number;
  prezzo_unitario: number; // per cartone
  sc1: number;
  sc2: number;
  sc3: number;
  is_omaggio: boolean;
};

export type PDFRiga = {
  codice_prodotto?: string | null;
  nome_prodotto: string;
  quantita_cartoni: number;
  pezzi_per_cartone?: number;
  prezzo_per_cartone: number;
  sc1?: number;
  sc2?: number;
  sc3?: number;
  is_omaggio?: boolean;
  importo_riga?: number;
};

export type MatchStato =
  | "ok"
  | "qta_diff"
  | "prezzo_diff"
  | "sconto_diff"
  | "omaggio_diff"
  | "mancante_in_conferma"
  | "extra_in_conferma"
  | "sostituito";

export type RigaEsito = {
  stato: MatchStato;
  gravita: "ok" | "warning" | "error";
  crm?: CRMRiga;
  pdf?: PDFRiga;
  differenze: string[];
  score: number; // 0..1
};

export type ConfrontoEsito = {
  righe: RigaEsito[];
  score: number;
  righe_ok: number;
  righe_diff: number;
  righe_mancanti: number;
  righe_extra: number;
  totale_crm: number;
  totale_pdf: number;
  delta_totale: number;
};

const normalize = (s: string | null | undefined) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function similarity(a: string, b: string): number {
  const A = normalize(a);
  const B = normalize(b);
  if (!A || !B) return 0;
  if (A === B) return 1;
  const tokA = new Set(A.split(" "));
  const tokB = new Set(B.split(" "));
  const inter = [...tokA].filter((t) => tokB.has(t)).length;
  const uni = new Set([...tokA, ...tokB]).size;
  const jaccard = uni > 0 ? inter / uni : 0;
  const contains = A.includes(B) || B.includes(A) ? 0.15 : 0;
  return Math.min(1, jaccard + contains);
}

function matchScore(crm: CRMRiga, pdf: PDFRiga): number {
  const codeA = (crm.prodotto_codice || "").toLowerCase().trim();
  const codeB = (pdf.codice_prodotto || "").toLowerCase().trim();
  if (codeA && codeB && codeA === codeB) return 1;
  return similarity(crm.prodotto_nome || "", pdf.nome_prodotto);
}

const approxEqual = (a: number, b: number, tolAbs = 0.02, tolRel = 0.02) => {
  const d = Math.abs(a - b);
  if (d <= tolAbs) return true;
  const base = Math.max(Math.abs(a), Math.abs(b), 1);
  return d / base <= tolRel;
};

function confrontoRiga(crm: CRMRiga, pdf: PDFRiga): RigaEsito {
  const diffs: string[] = [];
  let stato: MatchStato = "ok";
  let gravita: RigaEsito["gravita"] = "ok";

  if (!approxEqual(crm.quantita_cartoni, pdf.quantita_cartoni, 0.001, 0)) {
    diffs.push(`Cartoni CRM ${crm.quantita_cartoni} vs conferma ${pdf.quantita_cartoni}`);
    stato = "qta_diff";
    gravita = "error";
  }

  if (!crm.is_omaggio && !pdf.is_omaggio) {
    if (!approxEqual(crm.prezzo_unitario, pdf.prezzo_per_cartone, 0.01, 0.02)) {
      diffs.push(
        `Prezzo CRM ${crm.prezzo_unitario.toFixed(2)} vs conferma ${pdf.prezzo_per_cartone.toFixed(2)}`
      );
      if (stato === "ok") stato = "prezzo_diff";
      gravita = "error";
    }
  }

  const cSc = [crm.sc1 || 0, crm.sc2 || 0, crm.sc3 || 0];
  const pSc = [pdf.sc1 || 0, pdf.sc2 || 0, pdf.sc3 || 0];
  cSc.forEach((v, i) => {
    if (!approxEqual(v, pSc[i], 0.05, 0)) {
      diffs.push(`sc${i + 1} CRM ${v} vs conferma ${pSc[i]}`);
      if (stato === "ok") stato = "sconto_diff";
      if (gravita === "ok") gravita = "warning";
    }
  });

  if (!!crm.is_omaggio !== !!pdf.is_omaggio) {
    diffs.push(`Omaggio CRM=${crm.is_omaggio} vs conferma=${!!pdf.is_omaggio}`);
    stato = "omaggio_diff";
    gravita = "error";
  }

  const score = diffs.length === 0 ? 1 : gravita === "warning" ? 0.6 : 0.3;
  return { stato, gravita, crm, pdf, differenze: diffs, score };
}

export function confrontaOrdine(
  crmRighe: CRMRiga[],
  pdfRighe: PDFRiga[],
  opts?: { matchThreshold?: number }
): ConfrontoEsito {
  const threshold = opts?.matchThreshold ?? 0.35;
  const usedPdf = new Set<number>();
  const risultati: RigaEsito[] = [];

  // 1) match ogni riga CRM con la miglior riga PDF disponibile
  for (const c of crmRighe) {
    let bestIdx = -1;
    let bestScore = 0;
    pdfRighe.forEach((p, i) => {
      if (usedPdf.has(i)) return;
      const s = matchScore(c, p);
      if (s > bestScore) {
        bestScore = s;
        bestIdx = i;
      }
    });
    if (bestIdx >= 0 && bestScore >= threshold) {
      usedPdf.add(bestIdx);
      const esito = confrontoRiga(c, pdfRighe[bestIdx]);
      if (bestScore < 0.7 && esito.stato === "ok") {
        esito.stato = "sostituito";
        esito.gravita = "warning";
        esito.differenze.push(`Nome prodotto simile ma non identico (match ${(bestScore * 100).toFixed(0)}%)`);
      }
      risultati.push(esito);
    } else {
      risultati.push({
        stato: "mancante_in_conferma",
        gravita: "error",
        crm: c,
        differenze: ["Riga presente nel CRM ma non trovata nella conferma"],
        score: 0,
      });
    }
  }

  // 2) righe PDF non utilizzate = extra
  pdfRighe.forEach((p, i) => {
    if (!usedPdf.has(i)) {
      risultati.push({
        stato: "extra_in_conferma",
        gravita: "error",
        pdf: p,
        differenze: ["Riga presente nella conferma ma non nell'ordine CRM"],
        score: 0,
      });
    }
  });

  const righe_ok = risultati.filter((r) => r.stato === "ok").length;
  const righe_diff = risultati.filter(
    (r) => r.stato !== "ok" && r.stato !== "mancante_in_conferma" && r.stato !== "extra_in_conferma"
  ).length;
  const righe_mancanti = risultati.filter((r) => r.stato === "mancante_in_conferma").length;
  const righe_extra = risultati.filter((r) => r.stato === "extra_in_conferma").length;

  const totale_crm = crmRighe.reduce(
    (s, r) => s + (r.is_omaggio ? 0 : r.quantita_cartoni * r.prezzo_unitario),
    0
  );
  const totale_pdf = pdfRighe.reduce(
    (s, r) => s + (r.is_omaggio ? 0 : r.quantita_cartoni * r.prezzo_per_cartone),
    0
  );

  const totalScore =
    risultati.length === 0 ? 0 : risultati.reduce((s, r) => s + r.score, 0) / risultati.length;

  return {
    righe: risultati,
    score: totalScore,
    righe_ok,
    righe_diff,
    righe_mancanti,
    righe_extra,
    totale_crm,
    totale_pdf,
    delta_totale: totale_pdf - totale_crm,
  };
}
