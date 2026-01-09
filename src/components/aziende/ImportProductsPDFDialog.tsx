import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileUp, Loader2, Package, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ParsedProduct = {
  codice: string | null;
  nome: string;
  prezzo_listino: number;
  pezzi_per_cartone: number;
  strati: number;
  cartoni_per_strato: number;
  selected: boolean;
};

type ImportProductsPDFDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aziendaId: string;
  aziendaNome: string;
  onImportComplete: () => void;
};

export function ImportProductsPDFDialog({
  open,
  onOpenChange,
  aziendaId,
  aziendaNome,
  onImportComplete,
}: ImportProductsPDFDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [products, setProducts] = useState<ParsedProduct[]>([]);
  const [fileName, setFileName] = useState("");

  const resetState = () => {
    setProducts([]);
    setFileName("");
    setIsLoading(false);
    setIsImporting(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Seleziona un file PDF");
      return;
    }

    setFileName(file.name);
    setIsLoading(true);
    setProducts([]);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        
        const { data, error } = await supabase.functions.invoke("parse-products-pdf", {
          body: { pdfBase64: base64 },
        });

        if (error) {
          console.error("Edge function error:", error);
          toast.error("Errore nel parsing del PDF");
          setIsLoading(false);
          return;
        }

        if (data?.error) {
          toast.error(data.error);
          setIsLoading(false);
          return;
        }

        if (data?.success && data?.data?.prodotti) {
          const parsed = data.data.prodotti.map((p: Omit<ParsedProduct, 'selected'>) => ({
            ...p,
            prezzo_listino: Number(p.prezzo_listino) || 0,
            pezzi_per_cartone: Number(p.pezzi_per_cartone) || 1,
            strati: Number(p.strati) || 1,
            cartoni_per_strato: Number(p.cartoni_per_strato) || 1,
            selected: true,
          }));
          setProducts(parsed);
          toast.success(`Trovati ${parsed.length} prodotti`);
        } else {
          toast.error("Nessun prodotto trovato nel PDF");
        }
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("File read error:", err);
      toast.error("Errore nella lettura del file");
      setIsLoading(false);
    }
  };

  const toggleProduct = (index: number) => {
    setProducts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, selected: !p.selected } : p))
    );
  };

  const toggleAll = (selected: boolean) => {
    setProducts((prev) => prev.map((p) => ({ ...p, selected })));
  };

  const updateProduct = (index: number, field: keyof ParsedProduct, value: string | number) => {
    setProducts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const handleImport = async () => {
    const selectedProducts = products.filter((p) => p.selected);
    if (selectedProducts.length === 0) {
      toast.error("Seleziona almeno un prodotto");
      return;
    }

    setIsImporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Utente non autenticato");
        return;
      }

      const productsToInsert = selectedProducts.map((p) => ({
        azienda_id: aziendaId,
        user_id: user.id,
        nome: p.nome,
        codice: p.codice || null,
        prezzo_listino: p.prezzo_listino,
        pezzi_per_cartone: p.pezzi_per_cartone,
        strati: p.strati,
        cartoni_per_strato: p.cartoni_per_strato,
        quantita_pezzi: 0,
      }));

      const { error } = await supabase.from("prodotti").insert(productsToInsert);
      if (error) throw error;

      toast.success(`${selectedProducts.length} prodotti importati!`);
      onImportComplete();
      onOpenChange(false);
      resetState();
    } catch (err) {
      console.error("Import error:", err);
      toast.error("Errore nell'importazione");
    } finally {
      setIsImporting(false);
    }
  };

  const selectedCount = products.filter((p) => p.selected).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetState();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Importa Prodotti da PDF
          </DialogTitle>
          <DialogDescription>
            Carica un listino PDF per importare i prodotti in {aziendaNome}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>File PDF</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={isLoading}
                className="flex-1"
              />
              {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            </div>
            {fileName && !isLoading && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <FileUp className="h-4 w-4" />
                {fileName}
              </p>
            )}
          </div>

          {/* Products List */}
          {products.length > 0 && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {selectedCount} di {products.length} prodotti selezionati
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggleAll(true)}>
                    Seleziona tutti
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleAll(false)}>
                    Deseleziona tutti
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 border rounded-md">
                <div className="p-4 space-y-3">
                  {products.map((product, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border transition-colors ${
                        product.selected ? "bg-accent/50 border-primary/30" : "bg-muted/30"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={product.selected}
                          onCheckedChange={() => toggleProduct(index)}
                          className="mt-1"
                        />
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-2">
                          <div className="md:col-span-1">
                            <Label className="text-xs text-muted-foreground">Codice</Label>
                            <Input
                              value={product.codice || ""}
                              onChange={(e) => updateProduct(index, "codice", e.target.value)}
                              placeholder="—"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label className="text-xs text-muted-foreground">Nome</Label>
                            <Input
                              value={product.nome}
                              onChange={(e) => updateProduct(index, "nome", e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Prezzo €</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={product.prezzo_listino}
                              onChange={(e) => updateProduct(index, "prezzo_listino", parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Pz/Cart</Label>
                            <Input
                              type="number"
                              value={product.pezzi_per_cartone}
                              onChange={(e) => updateProduct(index, "pezzi_per_cartone", parseInt(e.target.value) || 1)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Strati</Label>
                            <Input
                              type="number"
                              value={product.strati}
                              onChange={(e) => updateProduct(index, "strati", parseInt(e.target.value) || 1)}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && products.length === 0 && fileName && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>Nessun prodotto estratto dal PDF</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || selectedCount === 0}
          >
            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Importa {selectedCount > 0 ? `${selectedCount} prodotti` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
