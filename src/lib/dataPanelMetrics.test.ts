import { describe, expect, it } from "vitest";
import { dataPanelMetrics, inPeriodo, parseDocumentNumber } from "./dataPanelMetrics";

describe("Pannello dati read-only", () => {
  it("confronta il fatturato salvato con le righe senza sostituirlo", () => {
    const result = dataPanelMetrics([{ id: "a", totale: 80, ordini_righe: [{ quantita_pezzi: 10, prezzo_unitario: 10, prodotti: { costo_acquisto: 2 } }] }]);
    expect(result.fatturato).toBe(80);
    expect(result.report.rows[0].delta).toBe(-20);
    expect(result.margin).toBe(60);
  });
  it("usa lo stesso periodo per conteggio e fatturato", () => {
    const o = { id: "a", totale: 25, data_ordine: "2026-10-31", created_at: "2026-11-01" };
    expect(inPeriodo(o, { kind: "month", year: 2026, month: 10 })).toBe(true);
    expect(inPeriodo(o, { kind: "month", year: 2026, month: 11 })).toBe(false);
  });
  it("non inventa un margine quando mancano righe o costi", () => {
    expect(dataPanelMetrics([{ id: "a", totale: 100 }]).margin).toBeNull();
    expect(dataPanelMetrics([{ id: "b", totale: 100, ordini_righe: [{ quantita_pezzi: 1, prodotti: { costo_acquisto: 0 } }] }]).margin).toBeNull();
  });
  it("esclude stand-by e annullati dai totali", () => {
    const r = dataPanelMetrics([{ id: "a", totale: 100, status: "stand_by" }, { id: "b", totale: 200, status: "annullato" }, { id: "c", totale: 30, status: "completato" }]);
    expect(r.count).toBe(1); expect(r.fatturato).toBe(30);
  });
  it("omaggi: fatturato zero ma costo reale nel margine", () => {
    const r = dataPanelMetrics([{ id: "a", totale: 80, ordini_righe: [{ is_omaggio: true, quantita_cartoni: 5, prezzo_unitario: 10, prodotti: { pezzi_per_cartone: 6, costo_acquisto: 2 } }] }]);
    expect(r.report.total_righe).toBe(0); expect(r.margin).toBe(20);
  });
  it("legge valori italiani del documento senza trattare assenze come zero", () => {
    expect(parseDocumentNumber("12.450,80 €")).toBe(12450.8);
    expect(parseDocumentNumber("")).toBeNull();
    expect(parseDocumentNumber("N/D")).toBeNull();
  });
});