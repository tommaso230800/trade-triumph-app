import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle, TrendingDown, Users, CalendarClock, Package, Activity,
  Search, RefreshCw, ShoppingCart, BarChart3, Clock, PauseCircle, SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useReorderIntelligence, getTolleranza, setTolleranza, type EnrichedPair,
} from "@/hooks/useReorderIntelligence";
import { PortfolioChart } from "./PortfolioChart";
import { PairDetailDialog } from "./PairDetailDialog";
import { NuovoOrdineDialog, type OrdinePrefill } from "@/components/ordini/NuovoOrdineDialog";

const fmtD = (iso: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "2-digit" }) : "—";

type FiltroKpi =
  | "tutti" | "previsti" | "ritardo" | "sospetti" | "persistenti"
  | "prodotti" | "volumi" | "inattivita";

const STATO_BADGE: Record<string, { label: string; className: string }> = {
  regolare: { label: "Regolare", className: "bg-success/10 text-success border-success/30" },
  tolleranza: { label: "In tolleranza", className: "bg-warning/10 text-warning border-warning/30" },
  ritardo: { label: "In ritardo", className: "bg-destructive/10 text-destructive border-destructive/30" },
  storico_insufficiente: { label: "Storico insufficiente", className: "bg-muted text-muted-foreground border-border" },
};

const RALLENTAMENTO_BADGE: Record<string, { label: string; className: string } | null> = {
  nessuno: null,
  anomalo: { label: "Rallentamento anomalo — da monitorare", className: "bg-warning/10 text-warning border-warning/30" },
  persistente: { label: "Cliente sospetto — rallentamento persistente", className: "bg-destructive/10 text-destructive border-destructive/30" },
  in_recupero: { label: "Rallentamento in rientro", className: "bg-info/10 text-info border-info/30" },
};

export function IntelligenceDashboard() {
  const { data, isLoading, isError, isFetching, refetch, dataUpdatedAt } = useReorderIntelligence();
  const [filtro, setFiltro] = useState<FiltroKpi>("tutti");
  const [search, setSearch] = useState("");
  const [aziendaFilter, setAziendaFilter] = useState("all");
  const [prioritaFilter, setPrioritaFilter] = useState("all");
  const [affidabilitaFilter, setAffidabilitaFilter] = useState("all");
  const [ordinamento, setOrdinamento] = useState<"ritardo" | "rallentamento" | "valore" | "priorita">("priorita");
  const [tolleranza, setTolleranzaState] = useState(getTolleranza());
  const [dettaglio, setDettaglio] = useState<EnrichedPair | null>(null);
  const [ordinaPrefill, setOrdinaPrefill] = useState<OrdinePrefill | null>(null);
  const queryClient = useQueryClient();

  const pairs = data?.pairs || [];
  const kpi = data?.kpi;

  const aziendeOpt = useMemo(() => {
    const map = new Map<string, string>();
    pairs.forEach((p) => map.set(p.azienda_id, p.azienda_nome));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [pairs]);

  const filtrate = useMemo(() => {
    let list = pairs;
    if (aziendaFilter !== "all") list = list.filter((p) => p.azienda_id === aziendaFilter);
    if (prioritaFilter !== "all") list = list.filter((p) => p.priorita === prioritaFilter);
    if (affidabilitaFilter !== "all") list = list.filter((p) => p.affidabilita === affidabilitaFilter);
    switch (filtro) {
      case "previsti":
        list = list.filter((p) => p.prossimo_riordino_previsto && p.stato !== "ritardo" && p.affidabilita !== "insufficiente");
        break;
      case "ritardo": list = list.filter((p) => p.stato === "ritardo"); break;
      case "sospetti": list = list.filter((p) => p.rallentamento === "anomalo" || p.rallentamento === "in_recupero"); break;
      case "persistenti": list = list.filter((p) => p.rallentamento === "persistente"); break;
      case "prodotti": list = list.filter((p) => p.prodotti_non_riordinati.length > 0); break;
      case "volumi": list = list.filter((p) => p.calo_volumi); break;
      case "inattivita": list = list.filter((p) => p.previsione_affidabile && p.frequenza_operativa && p.giorni_da_ultimo > p.frequenza_operativa * 2); break;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.cliente_nome.toLowerCase().includes(q) || p.azienda_nome.toLowerCase().includes(q));
    }
    const sorted = [...list];
    switch (ordinamento) {
      case "ritardo": sorted.sort((a, b) => b.giorni_ritardo - a.giorni_ritardo); break;
      case "rallentamento": sorted.sort((a, b) => (b.variazione_recente_pct ?? -999) - (a.variazione_recente_pct ?? -999)); break;
      case "valore": sorted.sort((a, b) => b.valore_medio_ordine - a.valore_medio_ordine); break;
      case "priorita": {
        const rank = { alta: 0, media: 1, bassa: 2 };
        sorted.sort((a, b) => rank[a.priorita] - rank[b.priorita] || b.giorni_ritardo - a.giorni_ritardo);
        break;
      }
    }
    return sorted;
  }, [pairs, filtro, aziendaFilter, prioritaFilter, affidabilitaFilter, search, ordinamento]);

  const ricalcola = async () => {
    await queryClient.invalidateQueries({ queryKey: ["reorder_intelligence_v1"] });
    await refetch();
    toast.success("Intelligence riordini ricalcolata sugli ordini aggiornati.");
  };

  const cambiaTolleranza = (v: string) => {
    const t = Number(v);
    setTolleranza(t);
    setTolleranzaState(t);
    queryClient.invalidateQueries({ queryKey: ["reorder_intelligence_v1"] });
  };

  if (isError) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive p-4 text-sm">
        Non riesco a calcolare l'intelligence riordini. Controlla la connessione e riprova.
        <Button variant="outline" onClick={() => refetch()}>Riprova</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barra comandi */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {dataUpdatedAt ? `Ultimo aggiornamento: ${new Date(dataUpdatedAt).toLocaleString("it-IT")}` : "Aggiornamento non ancora disponibile"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(tolleranza)} onValueChange={cambiaTolleranza}>
            <SelectTrigger className="h-9 w-auto gap-1 text-xs">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Tolleranza 5 gg</SelectItem>
              <SelectItem value="6">Tolleranza 6 gg</SelectItem>
              <SelectItem value="7">Tolleranza 7 gg</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" disabled={isFetching} onClick={ricalcola}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Ricalcolo…" : "Ricalcola intelligence riordini"}
          </Button>
        </div>
      </div>

      {/* KPI cliccabili */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        <KpiBtn icon={<Users className="h-4 w-4 text-primary" />} label="Monitorati" value={kpi?.clienti_monitorati} active={filtro === "tutti"} onClick={() => setFiltro("tutti")} loading={isLoading} />
        <KpiBtn icon={<CalendarClock className="h-4 w-4 text-info" />} label="Previsti 30 gg" value={kpi?.riordini_previsti_30gg} active={filtro === "previsti"} onClick={() => setFiltro("previsti")} loading={isLoading} />
        <KpiBtn icon={<Clock className="h-4 w-4 text-warning" />} label="In ritardo" value={kpi?.clienti_in_ritardo} active={filtro === "ritardo"} onClick={() => setFiltro("ritardo")} loading={isLoading} />
        <KpiBtn icon={<AlertTriangle className="h-4 w-4 text-warning" />} label="Sospetti" value={kpi?.clienti_sospetti} active={filtro === "sospetti"} onClick={() => setFiltro("sospetti")} loading={isLoading} />
        <KpiBtn icon={<AlertTriangle className="h-4 w-4 text-destructive" />} label="Persistenti" value={kpi?.rallentamenti_persistenti} active={filtro === "persistenti"} onClick={() => setFiltro("persistenti")} loading={isLoading} />
        <KpiBtn icon={<Package className="h-4 w-4 text-destructive" />} label="Prodotti fermi" value={kpi?.prodotti_non_riordinati} active={filtro === "prodotti"} onClick={() => setFiltro("prodotti")} loading={isLoading} />
        <KpiBtn icon={<TrendingDown className="h-4 w-4 text-destructive" />} label="Calo volumi" value={kpi?.calo_volumi} active={filtro === "volumi"} onClick={() => setFiltro("volumi")} loading={isLoading} />
        <KpiBtn icon={<PauseCircle className="h-4 w-4 text-muted-foreground" />} label="Inattività" value={kpi?.inattivita_prolungata} active={filtro === "inattivita"} onClick={() => setFiltro("inattivita")} loading={isLoading} />
      </div>

      <details className="rounded-lg border border-border p-4">
        <summary className="min-h-11 cursor-pointer text-sm font-semibold">Report verifica frequenze</summary>
        <div className="space-y-2 text-sm">
          <p>{pairs.length} coppie · {pairs.reduce((n,p)=>n+p.numero_ordini,0)} ordini validi · {pairs.reduce((n,p)=>n+p.ordini_esclusi.length,0)} esclusi dalla cronologia</p>
          <p>{pairs.filter(p=>!p.previsione_affidabile).length} previsioni non affidabili · {pairs.filter(p=>p.rallentamento==='persistente').length} cambiamenti persistenti</p>
          <p className="text-xs text-muted-foreground">Le ripartizioni di fatturato 2025 ricostruite non attestano date di acquisto; restano negli Ordini e nei totali economici, ma non generano frequenze.</p>
          {pairs.filter(p=>p.ordini_esclusi.length>0).map(p=><Button key={p.key} variant="ghost" className="h-auto min-h-11 w-full justify-start whitespace-normal text-left" onClick={()=>setDettaglio(p)}>{p.cliente_nome} · {p.azienda_nome} · {p.numero_ordini} validi / {p.ordini_esclusi.length} esclusi</Button>)}
        </div>
      </details>
      {/* Grafico portafoglio */}
      <Card className="surface-noir">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Evoluzione del portafoglio clienti
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Stati ricalcolati mese per mese sugli ordini reali{aziendaFilter !== "all" ? ` — ${aziendeOpt.find(([id]) => id === aziendaFilter)?.[1]}` : ""}.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-60 w-full" /> : (
            <PortfolioChart ordersByPair={data?.ordersByPair || {}} aziendaFilter={aziendaFilter} tolleranza={tolleranza} />
          )}
        </CardContent>
      </Card>

      {/* Centro allarmi */}
      <CentroAllarmi pairs={pairs} onApri={setDettaglio} />

      {/* Filtri */}
      <Card className="surface-glass">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Cerca cliente o azienda…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Select value={aziendaFilter} onValueChange={setAziendaFilter}>
              <SelectTrigger><SelectValue placeholder="Tutte le aziende" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le aziende</SelectItem>
                {aziendeOpt.map(([id, nome]) => <SelectItem key={id} value={id}>{nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={prioritaFilter} onValueChange={setPrioritaFilter}>
              <SelectTrigger><SelectValue placeholder="Priorità" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Ogni priorità</SelectItem>
                <SelectItem value="alta">Priorità alta</SelectItem>
                <SelectItem value="media">Priorità media</SelectItem>
                <SelectItem value="bassa">Priorità bassa</SelectItem>
              </SelectContent>
            </Select>
            <Select value={affidabilitaFilter} onValueChange={setAffidabilitaFilter}>
              <SelectTrigger><SelectValue placeholder="Affidabilità" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Ogni affidabilità</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="bassa">Bassa</SelectItem>
                <SelectItem value="insufficiente">Storico insufficiente</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ordinamento} onValueChange={(v) => setOrdinamento(v as any)}>
              <SelectTrigger><SelectValue placeholder="Ordina per" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="priorita">Priorità di intervento</SelectItem>
                <SelectItem value="ritardo">Maggiore ritardo</SelectItem>
                <SelectItem value="rallentamento">Maggiore rallentamento</SelectItem>
                <SelectItem value="valore">Maggiore valore storico</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Card cliente–azienda */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 w-full" />)}
        </div>
      ) : filtrate.length === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          Nessuna coppia cliente–azienda in questa categoria.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtrate.slice(0, 120).map((p) => (
            <PairCard key={p.key} pair={p} onApri={() => setDettaglio(p)} onOrdina={() => setOrdinaPrefill({ cliente_id: p.cliente_id, azienda_id: p.azienda_id, righe: [] })} />
          ))}
        </div>
      )}
      {filtrate.length > 120 && (
        <p className="text-center text-xs text-muted-foreground">Mostrate le prime 120 di {filtrate.length} coppie: restringi i filtri.</p>
      )}

      <PairDetailDialog
        pair={dettaglio}
        onClose={() => setDettaglio(null)}
        onOrdina={(p) => { setDettaglio(null); setOrdinaPrefill({ cliente_id: p.cliente_id, azienda_id: p.azienda_id, righe: [] }); }}
        prodottiNomi={new Map(Object.entries(data?.prodottiNomi || {}))}
      />
      <NuovoOrdineDialog
        open={!!ordinaPrefill}
        onOpenChange={(v) => { if (!v) setOrdinaPrefill(null); }}
        prefill={ordinaPrefill}
        onOrderCreated={() => {
          setOrdinaPrefill(null);
          queryClient.invalidateQueries({ queryKey: ["reorder_intelligence_v1"] });
          queryClient.invalidateQueries({ queryKey: ["reorder_forecast_v1"] });
          toast.success("Ordine creato: statistiche e grafici aggiornati.");
        }}
      />
    </div>
  );
}

function KpiBtn({ icon, label, value, active, onClick, loading }: {
  icon: React.ReactNode; label: string; value?: number; active: boolean; onClick: () => void; loading: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition hover-lift ${
        active ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-border bg-card"
      }`}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span className="min-w-0 break-words leading-tight">{label}</span>
      </div>
      <div className="mt-1.5 text-right font-display text-xl font-bold tabular-nums">
        {loading ? "…" : value ?? 0}
      </div>
    </button>
  );
}

function PairCard({ pair, onApri, onOrdina }: { pair: EnrichedPair; onApri: () => void; onOrdina: () => void }) {
  const stato = STATO_BADGE[pair.stato];
  const rall = RALLENTAMENTO_BADGE[pair.rallentamento];
  return (
    <article className="flex flex-col rounded-xl border border-border bg-card p-4 transition hover-lift">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link to={`/clienti/${pair.cliente_id}`} className="block truncate text-sm font-semibold hover:text-primary">
            {pair.cliente_nome}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{pair.azienda_nome}</p>
        </div>
        <Badge variant="outline" className={`shrink-0 ${stato.className}`}>{stato.label}</Badge>
      </div>

      {rall && (
        <Badge variant="outline" className={`mt-2 w-fit max-w-full whitespace-normal text-left text-xs ${rall.className}`}>
          {rall.label}
        </Badge>
      )}
      {pair.calo_volumi && (
        <Badge variant="outline" className="mt-1 w-fit border-destructive/30 bg-destructive/10 text-xs text-destructive">
          Calo dei volumi {pair.calo_volumi_pct}%
        </Badge>
      )}

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <span className="text-muted-foreground">Ultimo ordine</span>
        <span className="text-right tabular-nums">{fmtD(pair.ultimo_ordine)}</span>
        <span className="text-muted-foreground">Frequenza abituale</span>
        <span className="text-right tabular-nums">{pair.frequenza_abituale !== null ? `${Math.round(pair.frequenza_abituale)} gg` : "N/D"}</span>
        <span className="text-muted-foreground">Frequenza recente</span>
        <span className={`text-right tabular-nums ${pair.variazione_recente_pct !== null && pair.variazione_recente_pct > 30 ? "text-warning" : ""}`}>
          {pair.frequenza_recente !== null ? `${Math.round(pair.frequenza_recente)} gg` : "N/D"}
        </span>
        <span className="text-muted-foreground">Frequenza operativa</span>
        <span className="text-right tabular-nums">{pair.frequenza_operativa ?? "N/D"} gg</span>
        <span className="text-muted-foreground">Prossimo previsto</span>
        <span className={`text-right tabular-nums ${pair.giorni_ritardo > 0 ? "font-semibold text-destructive" : ""}`}>
          {pair.prossimo_riordino_previsto ? fmtD(pair.prossimo_riordino_previsto) : "Previsione non affidabile"}
        </span>
        {pair.prodotti_non_riordinati.length > 0 && (
          <>
            <span className="text-muted-foreground">Prodotti in ritardo</span>
            <span className="text-right font-semibold text-destructive tabular-nums">{pair.prodotti_non_riordinati.length}</span>
          </>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="outline" className="h-9 flex-1 gap-1.5 text-xs" onClick={onApri}>
          <BarChart3 className="h-3.5 w-3.5" /> Grafici
        </Button>
        <Button size="sm" className="h-9 flex-1 gap-1.5 text-xs" onClick={onOrdina}>
          <ShoppingCart className="h-3.5 w-3.5" /> Crea ordine
        </Button>
      </div>
    </article>
  );
}

function CentroAllarmi({ pairs, onApri }: { pairs: EnrichedPair[]; onApri: (p: EnrichedPair) => void }) {
  const sezioni = useMemo(() => {
    const valide = pairs.filter((p) => p.affidabilita !== "insufficiente");
    return [
      {
        id: "ritardo", titolo: "Clienti in ritardo", tone: "warning" as const,
        items: valide.filter((p) => p.stato === "ritardo"),
        motivo: (p: EnrichedPair) => `${p.giorni_ritardo} gg oltre la tolleranza (frequenza ${Math.round(p.frequenza_operativa || 0)} gg operativi, ultimo ordine ${fmtD(p.ultimo_ordine)})`,
      },
      {
        id: "sospetti", titolo: "Clienti sospetti", tone: "warning" as const,
        items: valide.filter((p) => p.rallentamento === "anomalo" || p.rallentamento === "in_recupero"),
        motivo: (p: EnrichedPair) => `ultimo intervallo ${p.intervalli[p.intervalli.length - 1]?.giorni} gg vs frequenza abituale ${Math.round(p.frequenza_abituale || 0)} gg`,
      },
      {
        id: "persistenti", titolo: "Rallentamenti persistenti", tone: "destructive" as const,
        items: valide.filter((p) => p.rallentamento === "persistente"),
        motivo: (p: EnrichedPair) => `${p.intervalli_anomali_consecutivi} intervalli consecutivi sopra la soglia (ultimi: ${p.intervalli.slice(-2).map((i) => i.giorni).join(", ")} gg vs ${Math.round(p.frequenza_abituale || 0)} gg abituali)`,
      },
      {
        id: "prodotti", titolo: "Prodotti non riordinati", tone: "destructive" as const,
        items: valide.filter((p) => p.prodotti_non_riordinati.length > 0),
        motivo: (p: EnrichedPair) => `${p.prodotti_non_riordinati.length} prodotti abituali fermi mentre il cliente ordina altro`,
      },
      {
        id: "volumi", titolo: "Calo dei volumi", tone: "destructive" as const,
        items: valide.filter((p) => p.calo_volumi),
        motivo: (p: EnrichedPair) => `valore medio ordine in calo del ${Math.abs(p.calo_volumi_pct || 0)}% negli ultimi ordini`,
      },
      {
        id: "inattivita", titolo: "Inattività prolungata", tone: "muted" as const,
        items: valide.filter((p) => p.previsione_affidabile && p.frequenza_operativa && p.giorni_da_ultimo > p.frequenza_operativa * 2),
        motivo: (p: EnrichedPair) => `${p.giorni_da_ultimo} gg senza ordini, oltre il doppio della frequenza abituale`,
      },
    ].filter((s) => s.items.length > 0);
  }, [pairs]);

  if (!sezioni.length) {
    return (
      <Card className="surface-noir">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Intelligence commerciale — Allarmi e opportunità</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nessun allarme attivo: i clienti monitorati stanno ordinando secondo le proprie abitudini.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="surface-noir">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Intelligence commerciale — Allarmi e opportunità
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sezioni.map((s) => (
          <details key={s.id} className="rounded-lg border border-border">
            <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 px-4 text-sm font-semibold">
              {s.titolo}
              <Badge variant="outline" className={
                s.tone === "destructive" ? "border-destructive/30 bg-destructive/10 text-destructive"
                : s.tone === "warning" ? "border-warning/30 bg-warning/10 text-warning"
                : "border-border bg-muted text-muted-foreground"
              }>
                {s.items.length}
              </Badge>
            </summary>
            <div className="space-y-1.5 border-t border-border p-3">
              {s.items.slice(0, 10).map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => onApri(p)}
                  className="block w-full rounded-md px-2 py-2 text-left transition hover:bg-muted/50"
                >
                  <span className="text-sm font-medium">{p.cliente_nome}</span>
                  <span className="text-xs text-muted-foreground"> · {p.azienda_nome}</span>
                  <span className="block text-xs text-muted-foreground">{s.motivo(p)}</span>
                </button>
              ))}
              {s.items.length > 10 && (
                <p className="px-2 text-xs text-muted-foreground">Altre {s.items.length - 10} segnalazioni: usa i filtri qui sotto.</p>
              )}
            </div>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}
