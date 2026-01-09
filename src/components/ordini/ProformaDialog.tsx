import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Printer, X } from "lucide-react";
import agencyLogo from "@/assets/agency-logo.jpg";

type RigaOrdine = {
  prodotto_nome: string;
  prezzo_unitario: number;
  quantita_pezzi: number;
  quantita_cartoni: number;
  pezzi_per_cartone: number;
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
};

type ProformaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ProformaData | null;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);

export function ProformaDialog({ open, onOpenChange, data }: ProformaDialogProps) {
  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  const subtotale = data.righe.reduce((sum, riga) => {
    const pezziTotali = riga.quantita_pezzi + riga.quantita_cartoni * riga.pezzi_per_cartone;
    return sum + pezziTotali * riga.prezzo_unitario;
  }, 0);

  const scontoPercentuale = subtotale * (data.sconto / 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible print:shadow-none print:border-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>Proforma Ordine</DialogTitle>
        </DialogHeader>

        {/* Printable Content */}
        <div className="proforma-content space-y-6 p-4 bg-white text-black print:p-8">
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
              <h2 className="text-lg font-semibold text-primary">PROFORMA</h2>
              <p className="text-sm font-mono text-gray-700">{data.codice}</p>
              <p className="text-sm text-gray-600">
                {format(new Date(data.created_at), "dd MMMM yyyy", { locale: it })}
              </p>
            </div>
          </div>

          <Separator />

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
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-semibold text-gray-900">Prodotto</TableHead>
                  <TableHead className="text-right font-semibold text-gray-900">Prezzo Unit.</TableHead>
                  <TableHead className="text-center font-semibold text-gray-900">Pezzi</TableHead>
                  <TableHead className="text-center font-semibold text-gray-900">Cartoni</TableHead>
                  <TableHead className="text-center font-semibold text-gray-900">Tot. Pezzi</TableHead>
                  <TableHead className="text-right font-semibold text-gray-900">Subtotale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.righe.map((riga, idx) => {
                  const pezziTotali = riga.quantita_pezzi + riga.quantita_cartoni * riga.pezzi_per_cartone;
                  const rigaSubtotale = pezziTotali * riga.prezzo_unitario;
                  return (
                    <TableRow key={idx}>
                      <TableCell>
                        <p className="font-medium text-gray-900">{riga.prodotto_nome}</p>
                        <p className="text-xs text-gray-500">{riga.pezzi_per_cartone} pz/cartone</p>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(riga.prezzo_unitario)}</TableCell>
                      <TableCell className="text-center">{riga.quantita_pezzi}</TableCell>
                      <TableCell className="text-center">{riga.quantita_cartoni}</TableCell>
                      <TableCell className="text-center font-medium">{pezziTotali}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(rigaSubtotale)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotale:</span>
                <span className="font-medium">{formatCurrency(subtotale)}</span>
              </div>
              {data.sconto > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sconto ({data.sconto}%):</span>
                  <span className="font-medium text-red-600">-{formatCurrency(scontoPercentuale)}</span>
                </div>
              )}
              {data.sconto_merce > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Sconto Merce:</span>
                  <span className="font-medium text-red-600">-{formatCurrency(data.sconto_merce)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Totale:</span>
                <span className="font-bold text-primary">{formatCurrency(data.totale)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Pagamento:</span>
                <span className="font-medium">{data.tipo_pagamento}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {data.note && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Note</h3>
              <p className="text-sm text-gray-700">{data.note}</p>
            </div>
          )}
        </div>

        <DialogFooter className="print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Chiudi
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
