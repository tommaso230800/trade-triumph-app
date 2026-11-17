import { describe, expect, it } from "vitest";
import { dataRinvio, gruppoDi, quandoLabel, toLocalInput } from "./promemoria";

const now = new Date(2026, 10, 17, 10, 30); // 17 nov 2026, 10:30

describe("promemoria", () => {
  it("raggruppa per scadenza", () => {
    const at = (d: Date) => ({ stato: "da_fare", data_promemoria: d.toISOString() });
    expect(gruppoDi(at(new Date(2026, 10, 17, 9, 0)), now)).toBe("scaduti");
    expect(gruppoDi(at(new Date(2026, 10, 17, 18, 0)), now)).toBe("oggi");
    expect(gruppoDi(at(new Date(2026, 10, 18, 9, 0)), now)).toBe("domani");
    expect(gruppoDi(at(new Date(2026, 10, 25, 9, 0)), now)).toBe("prossimi");
    expect(gruppoDi({ stato: "fatto", data_promemoria: new Date(2026, 10, 1).toISOString() }, now)).toBe("fatti");
  });

  it("calcola i rinvii", () => {
    expect(toLocalInput(dataRinvio("stasera", now))).toBe("2026-11-17T18:00");
    expect(toLocalInput(dataRinvio("stasera", new Date(2026, 10, 17, 19, 0)))).toBe("2026-11-18T18:00");
    expect(toLocalInput(dataRinvio("domani", now))).toBe("2026-11-18T09:00");
    expect(toLocalInput(dataRinvio("settimana", now))).toBe("2026-11-24T09:00");
    expect(toLocalInput(dataRinvio("mese", now))).toBe("2026-12-17T09:00");
  });

  it("etichetta il quando in italiano", () => {
    expect(quandoLabel(new Date(2026, 10, 17, 18, 0).toISOString(), now)).toBe("Oggi, 18:00");
    expect(quandoLabel(new Date(2026, 10, 18, 9, 0).toISOString(), now)).toBe("Domani, 09:00");
    expect(quandoLabel(new Date(2026, 10, 16, 9, 0).toISOString(), now)).toBe("Ieri, 09:00");
  });
});
