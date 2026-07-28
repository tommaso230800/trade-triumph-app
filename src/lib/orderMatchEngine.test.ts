import { describe, it, expect } from "vitest";
import { confrontaOrdine, type CRMRiga, type PDFRiga } from "./orderMatchEngine";

// Riga base "pulita": conferma esattamente identica al CRM.
// Prezzo CRM per PEZZO (17 €/pz) su cartoni da 6 pezzi -> 102 €/cartone,
// stessi numeri dell'esempio Casoni nel prompt di parse-order-multi.
function crmRiga(overrides: Partial<CRMRiga> = {}): CRMRiga {
  return {
    id: "r1",
    prodotto_id: "p1",
    prodotto_nome: "AMARO DEL CICLISTA ORIGINALE",
    prodotto_codice: "C01170018",
    quantita_cartoni: 3,
    quantita_pezzi: 0,
    pezzi_per_cartone: 6,
    prezzo_unitario: 17,
    sc1: 30,
    sc2: 28,
    sc3: 0,
    is_omaggio: false,
    ...overrides,
  };
}

function pdfRiga(overrides: Partial<PDFRiga> = {}): PDFRiga {
  return {
    codice_prodotto: "C01170018",
    nome_prodotto: "AMARO DEL CICLISTA ORIGINALE",
    quantita_cartoni: 3,
    pezzi_per_cartone: 6,
    prezzo_per_cartone: 102,
    sc1: 30,
    sc2: 28,
    sc3: 0,
    is_omaggio: false,
    importo_riga: 154.22,
    ...overrides,
  };
}

describe("confrontaOrdine — riga pulita", () => {
  it("conferma identica al CRM -> ok, imponibile allineato", () => {
    const res = confrontaOrdine([crmRiga()], [pdfRiga()]);
    expect(res.righe[0].stato).toBe("ok");
    expect(res.righe[0].gravita).toBe("ok");
    expect(res.righe[0].delta_imponibile).toBeCloseTo(0, 1);
  });
});

describe("confrontaOrdine — normalizzazione unità di misura (bug #6)", () => {
  it("prezzo CRM per pezzo convertito correttamente a per-cartone prima del confronto", () => {
    // Se il motore confrontasse ancora prezzo_unitario (per pezzo, 17) contro
    // prezzo_per_cartone (102) SENZA convertire, la differenza sarebbe enorme
    // (85 €) e la riga verrebbe sempre segnalata come prezzo_diff. Con la
    // conversione corretta (17 * 6 = 102) il prezzo torna a coincidere.
    const res = confrontaOrdine([crmRiga({ prezzo_unitario: 17 })], [pdfRiga({ prezzo_per_cartone: 102 })]);
    expect(res.righe[0].stato).toBe("ok");
  });

  it("pezzi_per_cartone diverso tra CRM e conferma cambia il prezzo/cartone atteso", () => {
    // Stesso prezzo per pezzo (17) ma la conferma dichiara un formato da 12 pz/cart:
    // prezzo/cartone atteso 17*12=204, non 102. Deve essere rilevato come prezzo_diff.
    const res = confrontaOrdine(
      [crmRiga({ prezzo_unitario: 17, pezzi_per_cartone: 6 })],
      [pdfRiga({ prezzo_per_cartone: 102, pezzi_per_cartone: 12 })]
    );
    expect(res.righe[0].stato).toBe("qta_diff"); // 3 cart * 12 pz/cart = 36 pezzi vs CRM 3*6=18 pezzi
  });
});

describe("confrontaOrdine — tolleranza prezzo (bug #1)", () => {
  it("un centesimo di scarto sul prezzo/cartone è tollerato", () => {
    const res = confrontaOrdine([crmRiga()], [pdfRiga({ prezzo_per_cartone: 102.01, importo_riga: 154.24 })]);
    expect(res.righe[0].stato).toBe("ok");
  });

  it("50 centesimi di scarto sul prezzo lordo/cartone vengono segnalati anche dopo la normalizzazione al netto", () => {
    // Col vecchio approxEqual(prezzo, tolAbs=0.01, tolRel=0.02) una differenza
    // relativa piccola sarebbe passata inosservata. Ora la tolleranza è solo
    // assoluta e si applica al NETTO (dopo sc1/sc2/sc3, uguali su entrambi i
    // lati in questo fixture): 0.50 di scarto sul lordo diventa 0.50*0.504=0.252
    // sul netto, ben sopra la tolleranza di default (0.05 €) — deve restare segnalato.
    const res = confrontaOrdine([crmRiga()], [pdfRiga({ prezzo_per_cartone: 102.5, importo_riga: 154.22 })]);
    expect(res.righe[0].stato).toBe("prezzo_diff");
    expect(res.righe[0].gravita).toBe("error");
  });
});

describe("confrontaOrdine — imponibile mai confrontato prima (bug #2)", () => {
  it("prezzo/qta/sconti coincidono ma l'imponibile dichiarato dalla conferma diverge -> imponibile_diff", () => {
    const res = confrontaOrdine([crmRiga()], [pdfRiga({ importo_riga: 200 })]);
    expect(res.righe[0].stato).toBe("imponibile_diff");
    expect(res.righe[0].gravita).toBe("error");
    expect(res.righe[0].delta_imponibile).toBeCloseTo(200 - 154.224, 1);
  });

  it("il totale documento è l'imponibile netto post-sconti, non il lordo con unità mischiate", () => {
    const res = confrontaOrdine([crmRiga()], [pdfRiga()]);
    // 102 €/cart * 3 cart * (1-0.30) * (1-0.28) = 154.224
    expect(res.totale_crm).toBeCloseTo(154.224, 2);
    expect(res.totale_pdf).toBeCloseTo(154.22, 2); // usa importo_riga dichiarato
  });
});

describe("confrontaOrdine — pezzi sciolti ignorati (bug #5)", () => {
  it("pezzi sciolti CRM (oltre ai cartoni pieni) vengono sommati e confrontati", () => {
    const crm = crmRiga({ quantita_cartoni: 3, quantita_pezzi: 2 }); // 3*6+2=20 pezzi
    const pdfOk = pdfRiga({ quantita_cartoni: 3, pezzi_per_cartone: 6 }); // 18 pezzi confermati -> diverso da 20
    const res = confrontaOrdine([crm], [pdfOk]);
    expect(res.righe[0].stato).toBe("qta_diff");
    expect(res.righe[0].differenze.join(" ")).toMatch(/Pezzi tot\..*20.*18|Pezzi tot\..*18.*20/);
  });
});

describe("confrontaOrdine — riga mancante ed extra", () => {
  it("riga CRM senza corrispondenza nella conferma -> mancante_in_conferma", () => {
    const res = confrontaOrdine(
      [crmRiga({ id: "r1" }), crmRiga({ id: "r2", prodotto_nome: "VODKA PREMIUM 70CL", prodotto_codice: "V99" })],
      [pdfRiga()]
    );
    const mancante = res.righe.find((r) => r.crm?.id === "r2");
    expect(mancante?.stato).toBe("mancante_in_conferma");
    expect(res.righe_mancanti).toBe(1);
  });

  it("riga in conferma senza corrispondenza nel CRM -> extra_in_conferma", () => {
    const res = confrontaOrdine(
      [crmRiga()],
      [pdfRiga(), pdfRiga({ codice_prodotto: "X99", nome_prodotto: "GIN LONDON DRY 70CL" })]
    );
    const extra = res.righe.find((r) => r.stato === "extra_in_conferma");
    expect(extra).toBeDefined();
    expect(res.righe_extra).toBe(1);
  });
});

describe("confrontaOrdine — ordine delle righe invertito", () => {
  it("il risultato non dipende dalla posizione nell'array, solo dal contenuto", () => {
    const c1 = crmRiga({ id: "r1", prodotto_codice: "AAA", prodotto_nome: "PRODOTTO A" });
    const c2 = crmRiga({ id: "r2", prodotto_codice: "BBB", prodotto_nome: "PRODOTTO B" });
    const p1 = pdfRiga({ codice_prodotto: "AAA", nome_prodotto: "PRODOTTO A" });
    const p2 = pdfRiga({ codice_prodotto: "BBB", nome_prodotto: "PRODOTTO B" });

    const normale = confrontaOrdine([c1, c2], [p1, p2]);
    const invertito = confrontaOrdine([c1, c2], [p2, p1]);

    const idA_normale = normale.righe.find((r) => r.crm?.id === "r1");
    const idA_invertito = invertito.righe.find((r) => r.crm?.id === "r1");
    expect(idA_normale?.pdf?.codice_prodotto).toBe("AAA");
    expect(idA_invertito?.pdf?.codice_prodotto).toBe("AAA");
    expect(idA_normale?.stato).toBe(idA_invertito?.stato);
    expect(normale.righe_ok).toBe(invertito.righe_ok);
  });
});

describe("confrontaOrdine — abbinamento globale invece che sequenziale (bug #3)", () => {
  it("non fa slittare un abbinamento corretto quando due prodotti hanno nomi molto simili", () => {
    // c1 e c2 condividono parole generiche con p1; se l'abbinamento fosse
    // sequenziale (CRM in ordine, primo arrivato primo servito) c1 potrebbe
    // "rubare" p1 anche se p1 è in realtà il prodotto giusto per c2, lasciando
    // c2 senza corrispondenza e p2 (la vera riga di c1) segnalato come extra.
    const c1 = crmRiga({
      id: "r1",
      prodotto_codice: null,
      prodotto_nome: "GRAPPA BARRICATA SELEZIONE ANNATA",
    });
    const c2 = crmRiga({
      id: "r2",
      prodotto_codice: null,
      prodotto_nome: "GRAPPA BARRICATA SELEZIONE ORO RISERVA SPECIALE",
    });
    const p1 = pdfRiga({
      codice_prodotto: null,
      nome_prodotto: "GRAPPA BARRICATA SELEZIONE ORO RISERVA SPECIALE",
    });
    const p2 = pdfRiga({
      codice_prodotto: null,
      nome_prodotto: "GRAPPA BARRICATA SELEZIONE ANNATA",
    });

    const res = confrontaOrdine([c1, c2], [p1, p2]);
    const esitoC1 = res.righe.find((r) => r.crm?.id === "r1");
    const esitoC2 = res.righe.find((r) => r.crm?.id === "r2");

    expect(esitoC1?.pdf?.nome_prodotto).toBe("GRAPPA BARRICATA SELEZIONE ANNATA");
    expect(esitoC2?.pdf?.nome_prodotto).toBe("GRAPPA BARRICATA SELEZIONE ORO RISERVA SPECIALE");
    expect(res.righe_mancanti).toBe(0);
    expect(res.righe_extra).toBe(0);
  });
});

describe("confrontaOrdine — soglia troppo bassa / abbinamento incerto (bug #4)", () => {
  it("un nome solo parzialmente simile non viene dato per buono in automatico", () => {
    const res = confrontaOrdine(
      [crmRiga({ prodotto_codice: null, prodotto_nome: "PROSECCO EXTRA DRY DOCG" })],
      [pdfRiga({ codice_prodotto: null, nome_prodotto: "PROSECCO DOCG" })]
    );
    expect(res.righe[0].stato).toBe("match_incerto");
    expect(res.righe[0].gravita).toBe("warning");
  });

  it("prodotti di famiglie palesemente diverse non vengono abbinati affatto", () => {
    // Quantità/prezzo diversi dal default apposta: altrimenti coincidendo con
    // la riga pdf (stesso fixture di base) scatterebbe la proposta di alias
    // per quantità+importo coincidenti (comportamento corretto in generale,
    // ma non quello che questo test vuole isolare: nessun abbinamento affatto).
    const res = confrontaOrdine(
      [crmRiga({ prodotto_codice: null, prodotto_nome: "GRAPPA BIANCA", quantita_cartoni: 1, prezzo_unitario: 5 })],
      [pdfRiga({ codice_prodotto: null, nome_prodotto: "LIMONCELLO ARTIGIANALE" })]
    );
    expect(res.righe_mancanti).toBe(1);
    expect(res.righe_extra).toBe(1);
  });
});

describe("confrontaOrdine — prezzo lordo+sconti vs prezzo netto (Problema 1, caso reale ORD-2026-0339)", () => {
  it("stesso prezzo espresso lordo+sconti a cascata (conferma) o già netto (CRM) non genera prezzo_diff", () => {
    // Caso reale: CRM registra il prezzo LIMONATA ARS già netto (0,62 €/pz,
    // sconti a 0), la conferma espone il lordo di listino con gli sconti
    // applicati in cascata: 26,50 € × 0,75 × 0,75 = 14,90625, praticamente
    // identico ai 14,88 € del CRM (0,62 × 24). Confrontare il lordo grezzo
    // della conferma col netto del CRM (o le percentuali di sconto isolate,
    // 0 vs 25/25) segnalava una differenza inesistente.
    const crm = crmRiga({
      prezzo_unitario: 0.62,
      pezzi_per_cartone: 24,
      sc1: 0,
      sc2: 0,
      sc3: 0,
      quantita_cartoni: 1,
      quantita_pezzi: 0,
    });
    const pdf = pdfRiga({
      prezzo_per_cartone: 26.5,
      pezzi_per_cartone: 24,
      sc1: 25,
      sc2: 25,
      sc3: 0,
      quantita_cartoni: 1,
      importo_riga: undefined,
    });
    const res = confrontaOrdine([crm], [pdf]);
    expect(res.righe[0].stato).toBe("ok");
    expect(res.righe[0].differenze).toEqual([]);
  });
});

describe("confrontaOrdine — nomi prodotto corti con suffisso comune (Problema 2)", () => {
  it("abbina correttamente varianti ortografiche di nomi corti invece di lasciarle mancanti", () => {
    // "ARANCIATA ARS" (CRM) vs "ARANCIA ARS" (conferma, variante ortografica) e
    // "SPUMA ARS" (CRM) vs "SPUMA ARS" (conferma): con la similarità a sole
    // parole intere, "aranciata" e "arancia" sono token completamente diversi
    // (0 in comune) e il suffisso "ars" condiviso da TUTTI i prodotti non aiuta
    // a distinguere il match giusto da quello sbagliato (in entrambi i casi
    // condividono solo "ars" su 3 parole totali, punteggio 0.33 sotto la soglia
    // di 0.45) — la riga giusta risultava "mancante in conferma". I bigrammi di
    // carattere colgono la quasi-identità ortografica e risolvono il caso.
    const c1 = crmRiga({ id: "r1", prodotto_codice: null, prodotto_nome: "ARANCIATA ARS" });
    const c2 = crmRiga({ id: "r2", prodotto_codice: null, prodotto_nome: "SPUMA ARS" });
    const p1 = pdfRiga({ codice_prodotto: null, nome_prodotto: "ARANCIA ARS" });
    const p2 = pdfRiga({ codice_prodotto: null, nome_prodotto: "SPUMA ARS" });

    const res = confrontaOrdine([c1, c2], [p1, p2]);
    const esitoC1 = res.righe.find((r) => r.crm?.id === "r1");
    const esitoC2 = res.righe.find((r) => r.crm?.id === "r2");

    expect(esitoC1?.pdf?.nome_prodotto).toBe("ARANCIA ARS");
    expect(esitoC2?.pdf?.nome_prodotto).toBe("SPUMA ARS");
    expect(res.righe_mancanti).toBe(0);
    expect(res.righe_extra).toBe(0);
  });
});

describe("confrontaOrdine — controllo di coerenza abbinamento (Problema 2)", () => {
  it("delta totale piccolo ma molte righe senza corrispondenza -> possibile_errore_matching", () => {
    // Se davvero mancassero 3 prodotti su 4, i totali sarebbero lontanissimi:
    // qui la somma resta vicina pur avendo 6 righe su 7 senza corrispondenza.
    // È il matching a essere rotto (nomi troppo diversi), non l'ordine a
    // essere disallineato: va segnalato. Quantità/prezzo scelti apposta
    // diversi tra loro (e diversi dai decoy) per non far scattare la
    // proposta di alias (Problema 6) sulle righe sbagliate.
    const crm = [
      crmRiga({ id: "r1", prodotto_codice: null, prodotto_nome: "PRODOTTO A", quantita_cartoni: 2, prezzo_unitario: 1, sc1: 0, sc2: 0, sc3: 0 }),
      crmRiga({ id: "r2", prodotto_codice: null, prodotto_nome: "PRODOTTO B", quantita_cartoni: 3, prezzo_unitario: 1, sc1: 0, sc2: 0, sc3: 0 }),
      crmRiga({ id: "r3", prodotto_codice: null, prodotto_nome: "PRODOTTO C", quantita_cartoni: 4, prezzo_unitario: 1, sc1: 0, sc2: 0, sc3: 0 }),
      crmRiga({ id: "r4", prodotto_codice: null, prodotto_nome: "PRODOTTO D", quantita_cartoni: 5, prezzo_unitario: 1, sc1: 0, sc2: 0, sc3: 0 }),
    ];
    const pdf = [
      pdfRiga({ codice_prodotto: null, nome_prodotto: "ARTICOLO XX", quantita_cartoni: 3, pezzi_per_cartone: 5, prezzo_per_cartone: 5, sc1: 0, sc2: 0, sc3: 0, importo_riga: undefined }),
      pdfRiga({ codice_prodotto: null, nome_prodotto: "ARTICOLO YY", quantita_cartoni: 4, pezzi_per_cartone: 5, prezzo_per_cartone: 5, sc1: 0, sc2: 0, sc3: 0, importo_riga: undefined }),
      pdfRiga({ codice_prodotto: null, nome_prodotto: "ARTICOLO ZZ", quantita_cartoni: 5, pezzi_per_cartone: 5, prezzo_per_cartone: 5, sc1: 0, sc2: 0, sc3: 0, importo_riga: undefined }),
      pdfRiga({ codice_prodotto: null, nome_prodotto: "PRODOTTO D", quantita_cartoni: 5, pezzi_per_cartone: 6, prezzo_per_cartone: 6, sc1: 0, sc2: 0, sc3: 0, importo_riga: undefined }),
    ];
    const res = confrontaOrdine(crm, pdf);
    expect(res.righe_mancanti).toBe(3);
    expect(res.righe_extra).toBe(3);
    // Delta reale (6€) ben sotto quanto ci si aspetterebbe se 3 prodotti su 4
    // mancassero davvero (totale_crm è 84€: un vero disallineamento di quella
    // portata sarebbe un delta di decine di euro, non 6).
    expect(Math.abs(res.delta_totale)).toBeLessThan(10);
    expect(res.possibile_errore_matching).toBe(true);
    expect(res.avviso_matching).toBeTruthy();
  });

  it("nessun avviso quando il delta è in realtà grande (riga davvero mancante, non un problema di matching)", () => {
    const res = confrontaOrdine(
      [crmRiga({ id: "r1" }), crmRiga({ id: "r2", prodotto_nome: "VODKA PREMIUM 70CL", prodotto_codice: "V99" })],
      [pdfRiga()]
    );
    expect(res.righe_mancanti).toBe(1);
    expect(res.possibile_errore_matching).toBe(false);
  });
});

describe("confrontaOrdine — pezzi/cartone mancanti su entrambi i lati (Problema 3)", () => {
  it("se né CRM né conferma valorizzano pezzi_per_cartone, la riga è segnalata come unità incerta invece di confrontare alla cieca con un fallback a 1", () => {
    const crm = crmRiga({ pezzi_per_cartone: 0 });
    const pdf = pdfRiga({ pezzi_per_cartone: undefined });
    const res = confrontaOrdine([crm], [pdf]);
    expect(res.righe[0].stato).toBe("unita_incerta");
    expect(res.righe[0].gravita).toBe("error");
  });
});

describe("confrontaOrdine — matching per codice, uno-a-molti, alias prodotto (Problemi 1/2/4/5/6, caso reale ORD-2026-0339)", () => {
  it("9 righe con codice riconosciuto (7 esatte + 1 fuzzy), 1 riga con differenza reale (CEDRATA), 1 alias da confermare (B189/B210)", () => {
    // Verità di riferimento fornita dall'utente dopo verifica manuale
    // riga-per-riga di ORD-2026-0339 contro la conferma del fornitore.
    // Non ho accesso diretto al PDF/CRM (RLS blocca le query anon): le righe
    // "pulite" — di cui l'utente ha dato solo le coppie di codici, non i
    // numeri — sono ricostruite con lo stesso schema di prezzo reale della
    // CEDRATA (0,62 €/pz netto CRM vs 13,25 €/cartone lordo -25%/-25% lato
    // conferma) per dimostrare che il CODICE le aggancia nonostante nomi
    // completamente diversi. CEDRATA e l'alias B189/B210 usano i numeri reali
    // esatti forniti dall'utente.
    const prodottiPuliti: Array<[string, string]> = [
      ["ARS123", "V12ARS123"],
      ["ARS124SP", "V12ARS124SP"],
      ["ARS124CH", "V12ARS124CH"],
      ["ARS124T", "V12ARS124T"],
      ["ARS202", "V12ARS202"],
      ["ARS203", "V12ARS203"],
      ["ARS124L", "ARS124L"], // la conferma non antepone sempre il prefisso V12
    ];

    const crm: CRMRiga[] = prodottiPuliti.map(([codiceCrm], i) =>
      crmRiga({
        id: `ok${i}`,
        prodotto_codice: codiceCrm,
        prodotto_nome: `PRODOTTO ${codiceCrm}`,
        quantita_cartoni: 2,
        quantita_pezzi: 0,
        pezzi_per_cartone: 12,
        prezzo_unitario: 0.62,
        sc1: 0,
        sc2: 0,
        sc3: 0,
      })
    );
    const pdf: PDFRiga[] = prodottiPuliti.map(([, codicePdf]) =>
      pdfRiga({
        codice_prodotto: codicePdf,
        // Nome volutamente inconfrontabile col CRM, come nel caso reale
        // ("ARANCIATA ARS" vs "ANT.RIC.SICIL.ARANCIATA x12 bott CL 27.5").
        nome_prodotto: `ANT.RIC.SICIL. ${codicePdf} x12 bott`,
        quantita_cartoni: 2,
        pezzi_per_cartone: 12,
        prezzo_per_cartone: 13.25,
        sc1: 25,
        sc2: 25,
        sc3: 0,
        importo_riga: undefined,
      })
    );

    // Caso particolare: codice CRM "ARS 124 ARA" vs conferma "V12ARS124AR"
    // (suffisso ARA/AR, non un suffisso pulito) — deve agganciare via
    // similarità a bigrammi sul codice, non per suffisso esatto.
    crm.push(
      crmRiga({
        id: "ara",
        prodotto_codice: "ARS 124 ARA",
        prodotto_nome: "PRODOTTO ARS124ARA",
        quantita_cartoni: 2,
        quantita_pezzi: 0,
        pezzi_per_cartone: 12,
        prezzo_unitario: 0.62,
        sc1: 0,
        sc2: 0,
        sc3: 0,
      })
    );
    pdf.push(
      pdfRiga({
        codice_prodotto: "V12ARS124AR",
        nome_prodotto: "ANT.RIC.SICIL. ARANCIA RARA x12 bott",
        quantita_cartoni: 2,
        pezzi_per_cartone: 12,
        prezzo_per_cartone: 13.25,
        sc1: 25,
        sc2: 25,
        sc3: 0,
        importo_riga: undefined,
      })
    );

    // CEDRATA (ARS 124CE / V12ARS124CE): l'UNICA discrepanza reale verificata
    // a mano. CRM: 5 cart × 12 pz = 60 pz @ 0,62 €/pz = 37,20 €. Conferma:
    // spezzata su 2 righe con formati diversi (2 cart × 12 pz + 2 cart × 24
    // pz = 72 pz), stesso prezzo netto/pz di tutte le altre righe = 44,72 €.
    // Differenza reale: +12 pezzi, +7,52 €.
    crm.push(
      crmRiga({
        id: "cedrata",
        prodotto_codice: "ARS124CE",
        prodotto_nome: "CEDRATA ARS",
        quantita_cartoni: 5,
        quantita_pezzi: 0,
        pezzi_per_cartone: 12,
        prezzo_unitario: 0.62,
        sc1: 0,
        sc2: 0,
        sc3: 0,
      })
    );
    pdf.push(
      pdfRiga({
        codice_prodotto: "V12ARS124CE",
        nome_prodotto: "ANT.RIC.SICIL. CEDRATA x12 bott",
        quantita_cartoni: 2,
        pezzi_per_cartone: 12,
        prezzo_per_cartone: 13.25,
        sc1: 25,
        sc2: 25,
        sc3: 0,
        importo_riga: undefined,
      }),
      pdfRiga({
        codice_prodotto: "V12ARS124CE",
        nome_prodotto: "ANT.RIC.SICIL. CEDRATA x24 bott",
        quantita_cartoni: 2,
        pezzi_per_cartone: 24,
        prezzo_per_cartone: 26.5,
        sc1: 25,
        sc2: 25,
        sc3: 0,
        importo_riga: undefined,
      })
    );

    // Alias non risolvibile automaticamente: codice ("B189" vs "B210") e nome
    // ("TONICA LEMON 1LT" vs "P53 LEMON LT 1 X 6 BOTT") entrambi diversi su
    // entrambi i lati, ma quantità (25 pz) e imponibile (85,50 €) identici.
    // Semplificato a "25 unità da 1 pezzo" invece del reale formato
    // bottiglie/cartone: non cambia il meccanismo testato (rilevare che
    // nessun segnale di codice/nome aggancia, ma i numeri sì).
    crm.push(
      crmRiga({
        id: "b189",
        prodotto_codice: "B189",
        prodotto_nome: "TONICA LEMON 1LT",
        quantita_cartoni: 25,
        quantita_pezzi: 0,
        pezzi_per_cartone: 1,
        prezzo_unitario: 3.42,
        sc1: 0,
        sc2: 0,
        sc3: 0,
      })
    );
    pdf.push(
      pdfRiga({
        codice_prodotto: "B210",
        nome_prodotto: "P53 LEMON LT 1 X 6 BOTT",
        quantita_cartoni: 25,
        pezzi_per_cartone: 1,
        prezzo_per_cartone: 3.42,
        sc1: 0,
        sc2: 0,
        sc3: 0,
        importo_riga: undefined,
      })
    );

    const res = confrontaOrdine(crm, pdf);

    expect(res.righe_ok).toBe(8); // 7 codice esatto + 1 codice fuzzy (ARA/AR)
    expect(res.righe_diff).toBe(1); // CEDRATA
    expect(res.righe_alias_suggerito).toBe(1); // B189/B210
    expect(res.righe_mancanti).toBe(0);
    expect(res.righe_extra).toBe(0);

    const cedrataEsito = res.righe.find((r) => r.crm?.id === "cedrata");
    expect(cedrataEsito?.stato).toBe("qta_diff");
    expect(cedrataEsito?.gravita).toBe("error");
    expect(cedrataEsito?.pdfRighe?.length).toBe(2); // uno-a-molti: due righe conferma raggruppate
    expect(cedrataEsito?.delta_imponibile).toBeCloseTo(7.52, 1);

    const aliasEsito = res.righe.find((r) => r.crm?.id === "b189");
    expect(aliasEsito?.stato).toBe("alias_suggerito");
    expect(aliasEsito?.pdf?.codice_prodotto).toBe("B210");

    const araEsito = res.righe.find((r) => r.crm?.id === "ara");
    expect(araEsito?.stato).toBe("ok"); // agganciato per bigrammi sul codice, non per suffisso esatto
    expect(araEsito?.pdf?.codice_prodotto).toBe("V12ARS124AR");
  });
});

describe("confrontaOrdine — omaggi", () => {
  it("omaggio dichiarato solo su un lato viene segnalato", () => {
    const res = confrontaOrdine(
      [crmRiga({ is_omaggio: true, prezzo_unitario: 0 })],
      [pdfRiga({ is_omaggio: false })]
    );
    expect(res.righe[0].stato).toBe("omaggio_diff");
  });
});
