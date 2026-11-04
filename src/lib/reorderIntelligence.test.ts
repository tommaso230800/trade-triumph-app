import { describe, it, expect } from "vitest";
import {
  analyzePair,
  computePortfolioKPIs,
  sogliaAnomalia,
  type IntelligenceOrder,
  type IntelligenceRiga,
} from "./reorderIntelligence";

const TODAY = "2026-11-04";

function ordersFromIntervals(start: string, intervals: number[], totale = 1000): IntelligenceOrder[] {
  const out: IntelligenceOrder[] = [];
  let d = Date.parse(`${start}T00:00:00Z`) / 86400000;
  out.push({ id: "o0", data_ordine: iso(d), totale, cartoni: 10, pezzi: 100 });
  intervals.forEach((g, i) => {
    d += g;
    out.push({ id: `o${i + 1}`, data_ordine: iso(d), totale, cartoni: 10, pezzi: 100 });
  });
  return out;
}

function iso(day: number): string {
  return new Date(day * 86400000).toISOString().slice(0, 10);
}

function righeProdotto(prodotto: string, dates: string[]): IntelligenceRiga[] {
  return dates.map((d, i) => ({
    prodotto_id: prodotto,
    data_ordine: d,
    ordine_id: `r${i}`,
    quantita_cartoni: 5,
    quantita_pezzi: 50,
    prezzo_unitario: 10,
    is_omaggio: false,
  }));
}

describe("Intelligence riordini — condizioni della specifica", () => {
  it("1. frequenza regolare 30-35 giorni: regolare, nessun allarme", () => {
    const orders = ordersFromIntervals("2026-04-01", [32, 35, 30, 34, 33, 31]);
    const p = analyzePair("c1", "a1", orders, [], { today: iso(dayOf(orders[6].data_ordine) + 20) });
    expect(p.frequenza_abituale).toBeGreaterThanOrEqual(30);
    expect(p.frequenza_abituale).toBeLessThanOrEqual(35);
    expect(p.stato).toBe("regolare");
    expect(p.rallentamento).toBe("nessuno");
    expect(p.affidabilita).not.toBe("insufficiente");
  });

  it("2. ritardo oltre i 6 giorni di tolleranza", () => {
    const orders = ordersFromIntervals("2026-05-01", [30, 30, 30, 30, 30]);
    const last = orders[5].data_ordine;
    const p = analyzePair("c1", "a1", orders, [], { today: iso(dayOf(last) + 37) });
    expect(p.stato).toBe("ritardo");
    expect(p.giorni_ritardo).toBe(1);
    const inTolleranza = analyzePair("c1", "a1", orders, [], { today: iso(dayOf(last) + 34) });
    expect(inTolleranza.stato).toBe("tolleranza");
  });

  it("3. primo intervallo anomalo di 50 giorni: arancione da monitorare", () => {
    const orders = ordersFromIntervals("2026-03-01", [32, 35, 30, 34, 33, 50]);
    const p = analyzePair("c1", "a1", orders, [], { today: iso(dayOf(orders[6].data_ordine) + 5) });
    expect(p.rallentamento).toBe("anomalo");
    expect(p.intervalli[p.intervalli.length - 1].stato).toBe("anomalo");
    expect(p.frequenza_abituale).toBeLessThan(40); // baseline non riscritta dal 50
  });

  it("4. due intervalli consecutivi 50 e 52: rallentamento persistente rosso", () => {
    const orders = ordersFromIntervals("2026-02-01", [32, 35, 30, 34, 50, 52]);
    const p = analyzePair("c1", "a1", orders, [], { today: iso(dayOf(orders[6].data_ordine) + 5) });
    expect(p.rallentamento).toBe("persistente");
    expect(p.intervalli_anomali_consecutivi).toBe(2);
    expect(p.intervalli[p.intervalli.length - 1].stato).toBe("persistente");
    expect(p.priorita).not.toBe("bassa");
  });

  it("5. un nuovo ordine non cancella il rallentamento persistente", () => {
    const orders = ordersFromIntervals("2026-02-01", [32, 35, 30, 34, 50, 52, 31]);
    const p = analyzePair("c1", "a1", orders, [], { today: iso(dayOf(orders[7].data_ordine) + 5) });
    expect(p.rallentamento).toBe("in_recupero");
    expect(p.rallentamento).not.toBe("nessuno");
  });

  it("6. ritorno progressivo: dopo 2 cicli regolari il sospetto rientra", () => {
    const orders = ordersFromIntervals("2026-02-01", [32, 35, 30, 34, 50, 52, 31, 33]);
    const p = analyzePair("c1", "a1", orders, [], { today: iso(dayOf(orders[8].data_ordine) + 5) });
    expect(p.rallentamento).toBe("nessuno");
  });

  it("7. prodotto non più riordinato mentre altri continuano", () => {
    const orders = ordersFromIntervals("2026-03-01", [30, 30, 30, 30, 30, 30]);
    const dates = orders.map((o) => o.data_ordine);
    const righe = [
      ...righeProdotto("p1", dates.slice(0, 3)), // smette dopo il 3° ordine
      ...righeProdotto("p2", dates), // continua sempre
    ];
    const p = analyzePair("c1", "a1", orders, righe, { today: iso(dayOf(dates[6]) + 2) });
    expect(p.prodotti_non_riordinati.map((x) => x.prodotto_id)).toContain("p1");
    expect(p.prodotti_non_riordinati.map((x) => x.prodotto_id)).not.toContain("p2");
  });

  it("8. calo dei volumi a frequenza invariata: segnalazione distinta", () => {
    const dates = ordersFromIntervals("2026-03-01", [30, 30, 30, 30, 30, 30, 30]);
    const orders = dates.map((o, i) => ({ ...o, totale: i < 4 ? 1000 : 500, cartoni: i < 4 ? 10 : 5 }));
    const p = analyzePair("c1", "a1", orders, [], { today: iso(dayOf(orders[7].data_ordine) + 5) });
    expect(p.calo_volumi).toBe(true);
    expect(p.calo_volumi_pct).toBeLessThanOrEqual(-30);
    expect(p.rallentamento).toBe("nessuno"); // non confuso col rallentamento
  });

  it("9. storico insufficiente: nessun allarme, nessuna frequenza inventata", () => {
    const orders = ordersFromIntervals("2026-10-01", [30]);
    const p = analyzePair("c1", "a1", orders, [], { today: TODAY });
    expect(p.affidabilita).toBe("insufficiente");
    expect(p.stato).toBe("storico_insufficiente");
    expect(p.frequenza_abituale).toBeNull();
    expect(p.rallentamento).toBe("nessuno");
  });

  it("ordini dello stesso giorno non creano falsi intervalli", () => {
    const orders = ordersFromIntervals("2026-05-01", [30, 30, 30, 30]);
    orders.push({ ...orders[2], id: "dup", totale: 500 });
    const p = analyzePair("c1", "a1", orders, [], { today: iso(dayOf(orders[4].data_ordine) + 10) });
    expect(p.intervalli.every((i) => i.giorni > 0)).toBe(true);
    expect(p.numero_ordini).toBe(5);
  });

  it("tolleranza configurabile tra 5 e 7", () => {
    const orders = ordersFromIntervals("2026-05-01", [30, 30, 30, 30, 30]);
    const last = orders[5].data_ordine;
    const t5 = analyzePair("c1", "a1", orders, [], { today: iso(dayOf(last) + 36), tolleranza: 5 });
    expect(t5.stato).toBe("ritardo");
    const t7 = analyzePair("c1", "a1", orders, [], { today: iso(dayOf(last) + 36), tolleranza: 7 });
    expect(t7.stato).toBe("tolleranza");
    const t99 = analyzePair("c1", "a1", orders, [], { today: TODAY, tolleranza: 99 });
    expect(t99.tolleranza).toBe(7);
  });

  it("soglia anomalia: max(7 giorni, 30%, deviazione)", () => {
    expect(sogliaAnomalia(33, 2)).toBeCloseTo(33 + 9.9, 1);
    expect(sogliaAnomalia(10, 1)).toBe(17);
    expect(sogliaAnomalia(30, 15)).toBe(45);
  });

  it("KPI portafoglio: nessun doppio conteggio, storico insufficiente escluso", () => {
    const regolare = analyzePair("c1", "a1", ordersFromIntervals("2026-05-01", [30, 30, 30, 30, 30]), [], { today: iso(dayOf("2026-05-01") + 150 + 10) });
    const persistente = analyzePair("c2", "a1", ordersFromIntervals("2026-02-01", [32, 35, 30, 34, 50, 52]), [], { today: TODAY });
    const insufficiente = analyzePair("c3", "a1", ordersFromIntervals("2026-10-01", [30]), [], { today: TODAY });
    const kpi = computePortfolioKPIs([regolare, persistente, insufficiente], TODAY);
    expect(kpi.clienti_monitorati).toBe(2);
    expect(kpi.rallentamenti_persistenti).toBe(1);
    expect(kpi.clienti_sospetti).toBe(0); // persistente non contato due volte
  });
});

function dayOf(date: string): number {
  return Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / 86400000;
}
