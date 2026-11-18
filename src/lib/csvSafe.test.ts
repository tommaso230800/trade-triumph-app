import { describe, expect, it } from "vitest";
import { csvCell, neutralizeCsvFormula } from "./csvSafe";

describe("csvSafe", () => {
  it("neutralizes formula-like text", () => {
    expect(neutralizeCsvFormula("=HYPERLINK(\"x\")")).toBe("'=HYPERLINK(\"x\")");
    expect(neutralizeCsvFormula("+cmd")).toBe("'+cmd");
    expect(neutralizeCsvFormula("-2+3")).toBe("'-2+3");
    expect(neutralizeCsvFormula("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(neutralizeCsvFormula("\tx")).toBe("'\tx");
  });
  it("keeps plain numbers and ordinary text", () => {
    expect(neutralizeCsvFormula("-12,50")).toBe("-12,50");
    expect(neutralizeCsvFormula("-12.50")).toBe("-12.50");
    expect(neutralizeCsvFormula(-3)).toBe("-3");
    expect(neutralizeCsvFormula("Bar Rossi")).toBe("Bar Rossi");
    expect(neutralizeCsvFormula(null)).toBe("");
  });
  it("quotes cells when needed", () => {
    expect(csvCell("a;b")).toBe('"a;b"');
    expect(csvCell('=1;"x"')).toBe('"\'=1;""x"""');
    expect(csvCell("a,b", ",")).toBe('"a,b"');
    expect(csvCell("x", ";", true)).toBe('"x"');
  });
});
