// Contratto condiviso tra l'edge function parse-order-multi e TUTTI i suoi
// client (VerificaConfermaDialog, MultiFileImportDialog, ecc.).
//
// Un solo file, importato sia da Deno (l'edge function, via import relativo
// con estensione .ts) sia dal frontend Vite (stesso file, path relativo):
// nessuna duplicazione, nessun secondo posto da tenere sincronizzato. È
// puro TypeScript (solo tipi + una funzione banale), quindi non usa API né
// di Deno né del browser — può vivere in entrambi i mondi.
//
// Prima di questo file il contratto non era tipizzato: un nome di campo
// sbagliato in un client (es. "ordini" invece di "orders") non veniva
// segnalato da nessuna parte e si scopriva solo in produzione, con
// "Analisi documento in corso..." seguito da un errore sempre uguale.
// Ora un errore del genere è un errore di compilazione.

export type ParseOrderMultiRigaConfidence = "high" | "medium" | "low";

export type ParseOrderMultiRigaUnita = "cartoni" | "pezzi" | "pallet" | "confezioni" | "sconosciuta";

export interface ParseOrderMultiRiga {
  codice_prodotto: string | null;
  nome_prodotto: string;
  quantita_cartoni: number;
  pezzi_per_cartone: number;
  prezzo_per_cartone: number;
  sc1: number;
  sc2: number;
  sc3: number;
  is_omaggio: boolean;
  importo_riga: number;
  confidence: ParseOrderMultiRigaConfidence;
  warning: string | null;
  unita_originale: ParseOrderMultiRigaUnita;
}

export interface ParseOrderMultiOrdine {
  data_ordine: string | null;
  cliente_nome: string | null;
  azienda_nome: string | null;
  tipo_pagamento: string | null;
  sconto_pagamento_percentuale: number;
  sconto_merce: number;
  imponibile_totale: number;
  note: string | null;
  warnings: string[];
  righe: ParseOrderMultiRiga[];
}

export type ParseOrderMultiDocumentType = "order" | "price_list" | "promo" | "note" | "attachment";

export interface ParseOrderMultiParsed {
  document_type: ParseOrderMultiDocumentType;
  global_notes: string | null;
  // NOME REALE DEL CAMPO: "orders" (inglese), non "ordini". Questo è
  // esattamente il campo il cui nome sbagliato causava il bug.
  orders: ParseOrderMultiOrdine[];
}

export interface ParseOrderMultiSuccessBody {
  success: true;
  data: ParseOrderMultiParsed;
}

export interface ParseOrderMultiErrorBody {
  success?: false;
  error: string;
  raw?: string;
}

/** Body HTTP effettivo restituito dall'edge function: 200 -> successo, altrimenti errore. */
export type ParseOrderMultiResponseBody = ParseOrderMultiSuccessBody | ParseOrderMultiErrorBody;

export function isParseOrderMultiSuccess(
  body: ParseOrderMultiResponseBody | null | undefined
): body is ParseOrderMultiSuccessBody {
  return !!body && (body as ParseOrderMultiSuccessBody).success === true;
}
