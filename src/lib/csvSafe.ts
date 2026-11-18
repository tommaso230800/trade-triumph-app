// Spreadsheet apps execute cells starting with = + - @ (or tab / carriage
// return) as formulas. Text coming from user-entered data (customer and
// company names, codes, notes) is prefixed with an apostrophe so it is shown
// as plain text. Plain numbers such as "-12.50" or "-12,50" stay numeric.
const FORMULA_START = /^[=+\-@\t\r]/;
const PLAIN_NUMBER = /^-?\d+([.,]\d+)?$/;

export function neutralizeCsvFormula(value: unknown): string {
  const s = String(value ?? "");
  if (typeof value === "number") return s;
  if (FORMULA_START.test(s) && !PLAIN_NUMBER.test(s)) return `'${s}`;
  return s;
}

/** Neutralizes formulas and quotes the cell when it contains the separator, quotes or new lines. */
export function csvCell(value: unknown, separator = ";", alwaysQuote = false): string {
  const s = neutralizeCsvFormula(value);
  if (alwaysQuote || s.includes(separator) || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
