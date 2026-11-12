import { describe, expect, it } from "vitest";
import { addRecipient, defaultRecipients, isValidEmail, suggestRecipients, type EmailContact } from "./recipients";

const c = (id: string, azienda: string, nome: string, email: string, over: Partial<EmailContact> = {}): EmailContact => ({ id, azienda_id: azienda, nome, email, ruolo: null, default_to: false, default_cc: false, ...over });
const contacts = [
  c("1", "A", "Lorella Maggi", "lorella.maggi@cantine.it", { default_to: true }),
  c("2", "A", "Angelo Cattivelli", "angelo@cantine.it", { default_cc: true }),
  c("3", "B", "Laura Bianchi", "laura@altra.it"),
];

describe("suggerimenti destinatari", () => {
  it("propone già dalla prima lettera, prima i contatti dell'azienda dell'ordine", () => {
    const s = suggestRecipients(contacts, "l", "A", []);
    expect(s.map((x) => x.id)).toEqual(["1", "3"]);
  });
  it("cerca anche nell'indirizzo", () => {
    expect(suggestRecipients(contacts, "altra", "A", []).map((x) => x.id)).toEqual(["3"]);
  });
  it("esclude indirizzi già presenti in A o CC", () => {
    expect(suggestRecipients(contacts, "l", "A", ["LORELLA.MAGGI@cantine.it"]).map((x) => x.id)).toEqual(["3"]);
  });
  it("nessun suggerimento senza testo", () => expect(suggestRecipients(contacts, "", "A", [])).toEqual([]));
});

describe("duplicati e predefiniti", () => {
  it("blocca lo stesso indirizzo due volte nello stesso campo", () => {
    expect(addRecipient(["a@b.it"], [], "A@B.it").duplicate).toBe("same");
  });
  it("blocca lo stesso indirizzo in A e CC", () => {
    expect(addRecipient([], ["a@b.it"], "a@b.it").duplicate).toBe("other");
  });
  it("carica A e CC predefiniti solo dell'azienda dell'ordine", () => {
    expect(defaultRecipients(contacts, "A")).toEqual({ to: ["lorella.maggi@cantine.it"], cc: ["angelo@cantine.it"] });
    expect(defaultRecipients(contacts, "B")).toEqual({ to: [], cc: [] });
  });
  it("una lettera sola non è un indirizzo valido", () => {
    expect(isValidEmail("l")).toBe(false);
    expect(isValidEmail("lorella@cantine.it")).toBe(true);
  });
});
