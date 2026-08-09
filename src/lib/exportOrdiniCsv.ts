import { format } from "date-fns";
import type { Ordine } from "@/hooks/useOrdini";

export const ORDINI_EXPORT_STATUS_LABEL: Record<Ordine["status"], string> = {
  in_attesa: "In attesa",
  spedito: "Spedito",
  completato: "Completato",
  annullato: "Annullato",
  stand_by: "Stand-by",
};

const csvEscape = (v: unknown) => {
  const s = String(v ?? "");
  return s.includes(";") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportOrdiniToCSV(ordini: Ordine[]) {
  const header = ["Codice", "Data", "Cliente", "Azienda", "Totale", "Stato", "Verificato"];
  const rows = ordini.map((o) => [
    o.codice,
    o.data_ordine ? format(new Date(o.data_ordine), "dd/MM/yyyy") : "",
    o.clienti?.nome || "",
    o.aziende?.nome || "",
    Number(o.totale).toFixed(2).replace(".", ","),
    ORDINI_EXPORT_STATUS_LABEL[o.status],
    o.verificato_conferma ? "Sì" : "No",
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(";")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ordini_selezionati_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
