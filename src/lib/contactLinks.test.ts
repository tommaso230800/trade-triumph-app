import { describe, expect, it } from "vitest";
import { normalizePhone, telHref, whatsappHref } from "./contactLinks";

describe("contactLinks", () => {
  it("normalizza cellulari e fissi italiani", () => {
    expect(normalizePhone("333 123 4567")).toBe("393331234567");
    expect(normalizePhone("055/123456")).toBe("39055123456");
    expect(normalizePhone("+39 333 1234567")).toBe("393331234567");
    expect(normalizePhone("0039 333 1234567")).toBe("393331234567");
  });

  it("ignora valori vuoti o non validi", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone("n/d")).toBeNull();
    expect(telHref("12")).toBeNull();
  });

  it("WhatsApp solo per cellulari o numeri esteri", () => {
    expect(whatsappHref("333 1234567")).toBe("https://wa.me/393331234567");
    expect(whatsappHref("055 123456")).toBeNull();
    expect(whatsappHref("+41 79 123 45 67")).toBe("https://wa.me/41791234567");
    expect(telHref("055 123456")).toBe("tel:+39055123456");
  });
});
