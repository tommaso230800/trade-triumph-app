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

  it("10 centesimi di scarto sul prezzo/cartone vengono segnalati anche se relativamente sono <1%", () => {
    // Col vecchio approxEqual(prezzo, tolAbs=0.01, tolRel=0.02) una differenza di
    // 0.10 su 102 (0.098% relativo) sarebbe passata inosservata. Ora la tolleranza
    // è solo assoluta (default 0.02 €): deve essere segnalata.
    const res = confrontaOrdine([crmRiga()], [pdfRiga({ prezzo_per_cartone: 102.1, importo_riga: 154.22 })]);
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
    const res = confrontaOrdine(
      [crmRiga({ prodotto_codice: null, prodotto_nome: "GRAPPA BIANCA" })],
      [pdfRiga({ codice_prodotto: null, nome_prodotto: "LIMONCELLO ARTIGIANALE" })]
    );
    expect(res.righe_mancanti).toBe(1);
    expect(res.righe_extra).toBe(1);
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
