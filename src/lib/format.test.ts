import { describe, expect, it } from "vitest";
import { formatEuro, formatEuroInt, formatNumber, formatPercent } from "./format";

describe("format", () => {
  it("euro con migliaia anche a 4 cifre", () => {
    expect(formatEuro(12450.8)).toBe("12.450,80 €");
    expect(formatEuro(4788)).toBe("4.788,00 €");
    expect(formatEuro(0.5)).toBe("0,50 €");
    expect(formatEuro(-1234.567)).toBe("-1.234,57 €");
    expect(formatEuro(1234567.891)).toBe("1.234.567,89 €");
  });

  it("euro intero", () => {
    expect(formatEuroInt(12450.8)).toBe("12.451 €");
    expect(formatEuroInt(-0.4)).toBe("0 €");
  });

  it("valori mancanti diventano N/D", () => {
    expect(formatEuro(null)).toBe("N/D");
    expect(formatEuro(undefined)).toBe("N/D");
    expect(formatEuro(Number.NaN)).toBe("N/D");
    expect(formatPercent(Number.POSITIVE_INFINITY)).toBe("N/D");
  });

  it("numeri e percentuali", () => {
    expect(formatNumber(1234)).toBe("1.234");
    expect(formatNumber(2.345, 2)).toBe("2,35");
    expect(formatPercent(12.345)).toBe("12,3%");
    expect(formatPercent(12.345, 1, { signed: true })).toBe("+12,3%");
    expect(formatPercent(-4, 1, { signed: true })).toBe("-4,0%");
    expect(formatPercent(0, 1, { signed: true })).toBe("0,0%");
  });
});
