import { describe, expect, it } from "vitest";
import { comparisonRange, defaultCompareYear, mergeStats, periodRange, totals, variation, type ProductStatRow } from "./productStats";

const row = (id: string, over: Partial<ProductStatRow> = {}): ProductStatRow => ({
  prodotto_id: id, nome: id, codice: null, formato: null, azienda_id: "a", azienda_nome: "A", attivo: true,
  fatturato: 0, cartoni: 0, pezzi_sfusi: 0, pezzi: 0, righe_senza_confezione: 0, omaggio_cartoni: 0, omaggio_pezzi: 0, righe: 1, ordini: 1, ...over,
});

describe("confronto annuale dinamico", () => {
  it("2027 si confronta con 2026, 2028 con 2027", () => {
    expect(defaultCompareYear(2027)).toBe(2026);
    expect(defaultCompareYear(2028)).toBe(2027);
  });
  it("durante l'anno confronta 1 gennaio–15 marzo 2027 con 1 gennaio–15 marzo 2026", () => {
    const r = periodRange("ytd", 2027, "2027-03-15");
    expect(r).toEqual({ from: "2027-01-01", to: "2027-03-15" });
    expect(comparisonRange(r, 2026)).toEqual({ from: "2026-01-01", to: "2026-03-15" });
  });
  it("anno intero contro anno intero", () => {
    expect(comparisonRange(periodRange("year", 2027, "2027-03-15"), 2026)).toEqual({ from: "2026-01-01", to: "2026-12-31" });
  });
  it("29 febbraio diventa 28 nell'anno non bisestile", () => {
    expect(comparisonRange({ from: "2028-01-01", to: "2028-02-29" }, 2027).to).toBe("2027-02-28");
  });
});

describe("variazioni", () => {
  it("valore precedente zero = Nuovo", () => expect(variation(100, 0, true).kind).toBe("new"));
  it("entrambi zero = nessuna variazione", () => expect(variation(0, 0, true).kind).toBe("none"));
  it("storico mancante = dati non disponibili, non zero vendite", () => expect(variation(100, 0, false).kind).toBe("na"));
  it("percentuale e differenza assoluta", () => expect(variation(150, 100, true)).toEqual({ kind: "pct", diff: 50, pct: 50 }));
});

describe("unione per identificativo stabile", () => {
  it("mantiene prodotti venduti solo l'anno precedente e usa l'id anche se il nome cambia", () => {
    const merged = mergeStats([row("p1", { nome: "Nuovo nome", fatturato: 10 })], [row("p1", { nome: "Vecchio nome", fatturato: 5 }), row("p2", { fatturato: 7 })], [], { includeUnsold: false, aziendaNames: new Map() });
    const p1 = merged.find((r) => r.prodotto_id === "p1")!;
    expect(p1.nome).toBe("Nuovo nome");
    expect(p1.prev?.fatturato).toBe(5);
    expect(merged.find((r) => r.prodotto_id === "p2")?.fatturato).toBe(0);
  });
  it("prodotti senza vendite inclusi solo su richiesta", () => {
    const catalog = [{ id: "p9", nome: "Fermo", codice: null, formato: null, azienda_id: "a" }];
    expect(mergeStats([], null, catalog, { includeUnsold: false, aziendaNames: new Map() })).toHaveLength(0);
    expect(mergeStats([], null, catalog, { includeUnsold: true, aziendaNames: new Map() })).toHaveLength(1);
  });
  it("i totali escludono gli omaggi dai pezzi venduti", () => {
    const t = totals([row("p1", { cartoni: 2, pezzi: 24, omaggio_pezzi: 12, fatturato: 30 })]);
    expect(t.pezzi).toBe(24);
    expect(t.omaggio_pezzi).toBe(12);
  });
});
