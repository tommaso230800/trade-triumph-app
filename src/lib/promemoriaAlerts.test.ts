import { describe, expect, it } from "vitest";
import {
  promemoriaDaNotificare,
  promemoriaEventKey,
  promemoriaMessage,
  type PromemoriaRow,
} from "../../supabase/functions/_shared/promemoriaAlerts.ts";

const now = new Date("2026-11-17T10:00:00Z");
const row = (id: string, iso: string, stato = "da_fare"): PromemoriaRow => ({
  id, user_id: "u1", titolo: "Richiamare", descrizione: null, data_promemoria: iso, cliente_id: null, stato,
});

describe("notifiche promemoria", () => {
  it("notifica solo i promemoria da fare arrivati all'ora, entro 24 ore", () => {
    const due = promemoriaDaNotificare([
      row("ora", "2026-11-17T10:00:00Z"),
      row("passato", "2026-11-17T09:55:00Z"),
      row("futuro", "2026-11-17T10:05:00Z"),
      row("fatto", "2026-11-17T09:00:00Z", "fatto"),
      row("vecchio", "2026-11-15T09:00:00Z"),
    ], now);
    expect(due.map((d) => d.id)).toEqual(["ora", "passato"]);
  });

  it("push solo se recente, altrimenti nel centro notifiche senza suono", () => {
    const [recente, arretrato] = promemoriaDaNotificare([
      row("a", "2026-11-17T09:30:00Z"),
      row("b", "2026-11-17T06:00:00Z"),
    ], now);
    expect(recente.push_mode).toBe("push");
    expect(arretrato.push_mode).toBe("silenzioso");
  });

  it("rinviare un promemoria genera una nuova notifica", () => {
    const k1 = promemoriaEventKey({ id: "p1", data_promemoria: "2026-11-17T09:00:00+00:00" });
    const k2 = promemoriaEventKey({ id: "p1", data_promemoria: "2026-11-18T09:00:00+00:00" });
    expect(k1).toBe("promemoria:p1:2026-11-17T09:00:00.000Z");
    expect(k1).not.toBe(k2);
    // Stesso istante con formati diversi → stessa chiave (niente doppioni).
    expect(promemoriaEventKey({ id: "p1", data_promemoria: "2026-11-17T10:00:00+01:00" })).toBe(k1);
  });

  it("testo del messaggio", () => {
    expect(promemoriaMessage({ titolo: "Richiamare", descrizione: null })).toEqual({ titolo: "Promemoria", testo: "Richiamare" });
    expect(promemoriaMessage({ titolo: "Richiamare", descrizione: "listino" }, "Bar Roma")).toEqual({
      titolo: "Promemoria · Bar Roma",
      testo: "Richiamare — listino",
    });
  });
});
