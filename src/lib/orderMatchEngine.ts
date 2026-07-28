// Compares CRM order lines against a parsed confirmation document.
// Pure TS, no I/O. Reuses the shape returned by parse-order-multi.

export type CRMRiga = {
  id: string;
  prodotto_id: string | null;
  prodotto_nome: string | null;
  prodotto_codice: string | null;
  quantita_cartoni: number;
  quantita_pezzi: number;
  // Pezzi per cartone dal catalogo prodotti. Serve a normalizzare prezzo e
  // quantità sulla stessa unità della conferma (vedi commento su prezzo_unitario).
  pezzi_per_cartone: number;
  // Prezzo PER PEZZO, non per cartone: coerente con la formula di calcolo usata
  // in NuovoOrdineDialog/ModificaOrdineDialog (subtotale = pezziTotali * prezzo_unitario).
  // La conferma, invece, arriva sempre normalizzata per CARTONE da parse-order-multi:
  // vanno convertiti sulla stessa unità prima di qualunque confronto, altrimenti il
  // confronto prezzo non ha senso (differisce di un fattore pari a pezzi_per_cartone).
  prezzo_unitario: number;
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
  prezzo_per_cartone: number; // sempre per CARTONE, normalizzato da parse-order-multi
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
  | "imponibile_diff"
  | "sconto_diff"
  | "omaggio_diff"
  | "match_incerto"
  | "mancante_in_conferma"
  | "extra_in_conferma";

export type RigaEsito = {
  stato: MatchStato;
  gravita: "ok" | "warning" | "error";
  crm?: CRMRiga;
  pdf?: PDFRiga;
  differenze: string[];
  score: number; // 0..1, qualità del confronto (non il punteggio di similarità nome)
  imponibile_crm?: number;
  imponibile_pdf?: number;
  delta_imponibile?: number;
};

export type ConfrontoOpts = {
  // Punteggio minimo di similarità nome/codice per considerare due righe come
  // possibile abbinamento. Sotto questa soglia, la riga CRM/PDF resta senza
  // corrispondenza (mancante/extra) piuttosto che essere abbinata a caso.
  matchThreshold?: number;
  // Sopra questa soglia l'abbinamento è considerato affidabile. Tra
  // matchThreshold e certaintyThreshold l'abbinamento viene accettato ma
  // segnalato come "match_incerto": tipico caso di prodotti della stessa linea
  // con nomi simili (gusti/formati diversi) che non vanno mai dati per buoni
  // in automatico.
  certaintyThreshold?: number;
  // Tolleranza sul prezzo per cartone, in EURO ASSOLUTI (non percentuale): su
  // un cartone costoso il vecchio 2% relativo nascondeva differenze di diversi
  // euro. Default: solo arrotondamento al centesimo.
  tolleranzaPrezzoEuro?: number;
  // Tolleranza sull'imponibile di riga (post sconti), in euro assoluti.
  tolleranzaImponibileEuro?: number;
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

const DEFAULTS: Required<ConfrontoOpts> = {
  matchThreshold: 0.45,
  certaintyThreshold: 0.75,
  tolleranzaPrezzoEuro: 0.02,
  tolleranzaImponibileEuro: 0.05,
};

const normalize = (s: string | null | undefined) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
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

const withinAbs = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol + 1e-9;

/** Pezzi per cartone da usare per normalizzare la riga: quelli dichiarati nella
 *  conferma se presenti (è quello che il fornitore intende), altrimenti quelli
 *  del prodotto CRM come riferimento. */
function pezziPerCartoneEffettivo(crm: CRMRiga, pdf: PDFRiga): number {
  return pdf.pezzi_per_cartone && pdf.pezzi_per_cartone > 0 ? pdf.pezzi_per_cartone : crm.pezzi_per_cartone || 1;
}

/** Pezzi totali ordinati sul CRM: cartoni pieni (convertiti in pezzi) + eventuali
 *  pezzi sciolti (quantita_pezzi è additivo, non il totale — vedi rigaSubtotale). */
function crmPezziTotali(crm: CRMRiga): number {
  return crm.quantita_cartoni * (crm.pezzi_per_cartone || 1) + crm.quantita_pezzi;
}

function pdfPezziTotali(pdf: PDFRiga, pezziPerCartone: number): number {
  return pdf.quantita_cartoni * pezziPerCartone;
}

function scontoFattore(sc1: number, sc2: number, sc3: number): number {
  return (1 - sc1 / 100) * (1 - sc2 / 100) * (1 - sc3 / 100);
}

function crmImponibileRiga(crm: CRMRiga): number {
  if (crm.is_omaggio) return 0;
  return crmPezziTotali(crm) * crm.prezzo_unitario * scontoFattore(crm.sc1, crm.sc2, crm.sc3);
}

function pdfImponibileRiga(pdf: PDFRiga, pezziPerCartone: number): number {
  if (pdf.is_omaggio) return 0;
  // Se la conferma dichiara direttamente l'imponibile di riga, è il valore più
  // affidabile (viene dal documento del fornitore): usalo come controllo
  // incrociato invece di ricalcolarlo da prezzo/sconti estratti.
  if (typeof pdf.importo_riga === "number" && pdf.importo_riga > 0) return pdf.importo_riga;
  const pezzi = pdfPezziTotali(pdf, pezziPerCartone);
  const prezzoPerPezzo = pdf.prezzo_per_cartone / pezziPerCartone;
  return pezzi * prezzoPerPezzo * scontoFattore(pdf.sc1 || 0, pdf.sc2 || 0, pdf.sc3 || 0);
}

function confrontoRiga(
  crm: CRMRiga,
  pdf: PDFRiga,
  nameScore: number,
  opts: Required<ConfrontoOpts>
): RigaEsito {
  const diffs: string[] = [];
  let stato: MatchStato = "ok";
  let gravita: RigaEsito["gravita"] = "ok";

  const pezziPerCartone = pezziPerCartoneEffettivo(crm, pdf);
  if (!pdf.pezzi_per_cartone) {
    diffs.push("Conferma senza pezzi/cartone espliciti: normalizzato con il formato prodotto CRM");
  }

  // 1) Quantità — confronto in PEZZI TOTALI (non solo cartoni): i pezzi sciolti
  // sul CRM vanno sommati ai cartoni pieni, altrimenti restano sempre ignorati.
  const qCrm = crmPezziTotali(crm);
  const qPdf = pdfPezziTotali(pdf, pezziPerCartone);
  if (!withinAbs(qCrm, qPdf, 0.01)) {
    diffs.push(
      `Pezzi tot. CRM ${qCrm} (${crm.quantita_cartoni} cart + ${crm.quantita_pezzi} pz) vs conferma ${qPdf}`
    );
    stato = "qta_diff";
    gravita = "error";
  }

  // 2) Omaggio
  if (!!crm.is_omaggio !== !!pdf.is_omaggio) {
    diffs.push(`Omaggio CRM=${crm.is_omaggio} vs conferma=${!!pdf.is_omaggio}`);
    stato = "omaggio_diff";
    gravita = "error";
  }

  // 3) Prezzo — normalizzato sulla stessa unità (per cartone) prima di
  // confrontare. Tolleranza solo in euro assoluti, niente percentuale relativa.
  if (!crm.is_omaggio && !pdf.is_omaggio) {
    const crmPrezzoPerCartone = crm.prezzo_unitario * pezziPerCartone;
    if (!withinAbs(crmPrezzoPerCartone, pdf.prezzo_per_cartone, opts.tolleranzaPrezzoEuro)) {
      diffs.push(
        `Prezzo/cartone CRM € ${crmPrezzoPerCartone.toFixed(2)} (€ ${crm.prezzo_unitario.toFixed(2)}/pz × ${pezziPerCartone}) vs conferma € ${pdf.prezzo_per_cartone.toFixed(2)}`
      );
      if (stato === "ok") stato = "prezzo_diff";
      gravita = "error";
    }
  }

  // 4) Sconti a cascata
  const cSc = [crm.sc1 || 0, crm.sc2 || 0, crm.sc3 || 0];
  const pSc = [pdf.sc1 || 0, pdf.sc2 || 0, pdf.sc3 || 0];
  cSc.forEach((v, i) => {
    if (!withinAbs(v, pSc[i], 0.05)) {
      diffs.push(`sc${i + 1} CRM ${v} vs conferma ${pSc[i]}`);
      if (stato === "ok") stato = "sconto_diff";
      if (gravita === "ok") gravita = "warning";
    }
  });

  // 5) Imponibile di riga — controllo incrociato indipendente in euro. Se prezzo,
  // quantità e sconti sopra tornano tutti ma l'imponibile dichiarato dalla
  // conferma no, c'è qualcosa (arrotondamento, sconto non dichiarato) che i
  // controlli singoli non vedono da soli.
  const impCrm = crmImponibileRiga(crm);
  const impPdf = pdfImponibileRiga(pdf, pezziPerCartone);
  const deltaImp = impPdf - impCrm;
  if (stato === "ok" && !withinAbs(impCrm, impPdf, opts.tolleranzaImponibileEuro)) {
    diffs.push(
      `Imponibile riga CRM € ${impCrm.toFixed(2)} vs conferma € ${impPdf.toFixed(2)} (Δ € ${deltaImp.toFixed(2)})`
    );
    stato = "imponibile_diff";
    gravita = "error";
  }

  // 6) Affidabilità dell'abbinamento prodotto: sotto la soglia di certezza va
  // sempre segnalato per verifica manuale, anche se i numeri sopra combaciano —
  // potrebbe essere il prodotto sbagliato della stessa linea (gusto/formato).
  if (nameScore < opts.certaintyThreshold) {
    if (stato === "ok") {
      stato = "match_incerto";
      gravita = "warning";
    }
    diffs.push(
      `Abbinamento prodotto incerto (similarità nome ${(nameScore * 100).toFixed(0)}%), verifica manuale consigliata`
    );
  }

  const score = diffs.length === 0 ? 1 : gravita === "error" ? 0.3 : 0.6;
  return {
    stato,
    gravita,
    crm,
    pdf,
    differenze: diffs,
    score,
    imponibile_crm: impCrm,
    imponibile_pdf: impPdf,
    delta_imponibile: deltaImp,
  };
}

export function confrontaOrdine(
  crmRighe: CRMRiga[],
  pdfRighe: PDFRiga[],
  opts?: ConfrontoOpts
): ConfrontoEsito {
  const o: Required<ConfrontoOpts> = { ...DEFAULTS, ...opts };

  // Abbinamento globale, non sequenziale: si costruiscono tutte le coppie
  // candidate sopra soglia e si assegnano in ordine di punteggio decrescente.
  // Così un match dubbio incontrato per primo non "ruba" più la riga giusta a
  // un abbinamento migliore che arriva dopo (problema reale con prodotti dai
  // nomi molto simili, tipico nel Food & Beverage).
  type Candidato = { ci: number; pi: number; score: number };
  const candidati: Candidato[] = [];
  crmRighe.forEach((c, ci) => {
    pdfRighe.forEach((p, pi) => {
      const s = matchScore(c, p);
      if (s >= o.matchThreshold) candidati.push({ ci, pi, score: s });
    });
  });
  candidati.sort((a, b) => b.score - a.score || a.ci - b.ci || a.pi - b.pi);

  const usedCrm = new Set<number>();
  const usedPdf = new Set<number>();
  const assegnati = new Map<number, { pi: number; score: number }>();
  for (const cand of candidati) {
    if (usedCrm.has(cand.ci) || usedPdf.has(cand.pi)) continue;
    usedCrm.add(cand.ci);
    usedPdf.add(cand.pi);
    assegnati.set(cand.ci, { pi: cand.pi, score: cand.score });
  }

  const risultati: RigaEsito[] = [];
  crmRighe.forEach((c, ci) => {
    const match = assegnati.get(ci);
    if (!match) {
      risultati.push({
        stato: "mancante_in_conferma",
        gravita: "error",
        crm: c,
        differenze: ["Riga presente nel CRM ma non trovata nella conferma"],
        score: 0,
      });
      return;
    }
    risultati.push(confrontoRiga(c, pdfRighe[match.pi], match.score, o));
  });

  pdfRighe.forEach((p, pi) => {
    if (!usedPdf.has(pi)) {
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

  // Totali documento in IMPONIBILE NETTO (post sconti), nella stessa unità
  // normalizzata usata riga per riga — non più prezzo lordo con unità mischiate
  // (per-pezzo lato CRM, per-cartone lato conferma) che rendeva delta_totale
  // un numero senza significato.
  const totale_crm = crmRighe.reduce((s, r) => s + crmImponibileRiga(r), 0);
  const totale_pdf = pdfRighe.reduce((s, r) => s + pdfImponibileRiga(r, r.pezzi_per_cartone || 1), 0);

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
