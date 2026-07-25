import { describe, it, expect } from "vitest";
import {
  computeOmaggiSpettanti,
  type RegolaOmaggio,
  type AcquistoRiga,
} from "./omaggiEngine";

function regola(overrides: Partial<RegolaOmaggio>): RegolaOmaggio {
  return {
    id: "r1",
    sorgente: "promo",
    cliente_id: null,
    azienda_id: "a1",
    prodotto_id: "p1",
    qta_base: 80,
    qta_omaggio: 4,
    unita: "cartoni",
    cumulabile_arretrati: true,
    data_inizio: "2026-01-01",
    data_fine: "2026-12-31",
    nome: "Promo 80+4",
    ...overrides,
  };
}

function acquisto(overrides: Partial<AcquistoRiga>): AcquistoRiga {
  return {
    cliente_id: "c1",
    azienda_id: "a1",
    prodotto_id: "p1",
    data_ordine: "2026-02-01",
    quantita_cartoni: 40,
    quantita_pezzi: 0,
    pezzi_per_cartone: 12,
    is_omaggio: false,
    ordine_id: "o1",
    ...overrides,
  };
}

describe("computeOmaggiSpettanti", () => {
  it("applica la formula floor(acquistato/qta_base) * qta_omaggio", () => {
    const [res] = computeOmaggiSpettanti(
      [regola({})],
      [acquisto({ quantita_cartoni: 80 })],
      []
    );
    expect(res.acquistato).toBe(80);
    expect(res.spettanti_totali).toBe(4);
    expect(res.spettanti_residui).toBe(4);
  });

  it("sotto la soglia riporta il prodotto con 0 omaggi spettanti (per il progresso verso il prossimo scaglione)", () => {
    const [res] = computeOmaggiSpettanti(
      [regola({})],
      [acquisto({ quantita_cartoni: 79 })],
      []
    );
    expect(res.spettanti_totali).toBe(0);
    expect(res.progresso_prossimo_pct).toBeCloseTo((79 / 80) * 100);
    expect(res.mancano_al_prossimo).toBe(1);
  });

  it("sottrae gli omaggi già erogati dai residui", () => {
    const [res] = computeOmaggiSpettanti(
      [regola({})],
      [acquisto({ quantita_cartoni: 160 })], // 2 scaglioni -> 8 spettanti
      [{ cliente_id: "c1", prodotto_id: "p1", promo_id: "r1", contratto_id: null, quantita: 4, unita: "cartoni" }]
    );
    expect(res.spettanti_totali).toBe(8);
    expect(res.gia_erogati).toBe(4);
    expect(res.spettanti_residui).toBe(4);
  });

  it("con cumulabile_arretrati=false considera solo l'ordine più recente", () => {
    const [res] = computeOmaggiSpettanti(
      [regola({ cumulabile_arretrati: false })],
      [
        acquisto({ data_ordine: "2026-02-01", quantita_cartoni: 80 }),
        acquisto({ data_ordine: "2026-03-01", quantita_cartoni: 40, ordine_id: "o2" }),
      ],
      []
    );
    // Solo l'ordine di marzo (40 cartoni) viene considerato -> nessuno scaglione raggiunto
    expect(res.acquistato).toBe(40);
    expect(res.spettanti_totali).toBe(0);
  });

  it("ignora le righe già segnate come omaggio nel calcolo dell'acquistato", () => {
    const res = computeOmaggiSpettanti(
      [regola({})],
      [acquisto({ quantita_cartoni: 80, is_omaggio: true })],
      []
    );
    expect(res).toHaveLength(0);
  });
});
