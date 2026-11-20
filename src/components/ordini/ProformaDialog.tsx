import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Printer, X, Download, Loader2, Gift, Send } from "lucide-react";
import agencyLogo from "@/assets/agency-logo.jpg";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { parseLocalDate } from "@/lib/periodRange";
import { OrderEmailComposer, OrderEmailHistory, type PreparedOrderEmail } from "./OrderEmailComposer";
import { useOrderEmailHistory } from "@/hooks/useOrderEmail";
import { loadOrderEmailSnapshot } from "@/lib/orderEmailSnapshot";
import { toast } from "sonner";
import { orderTotals } from "@/lib/orderTotals";
import { formatEuro } from "@/lib/format";

export type ProformaRigaOrdine = {
  prodotto_codice?: string;
  prodotto_nome: string;
  prodotto_brand?: string;
  prezzo_unitario: number;
  quantita_pezzi: number;
  quantita_cartoni: number;
  pezzi_per_cartone: number;
  sc1?: number;
  sc2?: number;
  sc3?: number;
  is_omaggio?: boolean;
  promo_applicata?: string;
  promo_tipo?: string;
  promo_valore?: number;
};

export type PromoApplicata = {
  nome: string;
  tipo: string;
  valore: number;
};

export type ProformaData = {
  ordine_id?: string;
  azienda_id?: string | null;
  codice: string;
  created_at: string;
  data_ordine?: string | null;
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
  condizioni_commerciali?: string | null;
  data_consegna_prevista?: string | null;
  destinazione_consegna?: string | null;
  note_consegna?: string | null;
  righe: ProformaRigaOrdine[];
  promozioni_applicate?: PromoApplicata[];
};

type ProformaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ProformaData | null;
};

const formatCurrency = (value: number) =>
  formatEuro(value);

export function ProformaDialog({ open, onOpenChange, data: originalData }: ProformaDialogProps) {
  const [freshData, setFreshData] = useState<ProformaData | null>(null);
  const [prepared, setPrepared] = useState<PreparedOrderEmail | null>(null);
  const [preparing, setPreparing] = useState(false);
  const data = freshData ?? originalData;
  const history = useOrderEmailHistory(originalData?.ordine_id);
  useEffect(() => { setFreshData(null); setPrepared(null); }, [originalData, open]);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!data) return null;

  const dataOrdine = parseLocalDate(data.data_ordine) ?? new Date(data.created_at);

  const handlePrint = () => {
    window.print();
  };

  const CAPTURE_WIDTH = 1000;

  const generatePDF = async () => {
    if (!contentRef.current) return;

    setIsExporting(true);
    const element = contentRef.current;
    const originalStyle = {
      position: element.style.position,
      left: element.style.left,
      top: element.style.top,
      width: element.style.width,
      zIndex: element.style.zIndex,
    };

    try {
      // Larghezza fissa fuori schermo: il PDF risulta identico da desktop e da mobile,
      // indipendentemente dalla larghezza reale del dialog sul dispositivo.
      element.style.position = "fixed";
      element.style.top = "0";
      element.style.left = "-9999px";
      element.style.width = `${CAPTURE_WIDTH}px`;
      element.style.zIndex = "-1";

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        windowWidth: CAPTURE_WIDTH,
      });

      // JPEG ad alta qualità invece di PNG: stesso aspetto, file molte volte più
      // leggero → PDF, caricamento e invio email molto più rapidi (anche in 4G).
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(imgData, "JPEG", imgX, imgY, imgWidth * ratio, imgHeight * ratio, undefined, "FAST");
      return pdf;
    } catch (error) {
      console.error("Error exporting PDF:", error);
      throw error;
    } finally {
      element.style.position = originalStyle.position;
      element.style.top = originalStyle.top;
      element.style.left = originalStyle.left;
      element.style.width = originalStyle.width;
      element.style.zIndex = originalStyle.zIndex;
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try { const pdf = await generatePDF(); pdf?.save(`Proforma_${data.codice}.pdf`); }
    catch { toast.error("Impossibile generare il PDF. Riprova."); }
  };
  const prepareEmail = async () => {
    if (!data.ordine_id || preparing) return;
    setPreparing(true);
    try {
      const snapshot = await loadOrderEmailSnapshot(data.ordine_id);
      setFreshData(snapshot.data);
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const pdf = await generatePDF();
      if (!pdf) throw new Error("PDF non disponibile");
      setPrepared({ ...snapshot, pdf: pdf.output('blob'), filename: `Proforma_${snapshot.data.codice.replace(/[^A-Za-z0-9_-]/g, '_')}.pdf` });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Preparazione email non riuscita"); }
    finally { setPreparing(false); }
  };

  // Calculate subtotals with cascading discounts - pieces auto-calculated from cartons
  const subtotale = data.righe.reduce((sum, riga) => {
    if (riga.is_omaggio) return sum;
    const pezziTotali = (Number(riga.quantita_pezzi) || 0) + riga.quantita_cartoni * riga.pezzi_per_cartone;
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
  const qty = orderTotals(data.righe);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible print:shadow-none print:border-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>Proforma Ordine</DialogTitle>
        </DialogHeader>

        {/* Printable Content */}
        <div ref={contentRef} className="light proforma-content space-y-6 rounded-lg bg-white p-4 text-black print:p-8">
          {/* Header with Logo */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <img 
                src={agencyLogo} 
                alt="Mazzi Group" 
                className="h-16 w-auto object-contain"
              />
              <div>
                <h1 className="text-xl font-bold text-foreground">MAZZI GROUP</h1>
                <p className="text-sm text-muted-foreground">Agenzia di Rappresentanza</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-base font-semibold text-primary">PROFORMA</h2>
              <p className="text-sm font-mono text-foreground">{data.codice}</p>
              <p className="text-sm text-muted-foreground">
                {format(dataOrdine, "dd MMMM yyyy", { locale: it })}
              </p>
            </div>
          </div>

          <Separator className="bg-muted" />

          {/* Client and Company Info */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">Cliente</h3>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="font-semibold text-foreground">{data.cliente_nome}</p>
                {data.cliente_indirizzo && (
                  <p className="text-sm text-muted-foreground">{data.cliente_indirizzo}</p>
                )}
                {(data.cliente_cap || data.cliente_citta) && (
                  <p className="text-sm text-muted-foreground">
                    {data.cliente_cap} {data.cliente_citta}
                  </p>
                )}
                {data.cliente_piva && (
                  <p className="text-sm text-muted-foreground">P.IVA: {data.cliente_piva}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">Fornitore</h3>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="font-semibold text-foreground">{data.azienda_nome}</p>
                {data.azienda_indirizzo && (
                  <p className="text-sm text-muted-foreground">{data.azienda_indirizzo}</p>
                )}
                {data.azienda_citta && (
                  <p className="text-sm text-muted-foreground">{data.azienda_citta}</p>
                )}
              </div>
            </div>
          </div>

          {/* Order Details Table */}
          <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="font-semibold text-foreground text-xs">C.P</TableHead>
                  <TableHead className="font-semibold text-foreground text-xs">Prodotto</TableHead>
                  <TableHead className="font-semibold text-foreground text-xs">Marchio</TableHead>
                  <TableHead className="text-right font-semibold text-foreground text-xs">Prezzo</TableHead>
                  <TableHead className="text-center font-semibold text-foreground text-xs">Sc.1</TableHead>
                  <TableHead className="text-center font-semibold text-foreground text-xs">Sc.2</TableHead>
                  <TableHead className="text-center font-semibold text-foreground text-xs">Sc.3</TableHead>
                  <TableHead className="text-center font-semibold text-foreground text-xs">Cart.</TableHead>
                  <TableHead className="text-center font-semibold text-foreground text-xs">Tot. Pz</TableHead>
                  <TableHead className="text-right font-semibold text-foreground text-xs">Subtot.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.righe.map((riga, idx) => {
                  const pezziTotali = (Number(riga.quantita_pezzi) || 0) + riga.quantita_cartoni * riga.pezzi_per_cartone;
                  const sc1 = riga.sc1 || 0;
                  const sc2 = riga.sc2 || 0;
                  const sc3 = riga.sc3 || 0;
                  // Cascading discount
                  const prezzo1 = riga.prezzo_unitario * (1 - sc1 / 100);
                  const prezzo2 = prezzo1 * (1 - sc2 / 100);
                  const prezzoNetto = prezzo2 * (1 - sc3 / 100);
                  const rigaSubtotale = riga.is_omaggio ? 0 : pezziTotali * prezzoNetto;
                  return (
                    <TableRow key={idx} className={`border-b border-border ${riga.is_omaggio ? "bg-success/10" : ""}`}>
                      <TableCell className="py-2 text-xs text-muted-foreground">
                        {riga.prodotto_codice || "—"}
                      </TableCell>
                      <TableCell className="py-2">
                        <p className="font-medium text-foreground text-sm">
                          {riga.prodotto_nome}
                          {riga.is_omaggio && (
                            <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold uppercase px-2 py-0.5 rounded bg-success/10 text-success">
                              <Gift className="h-3 w-3" /> Omaggio
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{riga.pezzi_per_cartone} pz/cart</p>
                        {riga.promo_applicata && (
                          <p className="text-xs text-success font-medium mt-1 flex items-center gap-1">
                            <Gift className="h-3 w-3" />
                            {riga.promo_applicata}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-xs text-muted-foreground">
                        {riga.prodotto_brand || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums py-2">
                        <span className="text-foreground text-sm">
                          {riga.is_omaggio ? "—" : formatCurrency(riga.prezzo_unitario)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-foreground text-sm py-2">
                        {riga.is_omaggio ? "—" : sc1 > 0 ? `${sc1}%` : "—"}
                      </TableCell>
                      <TableCell className="text-center text-foreground text-sm py-2">
                        {riga.is_omaggio ? "—" : sc2 > 0 ? `${sc2}%` : "—"}
                      </TableCell>
                      <TableCell className="text-center text-foreground text-sm py-2">
                        {riga.is_omaggio ? "—" : sc3 > 0 ? `${sc3}%` : "—"}
                      </TableCell>
                      <TableCell className="text-center text-foreground text-sm py-2">{riga.quantita_cartoni}</TableCell>
                      <TableCell className="text-center font-medium text-foreground text-sm py-2">{pezziTotali}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums text-foreground text-sm py-2">
                        {riga.is_omaggio ? <span className="text-success">Omaggio</span> : formatCurrency(rigaSubtotale)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Cartoni e pezzi: stessi totali del modulo ordine */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Cartoni totali</p>
              <p className="text-2xl font-bold tabular-nums text-foreground">{qty.cartoni.toLocaleString("it-IT")}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Pezzi totali</p>
              <p className="text-2xl font-bold tabular-nums text-foreground">{qty.pezzi.toLocaleString("it-IT")}{!qty.completo && " *"}</p>
              {qty.pezziSfusi > 0 && <p className="text-xs text-muted-foreground">di cui {qty.pezziSfusi.toLocaleString("it-IT")} sfusi</p>}
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Omaggi</p>
              <p className="text-2xl font-bold tabular-nums text-foreground">{qty.omaggioCartoni.toLocaleString("it-IT")} <span className="text-sm font-medium">ct</span></p>
              <p className="text-xs text-muted-foreground">{qty.omaggioPezzi.toLocaleString("it-IT")} pz · da consegnare {qty.daConsegnarePezzi.toLocaleString("it-IT")} pz</p>
            </div>
          </div>
          {!qty.completo && <p className="text-xs text-muted-foreground">* Pezzi per cartone mancanti su {qty.righeSenzaConfezione} {qty.righeSenzaConfezione === 1 ? "riga" : "righe"}: il totale pezzi non è completo.</p>}

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-80 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotale Netto:</span>
                <span className="font-medium text-foreground">{formatCurrency(subtotale)}</span>
              </div>
              {data.sconto > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sconto Documento ({data.sconto}%):</span>
                  <span className="font-medium text-destructive">-{formatCurrency(scontoPercentuale)}</span>
                </div>
              )}
              {data.sconto_merce > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sconto Merce:</span>
                  <span className="font-medium text-destructive">-{formatCurrency(data.sconto_merce)}</span>
                </div>
              )}
              <Separator className="bg-muted-foreground" />
              <div className="flex justify-between text-lg">
                <span className="font-semibold text-foreground">Totale:</span>
                <span className="font-bold text-primary">{formatCurrency(data.totale)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pagamento:</span>
                <span className="font-medium text-foreground">{data.tipo_pagamento}</span>
              </div>
            </div>
          </div>

          {/* Promozioni Applicate */}
          {data.promozioni_applicate && data.promozioni_applicate.length > 0 && (
            <div className="bg-success/10 border border-success/30 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="h-4 w-4 text-success" />
                <h3 className="text-xs font-semibold uppercase text-success">Promozioni Applicate</h3>
              </div>
              <div className="space-y-1">
                {data.promozioni_applicate.map((promo, idx) => (
                  <p key={idx} className="text-sm text-success">
                    <span className="font-medium">{promo.nome}</span>
                    <span className="text-success ml-2">
                      ({promo.tipo === "sconto_percentuale" ? `${promo.valore}%` : `€${promo.valore}`} come da promo canvass)
                    </span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {(data.condizioni_commerciali || data.data_consegna_prevista || data.destinazione_consegna || data.note_consegna) && (
            <div className="grid gap-3 rounded-lg bg-muted/50 p-4 sm:grid-cols-2">
              {data.condizioni_commerciali && <div><h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Condizioni commerciali</h3><p className="whitespace-pre-wrap text-sm text-foreground">{data.condizioni_commerciali}</p></div>}
              {(data.data_consegna_prevista || data.destinazione_consegna || data.note_consegna) && <div><h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Consegna</h3>
                {data.data_consegna_prevista && <p className="text-sm text-foreground">Prevista il {format(parseLocalDate(data.data_consegna_prevista) ?? new Date(data.data_consegna_prevista), "dd/MM/yyyy")}</p>}
                {data.destinazione_consegna && <p className="whitespace-pre-wrap text-sm text-foreground">{data.destinazione_consegna}</p>}
                {data.note_consegna && <p className="whitespace-pre-wrap text-sm text-foreground">{data.note_consegna}</p>}
              </div>}
            </div>
          )}

          {/* Notes */}
          {data.note && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Note</h3>
              <p className="text-sm text-foreground">{data.note}</p>
            </div>
          )}
        </div>

        <OrderEmailHistory orderId={data.ordine_id} />
        <DialogFooter className="print:hidden flex-wrap gap-2">
          {data.ordine_id && <Button onClick={prepareEmail} disabled={preparing || isExporting} className="min-h-11 gap-2 whitespace-normal">
            <Send className="h-4 w-4 shrink-0" />{preparing ? "Preparazione PDF…" : history.data?.some(r => r.status === 'sent') ? "Invia nuovamente" : "Invia ordine via email"}
          </Button>}
          {history.data?.find(r => r.status === 'sent') && <span className="w-full text-xs text-muted-foreground">Ultimo invio: {new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'short', timeStyle: 'short' }).format(new Date(history.data.find(r => r.status === 'sent')?.sent_at ?? history.data[0].created_at))}</span>}
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
    {prepared && <OrderEmailComposer prepared={prepared} onClose={() => setPrepared(null)} />}
    </>
  );
}
