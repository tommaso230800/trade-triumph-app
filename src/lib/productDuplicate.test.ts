import { describe, expect, it } from "vitest";
import { findProductDuplicate } from "./productDuplicate";

const products = [
  { id: "1", nome: "Acqua Naturale", codice: "AN50", formato: "0,5L", azienda_id: "az1" },
  { id: "2", nome: "Acqua Frizzante", codice: null, formato: "0,5L", azienda_id: "az1" },
  { id: "3", nome: "Acqua Naturale", codice: "AN50", formato: "1L", azienda_id: "az2" },
];

describe("findProductDuplicate", () => {
  it("rileva lo stesso codice articolo nella stessa azienda", () => {
    const dup = findProductDuplicate(products, { nome: "Altro", codice: " an50 " }, "az1");
    expect(dup?.id).toBe("1");
  });

  it("rileva stesso nome e formato nella stessa azienda", () => {
    const dup = findProductDuplicate(products, { nome: "acqua  frizzante", formato: "0,5L" }, "az1");
    expect(dup?.id).toBe("2");
  });

  it("non segnala duplicati in aziende diverse", () => {
    expect(findProductDuplicate(products, { nome: "Acqua Naturale", codice: "AN50" }, "az3")).toBeNull();
    expect(findProductDuplicate(products, { nome: "Acqua Naturale", formato: "0,5L" }, "az2")).toBeNull();
  });

  it("nome uguale ma formato diverso non è duplicato", () => {
    expect(findProductDuplicate(products, { nome: "Acqua Naturale", formato: "1L" }, "az1")).toBeNull();
  });

  it("codice vuoto non genera duplicati", () => {
    expect(findProductDuplicate([{ id: "9", nome: "X", codice: "", formato: null, azienda_id: "az1" }], { nome: "Y", codice: "" }, "az1")).toBeNull();
  });
});
