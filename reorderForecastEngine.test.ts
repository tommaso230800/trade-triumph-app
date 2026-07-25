import { describe, it, expect } from "vitest";
import {
  computeReorderForecast,
  computeForecastKPIs,
  type RawRigaOrdine,
} from "./reorderForecastEngine";

function riga(overrides: Partial<RawRigaOrdine>): RawRigaOrdine {
  return {
    ordine_id: "o1",
    prodotto_id: "p1",
    quantita_cartoni: 10,
    quantita_pezzi: 120,
    is_omaggio: false,
    prezzo_unitario: 2,
    data_ordine: "2026-01-01",
    cliente_id: "c1",
    azienda_id: "a1",
    ...overrides,
  };
}

describe("computeReorderForecast", () => {
  it("ignora le righe omaggio e quelle senza chiavi valide", () => {
    const righe = [
      riga({ is_omaggio: true }),
      riga({ cliente_id: "" }),
      riga({ quantita_cartoni: 0, quantita_pezzi: 0 }),
    ];
    expect(computeReorderForecast(righe)).toHaveLength(0);
  });

  it("raggruppa per cliente|azienda|prodotto e calcola l'intervallo medio fra riordini", () => {
    const righe = [
      riga({ data_ordine: "2026-01-01" }),
      riga({ data_ordine: "2026-01-11" }), // +10gg
      riga({ data_ordine: "2026-01-21" }), // +10gg
    ];
    const [f] = computeReorderForecast(righe, new Date("2026-01-21"));
    expect(f.numero_ordini).toBe(3);
    expect(f.media_giorni).toBe(10);
    expect(f.deviazione_giorni).toBe(0);
    expect(f.prossimo_riordino).toBe("2026-01-31");
  });

  it("classifica correttamente l'urgenza in base ai giorni al riordino previsto", () => {
    // ultimo ordine 10gg fa, cadenza media 10gg -> prossimo riordino oggi -> critica
    const righe = [
      riga({ data_ordine: "2025-12-12" }),
      riga({ data_ordine: "2025-12-22" }),
    ];
    const [f] = computeReorderForecast(righe, new Date("2026-01-01"));
    expect(f.giorni_al_riordino).toBe(0);
    expect(f.urgenza).toBe("critica");
  });

  it("con un solo ordine non calcola un prossimo riordino (nessun intervallo noto)", () => {
    const [f] = computeReorderForecast([riga({})]);
    expect(f.prossimo_riordino).toBeNull();
    expect(f.giorni_al_riordino).toBeNull();
    expect(f.urgenza).toBe("futura");
  });
});

describe("computeForecastKPIs", () => {
  it("aggrega correttamente rotture, clienti da contattare e fatturato potenziale", () => {
    const righe = [
      // cliente c1: cadenza 10gg, in rottura oggi -> critica
      riga({ cliente_id: "c1", data_ordine: "2025-12-12" }),
      riga({ cliente_id: "c1", data_ordine: "2025-12-22" }),
      // cliente c2: cadenza 60gg, riordino fra 30gg -> non urgente
      riga({ cliente_id: "c2", prodotto_id: "p2", data_ordine: "2025-11-02" }),
      riga({ cliente_id: "c2", prodotto_id: "p2", data_ordine: "2026-01-01" }),
    ];
    const forecasts = computeReorderForecast(righe, new Date("2026-01-01"));
    const kpi = computeForecastKPIs(forecasts);

    expect(kpi.totale_prodotti_monitorati).toBe(2);
    expect(kpi.in_rottura_oggi).toBe(1);
    expect(kpi.clienti_da_contattare).toBe(1);
  });
});
