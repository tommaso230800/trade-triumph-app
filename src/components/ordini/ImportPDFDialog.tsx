import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, FileText, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ParsedRiga = {
  codice_prodotto: string | null;
  nome_prodotto: string;
  quantita_pezzi: number;
  quantita_cartoni: number;
  prezzo_unitario: number;
  importo_riga: number;
  prodotto_id?: string;
};

type ParsedOrderData = {
  data_ordine: string | null;
  cliente_nome: string | null;
  azienda_nome: string | null;
  sconto_percentuale: number;
  sconto_merce: number;
  tipo_pagamento: string | null;
  imponibile_totale: number;
  note: string | null;
  righe: ParsedRiga[];
};

type Cliente = {
  id: string;
  nome: string;
  azienda?: string | null;
};

type Azienda = {
  id: string;
  nome: string;
};

type Prodotto = {
  id: string;
  nome: string;
  codice: string | null;
  azienda_id: string;
  prezzo_listino: number;
  pezzi_per_cartone: number;
};

interface ImportPDFDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienti: Cliente[];
  aziende: Azienda[];
  prodotti: Prodotto[];
  onImportComplete: (data: {
    cliente_id: string;
    azienda_id: string;
    data_ordine: string;
    sconto: number;
    sconto_merce: number;
    tipo_pagamento: string;
    totale: number;
    note: string;
    righe: { prodotto_id: string; quantita_pezzi: number; quantita_cartoni: number; prezzo_unitario: number }[];
  }) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);

export function ImportPDFDialog({
  open,
  onOpenChange,
  clienti,
  aziende,
  prodotti,
  onImportComplete,
}: ImportPDFDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedOrderData | null>(null);
  const [selectedCliente, setSelectedCliente] = useState("");
  const [selectedAzienda, setSelectedAzienda] = useState("");
  const [dataOrdine, setDataOrdine] = useState("");
  const [mappedRighe, setMappedRighe] = useState<(ParsedRiga & { prodotto_id: string })[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setParsedData(null);
    setSelectedCliente("");
    setSelectedAzienda("");
    setDataOrdine("");
    setMappedRighe([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Seleziona un file PDF");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Il file è troppo grande (max 10MB)");
      return;
    }

    setIsLoading(true);
    setParsedData(null);

    try {
      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const pdfBase64 = await base64Promise;

      // Call edge function
      const { data, error } = await supabase.functions.invoke("parse-order-pdf", {
        body: { pdfBase64 },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || "Errore nel parsing del PDF");
      }

      const parsed = data.data as ParsedOrderData;
      setParsedData(parsed);
      
      // Set data ordine
      if (parsed.data_ordine) {
        setDataOrdine(parsed.data_ordine);
      }

      // Try to auto-match cliente
      if (parsed.cliente_nome) {
        const matchedCliente = clienti.find(
          (c) => c.nome.toLowerCase().includes(parsed.cliente_nome!.toLowerCase()) ||
                 parsed.cliente_nome!.toLowerCase().includes(c.nome.toLowerCase())
        );
        if (matchedCliente) {
          setSelectedCliente(matchedCliente.id);
        }
      }

      // Try to auto-match azienda
      if (parsed.azienda_nome) {
        const matchedAzienda = aziende.find(
          (a) => a.nome.toLowerCase().includes(parsed.azienda_nome!.toLowerCase()) ||
                 parsed.azienda_nome!.toLowerCase().includes(a.nome.toLowerCase())
        );
        if (matchedAzienda) {
          setSelectedAzienda(matchedAzienda.id);
        }
      }

      toast.success("PDF analizzato con successo!");
    } catch (error) {
      console.error("Error parsing PDF:", error);
      toast.error(error instanceof Error ? error.message : "Errore nel parsing del PDF");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-match products when azienda changes
  const handleAziendaChange = (aziendaId: string) => {
    setSelectedAzienda(aziendaId);
    
    if (!parsedData) return;

    const aziendaProdotti = prodotti.filter((p) => p.azienda_id === aziendaId);
    
    const mapped = parsedData.righe.map((riga) => {
      // Try to match by codice
      let matchedProdotto = aziendaProdotti.find(
        (p) => p.codice && riga.codice_prodotto && 
               p.codice.toLowerCase() === riga.codice_prodotto.toLowerCase()
      );
      
      // Try to match by nome if codice didn't match
      if (!matchedProdotto) {
        matchedProdotto = aziendaProdotti.find(
          (p) => p.nome.toLowerCase().includes(riga.nome_prodotto.toLowerCase()) ||
                 riga.nome_prodotto.toLowerCase().includes(p.nome.toLowerCase())
        );
      }

      return {
        ...riga,
        prodotto_id: matchedProdotto?.id || "",
      };
    });

    setMappedRighe(mapped);
  };

  const updateRigaProdotto = (index: number, prodottoId: string) => {
    const updated = [...mappedRighe];
    updated[index] = { ...updated[index], prodotto_id: prodottoId };
    setMappedRighe(updated);
  };

  const handleImport = () => {
    if (!selectedCliente || !selectedAzienda || !dataOrdine) {
      toast.error("Seleziona cliente, azienda e data ordine");
      return;
    }

    const validRighe = mappedRighe.filter((r) => r.prodotto_id);
    if (validRighe.length === 0) {
      toast.error("Associa almeno un prodotto");
      return;
    }

    onImportComplete({
      cliente_id: selectedCliente,
      azienda_id: selectedAzienda,
      data_ordine: dataOrdine,
      sconto: parsedData?.sconto_percentuale || 0,
      sconto_merce: parsedData?.sconto_merce || 0,
      tipo_pagamento: parsedData?.tipo_pagamento || "Contanti",
      totale: parsedData?.imponibile_totale || 0,
      note: parsedData?.note || "",
      righe: validRighe.map((r) => ({
        prodotto_id: r.prodotto_id,
        quantita_pezzi: r.quantita_pezzi,
        quantita_cartoni: r.quantita_cartoni,
        prezzo_unitario: r.prezzo_unitario,
      })),
    });

    resetState();
    onOpenChange(false);
  };

  const aziendaProdotti = prodotti.filter((p) => p.azienda_id === selectedAzienda);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Importa Ordine da PDF
          </DialogTitle>
          <DialogDescription>
            Carica un PDF di un ordine e l'AI estrarrà automaticamente i dati
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Seleziona PDF</Label>
            <div className="flex items-center gap-4">
              <Input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                disabled={isLoading}
                className="flex-1"
              />
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Analisi in corso...</span>
                </div>
              )}
            </div>
          </div>

          {/* Parsed Data Review */}
          {parsedData && (
            <>
              {/* Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1.5">
                  <Label className="text-sm">Data Ordine</Label>
                  <Input
                    type="date"
                    value={dataOrdine}
                    onChange={(e) => setDataOrdine(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Cliente</Label>
                  <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                    <SelectTrigger>
                      <SelectValue placeholder={parsedData.cliente_nome || "Seleziona cliente"} />
                    </SelectTrigger>
                    <SelectContent>
                      {clienti.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome} {c.azienda ? `(${c.azienda})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Azienda Fornitrice</Label>
                  <Select value={selectedAzienda} onValueChange={handleAziendaChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={parsedData.azienda_nome || "Seleziona azienda"} />
                    </SelectTrigger>
                    <SelectContent>
                      {aziende.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Sconto %</Label>
                  <p className="font-medium">{parsedData.sconto_percentuale}%</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Sconto Merce</Label>
                  <p className="font-medium">{formatCurrency(parsedData.sconto_merce)}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Imponibile Totale</Label>
                  <p className="font-medium text-primary">{formatCurrency(parsedData.imponibile_totale)}</p>
                </div>
              </div>

              {/* Product Lines */}
              <div className="space-y-2">
                <Label>Righe Ordine ({parsedData.righe.length} prodotti)</Label>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Codice</TableHead>
                        <TableHead>Prodotto PDF</TableHead>
                        <TableHead className="w-48">Associa Prodotto</TableHead>
                        <TableHead className="w-20 text-right">Qtà Pz</TableHead>
                        <TableHead className="w-20 text-right">Qtà Ct</TableHead>
                        <TableHead className="w-24 text-right">Prezzo</TableHead>
                        <TableHead className="w-24 text-right">Importo</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(mappedRighe.length > 0 ? mappedRighe : parsedData.righe.map(r => ({ ...r, prodotto_id: "" }))).map((riga, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-xs">
                            {riga.codice_prodotto || "-"}
                          </TableCell>
                          <TableCell className="text-sm">{riga.nome_prodotto}</TableCell>
                          <TableCell>
                            <Select 
                              value={riga.prodotto_id || ""} 
                              onValueChange={(v) => updateRigaProdotto(index, v)}
                              disabled={!selectedAzienda}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Seleziona..." />
                              </SelectTrigger>
                              <SelectContent>
                                {aziendaProdotti.map((p) => (
                                  <SelectItem key={p.id} value={p.id} className="text-xs">
                                    {p.codice ? `[${p.codice}] ` : ""}{p.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">{riga.quantita_pezzi}</TableCell>
                          <TableCell className="text-right">{riga.quantita_cartoni}</TableCell>
                          <TableCell className="text-right">{formatCurrency(riga.prezzo_unitario)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(riga.importo_riga)}</TableCell>
                          <TableCell>
                            {riga.prodotto_id ? (
                              <Check className="h-4 w-4 text-success" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-warning" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {!selectedAzienda && (
                  <p className="text-sm text-muted-foreground">
                    Seleziona un'azienda per associare i prodotti
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); resetState(); }}>
            Annulla
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!parsedData || !selectedCliente || !selectedAzienda || !dataOrdine || mappedRighe.filter(r => r.prodotto_id).length === 0}
          >
            <Upload className="h-4 w-4 mr-2" />
            Importa Ordine
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
