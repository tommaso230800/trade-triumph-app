import { describe, expect, it } from "vitest";
import { accisaDellaRiga, accisaTotale, accisaValida } from "./accisa";

describe("accisa", () => {
  it("valida l'importo a bottiglia", () => {
    expect(accisaValida("1,25")).toBe(1.25);
    expect(accisaValida(0)).toBeNull();
    expect(accisaValida(-1)).toBeNull();
    expect(accisaValida("abc")).toBeNull();
    expect(accisaValida(null)).toBeNull();
  });

  it("calcola l'accisa sui pezzi venduti, esclusi gli omaggi", () => {
    expect(accisaDellaRiga({ quantita_cartoni: 2, pezzi_per_cartone: 6, accisa_pezzo: 1.25 })).toBe(15);
    expect(accisaDellaRiga({ quantita_cartoni: 1, quantita_pezzi: 3, pezzi_per_cartone: 6, accisa_pezzo: 1.25 })).toBe(11.25);
    expect(accisaDellaRiga({ quantita_cartoni: 2, pezzi_per_cartone: 6, accisa_pezzo: 1.25, is_omaggio: true })).toBe(0);
    expect(accisaDellaRiga({ quantita_cartoni: 2, pezzi_per_cartone: 6, accisa_pezzo: null })).toBe(0);
  });

  it("somma le righe", () => {
    expect(accisaTotale([
      { quantita_cartoni: 2, pezzi_per_cartone: 6, accisa_pezzo: 1.25 },
      { quantita_cartoni: 1, pezzi_per_cartone: 12, accisa_pezzo: 0.5 },
      { quantita_cartoni: 5, pezzi_per_cartone: 6, accisa_pezzo: null },
    ])).toBe(21);
  });
});
