import { useState, useRef, useMemo } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Upload, FileText, FileSpreadsheet, Image as ImageIcon, X, Check,
  AlertTriangle, Trash2, Plus, ChevronDown, ChevronRight, Split,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Cliente = { id: string; nome: string; azienda?: string | null };
type Azienda = { id: string; nome: string };
type Prodotto = { id: string; nome: string; codice: string | null; azienda_id: string; prezzo_listino: number; pezzi_per_cartone: number };

type ParsedRiga = {
  codice_prodotto: string | null;
  nome_prodotto: string;
  quantita_cartoni: number;
  pezzi_per_cartone?: number;
  prezzo_per_cartone: number;
  sc1?: number; sc2?: number; sc3?: number;
  is_omaggio?: boolean;
  importo_riga?: number;
  confidence?: "high" | "medium" | "low";
  warning?: string | null;
  unita_originale?: string;
  // editing state
  prodotto_id?: string;
  createNew?: boolean;
  listinoWarning?: string;
};

type ParsedOrder = {
  id: string; // local
  data_ordine: string | null;
  cliente_nome: string | null;
  azienda_nome: string | null;
  tipo_pagamento: string | null;
  sconto_pagamento_percentuale: number;
  sconto_merce: number;
  imponibile_totale: number;
  note: string | null;
  warnings: string[];
  righe: ParsedRiga[];
  cliente_id: string;
  azienda_id: string;
  status: "bozza" | "da_confermare" | "confermato";
  sourceFileId: string;
};

type FileItem = {
  id: string;
  file: File;
  status: "queued" | "analyzing" | "done" | "error" | "attachment";
  error?: string;
  documentType?: string;
  orders: ParsedOrder[];
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienti: Cliente[];
  aziende: Azienda[];
  prodotti: Prodotto[];
  onCreateOrder: (order: {
    cliente_id: string; azienda_id: string; data_ordine: string;
    sconto: number; sconto_merce: number; tipo_pagamento: string;
    totale: number; note: string;
    righe: { prodotto_id: string; quantita_pezzi: number; quantita_cartoni: number; prezzo_unitario: number; sc1: number; sc2: number; sc3: number; is_omaggio?: boolean }[];
  }) => Promise<void>;
  onProductsCreated?: () => void;
}

const fmtEur = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n || 0);

const normCode = (s?: string | null) =>
  (s || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "").replace(/^0+/, "");
const normName = (s?: string | null) =>
  (s || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

const tokens = (s: string) => normName(s).split(" ").filter((t) => t.length >= 2);

function matchProdotto(riga: ParsedRiga, pool: Prodotto[], all: Prodotto[]): Prodotto | undefined {
  const rCode = normCode(riga.codice_prodotto);
  const rName = normName(riga.nome_prodotto);
  const rTok = tokens(riga.nome_prodotto);
  const tryIn = (p: Prodotto[]) => {
    if (rCode) { const x = p.find(q => q.codice && normCode(q.codice) === rCode); if (x) return x; }
    if (rName) { const x = p.find(q => normName(q.nome) === rName); if (x) return x; }
    if (!rTok.length) return undefined;
    let best: { p: Prodotto; s: number } | null = null;
    for (const q of p) {
      const t = tokens(q.nome); if (!t.length) continue;
      const c = rTok.filter(x => t.includes(x)).length;
      const r = c / Math.min(rTok.length, t.length);
      if (c >= 2 && r >= 0.6 && (!best || r > best.s)) best = { p: q, s: r };
    }
    return best?.p;
  };
  return tryIn(pool) || tryIn(all);
}

function rid() { return Math.random().toString(36).slice(2, 10); }

async function fileToBase64(file: File): Promise<string> {
  return await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function MultiFileImportDialog({
  open, onOpenChange, clienti, aziende, prodotti, onCreateOrder, onProductsCreated,
}: Props) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [localProdotti, setLocalProdotti] = useState<Prodotto[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const allProdotti = useMemo(() => [...prodotti, ...localProdotti], [prodotti, localProdotti]);

  const reset = () => {
    setFiles([]); setExpanded({}); setLocalProdotti([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const allOrders = files.flatMap(f => f.orders);

  function autoFillOrder(o: ParsedOrder): ParsedOrder {
    // match cliente
    let cliente_id = o.cliente_id;
    if (!cliente_id && o.cliente_nome) {
      const lc = o.cliente_nome.toLowerCase();
      const m = clienti.find(c =>
        c.nome.toLowerCase().includes(lc) || lc.includes(c.nome.toLowerCase()) ||
        (c.azienda && (c.azienda.toLowerCase().includes(lc) || lc.includes(c.azienda.toLowerCase())))
      );
      if (m) cliente_id = m.id;
    }
    let azienda_id = o.azienda_id;
    if (!azienda_id && o.azienda_nome) {
      const la = o.azienda_nome.toLowerCase();
      const m = aziende.find(a =>
        a.nome.toLowerCase().includes(la) || la.includes(a.nome.toLowerCase())
      );
      if (m) azienda_id = m.id;
    }
    const aziendaProd = azienda_id ? allProdotti.filter(p => p.azienda_id === azienda_id) : [];
    const righe = o.righe.map(r => {
      const m = azienda_id ? matchProdotto(r, aziendaProd, allProdotti) : undefined;
      let listinoWarning: string | undefined;
      if (m && !r.is_omaggio && r.prezzo_per_cartone > 0) {
        const expected = (m.prezzo_listino || 0) * (m.pezzi_per_cartone || 1);
        if (expected > 0) {
          const diff = Math.abs(r.prezzo_per_cartone - expected) / expected;
          if (diff > 0.05) {
            listinoWarning = `Prezzo diverso dal listino (${fmtEur(expected)})`;
          }
        }
      }
      return { ...r, prodotto_id: m?.id || "", createNew: !m, listinoWarning };
    });
    const status: ParsedOrder["status"] =
      cliente_id && azienda_id && righe.some(r => r.prodotto_id || r.createNew)
        ? "da_confermare" : "bozza";
    return { ...o, cliente_id, azienda_id, righe, status };
  }

  const handleFiles = async (selected: FileList | null) => {
    if (!selected || !selected.length) return;
    const arr = Array.from(selected).slice(0, 10);
    const items: FileItem[] = arr.map(f => ({
      id: rid(), file: f, status: "queued", orders: [],
    }));
    setFiles(prev => [...prev, ...items]);

    // process with concurrency 3
    const queue = [...items];
    const workers = Array(3).fill(0).map(async () => {
      while (queue.length) {
        const it = queue.shift()!;
        await processFile(it);
      }
    });
    await Promise.all(workers);
  };

  const processFile = async (item: FileItem) => {
    setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: "analyzing" } : f));
    try {
      const f = item.file;
      const name = f.name.toLowerCase();
      const isPdf = f.type === "application/pdf" || name.endsWith(".pdf");
      const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls") ||
        f.type.includes("spreadsheet") || f.type === "application/vnd.ms-excel";
      const isImage = f.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|heic)$/.test(name);

      if (f.size > 15 * 1024 * 1024) throw new Error("File troppo grande (max 15MB)");
      if (!isPdf && !isExcel && !isImage) throw new Error("Formato non supportato");

      let payload: any;
      if (isExcel) {
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array", cellDates: true, cellNF: true, cellStyles: false });
        const parts: string[] = [];
        for (const s of wb.SheetNames) {
          const sheet = wb.Sheets[s];
          // rawNumbers:false => percentages keep "30%", currency keeps formatted
          const csv = XLSX.utils.sheet_to_csv(sheet, {
            FS: "\t",
            blankrows: false,
            rawNumbers: false,
            strip: false,
          });
          if (!csv.trim()) continue;
          // Annotate each row with row number to help the AI map columns
          const annotated = csv
            .split("\n")
            .map((row, i) => `R${i + 1}\t${row}`)
            .join("\n");
          parts.push(`### Foglio: ${s}\n${annotated}`);
        }
        payload = { sheetText: parts.join("\n\n"), fileName: f.name };
      } else {
        const b64 = await fileToBase64(f);
        payload = { fileBase64: b64, mimeType: f.type || (isPdf ? "application/pdf" : "image/jpeg"), fileName: f.name };
      }

      const { data, error } = await supabase.functions.invoke("parse-order-multi", { body: payload });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Errore analisi");

      const dt = data.data.document_type || "order";
      const rawOrders: any[] = Array.isArray(data.data.orders) ? data.data.orders : [];
      const orders: ParsedOrder[] = rawOrders.map((o: any) => autoFillOrder({
        id: rid(),
        sourceFileId: item.id,
        data_ordine: o.data_ordine || new Date().toISOString().slice(0, 10),
        cliente_nome: o.cliente_nome || null,
        azienda_nome: o.azienda_nome || null,
        tipo_pagamento: o.tipo_pagamento || "Bonifico",
        sconto_pagamento_percentuale: Number(o.sconto_pagamento_percentuale) || 0,
        sconto_merce: Number(o.sconto_merce) || 0,
        imponibile_totale: Number(o.imponibile_totale) || 0,
        note: o.note || null,
        warnings: Array.isArray(o.warnings) ? o.warnings : [],
        cliente_id: "", azienda_id: "", status: "bozza",
        righe: (o.righe || []).map((r: any) => ({
          codice_prodotto: r.codice_prodotto || null,
          nome_prodotto: r.nome_prodotto || "",
          quantita_cartoni: Number(r.quantita_cartoni) || 0,
          pezzi_per_cartone: Number(r.pezzi_per_cartone) || undefined,
          prezzo_per_cartone: r.is_omaggio ? 0 : (Number(r.prezzo_per_cartone) || 0),
          sc1: Number(r.sc1) || 0, sc2: Number(r.sc2) || 0, sc3: Number(r.sc3) || 0,
          is_omaggio: !!r.is_omaggio,
          importo_riga: Number(r.importo_riga) || 0,
          confidence: r.confidence || "medium",
          warning: r.warning || null,
          unita_originale: r.unita_originale || "cartoni",
        })).filter((r: ParsedRiga) => r.quantita_cartoni > 0 || r.is_omaggio),
      }));

      setFiles(prev => prev.map(x => x.id === item.id ? {
        ...x,
        status: dt === "order" && orders.length ? "done" : "attachment",
        documentType: dt, orders,
      } : x));
      // auto-expand new orders
      setExpanded(prev => {
        const np = { ...prev };
        orders.forEach(o => { np[o.id] = true; });
        return np;
      });

      if (dt !== "order") {
        toast.info(`${f.name}: ${dt === "price_list" ? "listino" : dt === "promo" ? "promo" : "allegato"} (nessun ordine)`);
      } else if (orders.length > 1) {
        toast.success(`${f.name}: rilevati ${orders.length} ordini distinti`);
      } else if (orders.length === 1) {
        toast.success(`${f.name}: ordine analizzato`);
      } else {
        toast.warning(`${f.name}: nessun ordine rilevato`);
      }
    } catch (e: any) {
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: "error", error: e.message } : f));
      toast.error(`${item.file.name}: ${e.message}`);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateOrder = (orderId: string, patch: Partial<ParsedOrder>) => {
    setFiles(prev => prev.map(f => ({
      ...f,
      orders: f.orders.map(o => o.id === orderId ? autoFillOrder({ ...o, ...patch }) : o),
    })));
  };

  const updateRiga = (orderId: string, idx: number, patch: Partial<ParsedRiga>) => {
    setFiles(prev => prev.map(f => ({
      ...f,
      orders: f.orders.map(o => o.id === orderId ? {
        ...o,
        righe: o.righe.map((r, i) => i === idx ? { ...r, ...patch } : r),
      } : o),
    })));
  };

  const removeRiga = (orderId: string, idx: number) => {
    setFiles(prev => prev.map(f => ({
      ...f,
      orders: f.orders.map(o => o.id === orderId ? {
        ...o, righe: o.righe.filter((_, i) => i !== idx),
      } : o),
    })));
  };

  const removeOrder = (orderId: string) => {
    setFiles(prev => prev.map(f => ({
      ...f, orders: f.orders.filter(o => o.id !== orderId),
    })));
  };

  const splitOrder = (orderId: string) => {
    // duplica l'ordine: ogni nuovo ordine eredita meta ma righe vuote -> sposti manualmente
    setFiles(prev => prev.map(f => {
      const idx = f.orders.findIndex(o => o.id === orderId);
      if (idx < 0) return f;
      const src = f.orders[idx];
      const half = Math.ceil(src.righe.length / 2);
      const a = { ...src, id: rid(), righe: src.righe.slice(0, half) };
      const b = { ...src, id: rid(), righe: src.righe.slice(half) };
      const next = [...f.orders];
      next.splice(idx, 1, a, b);
      return { ...f, orders: next };
    }));
    toast.success("Ordine diviso in due. Modifica le righe come necessario.");
  };

  const createMissingProductsFor = async (orderId: string) => {
    const order = allOrders.find(o => o.id === orderId);
    if (!order || !order.azienda_id) {
      toast.error("Seleziona prima un'azienda fornitrice");
      return;
    }
    const toCreate = order.righe.filter(r => r.createNew && !r.prodotto_id);
    if (!toCreate.length) { toast.info("Nessun prodotto da creare"); return; }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");
      const created: Prodotto[] = [];
      for (const r of toCreate) {
        const ppc = r.pezzi_per_cartone && r.pezzi_per_cartone > 0 ? r.pezzi_per_cartone : 1;
        const { data, error } = await supabase.from("prodotti").insert({
          nome: r.nome_prodotto,
          codice: r.codice_prodotto,
          azienda_id: order.azienda_id,
          prezzo_listino: ppc > 0 ? Number((r.prezzo_per_cartone / ppc).toFixed(4)) : r.prezzo_per_cartone,
          pezzi_per_cartone: ppc,
          user_id: user.id,
        }).select().single();
        if (error) throw error;
        created.push(data as Prodotto);
      }
      setLocalProdotti(prev => [...prev, ...created]);
      // re-map quel singolo ordine
      setFiles(prev => prev.map(f => ({
        ...f,
        orders: f.orders.map(o => {
          if (o.id !== orderId) return o;
          const pool = [...allProdotti, ...created].filter(p => p.azienda_id === order.azienda_id);
          return {
            ...o,
            righe: o.righe.map(r => {
              if (r.prodotto_id) return r;
              const m = matchProdotto(r, pool, [...allProdotti, ...created]);
              return { ...r, prodotto_id: m?.id || "", createNew: !m };
            }),
          };
        }),
      })));
      toast.success(`${created.length} prodotti creati`);
      onProductsCreated?.();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const canConfirm = (o: ParsedOrder) =>
    !!o.cliente_id && !!o.azienda_id && o.righe.length > 0 &&
    o.righe.every(r => !!r.prodotto_id) &&
    o.righe.every(r => r.is_omaggio || r.prezzo_per_cartone > 0);

  const saveAll = async () => {
    const confirmable = allOrders.filter(canConfirm);
    if (!confirmable.length) {
      toast.error("Nessun ordine pronto. Completa cliente, azienda, prodotti e prezzi.");
      return;
    }
    setIsSaving(true);
    let ok = 0, ko = 0;
    for (const o of confirmable) {
      try {
        const totale = o.righe.reduce((s, r) => {
          if (r.is_omaggio) return s;
          const base = r.quantita_cartoni * r.prezzo_per_cartone;
          const n = base * (1 - (r.sc1 || 0) / 100) * (1 - (r.sc2 || 0) / 100) * (1 - (r.sc3 || 0) / 100);
          return s + n;
        }, 0);
        const dopoMerce = Math.max(0, totale - (o.sconto_merce || 0));
        const finale = dopoMerce * (1 - (o.sconto_pagamento_percentuale || 0) / 100);
        await onCreateOrder({
          cliente_id: o.cliente_id,
          azienda_id: o.azienda_id,
          data_ordine: o.data_ordine || new Date().toISOString().slice(0, 10),
          sconto: o.sconto_pagamento_percentuale,
          sconto_merce: o.sconto_merce,
          tipo_pagamento: o.tipo_pagamento || "Bonifico",
          totale: Number(finale.toFixed(2)),
          note: o.note || "",
          righe: o.righe.filter(r => r.prodotto_id).map(r => ({
            prodotto_id: r.prodotto_id!,
            quantita_pezzi: 0,
            quantita_cartoni: r.quantita_cartoni,
            prezzo_unitario: r.is_omaggio ? 0 : r.prezzo_per_cartone,
            sc1: r.sc1 || 0, sc2: r.sc2 || 0, sc3: r.sc3 || 0,
            is_omaggio: r.is_omaggio,
          })),
        });
        ok++;
      } catch (e) {
        console.error(e); ko++;
      }
    }
    setIsSaving(false);
    if (ok) toast.success(`${ok} ordini salvati`);
    if (ko) toast.error(`${ko} ordini falliti`);
    if (ok && !ko) { reset(); onOpenChange(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="w-full max-w-6xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importa ordini da file
          </DialogTitle>
          <DialogDescription>
            Carica uno o più file (PDF, immagini, Excel). Ogni file diventa un ordine separato, salvo unione manuale.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Upload zone */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center bg-muted/30">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Trascina qui i file oppure clicca per selezionarne fino a 10
            </p>
            <Input
              ref={inputRef}
              type="file"
              multiple
              accept="application/pdf,.pdf,.xlsx,.xls,image/*,.jpg,.jpeg,.png,.webp,.heic"
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
              id="multi-upload-input"
            />
            <Button asChild variant="outline">
              <label htmlFor="multi-upload-input" className="cursor-pointer">Seleziona file</label>
            </Button>
          </div>

          {/* File queue */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">File caricati ({files.length})</Label>
              <div className="border rounded-lg divide-y">
                {files.map(f => (
                  <div key={f.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {f.file.type.startsWith("image/") ? <ImageIcon className="h-4 w-4 shrink-0" />
                        : f.file.name.toLowerCase().endsWith(".pdf") ? <FileText className="h-4 w-4 shrink-0" />
                          : <FileSpreadsheet className="h-4 w-4 shrink-0" />}
                      <span className="truncate">{f.file.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {f.status === "analyzing" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                      {f.status === "queued" && <Badge variant="outline">In coda</Badge>}
                      {f.status === "done" && <Badge variant="default">{f.orders.length} ordine{f.orders.length !== 1 ? "i" : ""}</Badge>}
                      {f.status === "attachment" && <Badge variant="secondary">{f.documentType || "allegato"}</Badge>}
                      {f.status === "error" && <Badge variant="destructive" title={f.error}>Errore</Badge>}
                      <Button size="icon" variant="ghost" onClick={() => removeFile(f.id)} className="h-7 w-7">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orders review */}
          {allOrders.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm">Ordini rilevati ({allOrders.length})</Label>
              {allOrders.map((o, oi) => {
                const fileItem = files.find(f => f.id === o.sourceFileId);
                const isExpanded = expanded[o.id] ?? true;
                const ready = canConfirm(o);
                const aziendaProd = o.azienda_id ? allProdotti.filter(p => p.azienda_id === o.azienda_id) : [];
                const unmapped = o.righe.filter(r => !r.prodotto_id && r.createNew).length;
                return (
                  <div key={o.id} className={cn(
                    "border rounded-lg bg-card",
                    ready ? "border-success/40" : "border-warning/40"
                  )}>
                    <div className="flex items-center justify-between gap-2 p-3 border-b">
                      <button
                        className="flex items-center gap-2 flex-1 text-left min-w-0"
                        onClick={() => setExpanded(e => ({ ...e, [o.id]: !isExpanded }))}
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="font-semibold">Ordine {oi + 1}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {o.cliente_nome || "cliente da assegnare"} · {o.righe.length} righe · {fileItem?.file.name}
                        </span>
                      </button>
                      <div className="flex items-center gap-1">
                        {ready
                          ? <Badge variant="default" className="gap-1"><Check className="h-3 w-3" />Pronto</Badge>
                          : <Badge variant="outline" className="gap-1 border-warning text-warning"><AlertTriangle className="h-3 w-3" />Da completare</Badge>}
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => splitOrder(o.id)} title="Dividi in due ordini">
                          <Split className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeOrder(o.id)} title="Rimuovi ordine">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-3 space-y-3">
                        {/* AI warnings */}
                        {o.warnings?.length > 0 && (
                          <div className="rounded-md border border-warning/40 bg-warning/5 p-2 text-xs text-warning-foreground">
                            <div className="font-medium mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Segnalazioni AI</div>
                            <ul className="list-disc ml-4 space-y-0.5">
                              {o.warnings.map((w, i) => <li key={i}>{w}</li>)}
                            </ul>
                          </div>
                        )}

                        {/* Header form */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs">Data</Label>
                            <Input type="date" value={o.data_ordine || ""}
                              onChange={e => updateOrder(o.id, { data_ordine: e.target.value })} />
                          </div>
                          <div>
                            <Label className="text-xs">
                              Cliente {o.cliente_nome && <span className="text-muted-foreground">({o.cliente_nome})</span>}
                            </Label>
                            <Select value={o.cliente_id} onValueChange={v => updateOrder(o.id, { cliente_id: v })}>
                              <SelectTrigger><SelectValue placeholder="Seleziona cliente" /></SelectTrigger>
                              <SelectContent>
                                {clienti.map(c => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.nome}{c.azienda ? ` (${c.azienda})` : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">
                              Azienda {o.azienda_nome && <span className="text-muted-foreground">({o.azienda_nome})</span>}
                            </Label>
                            <Select value={o.azienda_id} onValueChange={v => updateOrder(o.id, { azienda_id: v })}>
                              <SelectTrigger><SelectValue placeholder="Seleziona azienda" /></SelectTrigger>
                              <SelectContent>
                                {aziende.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Pagamento</Label>
                            <Input value={o.tipo_pagamento || ""} onChange={e => updateOrder(o.id, { tipo_pagamento: e.target.value })} />
                          </div>
                          <div>
                            <Label className="text-xs">Sconto pag. %</Label>
                            <Input type="number" step="0.01" value={o.sconto_pagamento_percentuale}
                              onChange={e => updateOrder(o.id, { sconto_pagamento_percentuale: Number(e.target.value) || 0 })} />
                          </div>
                          <div>
                            <Label className="text-xs">Sconto merce €</Label>
                            <Input type="number" step="0.01" value={o.sconto_merce}
                              onChange={e => updateOrder(o.id, { sconto_merce: Number(e.target.value) || 0 })} />
                          </div>
                        </div>

                        {/* Righe */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Righe ({o.righe.length})</Label>
                            {unmapped > 0 && o.azienda_id && (
                              <Button size="sm" variant="outline" onClick={() => createMissingProductsFor(o.id)}>
                                <Plus className="h-3 w-3 mr-1" /> Crea {unmapped} prodotti mancanti
                              </Button>
                            )}
                          </div>
                          <div className="border rounded-md overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-16">Conf.</TableHead>
                                  <TableHead>Prodotto file</TableHead>
                                  <TableHead className="w-56">Associa a</TableHead>
                                  <TableHead className="w-20 text-right">Cartoni</TableHead>
                                  <TableHead className="w-28 text-right">€/Cartone</TableHead>
                                  <TableHead className="w-16 text-right">Sc1%</TableHead>
                                  <TableHead className="w-16 text-right">Sc2%</TableHead>
                                  <TableHead className="w-16 text-right">Sc3%</TableHead>
                                  <TableHead className="w-16">Om.</TableHead>
                                  <TableHead className="w-8"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {o.righe.map((r, idx) => (
                                  <TableRow key={idx} className={cn(
                                    r.is_omaggio && "bg-success/10",
                                    r.confidence === "low" && "bg-destructive/5",
                                  )}>
                                    <TableCell>
                                      <Badge variant={r.confidence === "high" ? "default" : r.confidence === "medium" ? "secondary" : "destructive"} className="text-[10px]">
                                        {r.confidence || "med"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      <div className="font-medium">{r.nome_prodotto}</div>
                                      {r.codice_prodotto && <div className="font-mono text-[10px] text-muted-foreground">{r.codice_prodotto}</div>}
                                      {(r.warning || r.listinoWarning) && (
                                        <div className="text-[10px] text-warning flex items-start gap-1 mt-0.5">
                                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                                          <span>{[r.warning, r.listinoWarning].filter(Boolean).join(" · ")}</span>
                                        </div>
                                      )}
                                      {r.unita_originale && r.unita_originale !== "cartoni" && (
                                        <div className="text-[10px] text-muted-foreground">Originale: {r.unita_originale}</div>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {r.createNew && !r.prodotto_id ? (
                                        <span className="text-xs italic text-muted-foreground">Verrà creato</span>
                                      ) : (
                                        <Select value={r.prodotto_id || ""} onValueChange={v => updateRiga(o.id, idx, { prodotto_id: v, createNew: false })} disabled={!o.azienda_id}>
                                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                                          <SelectContent>
                                            {aziendaProd.map(p => (
                                              <SelectItem key={p.id} value={p.id} className="text-xs">
                                                {p.codice ? `[${p.codice}] ` : ""}{p.nome}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Input type="number" step="1" className="h-8 text-right" value={r.quantita_cartoni}
                                        onChange={e => updateRiga(o.id, idx, { quantita_cartoni: Number(e.target.value) || 0 })} />
                                    </TableCell>
                                    <TableCell>
                                      <Input type="number" step="0.01" className="h-8 text-right" value={r.prezzo_per_cartone}
                                        disabled={r.is_omaggio}
                                        onChange={e => updateRiga(o.id, idx, { prezzo_per_cartone: Number(e.target.value) || 0 })} />
                                    </TableCell>
                                    <TableCell>
                                      <Input type="number" step="0.1" className="h-8 text-right" value={r.sc1 || 0}
                                        onChange={e => updateRiga(o.id, idx, { sc1: Number(e.target.value) || 0 })} />
                                    </TableCell>
                                    <TableCell>
                                      <Input type="number" step="0.1" className="h-8 text-right" value={r.sc2 || 0}
                                        onChange={e => updateRiga(o.id, idx, { sc2: Number(e.target.value) || 0 })} />
                                    </TableCell>
                                    <TableCell>
                                      <Input type="number" step="0.1" className="h-8 text-right" value={r.sc3 || 0}
                                        onChange={e => updateRiga(o.id, idx, { sc3: Number(e.target.value) || 0 })} />
                                    </TableCell>
                                    <TableCell className="text-center">
                                      <input type="checkbox" checked={!!r.is_omaggio}
                                        onChange={e => updateRiga(o.id, idx, { is_omaggio: e.target.checked, prezzo_per_cartone: e.target.checked ? 0 : r.prezzo_per_cartone })} />
                                    </TableCell>
                                    <TableCell>
                                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeRiga(o.id, idx)}>
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs">Note</Label>
                          <Textarea rows={2} value={o.note || ""} onChange={e => updateOrder(o.id, { note: e.target.value })} />
                        </div>

                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Imponibile AI: <span className="font-medium text-foreground">{fmtEur(o.imponibile_totale)}</span></span>
                          <span>Calcolato: <span className="font-medium text-foreground">
                            {fmtEur(
                              (() => {
                                const tot = o.righe.reduce((s, r) => {
                                  if (r.is_omaggio) return s;
                                  const base = r.quantita_cartoni * r.prezzo_per_cartone;
                                  return s + base * (1 - (r.sc1 || 0) / 100) * (1 - (r.sc2 || 0) / 100) * (1 - (r.sc3 || 0) / 100);
                                }, 0);
                                return Math.max(0, tot - (o.sconto_merce || 0)) * (1 - (o.sconto_pagamento_percentuale || 0) / 100);
                              })()
                            )}
                          </span></span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <div className="text-xs text-muted-foreground mr-auto">
            {allOrders.length > 0 && (
              <>Pronti {allOrders.filter(canConfirm).length} / {allOrders.length}</>
            )}
          </div>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Annulla</Button>
          <Button onClick={saveAll} disabled={isSaving || !allOrders.some(canConfirm)}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salva ordini pronti
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
