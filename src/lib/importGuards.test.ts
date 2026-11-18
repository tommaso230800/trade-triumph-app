import { describe, expect, it } from "vitest";
import { isRigaRiepilogo } from "./importGuards";

describe("isRigaRiepilogo", () => {
  it("riconosce i riepiloghi contabili senza codice", () => {
    for (const n of ["Imponibile IVA", "Imponibile Premi", "Imponibile Provvi", "IMPONIBILE PROVVIGIONI", "Totale documento", "Tot. merce", "Subtotale", "IVA 22%", "Spese trasporto", "Arrotondamento", "Netto a pagare", "Contributo CONAI", "Sconto cassa"]) {
      expect(isRigaRiepilogo(n, null)).toBe(true);
    }
  });

  it("non scarta articoli veri", () => {
    for (const n of ["Amaro Casoni 70cl", "Limoncello 50cl", "Liquore alla Liquirizia", "Grappa Riserva", "Sambuca Extra", "Prosecco DOC Extra Dry", "Ivanhoe Gin 70cl", "Premium Tonic 20cl", "Spritz Aperitivo 1L"]) {
      expect(isRigaRiepilogo(n, null)).toBe(false);
    }
  });

  it("con un codice articolo non è mai un riepilogo", () => {
    expect(isRigaRiepilogo("Totale Lemon Soda", "LS33")).toBe(false);
  });
});
