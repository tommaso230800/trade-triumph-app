import { describe, expect, it } from "vitest";
import { reorderDigestKey, reorderDigestMessage, romeHour } from "../../supabase/functions/_shared/reorderAlerts.ts";

describe("riepilogo riordini", () => {
  it("messaggio con i casi più in ritardo", () => {
    const m = reorderDigestMessage([
      { cliente: "Bar A", azienda: "Casoni", giorni_ritardo: 3 },
      { cliente: "Bar B", azienda: "Casoni", giorni_ritardo: 20 },
      { cliente: "Bar C", azienda: "Polara", giorni_ritardo: 9 },
      { cliente: "Bar D", azienda: "Polara", giorni_ritardo: 1 },
    ]);
    expect(m.titolo).toBe("Riordini in ritardo: 4 clienti");
    expect(m.testo).toBe("Bar B · Casoni (20 gg); Bar C · Polara (9 gg); Bar A · Casoni (3 gg) e altri 1.");
    expect(reorderDigestMessage([{ cliente: "Bar A", azienda: "Casoni", giorni_ritardo: 2 }]).titolo).toBe("Riordini in ritardo: 1 cliente");
  });

  it("una chiave al giorno e ora di Roma", () => {
    expect(reorderDigestKey("o1", "2026-11-19")).toBe("riordino_riepilogo:o1:2026-11-19");
    expect(romeHour(new Date("2026-11-19T07:30:00Z"))).toBe(8); // inverno: UTC+1
    expect(romeHour(new Date("2026-07-19T06:30:00Z"))).toBe(8); // estate: UTC+2
  });
});
