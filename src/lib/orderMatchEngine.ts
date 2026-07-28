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
  | "unita_incerta"
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
  // Tolleranza sul prezzo NETTO per cartone (dopo sconti a cascata), in EURO
  // ASSOLUTI (non percentuale): su un cartone costoso un % relativo nascondeva
  // differenze di diversi euro. Il default copre il rumore di arrotondamento
  // che si accumula quando un lato registra il prezzo già scontato e l'altro
  // lordo+sconti applicati in cascata (es. agente arrotonda il netto a 2
  // decimali, il fornitore arrotonda il lordo: il netto ricalcolato dai due
  // lati può divergere di qualche centesimo pur essendo lo stesso prezzo).
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
  // Se molte righe risultano senza corrispondenza ma il delta sui totali
  // documento è piccolo, è quasi certo un problema di ABBINAMENTO (nomi
  // prodotto non riconosciuti) e non un vero disallineamento dell'ordine:
  // presentare quelle righe come "mancanti"/"extra" affidabili sarebbe
  // fuorviante. Vedi confrontaOrdine per la soglia esatta.
  possibile_errore_matching: boolean;
  avviso_matching?: string;
};

const DEFAULTS: Required<ConfrontoOpts> = {
  matchThreshold: 0.45,
  certaintyThreshold: 0.75,
  tolleranzaPrezzoEuro: 0.05,
  tolleranzaImponibileEuro: 0.05,
};

// Sotto questa frazione di righe senza corrispondenza sul totale, e con un
// delta_totale relativo sotto questa soglia, l'esito viene segnalato come
// "possibile errore di abbinamento" invece che preso per buono (vedi
// possibile_errore_matching in confrontaOrdine).
const SOGLIA_QUOTA_RIGHE_SENZA_MATCH = 0.3;
const SOGLIA_DELTA_RELATIVO_SOSPETTO = 0.15;

const normalize = (s: string | null | undefined) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Bigrammi di carattere (spazi rimossi), usati per catturare la quasi-identità
 *  tra due nomi quando la similarità a parole intere fallisce. */
function bigrams(s: string): Set<string> {
  const compact = s.replace(/\s+/g, "");
  if (compact.length < 2) return new Set(compact ? [compact] : []);
  const set = new Set<string>();
  for (let i = 0; i < compact.length - 1; i++) set.add(compact.slice(i, i + 2));
  return set;
}

function diceBigram(a: string, b: string): number {
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  A.forEach((g) => {
    if (B.has(g)) inter++;
  });
  return (2 * inter) / (A.size + B.size);
}

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
  // Nomi corti che condividono solo una parola generica (es. un suffisso di
  // linea come "ARS" comune a tutti i gusti) ma differiscono nella parola che
  // distingue davvero il prodotto per una piccola variazione ortografica
  // (aranciata/arancia, abbreviazioni diverse tra CRM e conferma OCR): la
  // similarità a parole intere tratta "aranciata" e "arancia" come token
  // completamente diversi (0 in comune) e sottostima il match vero, mentre
  // NON discrimina a sufficienza tra il prodotto giusto e un altro gusto della
  // stessa linea (entrambi condividono "ARS" e nient'altro). I bigrammi di
  // carattere risolvono entrambi i problemi: colgono la quasi-identità
  // ortografica e restano bassi tra prodotti realmente diversi.
  const bigramScore = diceBigram(A, B);
  const contains = A.includes(B) || B.includes(A) ? 0.15 : 0;
  return Math.min(1, Math.max(jaccard, bigramScore) + contains);
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
 *  del prodotto CRM come riferimento. Se NESSUNO dei due lati lo valorizza, il
 *  fallback a 1 non è affidabile (equivarrebbe a trattare un cartone come un
 *  singolo pezzo): va segnalato esplicitamente invece di confrontare quantità
 *  e prezzo su un'unità di misura inventata. */
function pezziPerCartoneEffettivo(crm: CRMRiga, pdf: PDFRiga): { valore: number; affidabile: boolean } {
  if (pdf.pezzi_per_cartone && pdf.pezzi_per_cartone > 0) return { valore: pdf.pezzi_per_cartone, affidabile: true };
  if (crm.pezzi_per_cartone && crm.pezzi_per_cartone > 0) return { valore: crm.pezzi_per_cartone, affidabile: true };
  return { valore: 1, affidabile: false };
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

  const { valore: pezziPerCartone, affidabile: pezziAffidabili } = pezziPerCartoneEffettivo(crm, pdf);
  if (!pezziAffidabili) {
    diffs.push(
      "Pezzi/cartone non disponibili né dalla conferma né dal catalogo CRM: quantità e prezzo confrontati con un fallback di 1 pz/cartone, NON AFFIDABILE — verifica manuale necessaria"
    );
    stato = "unita_incerta";
    gravita = "error";
  } else if (!pdf.pezzi_per_cartone) {
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

  // 3) Prezzo — confronto sul NETTO (dopo sconti a cascata), mai sul lordo. La
  // conferma espone spesso il prezzo di listino con gli sconti a parte, mentre
  // il CRM registra a volte il prezzo già scontato con sc1/sc2/sc3 a 0:
  // confrontare i due "lordi" grezzi (o le percentuali di sconto isolate) è un
  // confronto tra grandezze diverse e genera differenze inesistenti. L'unico
  // valore che conta davvero — perché è quello che si paga — è il netto
  // risultante, quindi è l'unico confronto affidabile qui.
  if (!crm.is_omaggio && !pdf.is_omaggio) {
    const crmLordoPerCartone = crm.prezzo_unitario * pezziPerCartone;
    const crmNettoPerCartone = crmLordoPerCartone * scontoFattore(crm.sc1, crm.sc2, crm.sc3);
    const pdfNettoPerCartone = pdf.prezzo_per_cartone * scontoFattore(pdf.sc1 || 0, pdf.sc2 || 0, pdf.sc3 || 0);
    if (!withinAbs(crmNettoPerCartone, pdfNettoPerCartone, opts.tolleranzaPrezzoEuro)) {
      diffs.push(
        `Prezzo netto/cartone CRM € ${crmNettoPerCartone.toFixed(2)} (lordo € ${crmLordoPerCartone.toFixed(2)} = € ${crm.prezzo_unitario.toFixed(2)}/pz × ${pezziPerCartone}, sc ${crm.sc1}/${crm.sc2}/${crm.sc3}) vs conferma € ${pdfNettoPerCartone.toFixed(2)} (lordo € ${pdf.prezzo_per_cartone.toFixed(2)}, sc ${pdf.sc1 || 0}/${pdf.sc2 || 0}/${pdf.sc3 || 0})`
      );
      if (stato === "ok") stato = "prezzo_diff";
      gravita = "error";
    }
  }

  // 4) Imponibile di riga — controllo incrociato indipendente in euro. Se prezzo,
  // quantità e sconti sopra tornano tutti ma l'imponibile dichiarato dalla
  // conferma no, c'è qualcosa (arrotondamento, sconto non dichiarato) che i
  // controlli singoli non vedono da soli. Il rumore di arrotondamento tollerato
  // sul prezzo/cartone (punto 3) si moltiplica per il numero di cartoni una
  // volta portato a livello di imponibile totale di riga: una tolleranza fissa
  // in euro assoluti farebbe scattare falsi errori su ordini con più cartoni
  // pur essendo lo stesso identico scarto di arrotondamento per unità.
  const impCrm = crmImponibileRiga(crm);
  const impPdf = pdfImponibileRiga(pdf, pezziPerCartone);
  const deltaImp = impPdf - impCrm;
  const cartoniRiferimento = Math.max(crm.quantita_cartoni, pdf.quantita_cartoni, 1);
  const tolImponibileEffettiva = Math.max(opts.tolleranzaImponibileEuro, opts.tolleranzaPrezzoEuro * cartoniRiferimento);
  if (stato === "ok" && !withinAbs(impCrm, impPdf, tolImponibileEffettiva)) {
    diffs.push(
      `Imponibile riga CRM € ${impCrm.toFixed(2)} vs conferma € ${impPdf.toFixed(2)} (Δ € ${deltaImp.toFixed(2)})`
    );
    stato = "imponibile_diff";
    gravita = "error";
  }

  // 5) Affidabilità dell'abbinamento prodotto: sotto la soglia di certezza va
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

  // Controllo di coerenza: molte righe senza corrispondenza ma un delta sui
  // totali piccolo sono quasi sempre un problema di ABBINAMENTO (nomi prodotto
  // non riconosciuti), non un vero disallineamento dell'ordine — se davvero
  // mancassero/avanzassero così tante righe, i totali sarebbero lontani. Va
  // segnalato esplicitamente: presentare quelle righe come "mancanti"/"extra"
  // senza avviso farebbe sembrare attendibile un risultato che non lo è.
  const righeSenzaMatch = righe_mancanti + righe_extra;
  const deltaRelativo = totale_crm > 0 ? Math.abs(totale_pdf - totale_crm) / totale_crm : 0;
  const possibile_errore_matching =
    risultati.length > 0 &&
    righeSenzaMatch > 0 &&
    righeSenzaMatch / risultati.length >= SOGLIA_QUOTA_RIGHE_SENZA_MATCH &&
    deltaRelativo <= SOGLIA_DELTA_RELATIVO_SOSPETTO;
  const avviso_matching = possibile_errore_matching
    ? `${righeSenzaMatch} righe su ${risultati.length} risultano senza corrispondenza, ma il totale differisce solo di € ${Math.abs(totale_pdf - totale_crm).toFixed(2)} (${(deltaRelativo * 100).toFixed(1)}%): se mancassero davvero, i totali sarebbero molto più lontani. È probabile un errore di ABBINAMENTO (nomi prodotto non riconosciuti tra CRM e conferma), non un reale disallineamento dell'ordine — verifica manualmente prima di considerare l'esito attendibile.`
    : undefined;

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
    possibile_errore_matching,
    avviso_matching,
  };
}
