import { describe, expect, it } from "vitest";
import { orderTotals, parseQuantity, rowPieces, rowProblems } from "./orderTotals";

describe("totali ordine", () => {
  it("pezzi acquistati = cartoni × pezzi per cartone + pezzi sfusi", () => {
    expect(rowPieces({ quantita_cartoni: 10, quantita_pezzi: 4, pezzi_per_cartone: 24 })).toBe(244);
  });
  it("gli omaggi non sono merce venduta ma entrano nel da consegnare", () => {
    const t = orderTotals([
      { prodotto_id: "a", quantita_cartoni: 80, quantita_pezzi: 0, pezzi_per_cartone: 6 },
      { prodotto_id: "a", quantita_cartoni: 5, quantita_pezzi: 0, pezzi_per_cartone: 6, is_omaggio: true },
    ]);
    expect(t.cartoni).toBe(80);
    expect(t.pezzi).toBe(480);
    expect(t.omaggioCartoni).toBe(5);
    expect(t.omaggioPezzi).toBe(30);
    expect(t.daConsegnarePezzi).toBe(510);
    expect(t.referenze).toBe(1);
  });
  it("senza pezzi per cartone il totale pezzi non è completo", () => {
    const t = orderTotals([{ quantita_cartoni: 3, quantita_pezzi: 2, pezzi_per_cartone: 0 }]);
    expect(rowPieces({ quantita_cartoni: 3, quantita_pezzi: 2, pezzi_per_cartone: 0 })).toBeNull();
    expect(t.completo).toBe(false);
    expect(t.righeSenzaConfezione).toBe(1);
  });
  it("solo pezzi sfusi non richiede la confezione", () => {
    expect(rowPieces({ quantita_cartoni: 0, quantita_pezzi: 7, pezzi_per_cartone: null })).toBe(7);
  });
});

describe("validazioni", () => {
  it("rifiuta quantità negative o decimali", () => {
    expect(parseQuantity("-2").error).not.toBeNull();
    expect(parseQuantity("1,5").error).not.toBeNull();
    expect(parseQuantity("12")).toEqual({ value: 12, error: null });
  });
  it("segnala prezzo zero sulle righe vendute ma non sugli omaggi", () => {
    expect(rowProblems({ quantita_cartoni: 1, quantita_pezzi: 0, pezzi_per_cartone: 6, prezzo: 0, sc: [0, 0, 0] })).toContain("Prezzo non valido");
    expect(rowProblems({ quantita_cartoni: 1, quantita_pezzi: 0, pezzi_per_cartone: 6, prezzo: 0, sc: [0, 0, 0], is_omaggio: true })).toEqual([]);
  });
  it("segnala sconti fuori intervallo", () => {
    expect(rowProblems({ quantita_cartoni: 1, quantita_pezzi: 0, pezzi_per_cartone: 6, prezzo: 1, sc: [100, 0, 0] })).toContain("Sconto tra 0 e 99,99%");
  });
});
