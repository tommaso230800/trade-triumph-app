import { Fragment, useMemo, useState } from "react";
import { useAziende } from "@/hooks/useAziende";
import { useOrdini } from "@/hooks/useOrdini";
import {
  useEstratti,
  useEstrattoRighe,
  useUploadEstratto,
  useUpdateRiga,
  useDeleteEstratto,
  useRunMatching,
  useLinkOrdine,
  useMarkVerificata,
  getEstrattoSignedUrl,
  EstrattoDoc,
  EstrattoRiga,
  MATCH_STATUS_LABEL,
  ESITO_LABEL,
  AZIONE_LABEL,
} from "@/hooks/useRiconciliazione";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Upload, FileText, Trash2, RefreshCw, MoreVertical, ExternalLink, Sparkles, AlertTriangle, ChevronDown, CheckCircle2, Link2, XCircle } from "lucide-react";
import { toast } from "sonner";

const TIPI_DOC = [
  { v: "principale", l: "Estratto principale" },
  { v: "integrativo", l: "Estratto integrativo" },
  { v: "rettifica", l: "Rettifica" },
  { v: "conguaglio", l: "Conguaglio" },
  { v: "nota_credito", l: "Nota di credito" },
  { v: "premi_bonus", l: "Riepilogo premi/bonus" },
  { v: "altro", l: "Altro" },
];
const TRIMESTRI = [
  { v: 1, l: "1° trimestre (gen–mar)" },
  { v: 2, l: "2° trimestre (apr–giu)" },
  { v: 3, l: "3° trimestre (lug–set)" },
  { v: 4, l: "4° trimestre (ott–dic)" },
];

function formatEuro(n?: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}
function signedEuro(n?: number | null) {
  if (n == null) return "—";
  const s = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", signDisplay: "exceptZero" }).format(n);
  return s;
}

const STATUS_CLS: Record<string, string> = {
  esatta_confermata: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  esatta: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  probabile: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  multipli: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  mancante_crm: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  mancante_pdf: "bg-red-500/15 text-red-600 border-red-500/30",
  straordinaria: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  bonus: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  ignorata: "bg-muted text-muted-foreground border-muted",
  da_verificare: "bg-muted text-muted-foreground border-muted",
  verificata: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
};

function StatusBadge({ status, verified }: { status: string; verified?: boolean }) {
  const key = verified ? "verificata" : status;
  const label = verified ? "Verificata manualmente" : (MATCH_STATUS_LABEL[status] ?? "Da verificare");
  return <Badge variant="outline" className={STATUS_CLS[key] ?? STATUS_CLS.da_verificare}>{label}</Badge>;
}

function EsitoBadge({ esito }: { esito: string | null }) {
  if (!esito) return null;
  const cls = esito === "corretto" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
    : esito === "extra" ? "bg-blue-500/15 text-blue-600 border-blue-500/30"
    : esito === "dati_insufficienti" ? "bg-muted text-muted-foreground border-muted"
    : "bg-red-500/15 text-red-600 border-red-500/30";
  return <Badge variant="outline" className={cls}>{ESITO_LABEL[esito] ?? esito}</Badge>;
}

// ---------- Upload dialog (invariato) ----------

function UploadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const { data: aziende } = useAziende();
  const upload = useUploadEstratto();
  const now = new Date();
  const [aziendaId, setAziendaId] = useState<string>("");
  const [anno, setAnno] = useState<number>(now.getFullYear());
  const [trimestre, setTrimestre] = useState<number>(Math.floor(now.getMonth() / 3) + 1);
  const [tipoDoc, setTipoDoc] = useState<string>("principale");
  const [dataDoc, setDataDoc] = useState<string>(now.toISOString().slice(0, 10));
  const [dataPag, setDataPag] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  const submit = async (force = false) => {
    if (!file) return toast.error("Seleziona un PDF");
    try {
      await upload.mutateAsync({
        file, azienda_id: aziendaId || null, anno, trimestre,
        tipo_documento: tipoDoc, data_documento: dataDoc || null,
        data_pagamento: dataPag || null, forceDuplicate: force,
      });
      onOpenChange(false);
      setFile(null);
    } catch (e: any) {
      if (e?.code === "DUPLICATE" && confirm(`Un documento simile ("${e.existingName}") è già stato importato. Caricare comunque?`)) {
        submit(true);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Carica estratto conto provvigionale</DialogTitle>
          <DialogDescription>L'AI analizzerà il PDF ed estrarrà le righe di provvigione. Nessuna modifica automatica al CRM.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Azienda mandante</Label>
              <Select value={aziendaId} onValueChange={setAziendaId}>
                <SelectTrigger><SelectValue placeholder="Seleziona azienda" /></SelectTrigger>
                <SelectContent>
                  {(aziende || []).map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo di documento</Label>
              <Select value={tipoDoc} onValueChange={setTipoDoc}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPI_DOC.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Anno</Label><Input type="number" value={anno} onChange={(e) => setAnno(Number(e.target.value))} /></div>
            <div>
              <Label>Trimestre</Label>
              <Select value={String(trimestre)} onValueChange={(v) => setTrimestre(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIMESTRI.map((t) => <SelectItem key={t.v} value={String(t.v)}>{t.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Data documento</Label><Input type="date" value={dataDoc} onChange={(e) => setDataDoc(e.target.value)} /></div>
            <div><Label>Data pagamento (opz.)</Label><Input type="date" value={dataPag} onChange={(e) => setDataPag(e.target.value)} /></div>
          </div>
          <div>
            <Label>File PDF</Label>
            <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            {file && <p className="text-xs text-muted-foreground mt-1">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={() => submit(false)} disabled={upload.isPending || !file}>
            {upload.isPending ? "Analisi in corso…" : "Carica e analizza"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Link ordine dialog ----------

function LinkOrdineDialog({ riga, open, onOpenChange }: { riga: EstrattoRiga | null; open: boolean; onOpenChange: (b: boolean) => void }) {
  const link = useLinkOrdine();
  const { data: ordini } = useOrdini();
  const [search, setSearch] = useState("");
  const suggested = (riga?.match_candidates as any[]) || [];
  const filtered = useMemo(() => {
    if (!search) return [];
    const s = search.toLowerCase();
    return (ordini || []).filter((o) =>
      o.codice.toLowerCase().includes(s) ||
      o.clienti?.nome?.toLowerCase().includes(s) ||
      o.clienti?.azienda?.toLowerCase().includes(s)
    ).slice(0, 20);
  }, [search, ordini]);

  if (!riga) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Collega a un ordine del CRM</DialogTitle>
          <DialogDescription>Riga PDF: {riga.cliente_nome || "—"} · {formatEuro(riga.imponibile)} imp · {formatEuro(riga.provvigione)} prov</DialogDescription>
        </DialogHeader>
        {suggested.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Ordini suggeriti</p>
            <div className="space-y-2">
              {suggested.map((c: any) => (
                <div key={c.id} className="flex items-start justify-between gap-2 border rounded p-2">
                  <div className="text-sm">
                    <div className="font-medium">{c.codice} · {c.cliente || "—"}</div>
                    <div className="text-xs text-muted-foreground">{c.data || "—"} · {formatEuro(c.totale)} · Affidabilità {c.score}%</div>
                    {Array.isArray(c.parts) && (
                      <ul className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
                        {c.parts.slice(0, 5).map((p: any, i: number) => (
                          <li key={i}>• {p.label} {p.pts > 0 ? `(+${p.pts})` : ""}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <Button size="sm" onClick={async () => { await link.mutateAsync({ rigaId: riga.id, ordineId: c.id }); onOpenChange(false); }}>
                    Collega questo ordine
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div>
          <Label>Cerca ordine</Label>
          <Input placeholder="Codice ordine, cliente…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
            {filtered.map((o) => (
              <div key={o.id} className="flex items-center justify-between border rounded p-2">
                <div className="text-sm">
                  <div className="font-medium">{o.codice} · {o.clienti?.nome || o.clienti?.azienda || "—"}</div>
                  <div className="text-xs text-muted-foreground">{o.data_ordine || "—"} · {formatEuro(Number(o.totale))}</div>
                </div>
                <Button size="sm" variant="outline" onClick={async () => { await link.mutateAsync({ rigaId: riga.id, ordineId: o.id }); onOpenChange(false); }}>Collega</Button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          {riga.ordine_id && (
            <Button variant="destructive" onClick={async () => { await link.mutateAsync({ rigaId: riga.id, ordineId: null }); onOpenChange(false); }}>Scollega</Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Chiudi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Verify dialog ----------

function VerifyDialog({ riga, open, onOpenChange }: { riga: EstrattoRiga | null; open: boolean; onOpenChange: (b: boolean) => void }) {
  const [nota, setNota] = useState("");
  const mark = useMarkVerificata();
  if (!riga) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Segna come verificata</DialogTitle>
          <DialogDescription>
            La riga non verrà più modificata dai ricalcoli automatici finché non la sblocchi esplicitamente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Nota (opzionale)</Label>
          <Input placeholder="Es. verificato con contabilità azienda" value={nota} onChange={(e) => setNota(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={async () => { await mark.mutateAsync({ id: riga.id, nota: nota || undefined }); onOpenChange(false); setNota(""); }}>
            Conferma verifica
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Row expanded panel ----------

function RowDetailPanel({ r }: { r: EstrattoRiga }) {
  const snap: any = r.ordine_snapshot;
  const pdfProv = r.provvigione ?? 0;
  const crmImp = snap?.totale ?? null;
  const crmAliq = r.aliquota; // se non abbiamo aliquota CRM assumiamo la stessa
  const crmProv = crmImp != null && r.aliquota != null ? crmImp * (r.aliquota / 100) : null;
  const diffProv = crmProv != null ? pdfProv - crmProv : null;

  const daysDiff = snap?.data && r.data_riga
    ? Math.round(Math.abs(new Date(snap.data).getTime() - new Date(r.data_riga).getTime()) / 86400000)
    : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 rounded-lg p-4">
      {/* PDF */}
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase text-muted-foreground">Estratto PDF azienda</div>
        <div className="text-sm space-y-1">
          <div><span className="text-muted-foreground">Cliente:</span> {r.cliente_nome || "—"}</div>
          <div><span className="text-muted-foreground">Codice cliente:</span> {r.cliente_codice || "—"}</div>
          <div><span className="text-muted-foreground">Fattura:</span> {r.numero_fattura || "—"}</div>
          <div><span className="text-muted-foreground">Ordine PDF:</span> {r.numero_ordine || "—"}</div>
          <div><span className="text-muted-foreground">Data:</span> {r.data_riga || "—"}</div>
          <div><span className="text-muted-foreground">Imponibile:</span> {formatEuro(r.imponibile)}</div>
          <div><span className="text-muted-foreground">Aliquota:</span> {r.aliquota != null ? `${r.aliquota}%` : "—"}</div>
          <div><span className="text-muted-foreground">Provvigione:</span> <b>{formatEuro(r.provvigione)}</b></div>
          {r.descrizione && <div className="text-xs text-muted-foreground italic">"{r.descrizione}"</div>}
        </div>
      </div>

      {/* CRM */}
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase text-muted-foreground">Ordine CRM {r.crm_only ? "(non nel PDF)" : "collegato"}</div>
        {snap ? (
          <div className="text-sm space-y-1">
            <div><span className="text-muted-foreground">Codice:</span> {snap.codice || "—"}</div>
            <div><span className="text-muted-foreground">Cliente:</span> {snap.cliente || "—"}</div>
            <div><span className="text-muted-foreground">Data:</span> {snap.data || "—"}</div>
            <div><span className="text-muted-foreground">Imponibile:</span> {formatEuro(snap.totale)}</div>
            <div><span className="text-muted-foreground">Provvigione attesa:</span> {crmProv != null ? formatEuro(crmProv) : "—"}</div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground italic">Nessun ordine collegato.</div>
        )}
      </div>

      {/* Differenze */}
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase text-muted-foreground">Differenze</div>
        <div className="text-sm space-y-1">
          <div className="flex justify-between"><span>Imponibile</span><span>{r.imponibile != null && crmImp != null ? signedEuro(r.imponibile - crmImp) : "—"}</span></div>
          <div className="flex justify-between"><span>Provvigione</span><span className={diffProv == null ? "" : Math.abs(diffProv) < 0.01 ? "text-emerald-600" : diffProv < 0 ? "text-red-600 font-medium" : "text-blue-600 font-medium"}>{diffProv != null ? signedEuro(diffProv) : "—"}</span></div>
          {daysDiff != null && <div className="flex justify-between"><span>Giorni fra date</span><span>{daysDiff}g</span></div>}
        </div>
        {diffProv != null && diffProv < -0.01 && (
          <div className="text-xs mt-2 p-2 rounded bg-red-500/10 border border-red-500/30 text-red-700">
            Possibile importo da recuperare: <b>{formatEuro(Math.abs(diffProv))}</b>
          </div>
        )}
        {Array.isArray(r.score_breakdown) && r.score_breakdown.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Motivo del punteggio ({r.match_score}%)</div>
            <ul className="text-xs space-y-0.5">
              {r.score_breakdown.map((p: any, i: number) => (
                <li key={i}>• {p.label} {p.pts > 0 ? <span className="text-emerald-600">+{p.pts}</span> : <span className="text-muted-foreground">0</span>}</li>
              ))}
            </ul>
          </div>
        )}
        {r.motivo && <div className="mt-2 text-xs text-muted-foreground italic">{r.motivo}</div>}
      </div>

      {/* Ordini candidati */}
      {r.match_status === "multipli" && Array.isArray(r.match_candidates) && (
        <div className="md:col-span-3">
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Ordini candidati</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(r.match_candidates as any[]).map((c) => (
              <div key={c.id} className="border rounded p-2 text-sm bg-background">
                <div className="flex justify-between items-center">
                  <div><b>{c.codice}</b> · {c.cliente || "—"}</div>
                  <Badge variant="outline">{c.score}%</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{c.data || "—"} · {formatEuro(c.totale)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Estratto righe (KPI + tabella) ----------

const FILTERS: { k: string; label: string; test: (r: EstrattoRiga) => boolean }[] = [
  { k: "tutte", label: "Tutte", test: () => true },
  { k: "esatte", label: "Esatte", test: (r) => r.match_status === "esatta" || r.match_status === "esatta_confermata" },
  { k: "probabili", label: "Probabili", test: (r) => r.match_status === "probabile" },
  { k: "mancanti_crm", label: "Mancanti nel CRM", test: (r) => r.match_status === "mancante_crm" },
  { k: "mancanti_pdf", label: "Mancanti nel PDF", test: (r) => r.crm_only || r.match_status === "mancante_pdf" },
  { k: "multipli", label: "Più compatibili", test: (r) => r.match_status === "multipli" },
  { k: "differenze", label: "Differenze economiche", test: (r) => !!r.esito_economico && !["corretto", "dati_insufficienti"].includes(r.esito_economico) },
  { k: "bonus", label: "Bonus / conguagli", test: (r) => r.match_status === "straordinaria" || r.match_status === "bonus" },
  { k: "da_verificare", label: "Da verificare", test: (r) => r.match_status === "da_verificare" },
  { k: "verificate", label: "Verificate", test: (r) => r.verificata },
];

function EstrattoRighe({ estratto }: { estratto: EstrattoDoc }) {
  const { data: righe } = useEstrattoRighe(estratto.id);
  const update = useUpdateRiga();
  const runMatch = useRunMatching();
  const [linkTarget, setLinkTarget] = useState<EstrattoRiga | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<EstrattoRiga | null>(null);
  const [filter, setFilter] = useState<string>("tutte");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [simpleView, setSimpleView] = useState<boolean>(() => localStorage.getItem("recon_view") === "simple");

  const toggleView = () => {
    const v = !simpleView;
    setSimpleView(v);
    localStorage.setItem("recon_view", v ? "simple" : "detailed");
  };

  const rows = righe || [];
  const stats = useMemo(() => {
    const s = {
      totalePdf: 0, totaleCrm: 0, riconciliato: 0, riconciliatoImp: 0,
      pdfNonCrm: 0, pdfNonCrmImp: 0,
      crmNonPdf: 0, crmNonPdfImp: 0,
      diffImp: 0, diffImpImporto: 0,
      diffAliq: 0, diffAliqImporto: 0,
      diffProv: 0, diffProvImporto: 0,
      recuperabile: 0,
      bonus: 0, bonusImp: 0,
      daVerificare: 0, daVerificareImp: 0,
    };
    for (const r of rows) {
      const p = Number(r.provvigione) || 0;
      if (r.crm_only) {
        s.crmNonPdf++; s.crmNonPdfImp += p || (Number(r.imponibile) * (Number(r.aliquota) || 0) / 100) || 0;
        s.totaleCrm += Number(r.imponibile) * ((Number(r.aliquota) || 0) / 100);
        s.recuperabile += Number(r.imponibile) * ((Number(r.aliquota) || 0) / 100);
      } else {
        s.totalePdf += p;
        if (r.ordine_id) s.totaleCrm += p;
        if (r.match_status === "esatta" || r.match_status === "esatta_confermata") { s.riconciliato++; s.riconciliatoImp += p; }
        if (r.match_status === "mancante_crm") { s.pdfNonCrm++; s.pdfNonCrmImp += p; }
        if (r.match_status === "straordinaria" || r.match_status === "bonus") { s.bonus++; s.bonusImp += p; }
        if (r.match_status === "da_verificare" || r.match_status === "probabile" || r.match_status === "multipli") { s.daVerificare++; s.daVerificareImp += p; }
        if (r.esito_economico === "diff_imponibile" || r.esito_economico === "diff_multiple") { s.diffImp++; s.diffImpImporto += p; }
        if (r.esito_economico === "diff_aliquota" || r.esito_economico === "diff_multiple") { s.diffAliq++; s.diffAliqImporto += p; }
        if (r.esito_economico === "diff_provvigione") { s.diffProv++; s.diffProvImporto += p; }
      }
    }
    return s;
  }, [rows]);

  const activeFilter = FILTERS.find((f) => f.k === filter) ?? FILTERS[0];
  const visible = rows.filter(activeFilter.test);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // ---- Selezione per conferma pagamento ----
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectableRows = rows.filter((r) => !r.crm_only && !r.pagata);
  const selectedRighe = rows.filter((r) => selected.has(r.id));
  const selectedTotal = selectedRighe.reduce((s, r) => s + (Number(r.provvigione) || 0), 0);

  const toggleSel = (id: string) => setSelected((p) => {
    const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const selectAllVisible = () => setSelected(new Set(visible.filter((r) => !r.crm_only && !r.pagata).map((r) => r.id)));
  const selectByPredicate = (fn: (r: EstrattoRiga) => boolean) => setSelected(new Set(selectableRows.filter(fn).map((r) => r.id)));
  const clearSel = () => setSelected(new Set());

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => runMatch.mutate({ estrattoId: estratto.id, aziendaId: estratto.azienda_id })} disabled={runMatch.isPending}>
          <RefreshCw className="h-4 w-4 mr-1" />
          {runMatch.isPending ? "Riconcilio…" : "Ricalcola riconciliazione"}
        </Button>
        <Button size="sm" variant="outline" onClick={toggleView}>
          {simpleView ? "Vista dettagliata" : "Vista semplice"}
        </Button>
        <div className="mx-2 h-6 w-px bg-border" />
        <span className="text-xs text-muted-foreground">Selezione rapida:</span>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={selectAllVisible}>Tutte visibili</Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => selectByPredicate((r) => r.match_status === "esatta" || r.match_status === "esatta_confermata" || r.match_status === "verificata")}>Corrispondenze esatte</Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => selectByPredicate((r) => r.verificata && r.match_status === "probabile")}>Probabili verificate</Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => selectByPredicate((r) => r.match_status === "bonus" || r.match_status === "straordinaria")}>Bonus/conguagli</Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clearSel}>Deseleziona tutte</Button>
      </div>


      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard active={filter === "tutte"} onClick={() => setFilter("tutte")} label="Totale estratto PDF" value={formatEuro(stats.totalePdf)} sub={`${rows.filter((r) => !r.crm_only).length} righe`} />
        <KpiCard active={filter === "esatte"} onClick={() => setFilter("esatte")} label="Riconciliato" value={formatEuro(stats.riconciliatoImp)} sub={`${stats.riconciliato} righe`} tone="green" />
        <KpiCard active={filter === "mancanti_crm"} onClick={() => setFilter("mancanti_crm")} label="Nel PDF, non nel CRM" value={formatEuro(stats.pdfNonCrmImp)} sub={`${stats.pdfNonCrm} righe`} tone="orange" />
        <KpiCard active={filter === "mancanti_pdf"} onClick={() => setFilter("mancanti_pdf")} label="Nel CRM, non nel PDF" value={formatEuro(stats.crmNonPdfImp)} sub={`${stats.crmNonPdf} righe · potenz. da recuperare`} tone="red" />
        <KpiCard active={filter === "differenze"} onClick={() => setFilter("differenze")} label="Differenze imponibile" value={formatEuro(stats.diffImpImporto)} sub={`${stats.diffImp} righe`} tone="yellow" />
        <KpiCard label="Differenze aliquota" value={formatEuro(stats.diffAliqImporto)} sub={`${stats.diffAliq} righe`} tone="yellow" />
        <KpiCard label="Differenze provvigione" value={formatEuro(stats.diffProvImporto)} sub={`${stats.diffProv} righe`} tone="yellow" />
        <KpiCard active={filter === "bonus"} onClick={() => setFilter("bonus")} label="Bonus / conguagli" value={formatEuro(stats.bonusImp)} sub={`${stats.bonus} righe`} tone="blue" />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            className={`text-xs px-2.5 py-1 rounded-full border transition ${filter === f.k ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border"}`}
          >
            {f.label} · {rows.filter(f.test).length}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="border rounded overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <input
                  type="checkbox"
                  checked={visible.filter((r) => !r.crm_only && !r.pagata).every((r) => selected.has(r.id)) && visible.filter((r) => !r.crm_only && !r.pagata).length > 0}
                  onChange={(e) => e.target.checked ? selectAllVisible() : clearSel()}
                />
              </TableHead>
              <TableHead className="w-6"></TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fattura PDF</TableHead>
              <TableHead>Data</TableHead>
              {!simpleView && <TableHead className="text-right">Imp. PDF</TableHead>}
              {!simpleView && <TableHead className="text-right">Aliq.</TableHead>}
              <TableHead className="text-right">Prov. PDF</TableHead>
              {!simpleView && <TableHead>Ordine CRM</TableHead>}
              {!simpleView && <TableHead className="text-right">Imp. CRM</TableHead>}
              {!simpleView && <TableHead className="text-right">Prov. CRM</TableHead>}
              <TableHead className="text-right">Δ Prov.</TableHead>
              <TableHead>Stato</TableHead>
              {!simpleView && <TableHead>Esito</TableHead>}
              <TableHead>Motivo</TableHead>
              <TableHead>Azione</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((r) => {
              const snap: any = r.ordine_snapshot;
              const crmImp = snap?.totale ?? null;
              const crmProv = crmImp != null && r.aliquota != null ? crmImp * (r.aliquota / 100) : null;
              const diffProv = crmProv != null && r.provvigione != null ? r.provvigione - crmProv : null;
              const diffCls = diffProv == null ? "" : Math.abs(diffProv) < 0.01 ? "text-emerald-600" : diffProv < 0 ? "text-red-600 font-medium" : "text-blue-600 font-medium";
              const isOpen = expanded.has(r.id);
              const isCrmOnly = r.crm_only;
              const rowCls = isCrmOnly ? "bg-red-500/5" : r.esito_economico && !["corretto", "dati_insufficienti"].includes(r.esito_economico) ? "bg-yellow-500/5" : "";
              return (
                <Fragment key={r.id}>
                  <TableRow className={rowCls}>
                    <TableCell className="p-1">
                      {!r.crm_only && !r.pagata && (
                        <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSel(r.id)} />
                      )}
                      {r.pagata && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    </TableCell>
                    <TableCell className="p-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleExpand(r.id)}>
                        <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
                      </Button>
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate">{r.cliente_nome || "—"}</TableCell>
                    <TableCell className="text-xs">{r.numero_fattura || r.numero_ordine || "—"}</TableCell>
                    <TableCell className="text-xs">{r.data_riga || "—"}</TableCell>
                    {!simpleView && <TableCell className="text-right">{formatEuro(r.imponibile)}</TableCell>}
                    {!simpleView && <TableCell className="text-right">{r.aliquota != null ? `${r.aliquota}%` : "—"}</TableCell>}
                    <TableCell className="text-right font-medium">{formatEuro(r.provvigione)}</TableCell>
                    {!simpleView && <TableCell className="text-xs">{snap?.codice || (isCrmOnly ? r.numero_ordine : "—")}</TableCell>}
                    {!simpleView && <TableCell className="text-right">{formatEuro(crmImp)}</TableCell>}
                    {!simpleView && <TableCell className="text-right">{formatEuro(crmProv)}</TableCell>}
                    <TableCell className={`text-right ${diffCls}`}>{diffProv != null ? signedEuro(diffProv) : "—"}</TableCell>
                    <TableCell><StatusBadge status={r.match_status} verified={r.verificata} /></TableCell>
                    {!simpleView && <TableCell><EsitoBadge esito={r.esito_economico} /></TableCell>}
                    <TableCell className="max-w-[220px]">
                      {r.motivo ? (
                        <TooltipProvider><Tooltip><TooltipTrigger asChild>
                          <span className="text-xs text-muted-foreground line-clamp-2 cursor-help">{r.motivo}</span>
                        </TooltipTrigger><TooltipContent className="max-w-sm">{r.motivo}</TooltipContent></Tooltip></TooltipProvider>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {r.azione_consigliata && r.azione_consigliata !== "nessuna" ? (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                          if (r.azione_consigliata === "collega" || r.azione_consigliata === "verifica") setLinkTarget(r);
                          else if (r.azione_consigliata === "classifica") update.mutate({ id: r.id, patch: { match_status: "bonus", tipo_movimento: "bonus" } });
                          else setLinkTarget(r);
                        }}>
                          {AZIONE_LABEL[r.azione_consigliata] ?? r.azione_consigliata}
                        </Button>
                      ) : <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />OK</span>}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setLinkTarget(r)}><Link2 className="h-4 w-4 mr-2" />Collega / cerca ordine</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setVerifyTarget(r)}><CheckCircle2 className="h-4 w-4 mr-2" />Segna come verificata</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => update.mutate({ id: r.id, patch: { match_status: "bonus", tipo_movimento: "bonus", ordine_id: null, match_score: 100, azione_consigliata: "nessuna", esito_economico: "corretto" } })}>Registra come bonus/premio</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => update.mutate({ id: r.id, patch: { match_status: "straordinaria", tipo_movimento: "conguaglio", ordine_id: null, match_score: 100, azione_consigliata: "nessuna" } })}>Registra come conguaglio</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => update.mutate({ id: r.id, patch: { match_status: "straordinaria", tipo_movimento: "rettifica", ordine_id: null, match_score: 100, azione_consigliata: "nessuna" } })}>Registra come rettifica</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => update.mutate({ id: r.id, patch: { match_status: "da_verificare", match_score: 0, azione_consigliata: "verifica" } })}>Segna da verificare</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => update.mutate({ id: r.id, patch: { match_status: "ignorata", note: "Ignorata dall'utente", azione_consigliata: "nessuna" } })}><XCircle className="h-4 w-4 mr-2" />Ignora riga</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow>
                      <TableCell colSpan={simpleView ? 9 : 16} className="p-2">
                        <RowDetailPanel r={r} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
            {visible.length === 0 && (
              <TableRow><TableCell colSpan={16} className="text-center text-muted-foreground py-6 text-sm">Nessuna riga per il filtro selezionato.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <LinkOrdineDialog riga={linkTarget} open={!!linkTarget} onOpenChange={(b) => !b && setLinkTarget(null)} />
      <VerifyDialog riga={verifyTarget} open={!!verifyTarget} onOpenChange={(b) => !b && setVerifyTarget(null)} />
    </div>
  );
}

// ---------- KPI card ----------

function KpiCard({ label, value, sub, tone, active, onClick }: { label: string; value: string; sub?: string; tone?: "green" | "orange" | "red" | "blue" | "yellow"; active?: boolean; onClick?: () => void }) {
  const toneCls = tone === "green" ? "border-emerald-500/40" : tone === "orange" ? "border-orange-500/40" : tone === "red" ? "border-red-500/40" : tone === "blue" ? "border-blue-500/40" : tone === "yellow" ? "border-yellow-500/40" : "border-border";
  const activeCls = active ? "ring-2 ring-primary" : "";
  return (
    <button type="button" onClick={onClick} disabled={!onClick} className={`text-left border rounded-lg p-3 bg-card transition hover:bg-muted/40 ${toneCls} ${activeCls}`}>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-base font-semibold mt-1">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </button>
  );
}

// ---------- Root section ----------

export function RiconciliazioneSection() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const { data: estratti } = useEstratti();
  const del = useDeleteEstratto();

  const totali = useMemo(() => {
    const list = estratti || [];
    return {
      docs: list.length,
      righe: list.reduce((s, e) => s + (e.num_righe || 0), 0),
      totale: list.reduce((s, e) => s + (Number(e.totale_dichiarato) || 0), 0),
    };
  }, [estratti]);

  const openPdf = async (path: string | null) => {
    if (!path) return;
    try {
      const url = await getEstrattoSignedUrl(path);
      window.open(url, "_blank");
    } catch (e: any) {
      toast.error("Errore apertura PDF: " + e.message);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Confronto Provvigioni Azienda vs CRM
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Carica gli estratti conto PDF ricevuti dalle aziende mandanti. Il sistema li confronta con gli ordini del CRM e segnala differenze, ordini dimenticati e movimenti straordinari. Nessuna modifica automatica al CRM.
            </p>
          </div>
          <Button onClick={() => setUploadOpen(true)} className="shrink-0">
            <Upload className="h-4 w-4 mr-2" /> Carica estratto conto provvigionale
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <KpiCard label="Documenti caricati" value={String(totali.docs)} />
            <KpiCard label="Righe totali" value={String(totali.righe)} />
            <KpiCard label="Totale dichiarato" value={formatEuro(totali.totale)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Estratti conto caricati</CardTitle></CardHeader>
        <CardContent>
          {(estratti || []).length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2 opacity-60" />
              Nessun estratto conto caricato. Usa il pulsante in alto per iniziare.
            </div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {(estratti || []).map((e) => (
                <AccordionItem key={e.id} value={e.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex-1 flex items-center justify-between gap-3 pr-3">
                      <div className="text-left">
                        <div className="font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {e.aziende?.nome || "Azienda ignota"} · {e.anno} · T{e.trimestre}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {e.tipo_documento} · {e.file_name || "—"} · {e.num_righe} righe · {formatEuro(Number(e.totale_dichiarato))}
                        </div>
                      </div>
                      <Badge variant="outline">{e.stato}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex justify-end gap-2 mb-2">
                      <Button size="sm" variant="ghost" onClick={() => openPdf(e.file_path)}>
                        <FileText className="h-4 w-4 mr-1" /> Apri PDF
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm("Eliminare questo estratto e tutte le sue righe?")) del.mutate(e.id); }}>
                        <Trash2 className="h-4 w-4 mr-1" /> Elimina
                      </Button>
                    </div>
                    <EstrattoRighe estratto={e} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}
