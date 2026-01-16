import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Printer, X, Download, Loader2, Gift } from "lucide-react";
import agencyLogo from "@/assets/agency-logo.jpg";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type RigaOrdine = {
  prodotto_codice?: string;
  prodotto_nome: string;
  prezzo_unitario: number;
  quantita_pezzi: number;
  quantita_cartoni: number;
  pezzi_per_cartone: number;
  sc1?: number;
  sc2?: number;
  sc3?: number;
  promo_applicata?: string;
  promo_tipo?: string;
  promo_valore?: number;
};

type PromoApplicata = {
  nome: string;
  tipo: string;
  valore: number;
};

type ProformaData = {
  codice: string;
  created_at: string;
  cliente_nome: string;
  cliente_indirizzo?: string;
  cliente_citta?: string;
  cliente_cap?: string;
  cliente_piva?: string;
  azienda_nome: string;
  azienda_indirizzo?: string;
  azienda_citta?: string;
  tipo_pagamento: string;
  sconto: number;
  sconto_merce: number;
  totale: number;
  note?: string;
  righe: RigaOrdine[];
  promozioni_applicate?: PromoApplicata[];
};

type ProformaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ProformaData | null;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);

export function ProformaDialog({ open, onOpenChange, data }: ProformaDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (!contentRef.current) return;
    
    setIsExporting(true);
    try {
      const element = contentRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;
      
      pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`Proforma_${data.codice}.pdf`);
    } catch (error) {
      console.error("Error exporting PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate subtotals with cascading discounts - pieces auto-calculated from cartons
  const subtotale = data.righe.reduce((sum, riga) => {
    const pezziTotali = riga.quantita_cartoni * riga.pezzi_per_cartone;
    const sc1 = riga.sc1 || 0;
    const sc2 = riga.sc2 || 0;
    const sc3 = riga.sc3 || 0;
    // Cascading discount calculation
    const prezzo1 = riga.prezzo_unitario * (1 - sc1 / 100);
    const prezzo2 = prezzo1 * (1 - sc2 / 100);
    const prezzoNetto = prezzo2 * (1 - sc3 / 100);
    return sum + pezziTotali * prezzoNetto;
  }, 0);

  const scontoPercentuale = subtotale * (data.sconto / 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible print:shadow-none print:border-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>Proforma Ordine</DialogTitle>
        </DialogHeader>

        {/* Printable Content */}
        <div ref={contentRef} className="proforma-content space-y-6 p-4 bg-white text-black print:p-8">
          {/* Header with Logo */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <img 
                src={agencyLogo} 
                alt="Mazzi Group" 
                className="h-16 w-auto object-contain"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900">MAZZI GROUP</h1>
                <p className="text-sm text-gray-600">Agenzia di Rappresentanza</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-semibold text-blue-600">PROFORMA</h2>
              <p className="text-sm font-mono text-gray-700">{data.codice}</p>
              <p className="text-sm text-gray-600">
                {format(new Date(data.created_at), "dd MMMM yyyy", { locale: it })}
              </p>
            </div>
          </div>

          <Separator className="bg-gray-200" />

          {/* Client and Company Info */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-gray-500">Cliente</h3>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-semibold text-gray-900">{data.cliente_nome}</p>
                {data.cliente_indirizzo && (
                  <p className="text-sm text-gray-600">{data.cliente_indirizzo}</p>
                )}
                {(data.cliente_cap || data.cliente_citta) && (
                  <p className="text-sm text-gray-600">
                    {data.cliente_cap} {data.cliente_citta}
                  </p>
                )}
                {data.cliente_piva && (
                  <p className="text-sm text-gray-600">P.IVA: {data.cliente_piva}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-gray-500">Fornitore</h3>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-semibold text-gray-900">{data.azienda_nome}</p>
                {data.azienda_indirizzo && (
                  <p className="text-sm text-gray-600">{data.azienda_indirizzo}</p>
                )}
                {data.azienda_citta && (
                  <p className="text-sm text-gray-600">{data.azienda_citta}</p>
                )}
              </div>
            </div>
          </div>

          {/* Order Details Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-semibold text-gray-900 text-xs">C.P</TableHead>
                  <TableHead className="font-semibold text-gray-900 text-xs">Prodotto</TableHead>
                  <TableHead className="text-right font-semibold text-gray-900 text-xs">Prezzo</TableHead>
                  <TableHead className="text-center font-semibold text-gray-900 text-xs">Sc.1</TableHead>
                  <TableHead className="text-center font-semibold text-gray-900 text-xs">Sc.2</TableHead>
                  <TableHead className="text-center font-semibold text-gray-900 text-xs">Sc.3</TableHead>
                  <TableHead className="text-center font-semibold text-gray-900 text-xs">Cart.</TableHead>
                  <TableHead className="text-center font-semibold text-gray-900 text-xs">Tot. Pz</TableHead>
                  <TableHead className="text-right font-semibold text-gray-900 text-xs">Subtot.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.righe.map((riga, idx) => {
                  const pezziTotali = riga.quantita_cartoni * riga.pezzi_per_cartone;
                  const sc1 = riga.sc1 || 0;
                  const sc2 = riga.sc2 || 0;
                  const sc3 = riga.sc3 || 0;
                  // Cascading discount
                  const prezzo1 = riga.prezzo_unitario * (1 - sc1 / 100);
                  const prezzo2 = prezzo1 * (1 - sc2 / 100);
                  const prezzoNetto = prezzo2 * (1 - sc3 / 100);
                  const rigaSubtotale = pezziTotali * prezzoNetto;
                  return (
                    <TableRow key={idx} className="border-b border-gray-100">
                      <TableCell className="py-2 text-xs text-gray-600">
                        {riga.prodotto_codice || "—"}
                      </TableCell>
                      <TableCell className="py-2">
                        <p className="font-medium text-gray-900 text-sm">{riga.prodotto_nome}</p>
                        <p className="text-xs text-gray-500">{riga.pezzi_per_cartone} pz/cart</p>
                        {riga.promo_applicata && (
                          <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                            <Gift className="h-3 w-3" />
                            {riga.promo_applicata}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-2">
                        <span className="text-gray-700 text-sm">{formatCurrency(riga.prezzo_unitario)}</span>
                      </TableCell>
                      <TableCell className="text-center text-gray-700 text-sm py-2">
                        {sc1 > 0 ? `${sc1}%` : "—"}
                      </TableCell>
                      <TableCell className="text-center text-gray-700 text-sm py-2">
                        {sc2 > 0 ? `${sc2}%` : "—"}
                      </TableCell>
                      <TableCell className="text-center text-gray-700 text-sm py-2">
                        {sc3 > 0 ? `${sc3}%` : "—"}
                      </TableCell>
                      <TableCell className="text-center text-gray-700 text-sm py-2">{riga.quantita_cartoni}</TableCell>
                      <TableCell className="text-center font-medium text-gray-900 text-sm py-2">{pezziTotali}</TableCell>
                      <TableCell className="text-right font-semibold text-gray-900 text-sm py-2">{formatCurrency(rigaSubtotale)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-80 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotale Netto:</span>
                <span className="font-medium text-gray-900">{formatCurrency(subtotale)}</span>
              </div>
              {data.sconto > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sconto Documento ({data.sconto}%):</span>
                  <span className="font-medium text-red-600">-{formatCurrency(scontoPercentuale)}</span>
                </div>
              )}
              {data.sconto_merce > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sconto Merce:</span>
                  <span className="font-medium text-red-600">-{formatCurrency(data.sconto_merce)}</span>
                </div>
              )}
              <Separator className="bg-gray-300" />
              <div className="flex justify-between text-lg">
                <span className="font-semibold text-gray-900">Totale:</span>
                <span className="font-bold text-blue-600">{formatCurrency(data.totale)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Pagamento:</span>
                <span className="font-medium text-gray-900">{data.tipo_pagamento}</span>
              </div>
            </div>
          </div>

          {/* Promozioni Applicate */}
          {data.promozioni_applicate && data.promozioni_applicate.length > 0 && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="h-4 w-4 text-green-600" />
                <h3 className="text-xs font-semibold uppercase text-green-700">Promozioni Applicate</h3>
              </div>
              <div className="space-y-1">
                {data.promozioni_applicate.map((promo, idx) => (
                  <p key={idx} className="text-sm text-green-700">
                    <span className="font-medium">{promo.nome}</span>
                    <span className="text-green-600 ml-2">
                      ({promo.tipo === "sconto_percentuale" ? `${promo.valore}%` : `€${promo.valore}`} come da promo canvass)
                    </span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {data.note && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Note</h3>
              <p className="text-sm text-gray-700">{data.note}</p>
            </div>
          )}
        </div>

        <DialogFooter className="print:hidden gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Chiudi
          </Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Salva PDF
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Stampa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
