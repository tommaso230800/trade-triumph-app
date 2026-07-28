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
  | "alias_suggerito"
  | "mancante_in_conferma"
  | "extra_in_conferma";

export type RigaEsito = {
  stato: MatchStato;
  gravita: "ok" | "warning" | "error";
  crm?: CRMRiga;
  // Riga conferma "principale" del gruppo abbinato (per compatibilità con la
  // UI esistente che mostra una singola riga). Vedi pdfRighe per il gruppo
  // completo quando una riga CRM corrisponde a più righe conferma.
  pdf?: PDFRiga;
  // Tutte le righe conferma abbinate a questa riga CRM (normalmente 1, più di
  // 1 quando lo stesso prodotto è spezzato su più righe/formati lato conferma).
  pdfRighe?: PDFRiga[];
  differenze: string[];
  score: number; // 0..1, qualità del confronto (non il punteggio di similarità nome/codice)
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
  // Tolleranza sul prezzo NETTO PER PEZZO (dopo sconti a cascata), in EURO
  // ASSOLUTI. Il pezzo, non il cartone, perché il formato cartone può
  // differire tra CRM e conferma (o una riga CRM può essere spezzata su più
  // formati lato conferma) mentre il pezzo è la stessa unità su entrambi i
  // lati. Il default copre il rumore di arrotondamento che si accumula quando
  // un lato registra il prezzo già scontato e l'altro lordo+sconti applicati
  // in cascata (es. agente arrotonda il netto a 2 decimali, il fornitore
  // arrotonda il lordo: il netto ricalcolato dai due lati può divergere di
  // una frazione di centesimo per pezzo pur essendo lo stesso prezzo).
  tolleranzaPrezzoEuro?: number;
  // Tolleranza minima sull'imponibile di riga (post sconti), in euro assoluti.
  // Scala comunque con la quantità (vedi tolImponibileEffettiva in
  // confrontoRigaGruppo): questo è solo il pavimento per righe piccole.
  tolleranzaImponibileEuro?: number;
};

export type ConfrontoEsito = {
  righe: RigaEsito[];
  score: number;
  righe_ok: number;
  righe_diff: number;
  righe_mancanti: number;
  righe_extra: number;
  // Righe senza corrispondenza per codice/nome ma con quantità e imponibile
  // coincidenti con una riga conferma libera: candidate a un alias prodotto
  // (stesso prodotto, codifica diversa lato fornitore) da confermare a mano.
  righe_alias_suggerito: number;
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
  tolleranzaPrezzoEuro: 0.01,
  tolleranzaImponibileEuro: 0.05,
};

// Sotto questa frazione di righe senza corrispondenza sul totale, e con un
// delta_totale relativo sotto questa soglia, l'esito viene segnalato come
// "possibile errore di abbinamento" invece che preso per buono (vedi
// possibile_errore_matching in confrontaOrdine).
const SOGLIA_QUOTA_RIGHE_SENZA_MATCH = 0.3;
const SOGLIA_DELTA_RELATIVO_SOSPETTO = 0.15;

// Lunghezza minima di un codice (dopo normalizzazione) perché un confronto per
// suffisso venga accettato: sotto questa soglia il rischio di falsi positivi
// (codici corti che combaciano per coincidenza) è troppo alto.
const SOGLIA_CODICE_MIN_LEN = 4;

const normalize = (s: string | null | undefined) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Normalizza un codice prodotto per il confronto: maiuscole, senza spazi,
 *  punti, trattini o slash. Non tocca l'ordine dei caratteri: eventuali
 *  prefissi (es. "V12" anteposto dal fornitore) restano e vengono gestiti da
 *  codiciCombaciano, non qui. */
function normalizeCodice(c: string | null | undefined): string {
  return (c ?? "").toUpperCase().replace(/[.\s\-_/]/g, "");
}

/** Due codici (già normalizzati) combaciano se sono identici oppure se uno è
 *  un SUFFISSO dell'altro: gestisce in modo generico qualunque prefisso che
 *  un fornitore anteponga al codice CRM (es. "V12ARS123" per "ARS123"), senza
 *  dover conoscere a priori quali prefissi usa ciascun fornitore. */
function codiciCombaciano(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const corto = a.length <= b.length ? a : b;
  const lungo = a.length <= b.length ? b : a;
  if (corto.length < SOGLIA_CODICE_MIN_LEN) return false;
  return lungo.endsWith(corto);
}

/** Bigrammi di carattere (spazi rimossi), usati per catturare la quasi-identità
 *  tra due stringhe quando il confronto esatto/per parole fallisce. */
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

/** Similarità tra due NOMI prodotto (usata solo come ripiego quando il codice
 *  manca o non aggancia: i nomi tra CRM e conferma possono essere scritti in
 *  modo completamente diverso, es. "ARANCIATA ARS" vs "ANT.RIC.SICIL.ARANCIATA
 *  x12 bott CL 27.5"). */
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

const withinAbs = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol + 1e-9;

/** Pezzi/cartone da usare per UNA riga conferma: il suo valore dichiarato se
 *  presente, altrimenti il fallback (di norma il catalogo CRM). */
function pezziPerCartoneRiga(pdf: PDFRiga, fallback: number): number {
  return pdf.pezzi_per_cartone && pdf.pezzi_per_cartone > 0 ? pdf.pezzi_per_cartone : fallback;
}

/** Pezzi totali ordinati sul CRM: cartoni pieni (convertiti in pezzi) + eventuali
 *  pezzi sciolti (quantita_pezzi è additivo, non il totale — vedi rigaSubtotale). */
function crmPezziTotali(crm: CRMRiga): number {
  return crm.quantita_cartoni * (crm.pezzi_per_cartone || 1) + crm.quantita_pezzi;
}

function scontoFattore(sc1: number, sc2: number, sc3: number): number {
  return (1 - sc1 / 100) * (1 - sc2 / 100) * (1 - sc3 / 100);
}

function crmImponibileRiga(crm: CRMRiga): number {
  if (crm.is_omaggio) return 0;
  return crmPezziTotali(crm) * crm.prezzo_unitario * scontoFattore(crm.sc1, crm.sc2, crm.sc3);
}

/** Imponibile di UNA riga conferma (usato anche per il totale documento,
 *  indipendente dal raggruppamento per codice). Se la conferma dichiara
 *  direttamente l'imponibile di riga, è il valore più affidabile (viene dal
 *  documento del fornitore): usalo come controllo incrociato invece di
 *  ricalcolarlo da prezzo/sconti estratti. */
function pdfImponibileRiga(pdf: PDFRiga, pezziPerCartone: number): number {
  if (pdf.is_omaggio) return 0;
  if (typeof pdf.importo_riga === "number" && pdf.importo_riga > 0) return pdf.importo_riga;
  const ppc = pezziPerCartoneRiga(pdf, pezziPerCartone);
  const pezzi = pdf.quantita_cartoni * ppc;
  const prezzoPerPezzo = pdf.prezzo_per_cartone / ppc;
  return pezzi * prezzoPerPezzo * scontoFattore(pdf.sc1 || 0, pdf.sc2 || 0, pdf.sc3 || 0);
}

/** Imponibile aggregato di un GRUPPO di righe conferma (una riga CRM può
 *  corrispondere a più righe/formati lato conferma, es. stesso prodotto
 *  spezzato in cartoni da 12 e da 24): somma riga per riga, ciascuna con la
 *  propria preferenza per importo_riga dichiarato se presente. */
function gruppoImponibile(gruppo: PDFRiga[], fallbackPezziPerCartone: number): number {
  return gruppo.reduce((s, p) => s + pdfImponibileRiga(p, fallbackPezziPerCartone), 0);
}

/** Prezzo netto per pezzo e pezzi totali calcolati SEMPRE da prezzo/cartone e
 *  sconti (mai dall'importo_riga dichiarato): è un controllo indipendente
 *  dall'imponibile dichiarato, altrimenti diventerebbe tautologico (se la
 *  conferma dichiara un importo_riga che "per caso" torna, un prezzo/cartone
 *  sbagliato non verrebbe mai rilevato). */
function gruppoPrezzoNettoPerPezzo(
  gruppo: PDFRiga[],
  fallbackPezziPerCartone: number
): { pezzi: number; nettoPerPezzo: number } {
  let pezzi = 0;
  let imponibileDaPrezzo = 0;
  gruppo.forEach((p) => {
    if (p.is_omaggio) return;
    const ppc = pezziPerCartoneRiga(p, fallbackPezziPerCartone);
    const pz = p.quantita_cartoni * ppc;
    pezzi += pz;
    imponibileDaPrezzo += pz * (p.prezzo_per_cartone / ppc) * scontoFattore(p.sc1 || 0, p.sc2 || 0, p.sc3 || 0);
  });
  return { pezzi, nettoPerPezzo: pezzi > 0 ? imponibileDaPrezzo / pezzi : 0 };
}

function confrontoRigaGruppo(
  crm: CRMRiga,
  pdfGruppo: PDFRiga[],
  matchScoreValore: number,
  opts: Required<ConfrontoOpts>
): RigaEsito {
  const diffs: string[] = [];
  let stato: MatchStato = "ok";
  let gravita: RigaEsito["gravita"] = "ok";
  const pdfPrincipale = pdfGruppo[0];

  // Affidabilità pezzi/cartone: ogni riga del gruppo deve avere un valore
  // valido (proprio o dal catalogo CRM). Se NESSUN lato lo valorizza per una
  // riga, il fallback a 1 non è affidabile (tratterebbe un cartone come un
  // singolo pezzo): va segnalato invece di confrontare su un'unità inventata.
  const crmPezziPerCartone = crm.pezzi_per_cartone && crm.pezzi_per_cartone > 0 ? crm.pezzi_per_cartone : 0;
  const pezziAffidabili = pdfGruppo.every(
    (p) => (p.pezzi_per_cartone && p.pezzi_per_cartone > 0) || crmPezziPerCartone > 0
  );
  const fallback = crmPezziPerCartone || 1;
  if (!pezziAffidabili) {
    diffs.push(
      "Pezzi/cartone non disponibili né dalla conferma né dal catalogo CRM: quantità e prezzo confrontati con un fallback di 1 pz/cartone, NON AFFIDABILE — verifica manuale necessaria"
    );
    stato = "unita_incerta";
    gravita = "error";
  } else if (pdfGruppo.some((p) => !p.pezzi_per_cartone)) {
    diffs.push("Una o più righe conferma senza pezzi/cartone espliciti: normalizzate con il formato prodotto CRM");
  }

  // 1) Quantità — PEZZI TOTALI, sommando l'intero gruppo conferma: il formato
  // cartone può differire tra CRM e conferma (o tra le stesse righe conferma,
  // se il prodotto è spezzato su più formati), il pezzo no.
  const qCrm = crmPezziTotali(crm);
  const qPdf = pdfGruppo.reduce((s, p) => s + p.quantita_cartoni * pezziPerCartoneRiga(p, fallback), 0);
  if (!withinAbs(qCrm, qPdf, 0.01)) {
    const dettaglioPdf = pdfGruppo
      .map((p) => `${p.quantita_cartoni}×${pezziPerCartoneRiga(p, fallback)}`)
      .join(" + ");
    diffs.push(
      `Pezzi tot. CRM ${qCrm} (${crm.quantita_cartoni} cart × ${crm.pezzi_per_cartone || fallback} + ${crm.quantita_pezzi} pz) vs conferma ${qPdf} (${dettaglioPdf})`
    );
    stato = "qta_diff";
    gravita = "error";
  }

  // 2) Omaggio
  const pdfOmaggio = pdfGruppo.some((p) => p.is_omaggio);
  if (!!crm.is_omaggio !== pdfOmaggio) {
    diffs.push(`Omaggio CRM=${crm.is_omaggio} vs conferma=${pdfOmaggio}`);
    stato = "omaggio_diff";
    gravita = "error";
  }

  // 3) Prezzo — confronto sul NETTO PER PEZZO, non per cartone: il pezzo è
  // l'unica unità di misura sempre coerente tra i due lati quando i formati
  // di cartone differiscono. La conferma espone spesso il prezzo di listino
  // con gli sconti a parte, mentre il CRM registra a volte il prezzo già
  // scontato con sc1/sc2/sc3 a 0: confrontare grandezze diverse (lordo vs
  // netto) genera differenze inesistenti. Calcolato SEMPRE da prezzo×sconti,
  // mai dall'importo_riga dichiarato (vedi gruppoPrezzoNettoPerPezzo).
  if (!crm.is_omaggio && !pdfOmaggio) {
    const crmNettoPerPezzo = crm.prezzo_unitario * scontoFattore(crm.sc1, crm.sc2, crm.sc3);
    const { nettoPerPezzo: pdfNettoPerPezzo } = gruppoPrezzoNettoPerPezzo(pdfGruppo, fallback);
    if (!withinAbs(crmNettoPerPezzo, pdfNettoPerPezzo, opts.tolleranzaPrezzoEuro)) {
      diffs.push(
        `Prezzo netto/pz CRM € ${crmNettoPerPezzo.toFixed(5)} (€ ${crm.prezzo_unitario.toFixed(2)}/pz, sc ${crm.sc1}/${crm.sc2}/${crm.sc3}) vs conferma € ${pdfNettoPerPezzo.toFixed(5)}`
      );
      if (stato === "ok") stato = "prezzo_diff";
      gravita = "error";
    }
  }

  // 4) Imponibile di riga — controllo incrociato indipendente in euro, sul
  // gruppo intero. Tolleranza proporzionale alla quantità: il rumore di
  // arrotondamento tollerato sul prezzo/pezzo (punto 3) si moltiplica per il
  // numero di pezzi una volta portato a livello di imponibile totale di riga
  // — una tolleranza fissa farebbe scattare falsi errori su righe con più
  // pezzi pur essendo lo stesso identico scarto di arrotondamento per unità.
  const impCrm = crmImponibileRiga(crm);
  const impPdf = gruppoImponibile(pdfGruppo, fallback);
  const deltaImp = impPdf - impCrm;
  const tolImponibileEffettiva = Math.max(opts.tolleranzaImponibileEuro, opts.tolleranzaPrezzoEuro * qCrm);
  if (stato === "ok" && !withinAbs(impCrm, impPdf, tolImponibileEffettiva)) {
    diffs.push(
      `Imponibile riga CRM € ${impCrm.toFixed(2)} vs conferma € ${impPdf.toFixed(2)} (Δ € ${deltaImp.toFixed(2)})`
    );
    stato = "imponibile_diff";
    gravita = "error";
  }

  // 5) Affidabilità dell'abbinamento (per codice o, in ripiego, per nome):
  // sotto la soglia di certezza va sempre segnalato per verifica manuale,
  // anche se i numeri sopra combaciano.
  if (matchScoreValore < opts.certaintyThreshold) {
    if (stato === "ok") {
      stato = "match_incerto";
      gravita = "warning";
    }
    diffs.push(`Abbinamento incerto (score ${(matchScoreValore * 100).toFixed(0)}%), verifica manuale consigliata`);
  }

  const score = diffs.length === 0 ? 1 : gravita === "error" ? 0.3 : 0.6;
  return {
    stato,
    gravita,
    crm,
    pdf: pdfPrincipale,
    pdfRighe: pdfGruppo,
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

  const usedPdf = new Set<number>();
  const risultati: (RigaEsito | undefined)[] = new Array(crmRighe.length).fill(undefined);

  // FASE 1 — matching per CODICE, chiave PRIMARIA. I nomi prodotto tra CRM e
  // conferma possono essere scritti in modo completamente diverso (sigle
  // commerciali interne vs descrizione estesa del fornitore), mentre il
  // codice articolo è lo stesso dato con al più del rumore di formattazione
  // (spazi, punteggiatura, un prefisso anteposto dal fornitore).
  crmRighe.forEach((c, ci) => {
    const codeCrm = normalizeCodice(c.prodotto_codice);
    if (!codeCrm) return; // nessun codice CRM: si prova col nome in fase 2

    // Match esatto o per suffisso: raggruppa TUTTE le righe conferma libere
    // con codice corrispondente — una riga CRM può essere spezzata su più
    // righe/formati lato conferma (stesso prodotto in cartoni da 12 e da 24).
    const gruppoEsatto: number[] = [];
    pdfRighe.forEach((p, pi) => {
      if (usedPdf.has(pi)) return;
      const codePdf = normalizeCodice(p.codice_prodotto);
      if (codePdf && codiciCombaciano(codeCrm, codePdf)) gruppoEsatto.push(pi);
    });
    if (gruppoEsatto.length > 0) {
      gruppoEsatto.forEach((pi) => usedPdf.add(pi));
      risultati[ci] = confrontoRigaGruppo(c, gruppoEsatto.map((pi) => pdfRighe[pi]), 1, o);
      return;
    }

    // Nessun match esatto/suffisso: prova una similarità a bigrammi tra i
    // codici, che assorbe piccole varianti (es. un suffisso troncato di un
    // carattere). Non forma gruppo: è un candidato singolo, score < 1, quindi
    // finisce comunque sotto verifica se non supera anche certaintyThreshold.
    let best: { pi: number; score: number } | null = null;
    pdfRighe.forEach((p, pi) => {
      if (usedPdf.has(pi)) return;
      const codePdf = normalizeCodice(p.codice_prodotto);
      if (!codePdf) return;
      const s = diceBigram(codeCrm, codePdf);
      if (s >= o.matchThreshold && (!best || s > best.score)) best = { pi, score: s };
    });
    if (best) {
      usedPdf.add(best.pi);
      risultati[ci] = confrontoRigaGruppo(c, [pdfRighe[best.pi]], best.score, o);
    }
  });

  // FASE 2 — righe CRM ancora senza abbinamento (codice mancante o non
  // agganciato): ripiego sul NOME, tra le righe rimaste libere su entrambi i
  // lati. Abbinamento globale (non sequenziale): tutte le coppie candidate
  // sopra soglia, assegnate in ordine di punteggio decrescente, così un match
  // dubbio incontrato per primo non "ruba" la riga giusta a un abbinamento
  // migliore che arriva dopo.
  const crmDaNome = crmRighe.map((_, ci) => ci).filter((ci) => !risultati[ci]);
  type Candidato = { ci: number; pi: number; score: number };
  const candidatiNome: Candidato[] = [];
  crmDaNome.forEach((ci) => {
    pdfRighe.forEach((p, pi) => {
      if (usedPdf.has(pi)) return;
      const s = similarity(crmRighe[ci].prodotto_nome || "", p.nome_prodotto);
      if (s >= o.matchThreshold) candidatiNome.push({ ci, pi, score: s });
    });
  });
  candidatiNome.sort((a, b) => b.score - a.score || a.ci - b.ci || a.pi - b.pi);
  const usedCrmNome = new Set<number>();
  for (const cand of candidatiNome) {
    if (usedCrmNome.has(cand.ci) || usedPdf.has(cand.pi)) continue;
    usedCrmNome.add(cand.ci);
    usedPdf.add(cand.pi);
    risultati[cand.ci] = confrontoRigaGruppo(crmRighe[cand.ci], [pdfRighe[cand.pi]], cand.score, o);
  }

  // FASE 3 — righe CRM ancora senza abbinamento: propone un ALIAS quando
  // quantità e imponibile di riga coincidono con una riga conferma libera,
  // pur con codice e nome completamente diversi (riclassificazione lato
  // fornitore, private label...). Non abbina automaticamente: propone il
  // candidato per conferma manuale (il salvataggio come alias persistente è
  // fuori dallo scope di questo motore puro — vedi nota nella UI).
  crmRighe.forEach((c, ci) => {
    if (risultati[ci]) return;
    const pezziCrm = crmPezziTotali(c);
    const impCrm = crmImponibileRiga(c);
    const fallback = c.pezzi_per_cartone && c.pezzi_per_cartone > 0 ? c.pezzi_per_cartone : 1;
    let candidato: { pi: number; impPdf: number } | null = null;
    pdfRighe.forEach((p, pi) => {
      if (usedPdf.has(pi)) return;
      const pezziPdf = p.quantita_cartoni * pezziPerCartoneRiga(p, fallback);
      if (!withinAbs(pezziCrm, pezziPdf, 0.01)) return;
      const impPdf = pdfImponibileRiga(p, fallback);
      const tol = Math.max(o.tolleranzaImponibileEuro, o.tolleranzaPrezzoEuro * pezziCrm);
      if (!withinAbs(impCrm, impPdf, tol)) return;
      if (!candidato) candidato = { pi, impPdf };
    });
    if (candidato) {
      const { pi, impPdf } = candidato;
      usedPdf.add(pi);
      const p = pdfRighe[pi];
      risultati[ci] = {
        stato: "alias_suggerito",
        gravita: "warning",
        crm: c,
        pdf: p,
        pdfRighe: [p],
        differenze: [
          `Codice e nome non corrispondono ("${c.prodotto_nome ?? "—"}" / "${c.prodotto_codice ?? "—"}" vs "${p.nome_prodotto}" / "${p.codice_prodotto ?? "—"}"), ma quantità (${pezziCrm} pz) e imponibile (€ ${impCrm.toFixed(2)}) coincidono: probabile stesso prodotto con codifica diversa lato fornitore. Verifica e salva come alias.`,
        ],
        score: 0.5,
        imponibile_crm: impCrm,
        imponibile_pdf: impPdf,
        delta_imponibile: impPdf - impCrm,
      };
    }
  });

  // Righe CRM mai risolte -> mancante_in_conferma. Righe conferma mai usate -> extra_in_conferma.
  const risultatiFinali: RigaEsito[] = crmRighe.map((c, ci) => {
    const r = risultati[ci];
    if (r) return r;
    return {
      stato: "mancante_in_conferma",
      gravita: "error",
      crm: c,
      differenze: ["Riga presente nel CRM ma non trovata nella conferma"],
      score: 0,
    };
  });
  pdfRighe.forEach((p, pi) => {
    if (!usedPdf.has(pi)) {
      risultatiFinali.push({
        stato: "extra_in_conferma",
        gravita: "error",
        pdf: p,
        differenze: ["Riga presente nella conferma ma non nell'ordine CRM"],
        score: 0,
      });
    }
  });

  const righe_ok = risultatiFinali.filter((r) => r.stato === "ok").length;
  const righe_alias_suggerito = risultatiFinali.filter((r) => r.stato === "alias_suggerito").length;
  const righe_diff = risultatiFinali.filter(
    (r) =>
      r.stato !== "ok" &&
      r.stato !== "mancante_in_conferma" &&
      r.stato !== "extra_in_conferma" &&
      r.stato !== "alias_suggerito"
  ).length;
  const righe_mancanti = risultatiFinali.filter((r) => r.stato === "mancante_in_conferma").length;
  const righe_extra = risultatiFinali.filter((r) => r.stato === "extra_in_conferma").length;

  // Totali documento in IMPONIBILE NETTO (post sconti), nella stessa unità
  // normalizzata usata riga per riga.
  const totale_crm = crmRighe.reduce((s, r) => s + crmImponibileRiga(r), 0);
  const totale_pdf = pdfRighe.reduce((s, r) => s + pdfImponibileRiga(r, r.pezzi_per_cartone || 1), 0);

  const totalScore =
    risultatiFinali.length === 0 ? 0 : risultatiFinali.reduce((s, r) => s + r.score, 0) / risultatiFinali.length;

  // Controllo di coerenza: molte righe senza corrispondenza ma un delta sui
  // totali piccolo sono quasi sempre un problema di ABBINAMENTO (nomi prodotto
  // non riconosciuti), non un vero disallineamento dell'ordine — se davvero
  // mancassero/avanzassero così tante righe, i totali sarebbero lontani. Va
  // segnalato esplicitamente: presentare quelle righe come "mancanti"/"extra"
  // senza avviso farebbe sembrare attendibile un risultato che non lo è.
  const righeSenzaMatch = righe_mancanti + righe_extra;
  const deltaRelativo = totale_crm > 0 ? Math.abs(totale_pdf - totale_crm) / totale_crm : 0;
  const possibile_errore_matching =
    risultatiFinali.length > 0 &&
    righeSenzaMatch > 0 &&
    righeSenzaMatch / risultatiFinali.length >= SOGLIA_QUOTA_RIGHE_SENZA_MATCH &&
    deltaRelativo <= SOGLIA_DELTA_RELATIVO_SOSPETTO;
  const avviso_matching = possibile_errore_matching
    ? `${righeSenzaMatch} righe su ${risultatiFinali.length} risultano senza corrispondenza, ma il totale differisce solo di € ${Math.abs(totale_pdf - totale_crm).toFixed(2)} (${(deltaRelativo * 100).toFixed(1)}%): se mancassero davvero, i totali sarebbero molto più lontani. È probabile un errore di ABBINAMENTO (nomi prodotto non riconosciuti tra CRM e conferma), non un reale disallineamento dell'ordine — verifica manualmente prima di considerare l'esito attendibile.`
    : undefined;

  return {
    righe: risultatiFinali,
    score: totalScore,
    righe_ok,
    righe_diff,
    righe_mancanti,
    righe_extra,
    righe_alias_suggerito,
    totale_crm,
    totale_pdf,
    delta_totale: totale_pdf - totale_crm,
    possibile_errore_matching,
    avviso_matching,
  };
}
