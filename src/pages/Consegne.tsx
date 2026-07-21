import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useConsegne, useUpdateConsegna, OrdineConsegna, StatoConsegna, ProblemaConsegna } from "@/hooks/useConsegne";
import { Truck, AlertTriangle, Package, Clock, CheckCircle2, Search, Calendar as CalIcon } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { it } from "date-fns/locale";

const STATI: { value: StatoConsegna | "tutti"; label: string; color: string }[] = [
  { value: "tutti", label: "Tutti", color: "bg-muted text-foreground" },
  { value: "da_consegnare", label: "Da consegnare", color: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  { value: "in_consegna", label: "In consegna", color: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  { value: "consegnata", label: "Consegnata", color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  { value: "parziale", label: "Parziale", color: "bg-orange-500/15 text-orange-500 border-orange-500/30" },
  { value: "problema", label: "Problema", color: "bg-red-500/15 text-red-500 border-red-500/30" },
];

const PROBLEMI: { value: ProblemaConsegna; label: string }[] = [
  { value: "ritardo", label: "Ritardo" },
  { value: "rottura_stock", label: "Rottura di stock" },
  { value: "danneggiato", label: "Merce danneggiata" },
  { value: "indirizzo_errato", label: "Indirizzo errato" },
  { value: "rifiutato", label: "Rifiutato dal cliente" },
  { value: "altro", label: "Altro" },
];

export default function Consegne() {
  const { data: ordini = [], isLoading } = useConsegne();
  const update = useUpdateConsegna();
  const [tab, setTab] = useState<StatoConsegna | "tutti" | "ritardo">("tutti");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<OrdineConsegna | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    let list = [...ordini];
    if (tab === "ritardo") {
      list = list.filter(
        (o) =>
          o.data_consegna_prevista &&
          o.data_consegna_prevista < today &&
          !["consegnata"].includes(o.stato_consegna)
      );
    } else if (tab !== "tutti") {
      list = list.filter((o) => o.stato_consegna === tab);
    }
    if (search.trim()) {
      const t = search.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.codice?.toLowerCase().includes(t) ||
          o.clienti?.nome?.toLowerCase().includes(t) ||
          o.aziende?.nome?.toLowerCase().includes(t) ||
          o.destinazione_consegna?.toLowerCase().includes(t)
      );
    }
    return list;
  }, [ordini, tab, search, today]);

  const kpi = useMemo(() => {
    const inRitardo = ordini.filter(
      (o) => o.data_consegna_prevista && o.data_consegna_prevista < today && o.stato_consegna !== "consegnata"
    ).length;
    const oggi = ordini.filter((o) => o.data_consegna_prevista === today && o.stato_consegna !== "consegnata").length;
    const problemi = ordini.filter((o) => o.stato_consegna === "problema").length;
    const parziali = ordini.filter((o) => o.stato_consegna === "parziale").length;
    return { inRitardo, oggi, problemi, parziali, totali: ordini.length };
  }, [ordini, today]);

  const badgeFor = (o: OrdineConsegna) => {
    const cfg = STATI.find((s) => s.value === o.stato_consegna) ?? STATI[1];
    return <Badge variant="outline" className={cfg.color}>{cfg.label}</Badge>;
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-rise-in">
        <div>
          <h1 className="text-heading-lg font-display font-bold flex items-center gap-3">
            <Truck className="h-7 w-7 text-primary" /> Consegne
          </h1>
          <p className="text-body-sm text-muted-foreground mt-1">
            Pianifica, monitora e risolvi ritardi, parziali e problemi di consegna.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard label="Totali attive" value={kpi.totali} icon={<Package className="h-4 w-4" />} />
          <KpiCard label="Oggi" value={kpi.oggi} icon={<CalIcon className="h-4 w-4" />} tone="blue" />
          <KpiCard label="In ritardo" value={kpi.inRitardo} icon={<Clock className="h-4 w-4" />} tone="red" />
          <KpiCard label="Parziali" value={kpi.parziali} icon={<AlertTriangle className="h-4 w-4" />} tone="orange" />
          <KpiCard label="Problemi" value={kpi.problemi} icon={<AlertTriangle className="h-4 w-4" />} tone="red" />
        </div>

        <Card className="surface-noir">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
              <CardTitle className="text-base">Elenco consegne</CardTitle>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca codice, cliente, destinazione..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-3">
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="tutti">Tutti ({ordini.length})</TabsTrigger>
                <TabsTrigger value="ritardo">In ritardo ({kpi.inRitardo})</TabsTrigger>
                {STATI.filter((s) => s.value !== "tutti").map((s) => (
                  <TabsTrigger key={s.value} value={s.value}>{s.label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Caricamento...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nessun ordine in questo stato.</p>
            ) : (
              <div className="space-y-2">
                {filtered.map((o) => {
                  const ritardo =
                    o.data_consegna_prevista && o.data_consegna_prevista < today && o.stato_consegna !== "consegnata"
                      ? differenceInDays(new Date(), parseISO(o.data_consegna_prevista))
                      : 0;
                  return (
                    <div
                      key={o.id}
                      className="rounded-xl border border-border/60 bg-card/60 p-3 flex flex-col md:flex-row md:items-center gap-3 hover-lift cursor-pointer"
                      onClick={() => setEditing(o)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground">{o.codice}</span>
                          {badgeFor(o)}
                          {ritardo > 0 && (
                            <Badge variant="destructive" className="text-[10px]">+{ritardo}gg</Badge>
                          )}
                          {o.problema_consegna && (
                            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30 text-[10px]">
                              {PROBLEMI.find((p) => p.value === o.problema_consegna)?.label}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm font-medium truncate mt-1">
                          {o.clienti?.nome || "—"}{o.clienti?.azienda ? ` · ${o.clienti.azienda}` : ""}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {o.aziende?.nome || "—"}
                          {o.destinazione_consegna ? ` → ${o.destinazione_consegna}` : ""}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-muted-foreground">Prevista</div>
                        <div className="text-sm font-semibold">
                          {o.data_consegna_prevista
                            ? format(parseISO(o.data_consegna_prevista), "d MMM yyyy", { locale: it })
                            : "—"}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-muted-foreground">Totale</div>
                        <div className="text-sm font-semibold">€ {Number(o.totale).toLocaleString("it-IT", { minimumFractionDigits: 2 })}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Consegna {editing?.codice}</DialogTitle>
          </DialogHeader>
          {editing && (
            <ConsegnaForm
              ordine={editing}
              onSave={async (patch) => {
                await update.mutateAsync({ id: editing.id, ...patch });
                setEditing(null);
              }}
              saving={update.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

function KpiCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone?: "red" | "orange" | "blue" }) {
  const toneCls =
    tone === "red" ? "text-red-500" : tone === "orange" ? "text-orange-500" : tone === "blue" ? "text-blue-500" : "text-primary";
  return (
    <Card className="surface-glass">
      <CardContent className="p-4">
        <div className={`flex items-center gap-2 ${toneCls}`}>{icon}<span className="text-xs uppercase tracking-wide">{label}</span></div>
        <div className={`text-2xl font-bold mt-1 ${toneCls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function ConsegnaForm({
  ordine,
  onSave,
  saving,
}: {
  ordine: OrdineConsegna;
  onSave: (patch: Partial<OrdineConsegna>) => void;
  saving: boolean;
}) {
  const [stato, setStato] = useState<StatoConsegna>(ordine.stato_consegna);
  const [prevista, setPrevista] = useState(ordine.data_consegna_prevista || "");
  const [effettiva, setEffettiva] = useState(ordine.data_consegna_effettiva || "");
  const [destinazione, setDestinazione] = useState(ordine.destinazione_consegna || "");
  const [problema, setProblema] = useState<ProblemaConsegna | "nessuno">(ordine.problema_consegna || "nessuno");
  const [note, setNote] = useState(ordine.note_consegna || "");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Stato consegna</Label>
          <Select value={stato} onValueChange={(v) => setStato(v as StatoConsegna)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATI.filter((s) => s.value !== "tutti").map((s) => (
                <SelectItem key={s.value} value={s.value as string}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Problema (se presente)</Label>
          <Select value={problema} onValueChange={(v) => setProblema(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nessuno">Nessuno</SelectItem>
              {PROBLEMI.map((p) => (<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Data prevista</Label>
          <Input type="date" value={prevista} onChange={(e) => setPrevista(e.target.value)} />
        </div>
        <div>
          <Label>Data effettiva</Label>
          <Input type="date" value={effettiva} onChange={(e) => setEffettiva(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Destinazione</Label>
        <Input value={destinazione} onChange={(e) => setDestinazione(e.target.value)} placeholder="Indirizzo o punto di consegna" />
      </div>
      <div>
        <Label>Note</Label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Note operative, contatti, orari..." />
      </div>
      <DialogFooter>
        <Button
          onClick={() =>
            onSave({
              stato_consegna: stato,
              data_consegna_prevista: prevista || null,
              data_consegna_effettiva: effettiva || null,
              destinazione_consegna: destinazione || null,
              problema_consegna: problema === "nessuno" ? null : (problema as ProblemaConsegna),
              note_consegna: note || null,
            })
          }
          disabled={saving}
        >
          {saving ? "Salvo..." : "Salva"}
        </Button>
      </DialogFooter>
    </div>
  );
}
