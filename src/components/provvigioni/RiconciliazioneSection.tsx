import { useMemo, useState } from "react";
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
  getEstrattoSignedUrl,
  EstrattoDoc,
  EstrattoRiga,
} from "@/hooks/useRiconciliazione";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Upload, FileText, Trash2, RefreshCw, MoreVertical, ExternalLink, Sparkles, AlertTriangle } from "lucide-react";
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

function MatchBadge({ status, score }: { status: string; score?: number }) {
  const map: Record<string, { label: string; cls: string }> = {
    esatta_confermata: { label: "Confermata", cls: "bg-green-500/15 text-green-600 border-green-500/30" },
    esatta: { label: "Esatta", cls: "bg-green-500/15 text-green-600 border-green-500/30" },
    probabile: { label: "Probabile", cls: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
    multipli: { label: "Più compatibili", cls: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
    mancante_crm: { label: "Manca nel CRM", cls: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
    straordinaria: { label: "Bonus/Straord.", cls: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
    anomalia: { label: "Anomalia", cls: "bg-red-500/15 text-red-600 border-red-500/30" },
    ignorata: { label: "Ignorata", cls: "bg-muted text-muted-foreground border-muted" },
    da_verificare: { label: "Da verificare", cls: "bg-muted text-muted-foreground border-muted" },
    bonus: { label: "Bonus", cls: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  };
  const info = map[status] ?? map.da_verificare;
  return (
    <Badge variant="outline" className={info.cls}>
      {info.label}{typeof score === "number" && score > 0 ? ` · ${score}%` : ""}
    </Badge>
  );
}

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
        file,
        azienda_id: aziendaId || null,
        anno,
        trimestre,
        tipo_documento: tipoDoc,
        data_documento: dataDoc || null,
        data_pagamento: dataPag || null,
        forceDuplicate: force,
      });
      onOpenChange(false);
      setFile(null);
    } catch (e: any) {
      if (e?.code === "DUPLICATE") {
        if (confirm(`Un documento simile ("${e.existingName}") è già stato importato. Caricare comunque?`)) {
          submit(true);
        }
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Carica estratto conto provvigionale</DialogTitle>
          <DialogDescription>
            L'AI analizzerà il PDF ed estrarrà automaticamente le righe di provvigione. Nessun dato verrà scritto nel CRM senza la tua conferma.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Azienda mandante</Label>
              <Select value={aziendaId} onValueChange={setAziendaId}>
                <SelectTrigger><SelectValue placeholder="Seleziona azienda" /></SelectTrigger>
                <SelectContent>
                  {(aziende || []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                  ))}
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
            <div>
              <Label>Anno</Label>
              <Input type="number" value={anno} onChange={(e) => setAnno(Number(e.target.value))} />
            </div>
            <div>
              <Label>Trimestre</Label>
              <Select value={String(trimestre)} onValueChange={(v) => setTrimestre(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIMESTRI.map((t) => <SelectItem key={t.v} value={String(t.v)}>{t.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data documento</Label>
              <Input type="date" value={dataDoc} onChange={(e) => setDataDoc(e.target.value)} />
            </div>
            <div>
              <Label>Data pagamento (opz.)</Label>
              <Input type="date" value={dataPag} onChange={(e) => setDataPag(e.target.value)} />
            </div>
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
                <div key={c.id} className="flex items-center justify-between border rounded p-2">
                  <div className="text-sm">
                    <div className="font-medium">{c.codice} · {c.cliente || "—"}</div>
                    <div className="text-xs text-muted-foreground">{c.data || "—"} · {formatEuro(c.totale)} · Affidabilità {c.score}%</div>
                  </div>
                  <Button size="sm" onClick={async () => { await link.mutateAsync({ rigaId: riga.id, ordineId: c.id }); onOpenChange(false); }}>
                    Collega
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
                <Button size="sm" variant="outline" onClick={async () => { await link.mutateAsync({ rigaId: riga.id, ordineId: o.id }); onOpenChange(false); }}>
                  Collega
                </Button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          {riga.ordine_id && (
            <Button variant="destructive" onClick={async () => { await link.mutateAsync({ rigaId: riga.id, ordineId: null }); onOpenChange(false); }}>
              Scollega
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Chiudi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EstrattoRighe({ estratto }: { estratto: EstrattoDoc }) {
  const { data: righe } = useEstrattoRighe(estratto.id);
  const update = useUpdateRiga();
  const runMatch = useRunMatching();
  const [linkTarget, setLinkTarget] = useState<EstrattoRiga | null>(null);

  const summary = useMemo(() => {
    const rows = righe || [];
    return {
      totale: rows.reduce((s, r) => s + (r.provvigione || 0), 0),
      esatte: rows.filter((r) => r.match_status === "esatta" || r.match_status === "esatta_confermata").length,
      probabili: rows.filter((r) => r.match_status === "probabile" || r.match_status === "multipli").length,
      mancanti: rows.filter((r) => r.match_status === "mancante_crm").length,
      straord: rows.filter((r) => r.match_status === "straordinaria" || r.match_status === "bonus").length,
      daVerificare: rows.filter((r) => r.match_status === "da_verificare").length,
    };
  }, [righe]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => runMatch.mutate({ estrattoId: estratto.id, aziendaId: estratto.azienda_id })} disabled={runMatch.isPending}>
          <RefreshCw className="h-4 w-4 mr-1" />
          {runMatch.isPending ? "Riconcilio…" : "Ricalcola riconciliazione"}
        </Button>
        <div className="flex gap-2 text-xs flex-wrap">
          <Badge variant="outline">Totale: {formatEuro(summary.totale)}</Badge>
          <Badge variant="outline" className="border-green-500/30 text-green-600">Esatte: {summary.esatte}</Badge>
          <Badge variant="outline" className="border-yellow-500/30 text-yellow-600">Probabili: {summary.probabili}</Badge>
          <Badge variant="outline" className="border-orange-500/30 text-orange-600">Manca CRM: {summary.mancanti}</Badge>
          <Badge variant="outline" className="border-blue-500/30 text-blue-600">Straord.: {summary.straord}</Badge>
          <Badge variant="outline">Da verificare: {summary.daVerificare}</Badge>
        </div>
      </div>

      <div className="border rounded overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>N° fattura/ordine</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Imponibile</TableHead>
              <TableHead className="text-right">Aliq.</TableHead>
              <TableHead className="text-right">Provvigione</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(righe || []).map((r) => (
              <TableRow key={r.id}>
                <TableCell className="max-w-[180px] truncate">{r.cliente_nome || "—"}</TableCell>
                <TableCell className="text-xs">{r.numero_fattura || r.numero_ordine || "—"}</TableCell>
                <TableCell className="text-xs">{r.data_riga || "—"}</TableCell>
                <TableCell className="text-right">{formatEuro(r.imponibile)}</TableCell>
                <TableCell className="text-right">{r.aliquota != null ? `${r.aliquota}%` : "—"}</TableCell>
                <TableCell className="text-right font-medium">{formatEuro(r.provvigione)}</TableCell>
                <TableCell className="text-xs">{r.tipo_movimento}</TableCell>
                <TableCell><MatchBadge status={r.match_status} score={r.match_score} /></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setLinkTarget(r)}>
                        <ExternalLink className="h-4 w-4 mr-2" /> Collega a un ordine
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => update.mutate({ id: r.id, patch: { match_status: "bonus", tipo_movimento: "bonus", ordine_id: null, match_score: 100 } })}>
                        Registra come bonus/premio
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => update.mutate({ id: r.id, patch: { match_status: "straordinaria", tipo_movimento: "conguaglio", ordine_id: null, match_score: 100 } })}>
                        Registra come conguaglio
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => update.mutate({ id: r.id, patch: { match_status: "straordinaria", tipo_movimento: "rettifica", ordine_id: null, match_score: 100 } })}>
                        Registra come rettifica
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => update.mutate({ id: r.id, patch: { match_status: "da_verificare", match_score: 0 } })}>
                        Segna da verificare
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => update.mutate({ id: r.id, patch: { match_status: "ignorata", note: "Ignorata dall'utente" } })}>
                        Ignora riga
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {(righe || []).length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-6 text-sm">
                  Nessuna riga estratta.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <LinkOrdineDialog riga={linkTarget} open={!!linkTarget} onOpenChange={(b) => !b && setLinkTarget(null)} />
    </div>
  );
}

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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Documenti caricati" value={String(totali.docs)} />
            <StatBox label="Righe totali" value={String(totali.righe)} />
            <StatBox label="Totale dichiarato" value={formatEuro(totali.totale)} />
            <StatBox label="Ordini CRM totali" value="—" hint="Vedi tab Provvigioni per il dato CRM" />
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

function StatBox({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border rounded-lg p-3 bg-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}
