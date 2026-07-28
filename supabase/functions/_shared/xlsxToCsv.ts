// Converte un allegato Excel (.xlsx/.xls) in testo CSV, così può essere
// passato a parse-order-multi come `sheetText` (la stessa funzione, quando
// chiamata dal frontend, riceve già testo pronto perché lì la conversione la
// fa il browser con SheetJS; qui, lato server, non c'è un browser).
//
// Nuova dipendenza Deno-side per questa sola funzione: npm:xlsx (SheetJS).
// Non tocca il frontend/package.json.
import * as XLSX from "npm:xlsx@0.18.5";

export function xlsxBytesToSheetText(bytes: Uint8Array, maxSheets = 3): string {
  const wb = XLSX.read(bytes, { type: "array" });
  const sheetNames = wb.SheetNames.slice(0, maxSheets);
  return sheetNames
    .map((name) => {
      const sheet = wb.Sheets[name];
      const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
      return `--- Foglio: ${name} ---\n${csv}`;
    })
    .join("\n\n");
}
