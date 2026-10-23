import { useEffect, useRef, useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import { FileUp, Loader2, Package, AlertTriangle, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ParsedProduct = {
  rowId: string;
  codice: string | null;
  nome: string;
  formato: string | null;
  unita_misura: string | null;
  marca: string | null;
  pezzi_per_cartone: number | null;
  cartoni_per_strato: number | null;
  strati: number | null;
  cartoni_per_pallet: number | null;
  pezzi_per_pallet: number | null;
  prezzo_listino: number | null;
  costo_acquisto: number | null;
  prezzo_vendita: number | null;
  prezzo_riferimento: string | null;
  iva: number | null;
  sconti: string | null;
  pagina: number | null;
  campi_mancanti: string[];
  ambigui: string[];
  selected: boolean;
  duplicate: boolean;
  expanded: boolean;
};

type ProgressInfo = {
  status: string;
  totalPages: number;
  processedPages: number;
  failedPages: number;
  unreadableRanges: { from: number; to: number; error: string }[];
  products: number;
  chunks: number;
  doneChunks: number;
};

type ImportProductsPDFDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aziendaId: string;
  aziendaNome: string;
  onImportComplete: () => void;
};

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? parseFloat(v.replace(",", ".")) : Number(v);
  return Number.isFinite(n) ? n : null;
};

const resumeKey = (aziendaId: string) => `product-import-job-${aziendaId}`;

export function ImportProductsPDFDialog({
  open,
  onOpenChange,
  aziendaId,
  aziendaNome,
  onImportComplete,
}: ImportProductsPDFDialogProps) {
  const [phase, setPhase] = useState<"upload" | "processing" | "preview" | "importing" | "done">("upload");
  const [products, setProducts] = useState<ParsedProduct[]>([]);
  const [fileName, setFileName] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [existingCount, setExistingCount] = useState(0);
  const [importStats, setImportStats] = useState<{ imported: number; skipped: number } | null>(null);
  const polling = useRef(false);

  const resetState = () => {
    setProducts([]);
    setFileName("");
    setJobId(null);
    setProgress(null);
    setExistingCount(0);
    setImportStats(null);
    setPhase("upload");
    polling.current = false;
  };

  const pollUntilDone = async (id: string) => {
    if (polling.current) return;
    polling.current = true;
    try {
      for (;;) {
        const { data, error } = await supabase.functions.invoke("parse-products-pdf", {
          body: { action: "process", jobId: id },
        });
        if (error || data?.error) {
          toast.error(data?.error ?? "Errore nell'elaborazione del PDF");
          setPhase("upload");
          return;
        }
        setProgress(data as ProgressInfo);
        if (data.status === "done") break;
        await new Promise((r) => setTimeout(r, 1200));
      }
      await loadRows(id);
      setPhase("preview");
    } finally {
      polling.current = false;
    }
  };

  const loadRows = async (id: string) => {
    const { data, error } = await supabase
      .from("product_import_rows")
      .select("id, page, data")
      .eq("job_id", id)
      .order("page", { ascending: true });
    if (error) {
      toast.error("Errore nel caricamento dei prodotti estratti");
      return;
    }
    // Duplicati dentro l'azienda: confronto con i prodotti già presenti
    const { data: existing } = await supabase
      .from("prodotti")
      .select("codice, nome, formato")
      .eq("azienda_id", aziendaId)
      .is("deleted_at", null);
    const existingKeys = new Set(
      (existing ?? []).map((p) =>
        p.codice ? `c:${p.codice.toLowerCase()}` : `n:${(p.nome ?? "").toLowerCase()}|${(p.formato ?? "").toLowerCase()}`
      )
    );
    setExistingCount(existing?.length ?? 0);
    const seen = new Set<string>();
    const parsed = (data ?? []).map((row) => {
      const d = (row.data ?? {}) as Record<string, unknown>;
      const codice = d.codice ? String(d.codice) : null;
      const nome = String(d.nome ?? "").trim();
      const formato = d.formato ? String(d.formato) : null;
      const key = codice ? `c:${codice.toLowerCase()}` : `n:${nome.toLowerCase()}|${(formato ?? "").toLowerCase()}`;
      const duplicate = existingKeys.has(key) || seen.has(key);
      seen.add(key);
      return {
        rowId: row.id as string,
        codice,
        nome,
        formato,
        unita_misura: d.unita_misura ? String(d.unita_misura) : null,
        marca: d.marca ? String(d.marca) : null,
        pezzi_per_cartone: num(d.pezzi_per_cartone),
        cartoni_per_strato: num(d.cartoni_per_strato),
        strati: num(d.strati),
        cartoni_per_pallet: num(d.cartoni_per_pallet),
        pezzi_per_pallet: num(d.pezzi_per_pallet),
        prezzo_listino: num(d.prezzo_listino),
        costo_acquisto: num(d.costo_acquisto),
        prezzo_vendita: num(d.prezzo_vendita),
        prezzo_riferimento: d.prezzo_riferimento ? String(d.prezzo_riferimento) : null,
        iva: num(d.iva),
        sconti: d.sconti ? String(d.sconti) : null,
        pagina: typeof row.page === "number" ? row.page : null,
        campi_mancanti: Array.isArray(d.campi_mancanti) ? (d.campi_mancanti as string[]) : [],
        ambigui: Array.isArray(d.ambigui) ? (d.ambigui as string[]) : [],
        selected: !duplicate,
        duplicate,
        expanded: false,
      } satisfies ParsedProduct;
    });
    setProducts(parsed);
  };

  // Ripresa: se c'è un lavoro interrotto per questa azienda, proponi di riprenderlo
  const [resumable, setResumable] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    const saved = localStorage.getItem(resumeKey(aziendaId));
    if (saved) setResumable(saved);
  }, [open, aziendaId]);

  useEffect(() => {
    if (jobId) localStorage.setItem(resumeKey(aziendaId), jobId);
  }, [jobId, aziendaId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Seleziona un file PDF");
      return;
    }
    setFileName(file.name);
    setPhase("processing");
    setProgress(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("parse-products-pdf", {
        body: { action: "start", pdfBase64: base64, aziendaId, fileName: file.name },
      });
      if (error || data?.error) {
        toast.error(data?.error ?? "Errore nell'avvio dell'importazione");
        setPhase("upload");
        return;
      }
      setJobId(data.jobId);
      toast.success(`PDF di ${data.totalPages} pagine: elaborazione in ${data.chunks} blocchi`);
      await pollUntilDone(data.jobId);
    } catch {
      toast.error("Errore nella lettura del file");
      setPhase("upload");
    }
  };

  const resumeJob = async () => {
    if (!resumable) return;
    setJobId(resumable);
    setPhase("processing");
    await pollUntilDone(resumable);
  };

  const retryFailed = async () => {
    if (!jobId) return;
    setPhase("processing");
    await pollUntilDone(jobId);
  };

  const toggleProduct = (index: number) =>
    setProducts((prev) => prev.map((p, i) => (i === index ? { ...p, selected: !p.selected } : p)));
  const toggleAll = (selected: boolean) =>
    setProducts((prev) => prev.map((p) => ({ ...p, selected })));
  const toggleExpand = (index: number) =>
    setProducts((prev) => prev.map((p, i) => (i === index ? { ...p, expanded: !p.expanded } : p)));
  const updateProduct = (index: number, field: keyof ParsedProduct, value: string | number | null) =>
    setProducts((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));

  const handleImport = async () => {
    const selectedProducts = products.filter((p) => p.selected && p.nome);
    if (selectedProducts.length === 0) {
      toast.error("Seleziona almeno un prodotto");
      return;
    }
    setPhase("importing");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Utente non autenticato");
        setPhase("preview");
        return;
      }
      // Idempotente: ricontrolla i duplicati al momento dell'importazione
      const { data: existing } = await supabase
        .from("prodotti")
        .select("codice, nome, formato")
        .eq("azienda_id", aziendaId)
        .is("deleted_at", null);
      const existingKeys = new Set(
        (existing ?? []).map((p) =>
          p.codice ? `c:${p.codice.toLowerCase()}` : `n:${(p.nome ?? "").toLowerCase()}|${(p.formato ?? "").toLowerCase()}`
        )
      );
      const fresh = selectedProducts.filter((p) => {
        const key = p.codice
          ? `c:${p.codice.toLowerCase()}`
          : `n:${p.nome.toLowerCase()}|${(p.formato ?? "").toLowerCase()}`;
        return !existingKeys.has(key);
      });
      const skipped = selectedProducts.length - fresh.length;

      // Importazione a blocchi di 50
      const BATCH = 50;
      let imported = 0;
      for (let i = 0; i < fresh.length; i += BATCH) {
        const batch = fresh.slice(i, i + BATCH).map((p) => ({
          azienda_id: aziendaId,
          user_id: user.id,
          nome: p.nome,
          codice: p.codice || null,
          formato: p.formato || null,
          prezzo_listino: p.prezzo_listino ?? 0,
          costo_acquisto: p.costo_acquisto,
          prezzo_vendita: p.prezzo_vendita,
          iva: p.iva,
          prezzo_riferimento: p.prezzo_riferimento,
          pezzi_per_cartone: p.pezzi_per_cartone ?? 1,
          strati: p.strati ?? 1,
          cartoni_per_strato: p.cartoni_per_strato ?? 1,
          quantita_pezzi: 0,
        }));
        const { error } = await supabase.from("prodotti").insert(batch);
        if (error) throw error;
        imported += batch.length;
        const rowIds = fresh.slice(i, i + BATCH).map((p) => p.rowId);
        await supabase.from("product_import_rows").update({ imported: true }).in("id", rowIds);
      }

      setImportStats({ imported, skipped });
      setPhase("done");
      localStorage.removeItem(resumeKey(aziendaId));
      toast.success(`${imported} prodotti importati${skipped ? `, ${skipped} già presenti` : ""}`);
      onImportComplete();
    } catch (err) {
      console.error("Import error:", err);
      toast.error("Errore nell'importazione");
      setPhase("preview");
    }
  };

  const selectedCount = products.filter((p) => p.selected).length;
  const toVerify = products.filter((p) => p.ambigui.length > 0 || p.campi_mancanti.length > 0).length;
  const duplicates = products.filter((p) => p.duplicate).length;
  const progressPct = progress && progress.totalPages > 0 ? Math.round((progress.processedPages / progress.totalPages) * 100) : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && phase !== "processing" && phase !== "importing") resetState();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Importa prodotti da PDF
          </DialogTitle>
          <DialogDescription>
            Carica un listino PDF per importare i prodotti in {aziendaNome}. I listini pesanti vengono elaborati a blocchi di pagine.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col min-h-0">
          {phase === "upload" && (
            <div className="space-y-3">
              <Label>File PDF</Label>
              <Input type="file" accept=".pdf" onChange={handleFileChange} className="flex-1" />
              {resumable && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:bg-amber-950/30">
                  <p className="text-sm">C'è un'importazione interrotta per questa azienda.</p>
                  <Button variant="outline" size="sm" onClick={resumeJob}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Riprendi
                  </Button>
                </div>
              )}
            </div>
          )}

          {phase === "processing" && (
            <div className="space-y-3 py-4">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Elaborazione di {fileName || "listino"}…
              </div>
              <Progress value={progressPct} />
              <p className="text-xs text-muted-foreground">
                {progress
                  ? `Pagine ${progress.processedPages} di ${progress.totalPages} · blocco ${progress.doneChunks} di ${progress.chunks} · ${progress.products} prodotti trovati`
                  : "Preparazione del documento…"}
              </p>
              <p className="text-xs text-muted-foreground">
                Puoi chiudere: l'avanzamento viene salvato e potrai riprendere dal punto raggiunto.
              </p>
            </div>
          )}

          {phase === "preview" && (
            <>
              {/* Verifica di completezza */}
              {progress && (
                <div className="rounded-lg border p-3 text-sm space-y-1">
                  <p className="font-medium">Verifica di completezza</p>
                  <p className="text-xs text-muted-foreground">
                    Pagine totali {progress.totalPages} · elaborate {progress.processedPages}
                    {progress.failedPages > 0 ? ` · illeggibili ${progress.failedPages}` : ""} · prodotti rilevati {products.length} · già presenti in azienda {duplicates} · da verificare {toVerify}
                  </p>
                  {progress.unreadableRanges.length > 0 && (
                    <div className="flex items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 dark:bg-amber-950/30">
                      <p className="text-xs">
                        Pagine non lette: {progress.unreadableRanges.map((r) => `${r.from}–${r.to}`).join(", ")}. Il risultato è incompleto.
                      </p>
                      <Button variant="outline" size="sm" onClick={retryFailed}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Riprova
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedCount} di {products.length} prodotti selezionati
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggleAll(true)}>Seleziona tutti</Button>
                  <Button variant="outline" size="sm" onClick={() => toggleAll(false)}>Deseleziona tutti</Button>
                </div>
              </div>

              <ScrollArea className="flex-1 min-h-0 border rounded-md">
                <div className="p-3 space-y-2">
                  {products.map((product, index) => {
                    const warn = product.ambigui.length > 0 || product.campi_mancanti.length > 0;
                    return (
                      <div
                        key={product.rowId}
                        className={`p-3 rounded-lg border ${
                          product.duplicate
                            ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20"
                            : product.selected
                              ? "bg-accent/50 border-primary/30"
                              : "bg-muted/30"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox checked={product.selected} onCheckedChange={() => toggleProduct(index)} className="mt-1" />
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{product.nome || "—"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {[
                                    product.codice && `cod. ${product.codice}`,
                                    product.formato,
                                    product.prezzo_listino !== null && `${product.prezzo_listino.toFixed(2)} €${product.prezzo_riferimento ? `/${product.prezzo_riferimento}` : ""}`,
                                    product.pagina && `pag. ${product.pagina}`,
                                  ].filter(Boolean).join(" · ")}
                                </p>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => toggleExpand(index)} aria-label="Dettagli">
                                {product.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            </div>
                            {(product.duplicate || warn) && (
                              <p className="text-xs flex items-center gap-1 text-amber-700 dark:text-amber-400">
                                <AlertTriangle className="h-3 w-3" />
                                {product.duplicate ? "Possibile duplicato (già presente o ripetuto)" : ""}
                                {product.ambigui.length > 0 ? ` Ambiguo: ${product.ambigui.join("; ")}` : ""}
                                {product.campi_mancanti.length > 0 ? ` Mancano: ${product.campi_mancanti.join(", ")}` : ""}
                              </p>
                            )}
                            {product.expanded && (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                                <div>
                                  <Label className="text-xs text-muted-foreground">Codice</Label>
                                  <Input value={product.codice ?? ""} onChange={(e) => updateProduct(index, "codice", e.target.value || null)} className="h-9 text-sm" />
                                </div>
                                <div className="col-span-2">
                                  <Label className="text-xs text-muted-foreground">Nome</Label>
                                  <Input value={product.nome} onChange={(e) => updateProduct(index, "nome", e.target.value)} className="h-9 text-sm" />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Formato</Label>
                                  <Input value={product.formato ?? ""} onChange={(e) => updateProduct(index, "formato", e.target.value || null)} className="h-9 text-sm" />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Listino €</Label>
                                  <Input type="number" step="0.01" value={product.prezzo_listino ?? ""} onChange={(e) => updateProduct(index, "prezzo_listino", num(e.target.value))} className="h-9 text-sm" />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Costo €</Label>
                                  <Input type="number" step="0.01" value={product.costo_acquisto ?? ""} onChange={(e) => updateProduct(index, "costo_acquisto", num(e.target.value))} className="h-9 text-sm" />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Vendita €</Label>
                                  <Input type="number" step="0.01" value={product.prezzo_vendita ?? ""} onChange={(e) => updateProduct(index, "prezzo_vendita", num(e.target.value))} className="h-9 text-sm" />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">IVA %</Label>
                                  <Input type="number" step="0.1" value={product.iva ?? ""} onChange={(e) => updateProduct(index, "iva", num(e.target.value))} className="h-9 text-sm" />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Pz/cartone</Label>
                                  <Input type="number" value={product.pezzi_per_cartone ?? ""} onChange={(e) => updateProduct(index, "pezzi_per_cartone", num(e.target.value))} className="h-9 text-sm" />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Cartoni/strato</Label>
                                  <Input type="number" value={product.cartoni_per_strato ?? ""} onChange={(e) => updateProduct(index, "cartoni_per_strato", num(e.target.value))} className="h-9 text-sm" />
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Strati</Label>
                                  <Input type="number" value={product.strati ?? ""} onChange={(e) => updateProduct(index, "strati", num(e.target.value))} className="h-9 text-sm" />
                                </div>
                                <div className="col-span-2">
                                  <Label className="text-xs text-muted-foreground">Sconti / condizioni</Label>
                                  <Input value={product.sconti ?? ""} onChange={(e) => updateProduct(index, "sconti", e.target.value || null)} className="h-9 text-sm" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          )}

          {(phase === "importing" || phase === "done") && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              {phase === "importing" ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p className="text-sm">Importazione in corso…</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">Importazione completata</p>
                  <p className="text-xs text-muted-foreground">
                    {importStats?.imported ?? 0} importati · {importStats?.skipped ?? 0} già presenti
                    {progress ? ` · pagine elaborate ${progress.processedPages}/${progress.totalPages}` : ""}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={phase === "importing"}>
            {phase === "done" ? "Chiudi" : "Annulla"}
          </Button>
          {phase === "preview" && (
            <Button onClick={handleImport} disabled={selectedCount === 0}>
              Importa {selectedCount > 0 ? `${selectedCount} prodotti` : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
