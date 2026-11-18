/**
 * Riconosce le righe di RIEPILOGO CONTABILE che l'AI può leggere come articoli
 * (es. "Imponibile IVA", "Imponibile Premi", "Imponibile Provvigioni", "Totale",
 * "Spese trasporto"). Serve solo a NON proporle come nuovi prodotti: l'utente
 * può comunque scegliere diversamente. Nessun dato esistente viene toccato.
 */
const RIEPILOGO = new RegExp(
  "^\\s*(" +
    [
      "imponibil[ei]",
      "totale",
      "tot\\.",
      "sub\\s*-?\\s*totale",
      "iva\\b",
      "imposta",
      "aliquota",
      "sconto( |$)",
      "abbuono",
      "arrotondament",
      "spese\\b",
      "trasporto\\b",
      "contributo\\b",
      "cauzion",
      "acconto",
      "netto( a pagare)?$",
      "da pagare",
      "provvigion",
      "premi\\b",
      "enasarco",
      "ritenuta",
      "bollo",
      "riepilogo",
      "scadenz",
    ].join("|") +
    ")",
  "i",
);

export function isRigaRiepilogo(nome: string | null | undefined, codice?: string | null): boolean {
  const n = (nome ?? "").trim();
  if (!n) return false;
  // Un codice articolo vero rende molto improbabile un riepilogo.
  if (codice && String(codice).trim()) return false;
  return RIEPILOGO.test(n);
}
