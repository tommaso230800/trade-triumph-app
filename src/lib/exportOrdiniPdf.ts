import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { Ordine } from "@/hooks/useOrdini";
import { formatCurrency } from "@/components/ordini/ordiniShared";
import { ORDINI_EXPORT_STATUS_LABEL } from "./exportOrdiniCsv";

// File separato da exportOrdiniCsv.ts e caricato solo su richiesta (import
// dinamico dal chiamante): jsPDF + jspdf-autotable pesano ~460kB, non ha
// senso scaricarli visitando la pagina Ordini se poi non si esporta mai in PDF.
export function exportOrdiniToPDF(ordini: Ordine[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("Ordini selezionati", 14, 15);
  doc.setFontSize(9);
  doc.text(`Generato: ${format(new Date(), "dd/MM/yyyy HH:mm")} · ${ordini.length} ordini`, 14, 22);
  autoTable(doc, {
    startY: 28,
    head: [["Codice", "Data", "Cliente", "Azienda", "Totale", "Stato", "Verificato"]],
    body: ordini.map((o) => [
      o.codice,
      o.data_ordine ? format(new Date(o.data_ordine), "dd/MM/yy") : "—",
      o.clienti?.nome || "—",
      o.aziende?.nome || "—",
      formatCurrency(Number(o.totale)),
      ORDINI_EXPORT_STATUS_LABEL[o.status],
      o.verificato_conferma ? "Sì" : "No",
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [42, 45, 52] },
  });
  doc.save(`ordini_selezionati_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);
}
