import { describe, expect, it } from "vitest";
import { computeOwnerAlerts, reorderEventKey, reorderMessage } from "../../supabase/functions/_shared/reorderAlerts.ts";
import { classifyPushStatus } from "../../supabase/functions/_shared/pushRules.ts";
import { resolvePushState } from "./webPush";

const order = (id: string, data: string, extra: Record<string, unknown> = {}) => ({
  id, cliente_id: "c1", azienda_id: "a1", data_ordine: data, status: "completato", totale: 100, note: null, deleted_at: null, ...extra,
});

describe("riordino in ritardo", () => {
  it("un cliente che ordina ogni cinque mesi non è in ritardo dopo trenta giorni", () => {
    const orders = [order("o1", "2026-01-05"), order("o2", "2026-06-05")];
    expect(computeOwnerAlerts("owner", orders, "2026-07-06", 6).alerts).toHaveLength(0);
  });

  it("segnala la coppia cliente–azienda quando supera frequenza + tolleranza", () => {
    const orders = [order("o1", "2026-01-01"), order("o2", "2026-01-31"), order("o3", "2026-03-02"), order("x", "2026-03-01", { azienda_id: "a2" })];
    const { alerts } = computeOwnerAlerts("owner", orders, "2026-04-15", 6);
    expect(alerts.map(a => `${a.cliente_id}|${a.azienda_id}`)).toEqual(["c1|a1"]);
    expect(alerts[0].event_key).toBe(reorderEventKey("c1", "a1", "2026-03-02"));
  });

  it("con storico insufficiente non inventa una scadenza", () => {
    const res = computeOwnerAlerts("owner", [order("o1", "2026-02-01")], "2026-11-01", 6);
    expect(res.alerts).toHaveLength(0);
    expect(res.insufficienti).toBe(1);
  });

  it("un nuovo ordine valido apre un nuovo ciclo con una chiave diversa", () => {
    expect(reorderEventKey("c1", "a1", "2026-03-02")).not.toBe(reorderEventKey("c1", "a1", "2026-04-20"));
    expect(reorderEventKey("c1", "a1", "2026-03-02")).toBe(reorderEventKey("c1", "a1", "2026-03-02T00:00:00"));
  });

  it("testo dell’avviso nel formato richiesto", () => {
    const m = reorderMessage("Ingrocarico", "Casoni", { giorni_ritardo: 12, ultimo_ordine_data: "2026-09-29" });
    expect(m.titolo).toBe("Riordino in ritardo · Ingrocarico · Casoni");
    expect(m.testo).toBe("Ingrocarico ha superato di 12 giorni la data prevista per il riordino con Casoni. Ultimo ordine: 29/09/2026.");
  });
});

describe("esito invio push", () => {
  it("distingue accettata, iscrizione scaduta, da riprovare e fallita", () => {
    expect(classifyPushStatus(201)).toBe("accettata");
    expect(classifyPushStatus(410)).toBe("scaduta");
    expect(classifyPushStatus(404)).toBe("scaduta");
    expect(classifyPushStatus(429)).toBe("riprova");
    expect(classifyPushStatus(503)).toBe("riprova");
    expect(classifyPushStatus(400)).toBe("fallita");
  });
});

describe("stato notifiche del dispositivo", () => {
  const base = { ios: false, standalone: false, supported: true, iframe: false, permission: "default" as NotificationPermission, subscribed: false };
  it("iPhone fuori dalla schermata Home richiede l’installazione", () => {
    expect(resolvePushState({ ...base, ios: true, supported: false })).toBe("installazione_necessaria");
  });
  it("mostra permesso da concedere, bloccate, attive e non supportata", () => {
    expect(resolvePushState(base)).toBe("da_concedere");
    expect(resolvePushState({ ...base, permission: "denied" })).toBe("bloccate");
    expect(resolvePushState({ ...base, permission: "granted", subscribed: true })).toBe("attive");
    expect(resolvePushState({ ...base, supported: false })).toBe("non_supportata");
  });
});
