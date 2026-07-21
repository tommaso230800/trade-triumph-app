import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, AlertTriangle, FileMinus, CheckCircle2, Clock, Euro, Edit, Trash2 } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import {
  useSegnalazioni, useEliminaSegnalazione, useAggiornaSegnalazione,
  STATO_LABEL, STATO_COLOR, PRIORITA_COLOR,
  type Segnalazione, type SegnalazioneTipo,
} from "@/hooks/useSegnalazioni";
import { SegnalazioneDialog } from "@/components/segnalazioni/SegnalazioneDialog";
import { SegnalazioneTimeline } from "@/components/segnalazioni/SegnalazioneTimeline";

const APERTI = new Set(["da_gestire","in_lavorazione","richiesta","sollecitata","approvata"]);

export default function Segnalazioni() {
  const [tab, setTab] = useState<"aperte" | "reclamo" | "nota_credito" | "tutte">("aperte");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Segnalazione | null>(null);
  const [tipoDefault, setTipoDefault] = useState<SegnalazioneTipo>("reclamo");
  const [detail, setDetail] = useState<Segnalazione | null>(null);

  const filtro = tab === "aperte" ? { stato: "aperte" as const }
    : tab === "reclamo" ? { tipo: "reclamo" as const }
    : tab === "nota_credito" ? { tipo: "nota_credito" as const }
    : {};
  const { data: rows = [], isLoading } = useSegnalazioni(filtro);
  const elimina = useEliminaSegnalazione();
  const aggiorna = useAggiornaSegnalazione();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.oggetto.toLowerCase().includes(q)
      || (r.clienti?.nome || "").toLowerCase().includes(q)
      || (r.aziende?.nome || "").toLowerCase().includes(q)
      || (r.ordini?.codice || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const { data: all = [] } = useSegnalazioni({});
  const kpi = useMemo(() => {
    const aperte = all.filter((s) => APERTI.has(s.stato));
    const reclami = all.filter((s) => s.tipo === "reclamo" && APERTI.has(s.stato));
    const nc = all.filter((s) => s.tipo === "nota_credito" && APERTI.has(s.stato));
    const scaduteN = aperte.filter((s) => s.scadenza && isPast(parseISO(s.scadenza))).length;
    const importoAtteso = all.filter((s) => s.tipo === "nota_credito" && !["chiusa","respinta"].includes(s.stato))
      .reduce((sum, s) => sum + Number(s.importo_richiesto || 0), 0);
    return { aperteN: aperte.length, reclamiN: reclami.length, ncN: nc.length, scaduteN, importoAtteso };
  }, [all]);

  const apriNuovo = (tipo: SegnalazioneTipo) => {
    setTipoDefault(tipo); setEditing(null); setDialogOpen(true);
  };
  const apriModifica = (s: Segnalazione) => {
    setEditing(s); setDialogOpen(true);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-rise-in">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Reclami & Note di credito</h1>
            <p className="text-muted-foreground text-sm">
              Centro pratiche: reclami cliente, richieste di NC, solleciti, timeline e collegamento con gli ordini CRM.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => apriNuovo("reclamo")}>
              <Plus className="h-4 w-4 mr-2" /> Nuovo reclamo
            </Button>
            <Button onClick={() => apriNuovo("nota_credito")}>
              <Plus className="h-4 w-4 mr-2" /> Richiesta NC
            </Button>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="p-4 bg-surface-glass border-border/40">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Clock className="h-3.5 w-3.5" />Pratiche aperte</div>
            <div className="text-2xl font-bold">{kpi.aperteN}</div>
          </Card>
          <Card className="p-4 bg-surface-glass border-border/40">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><AlertTriangle className="h-3.5 w-3.5" />Reclami</div>
            <div className="text-2xl font-bold text-warning">{kpi.reclamiN}</div>
          </Card>
          <Card className="p-4 bg-surface-glass border-border/40">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><FileMinus className="h-3.5 w-3.5" />NC attese</div>
            <div className="text-2xl font-bold text-primary">{kpi.ncN}</div>
          </Card>
          <Card className="p-4 bg-surface-glass border-border/40">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><AlertTriangle className="h-3.5 w-3.5" />Scadute</div>
            <div className="text-2xl font-bold text-destructive">{kpi.scaduteN}</div>
          </Card>
          <Card className="p-4 bg-surface-glass border-border/40">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Euro className="h-3.5 w-3.5" />Importo NC atteso</div>
            <div className="text-2xl font-bold">€{kpi.importoAtteso.toFixed(0)}</div>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <TabsList>
              <TabsTrigger value="aperte">Aperte</TabsTrigger>
              <TabsTrigger value="reclamo">Reclami</TabsTrigger>
              <TabsTrigger value="nota_credito">Note di credito</TabsTrigger>
              <TabsTrigger value="tutte">Tutte</TabsTrigger>
            </TabsList>
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cerca oggetto, cliente, ordine..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <TabsContent value={tab} className="mt-4">
            <Card className="bg-surface-noir border-border/40">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Oggetto</TableHead>
                      <TableHead className="hidden md:table-cell">Cliente / Azienda</TableHead>
                      <TableHead className="hidden lg:table-cell">Ordine</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead className="hidden sm:table-cell">Priorità</TableHead>
                      <TableHead className="hidden md:table-cell">Importo €</TableHead>
                      <TableHead className="hidden lg:table-cell">Scadenza</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Caricamento...</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nessuna pratica</TableCell></TableRow>
                    ) : filtered.map((s) => {
                      const scaduta = s.scadenza && isPast(parseISO(s.scadenza)) && APERTI.has(s.stato);
                      return (
                        <TableRow key={s.id} className={scaduta ? "bg-destructive/5" : ""}>
                          <TableCell>
                            <button className="text-left hover:text-primary transition font-medium" onClick={() => setDetail(s)}>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={s.tipo === "reclamo" ? "bg-warning/15 text-warning border-warning/30" : "bg-primary/15 text-primary border-primary/30"}>
                                  {s.tipo === "reclamo" ? "Reclamo" : "NC"}
                                </Badge>
                                <span>{s.oggetto}</span>
                              </div>
                              {s.causa && <div className="text-xs text-muted-foreground mt-0.5">{s.causa}</div>}
                            </button>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            <div>{s.clienti?.nome ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">{s.aziende?.nome ?? ""}</div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">{s.ordini?.codice ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={STATO_COLOR[s.stato]}>{STATO_LABEL[s.stato]}</Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline" className={PRIORITA_COLOR[s.priorita]}>{s.priorita}</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            {Number(s.importo_richiesto || 0).toFixed(2)}
                            {Number(s.importo_riconosciuto || 0) > 0 && (
                              <div className="text-xs text-success">rec: {Number(s.importo_riconosciuto).toFixed(2)}</div>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">
                            {s.scadenza ? (
                              <span className={scaduta ? "text-destructive font-semibold" : ""}>
                                {format(parseISO(s.scadenza), "dd/MM/yyyy", { locale: it })}
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setDetail(s)}>Apri dettaglio</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => apriModifica(s)}><Edit className="h-4 w-4 mr-2" />Modifica</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {s.tipo === "reclamo" && (
                                  <DropdownMenuItem onClick={() => aggiorna.mutate({ id: s.id, patch: { stato: "in_lavorazione" }})}>Segna in lavorazione</DropdownMenuItem>
                                )}
                                {s.tipo === "nota_credito" && (
                                  <>
                                    <DropdownMenuItem onClick={() => aggiorna.mutate({ id: s.id, patch: { stato: "richiesta" }})}>Richiesta inviata</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => aggiorna.mutate({ id: s.id, patch: { stato: "sollecitata" }})}>Sollecitata</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => aggiorna.mutate({ id: s.id, patch: { stato: "emessa" }})}>NC emessa</DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem onClick={() => aggiorna.mutate({ id: s.id, patch: { stato: "chiusa", data_risoluzione: new Date().toISOString().slice(0,10) }})}>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />Chiudi
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm("Eliminare la pratica?")) elimina.mutate(s.id); }}>
                                  <Trash2 className="h-4 w-4 mr-2" />Elimina
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <SegnalazioneDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}
        tipoDefault={tipoDefault}
        editing={editing}
      />

      <Sheet open={!!detail} onOpenChange={(v) => { if (!v) setDetail(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto max-h-[100dvh]">
          <SheetHeader>
            <SheetTitle>{detail?.oggetto}</SheetTitle>
          </SheetHeader>
          {detail && (
            <div className="space-y-4 mt-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={detail.tipo === "reclamo" ? "bg-warning/15 text-warning border-warning/30" : "bg-primary/15 text-primary border-primary/30"}>
                  {detail.tipo === "reclamo" ? "Reclamo" : "Nota di credito"}
                </Badge>
                <Badge variant="outline" className={STATO_COLOR[detail.stato]}>{STATO_LABEL[detail.stato]}</Badge>
                <Badge variant="outline" className={PRIORITA_COLOR[detail.priorita]}>{detail.priorita}</Badge>
              </div>
              <div className="text-sm space-y-1">
                {detail.clienti?.nome && <div><span className="text-muted-foreground">Cliente:</span> <b>{detail.clienti.nome}</b></div>}
                {detail.aziende?.nome && <div><span className="text-muted-foreground">Azienda:</span> <b>{detail.aziende.nome}</b></div>}
                {detail.ordini?.codice && <div><span className="text-muted-foreground">Ordine:</span> <b>{detail.ordini.codice}</b></div>}
                {detail.responsabile && <div><span className="text-muted-foreground">Responsabile:</span> {detail.responsabile}</div>}
                {detail.scadenza && <div><span className="text-muted-foreground">Scadenza:</span> {format(parseISO(detail.scadenza), "dd/MM/yyyy", { locale: it })}</div>}
              </div>
              {detail.descrizione && (
                <Card className="p-3 bg-surface-glass border-border/40">
                  <div className="text-xs text-muted-foreground mb-1">Descrizione</div>
                  <div className="text-sm whitespace-pre-wrap">{detail.descrizione}</div>
                </Card>
              )}
              {(Number(detail.importo_richiesto) > 0 || Number(detail.importo_riconosciuto) > 0) && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Card className="p-3"><div className="text-xs text-muted-foreground">Richiesto</div><div className="text-lg font-bold">€{Number(detail.importo_richiesto).toFixed(2)}</div></Card>
                  <Card className="p-3"><div className="text-xs text-muted-foreground">Riconosciuto</div><div className="text-lg font-bold text-success">€{Number(detail.importo_riconosciuto).toFixed(2)}</div></Card>
                </div>
              )}
              <div>
                <Button size="sm" variant="outline" className="mb-3" onClick={() => { setDetail(null); apriModifica(detail); }}>
                  <Edit className="h-4 w-4 mr-2" />Modifica pratica
                </Button>
                <h3 className="font-semibold text-sm mb-2">Timeline</h3>
                <SegnalazioneTimeline segnalazioneId={detail.id} />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}
