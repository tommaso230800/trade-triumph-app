// Porting server-side (Deno) di src/lib/orderMatchEngine.ts.
// Le due copie vanno tenute allineate a mano: gli edge functions non
// possono importare da src/ in produzione (bundle separato dal frontend).
//
// Differenze intenzionali rispetto alla versione frontend, per l'uso
// automatico nell'agente email (dove le differenze di prezzo/imponibile
// impattano le provvigioni e non vanno "smussate" da una tolleranza larga):
// - prezzo_unitario: tolleranza solo in centesimi (niente più 2% relativo)
// - ogni riga espone anche un array `discrepanze` strutturato
//   { tipo, valore_crm, valore_conferma, differenza_euro } oltre al testo
//   libero `differenze`, e un flag `impatta_provvigioni`
// - quantità: invariata, zero tolleranza (già così nella versione frontend)

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

export type TipoDiscrepanza =
  | "prezzo"
  | "quantita"
  | "sconto"
  | "omaggio"
  | "prodotto_mancante"
  | "prodotto_extra";

export type Discrepanza = {
  tipo: TipoDiscrepanza;
  valore_crm: number | null;
  valore_conferma: number | null;
  differenza_euro: number;
};

export type RigaEsito = {
  stato: MatchStato;
  gravita: "ok" | "warning" | "error";
  crm?: CRMRiga;
  pdf?: PDFRiga;
  differenze: string[];
  discrepanze: Discrepanza[];
  impatta_provvigioni: boolean;
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

export const normalize = (s: string | null | undefined) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function similarity(a: string, b: string): number {
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

// Tolleranza SOLO in valore assoluto (centesimi). Niente percentuale relativa:
// su prodotti che valgono molto, il 2% relativo della versione frontend
// avrebbe potuto mascherare differenze reali di decine di euro.
const approxEqualEuro = (a: number, b: number, tolAbs = 0.01) => Math.abs(a - b) <= tolAbs;
const approxEqualExact = (a: number, b: number) => Math.abs(a - b) <= 0.001;

function confrontoRiga(crm: CRMRiga, pdf: PDFRiga): RigaEsito {
  const diffs: string[] = [];
  const discrepanze: Discrepanza[] = [];
  let stato: MatchStato = "ok";
  let gravita: RigaEsito["gravita"] = "ok";
  let impattaProvvigioni = false;

  if (!approxEqualExact(crm.quantita_cartoni, pdf.quantita_cartoni)) {
    diffs.push(`Cartoni CRM ${crm.quantita_cartoni} vs conferma ${pdf.quantita_cartoni}`);
    discrepanze.push({
      tipo: "quantita",
      valore_crm: crm.quantita_cartoni,
      valore_conferma: pdf.quantita_cartoni,
      differenza_euro: (pdf.quantita_cartoni - crm.quantita_cartoni) * (pdf.prezzo_per_cartone || crm.prezzo_unitario),
    });
    stato = "qta_diff";
    gravita = "error";
    impattaProvvigioni = true;
  }

  if (!crm.is_omaggio && !pdf.is_omaggio) {
    if (!approxEqualEuro(crm.prezzo_unitario, pdf.prezzo_per_cartone)) {
      diffs.push(
        `Prezzo CRM ${crm.prezzo_unitario.toFixed(2)} vs conferma ${pdf.prezzo_per_cartone.toFixed(2)}`
      );
      const cartoni = pdf.quantita_cartoni || crm.quantita_cartoni;
      discrepanze.push({
        tipo: "prezzo",
        valore_crm: crm.prezzo_unitario,
        valore_conferma: pdf.prezzo_per_cartone,
        differenza_euro: (pdf.prezzo_per_cartone - crm.prezzo_unitario) * cartoni,
      });
      if (stato === "ok") stato = "prezzo_diff";
      gravita = "error";
      impattaProvvigioni = true;
    }
  }

  const cSc = [crm.sc1 || 0, crm.sc2 || 0, crm.sc3 || 0];
  const pSc = [pdf.sc1 || 0, pdf.sc2 || 0, pdf.sc3 || 0];
  cSc.forEach((v, i) => {
    if (Math.abs(v - pSc[i]) > 0.05) {
      diffs.push(`sc${i + 1} CRM ${v} vs conferma ${pSc[i]}`);
      const base = (pdf.quantita_cartoni || crm.quantita_cartoni) * (pdf.prezzo_per_cartone || crm.prezzo_unitario);
      discrepanze.push({
        tipo: "sconto",
        valore_crm: v,
        valore_conferma: pSc[i],
        differenza_euro: (base * (pSc[i] - v)) / 100,
      });
      if (stato === "ok") stato = "sconto_diff";
      if (gravita === "ok") gravita = "warning";
      impattaProvvigioni = true;
    }
  });

  if (!!crm.is_omaggio !== !!pdf.is_omaggio) {
    diffs.push(`Omaggio CRM=${crm.is_omaggio} vs conferma=${!!pdf.is_omaggio}`);
    discrepanze.push({
      tipo: "omaggio",
      valore_crm: crm.is_omaggio ? 1 : 0,
      valore_conferma: pdf.is_omaggio ? 1 : 0,
      differenza_euro: crm.is_omaggio
        ? -(pdf.quantita_cartoni * pdf.prezzo_per_cartone)
        : crm.quantita_cartoni * crm.prezzo_unitario,
    });
    stato = "omaggio_diff";
    gravita = "error";
    impattaProvvigioni = true;
  }

  const score = diffs.length === 0 ? 1 : (gravita as string) === "warning" ? 0.6 : 0.3;
  return { stato, gravita, crm, pdf, differenze: diffs, discrepanze, impatta_provvigioni: impattaProvvigioni, score };
}

export function confrontaOrdine(
  crmRighe: CRMRiga[],
  pdfRighe: PDFRiga[],
  opts?: { matchThreshold?: number }
): ConfrontoEsito {
  const threshold = opts?.matchThreshold ?? 0.35;
  const usedPdf = new Set<number>();
  const risultati: RigaEsito[] = [];

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
        discrepanze: [
          {
            tipo: "prodotto_mancante",
            valore_crm: c.quantita_cartoni * c.prezzo_unitario,
            valore_conferma: null,
            differenza_euro: -(c.is_omaggio ? 0 : c.quantita_cartoni * c.prezzo_unitario),
          },
        ],
        impatta_provvigioni: !c.is_omaggio,
        score: 0,
      });
    }
  }

  pdfRighe.forEach((p, i) => {
    if (!usedPdf.has(i)) {
      risultati.push({
        stato: "extra_in_conferma",
        gravita: "error",
        pdf: p,
        differenze: ["Riga presente nella conferma ma non nell'ordine CRM"],
        discrepanze: [
          {
            tipo: "prodotto_extra",
            valore_crm: null,
            valore_conferma: p.quantita_cartoni * p.prezzo_per_cartone,
            differenza_euro: p.is_omaggio ? 0 : p.quantita_cartoni * p.prezzo_per_cartone,
          },
        ],
        impatta_provvigioni: !p.is_omaggio,
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

/** Vero se l'esito ha almeno una discrepanza che tocca prezzo/imponibile (impatto provvigioni). */
export function haImpattoProvvigioni(esito: ConfrontoEsito): boolean {
  return esito.righe.some((r) => r.impatta_provvigioni);
}
