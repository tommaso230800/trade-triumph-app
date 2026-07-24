import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { TransparencyBanner } from "@/components/metrics/TransparencyBanner";
import { useAziende } from "@/hooks/useAziende";
import { useClienti } from "@/hooks/useClienti";
import { useScadenziario, StatoProvvigione } from "@/hooks/useScadenziario";
import {
  useProvvigioniAnalytics,
  ProvvigioniFilters,
  PeriodoFilter,
  ProvvigioneRow,
} from "@/hooks/useProvvigioniAnalytics";
import { PagamentoProvvigioneDialog, ProvvigioneDialogItem } from "@/components/provvigioni/PagamentoProvvigioneDialog";
import { MeseDetailSheet } from "@/components/provvigioni/MeseDetailSheet";
import { ScadenziarioTab } from "@/components/provvigioni/ScadenziarioTab";
import { RiconciliazioneSection } from "@/components/provvigioni/RiconciliazioneSection";
import { MatriceProvvigioniSection } from "@/components/provvigioni/MatriceProvvigioniSection";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Euro,
  TrendingUp,
  TrendingDown,
  Building2,
  Users,
  Percent,
  Target,
  Sparkles,
  Search,
  Download,
  FileText,
  Receipt,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Ban,
  CircleDot,
  Wallet,
  CalendarClock,
  LineChart as LineChartIcon,
  Calculator,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fmtEur = (v: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
const fmtEur2 = (v: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const STATO_CONFIG: Record<StatoProvvigione, { label: string; color: string; rowBg?: string; icon: any; iconColor: string }> = {
  pagata: { label: "Pagata", color: "status-prov-paid", icon: CheckCircle2, iconColor: "text-success" },
  da_pagare: { label: "Non pagata", color: "status-prov-unpaid", icon: Clock, iconColor: "text-commission-unpaid" },
  scaduta: { label: "Scaduta", color: "status-prov-overdue", rowBg: "bg-destructive/10 hover:bg-destructive/15 border-l-4 border-l-destructive", icon: AlertTriangle, iconColor: "text-destructive" },
  parziale: { label: "Parzialmente pagata", color: "status-prov-partial", icon: CircleDot, iconColor: "text-primary" },
  contestazione: { label: "In contestazione", color: "status-prov-contested", icon: Ban, iconColor: "text-commission-contested" },
};

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(217 91% 60%)",
  "hsl(280 65% 60%)",
  "hsl(35 90% 55%)",
  "hsl(160 60% 45%)",
];

type SortKey = keyof ProvvigioneRow;

const Provvigioni = () => {
  const now = new Date();
  const [aziendaId, setAziendaId] = useState<string | "tutte">("tutte");
  const [clienteId, setClienteId] = useState<string | "tutti">("tutti");
  const [periodo, setPeriodo] = useState<PeriodoFilter>({ tipo: "anno", year: now.getFullYear() });
  const [search, setSearch] = useState("");
  const [statoFilter, setStatoFilter] = useState<"tutte" | "pagata" | "da_pagare" | "scaduta" | "parziale" | "contestazione">("tutte");
  const [sortKey, setSortKey] = useState<SortKey>("data");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [trimestreFilter, setTrimestreFilter] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkTrim, setBulkTrim] = useState<number>(Math.floor(now.getMonth() / 3) + 1);
  const [bulkYear, setBulkYear] = useState<number>(now.getFullYear());
  const [payDialog, setPayDialog] = useState<{ open: boolean; fattura: ProvvigioneDialogItem | null; initialStato?: StatoProvvigione }>({ open: false, fattura: null });
  const [meseDetail, setMeseDetail] = useState<{ open: boolean; detail: any | null }>({ open: false, detail: null });

  // Simulatore
  const [simFatturato, setSimFatturato] = useState("50000");
  const [simPct, setSimPct] = useState("4");
  const [simBonus, setSimBonus] = useState("0");
  const [simPremi, setSimPremi] = useState("0");

  const { data: aziende } = useAziende();
  const { data: clienti } = useClienti();
  const { fattureIncassate, fattureScadute, aggiornaStatoProvvigione, aggiornaTrimestrePagamento, aggiornaBulkPagate } = useScadenziario();

  const filters: ProvvigioniFilters = { aziendaId, clienteId, periodo, search };
  const analytics = useProvvigioniAnalytics(filters);

  // Riepiloghi per stato: coerenti con filtri, badge, grafici e KPI della pagina.
  const riepiloghi = useMemo(() => {
    const perStato = { da_pagare: 0, pagata: 0, parziale: 0, contestazione: 0, scaduta: 0 };
    let totMaturata = 0;
    let totalePagato = 0;
    analytics.filteredRows.forEach((r) => {
      const stato = r.statoProvvigione as keyof typeof perStato;
      const maturata = Number(r.provvigioneMaturata) || 0;
      const pagata = Number(r.provvigionePagata) || 0;
      totMaturata += maturata;
      totalePagato += pagata;
      perStato[stato] = (perStato[stato] || 0) + (stato === "pagata" || stato === "parziale" ? pagata : maturata);
    });
    return { perStato, totMaturata, totalePagato, residuo: Math.max(0, totMaturata - totalePagato) };
  }, [analytics.filteredRows]);

  const filteredTableRows = useMemo(() => {
    let rows = analytics.filteredRows;
    if (statoFilter !== "tutte") {
      rows = rows.filter((r) => r.statoProvvigione === statoFilter);
    }
    if (trimestreFilter !== 0) {
      rows = rows.filter((r) => r.trimestrePagamento === trimestreFilter);
    }
    const sorted = [...rows].sort((a, b) => {
      const av: any = a[sortKey];
      const bv: any = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [analytics.filteredRows, statoFilter, trimestreFilter, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const exportExcel = () => {
    const data = filteredTableRows.map((r) => ({
      Data: format(new Date(r.data), "dd/MM/yyyy"),
      Numero: r.numero,
      Azienda: r.aziendaNome,
      Cliente: r.clienteNome,
      Imponibile: r.imponibile,
      "% Provv": r.percentualeProvv,
      Maturata: r.provvigioneMaturata,
      Pagata: r.provvigionePagata,
      Stato: STATO_CONFIG[r.statoProvvigione]?.label || r.statoProvvigione,
      "Trimestre pagamento": r.trimestrePagamento ? `Q${r.trimestrePagamento} ${r.annoPagamento ?? ""}`.trim() : "",
      "Data effettiva": r.dataEffettivaPagamento ? format(new Date(r.dataEffettivaPagamento), "dd/MM/yyyy") : "",
      Note: r.note || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    const suffix = trimestreFilter !== 0 ? `_Q${trimestreFilter}` : "";
    XLSX.utils.book_append_sheet(wb, ws, `Provvigioni${suffix}`);
    XLSX.writeFile(wb, `provvigioni${suffix}_${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Report Provvigioni", 14, 15);
    doc.setFontSize(9);
    doc.text(`Generato: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [["Data", "N°", "Azienda", "Cliente", "Imponibile", "%", "Maturata", "Pagata", "Stato", "Trim. pag."]],
      body: filteredTableRows.map((r) => [
        format(new Date(r.data), "dd/MM/yy"),
        r.numero,
        r.aziendaNome,
        r.clienteNome,
        fmtEur(r.imponibile),
        `${r.percentualeProvv}%`,
        fmtEur(r.provvigioneMaturata),
        fmtEur(r.provvigionePagata),
        STATO_CONFIG[r.statoProvvigione]?.label || r.statoProvvigione,
        r.trimestrePagamento ? `Q${r.trimestrePagamento} ${r.annoPagamento ?? ""}`.trim() : "—",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 30, 60] },
    });
    const suffix = trimestreFilter !== 0 ? `_Q${trimestreFilter}` : "";
    doc.save(`provvigioni${suffix}_${format(new Date(), "yyyyMMdd")}.pdf`);
  };

  const openPayDialog = (row: ProvvigioneRow, initialStato?: StatoProvvigione) => {
    if (row.scadenziarioId) {
      const fattura = [...fattureIncassate, ...fattureScadute].find((f) => f.id === row.scadenziarioId);
      if (fattura) setPayDialog({ open: true, fattura: { ...fattura, source: "fattura" }, initialStato });
      return;
    }
    if (row.ordineId) {
      setPayDialog({
        open: true,
        initialStato,
        fattura: {
          id: row.ordineId,
          source: "ordine",
          numero_fattura: row.numero,
          azienda_nome: row.aziendaNome,
          cliente_nome: row.clienteNome,
          provvigione_calcolata: row.provvigioneMaturata,
          stato_provvigione: row.statoProvvigione,
          data_incasso_provvigione: row.dataEffettivaPagamento,
          importo_provvigione_pagata: row.provvigionePagata,
          metodo_pagamento_provvigione: row.metodoPagamento,
          note_provvigione: row.note,
        },
      });
    }
  };

  const quickSetStato = async (row: ProvvigioneRow, stato: "da_pagare" | "scaduta" | "contestazione") => {
    const id = row.scadenziarioId || row.ordineId;
    if (!id || row.source === "movimento") return;
    await aggiornaStatoProvvigione.mutateAsync({ id, source: row.source, stato });
  };

  const setTrimestreInline = async (row: ProvvigioneRow, trimestre: number) => {
    const id = row.scadenziarioId || row.ordineId;
    if (!id || row.source === "movimento") return;
    const anno = row.annoPagamento ?? (row.dataEffettivaPagamento ? new Date(row.dataEffettivaPagamento).getFullYear() : new Date().getFullYear());
    await aggiornaTrimestrePagamento.mutateAsync({ id, source: row.source, trimestre, anno });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTableRows.length && filteredTableRows.length > 0) {
      setSelectedIds(new Set());
    } else {
      const selectable = filteredTableRows.filter((r) => r.source !== "movimento");
      setSelectedIds(new Set(selectable.map((r) => r.id)));
    }
  };
  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };
  const selectedRows = useMemo(
    () => filteredTableRows.filter((r) => selectedIds.has(r.id) && r.source !== "movimento"),
    [filteredTableRows, selectedIds]
  );
  const confirmBulkPagate = async () => {
    const items = selectedRows.map((r) => ({
      id: (r.scadenziarioId || r.ordineId)!,
      source: r.source as "fattura" | "ordine",
      provvigioneMaturata: r.provvigioneMaturata,
    }));
    await aggiornaBulkPagate.mutateAsync({
      items,
      trimestre: bulkTrim,
      anno: bulkYear,
      data_pagamento: new Date().toISOString().slice(0, 10),
    });
    setSelectedIds(new Set());
    setBulkOpen(false);
  };



  const simTotale = (Number(simFatturato) * Number(simPct)) / 100 + Number(simBonus) + Number(simPremi);

  return (
    <MainLayout>
      <div className="space-y-6 animate-rise-in pb-8">
        <TransparencyBanner scope="provvigioni" />
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="page-title">Provvigioni</h1>
            <p className="text-body-md text-muted-foreground">
              Centro di controllo economico — filtra, analizza, gestisci pagamenti
            </p>
          </div>
        </div>

        {/* STICKY FILTER BAR */}
        <div className="sticky top-0 z-20 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-3 bg-background/80 backdrop-blur-xl border-b border-border/60">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={aziendaId} onValueChange={(v) => setAziendaId(v)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Seleziona azienda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutte">Tutte le aziende</SelectItem>
                  {aziende?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <PeriodoSelector value={periodo} onChange={setPeriodo} />

            <div className="flex items-center gap-2 min-w-[180px]">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={clienteId} onValueChange={(v) => setClienteId(v)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutti">Tutti i clienti</SelectItem>
                  {clienti?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca ordine, cliente, azienda..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* CONTO ECONOMICO PERSONALE */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Il tuo Conto Economico</h2>
              {aziendaId !== "tutte" && (
                <Badge variant="outline">{aziende?.find((a) => a.id === aziendaId)?.nome}</Badge>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <EconomicoCell label="Oggi" value={analytics.contoEconomico.guadagnoOggi} accent="text-success" />
              <EconomicoCell label="Questo mese" value={analytics.contoEconomico.guadagnoMese} accent="text-primary" big />
              <EconomicoCell label="Quest'anno" value={analytics.contoEconomico.guadagnoAnno} />
              <EconomicoCell label="Media/giorno" value={analytics.contoEconomico.mediaGiornaliera} accent="text-muted-foreground" />
              <EconomicoCell label={`Previsione ${format(now, "MMM", { locale: it })}`} value={analytics.contoEconomico.previsioneFineMese} accent="text-warning" />
            </div>
          </CardContent>
        </Card>

        {/* KPI CARDS */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <KPICard icon={<Euro />} label="Provvigioni maturate" value={fmtEur(analytics.kpi.provvigioniMaturate)} />
          <KPICard icon={<CheckCircle2 />} label="Liquidate" value={fmtEur(analytics.kpi.provvigioniLiquidate)} accent="success" />
          <KPICard icon={<Clock />} label="Da incassare" value={fmtEur(analytics.kpi.provvigioniDaIncassare)} accent="warning" />
          <KPICard icon={<TrendingUp />} label="Fatturato generato" value={fmtEur(analytics.kpi.fatturato)} />
          <KPICard icon={<FileText />} label="Numero ordini" value={String(analytics.kpi.nOrdini)} />
          <KPICard icon={<Receipt />} label="Ticket medio" value={fmtEur(analytics.kpi.ticketMedio)} />
          <KPICard icon={<Percent />} label="% media provv." value={`${analytics.kpi.pctMediaProvv.toFixed(2)}%`} />
          <GrowthCard label="Vs mese scorso" value={analytics.kpi.growthMoM} />
          <GrowthCard label="Vs stesso mese A-1" value={analytics.kpi.growthYoY} />
          <ObjectiveCard target={analytics.kpi.obiettivoMensile} current={analytics.kpi.provvMese} pct={analytics.kpi.completamentoObiettivo} />
        </div>

        {/* MAIN TABS */}
        <Tabs defaultValue="overview" className="space-y-5">
          <TabsList className="w-full flex-wrap h-auto justify-start">
            <TabsTrigger value="overview" className="gap-2"><LineChartIcon className="h-4 w-4" />Overview</TabsTrigger>
            <TabsTrigger value="provvigioni" className="gap-2"><Euro className="h-4 w-4" />Provvigioni</TabsTrigger>
            <TabsTrigger value="aziende" className="gap-2"><Building2 className="h-4 w-4" />Aziende</TabsTrigger>
            <TabsTrigger value="clienti" className="gap-2"><Users className="h-4 w-4" />Clienti</TabsTrigger>
            <TabsTrigger value="ai" className="gap-2"><Sparkles className="h-4 w-4" />AI Insights</TabsTrigger>
            <TabsTrigger value="calendario" className="gap-2"><CalendarClock className="h-4 w-4" />Calendario</TabsTrigger>
            <TabsTrigger value="simulatore" className="gap-2"><Calculator className="h-4 w-4" />Simulatore</TabsTrigger>
            <TabsTrigger value="bonus" className="gap-2"><Trophy className="h-4 w-4" />Bonus</TabsTrigger>
            <TabsTrigger value="scadenziario" className="gap-2"><Receipt className="h-4 w-4" />Scadenziario</TabsTrigger>
            <TabsTrigger value="riconciliazione" className="gap-2"><Sparkles className="h-4 w-4" />Riconciliazione</TabsTrigger>
            <TabsTrigger value="matrice" className="gap-2"><Percent className="h-4 w-4" />Matrice</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Andamento provvigioni · 24 mesi" icon={<LineChartIcon className="h-4 w-4" />}>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={analytics.serieMensile}>
                    <defs>
                      <linearGradient id="colorP" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mese" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => fmtEur(v)} />
                    <Area type="monotone" dataKey="provvigioni" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorP)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Fatturato vs Provvigioni" icon={<TrendingUp className="h-4 w-4" />}>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={analytics.serieMensile}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mese" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => fmtEur(v)} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="fatturato" fill="hsl(var(--muted-foreground) / 0.3)" name="Fatturato" />
                    <Line yAxisId="right" type="monotone" dataKey="provvigioni" stroke="hsl(var(--primary))" strokeWidth={2.5} name="Provvigioni" />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Ripartizione per azienda" icon={<Building2 className="h-4 w-4" />}>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={analytics.perAzienda.slice(0, 8)} dataKey="provvigioni" nameKey="nome" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={2}>
                      {analytics.perAzienda.slice(0, 8).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => fmtEur(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title={`Mese corrente · Andamento giornaliero`} icon={<CalendarClock className="h-4 w-4" />}>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={analytics.seriaGiornaliera}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="giorno" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => fmtEur(v)} />
                    <Line type="monotone" dataKey="cumulato" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Cumulato" />
                    <Line type="monotone" dataKey="valore" stroke="hsl(var(--success))" strokeWidth={1.5} dot={{ r: 2 }} name="Giornaliero" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <ChartCard title="Heatmap mesi migliori" icon={<Sparkles className="h-4 w-4" />}>
              <Heatmap data={analytics.heatmap} obiettivo={analytics.kpi.obiettivoMensile} onCellClick={(y, m) => setMeseDetail({ open: true, detail: analytics.getMonthlyDetail(y, m) })} />
            </ChartCard>
          </TabsContent>

          {/* PROVVIGIONI TABLE */}
          <TabsContent value="provvigioni" className="space-y-4">
            {/* Riepiloghi per stato */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatoSummaryCard label="Totale maturate" value={riepiloghi.totMaturata} icon={<Euro className="h-4 w-4" />} />
              <StatoSummaryCard label="Pagate" value={riepiloghi.totalePagato} icon={<CheckCircle2 className="h-4 w-4" />} accent="success" />
              <StatoSummaryCard label="Non pagate" value={riepiloghi.perStato.da_pagare} icon={<Clock className="h-4 w-4" />} accent="unpaid" />
              <StatoSummaryCard label="Scadute" value={riepiloghi.perStato.scaduta} icon={<AlertTriangle className="h-4 w-4" />} accent="destructive" />
              <StatoSummaryCard label="Residue" value={riepiloghi.residuo} icon={<Wallet className="h-4 w-4" />} accent="primary" />
              <StatoSummaryCard label="Parziali" value={riepiloghi.perStato.parziale} icon={<CircleDot className="h-4 w-4" />} accent="primary" />
              <StatoSummaryCard label="Contestazione" value={riepiloghi.perStato.contestazione} icon={<Ban className="h-4 w-4" />} accent="purple" />
            </div>

            {/* LIQUIDATO PER TRIMESTRE (Dashboard trimestrale) */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Liquidato per trimestre di pagamento</CardTitle>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Basato sul trimestre in cui l'azienda ha effettivamente liquidato la provvigione
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {analytics.perTrimestrePagamento.map((t) => {
                    const active = trimestreFilter === t.trimestre;
                    return (
                      <button
                        key={t.trimestre}
                        onClick={() => setTrimestreFilter(active ? 0 : (t.trimestre as 1 | 2 | 3 | 4))}
                        className={`text-left rounded-lg border p-4 transition ${active ? "border-primary bg-primary/10 shadow-sm" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold">Q{t.trimestre}</span>
                          <span className="text-xs text-muted-foreground">{["Gen-Mar","Apr-Giu","Lug-Set","Ott-Dic"][t.trimestre-1]}</span>
                        </div>
                        <p className="text-xl font-bold text-primary">{fmtEur(t.liquidato)}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t.conteggio} provvigioni</p>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.perTrimestrePagamento.map((t) => ({ name: `Q${t.trimestre}`, liquidato: t.liquidato }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => fmtEur(v)} />
                      <Bar dataKey="liquidato" radius={[6, 6, 0, 0]}>
                        {analytics.perTrimestrePagamento.map((t, i) => (
                          <Cell key={i} fill={trimestreFilter === t.trimestre ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.55)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-3 space-y-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {(["tutte", "pagata", "da_pagare", "scaduta", "parziale", "contestazione"] as const).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={statoFilter === s ? "default" : "outline"}
                        onClick={() => setStatoFilter(s)}
                      >
                        {s === "tutte" ? "Tutte" : STATO_CONFIG[s].label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={exportExcel}><Download className="h-4 w-4 mr-1" />Excel{trimestreFilter !== 0 ? ` Q${trimestreFilter}` : ""}</Button>
                    <Button size="sm" variant="outline" onClick={exportPDF}><Download className="h-4 w-4 mr-1" />PDF{trimestreFilter !== 0 ? ` Q${trimestreFilter}` : ""}</Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/60">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground mr-1">Trimestre pagamento:</span>
                  {([0, 1, 2, 3, 4] as const).map((q) => (
                    <Button
                      key={q}
                      size="sm"
                      variant={trimestreFilter === q ? "default" : "outline"}
                      onClick={() => setTrimestreFilter(q)}
                      className="h-7 px-3"
                    >
                      {q === 0 ? "Tutti" : `Q${q}`}
                    </Button>
                  ))}
                  {selectedRows.length > 0 && (
                    <div className="ml-auto flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5">
                      <span className="text-xs font-medium">{selectedRows.length} selezionate</span>
                      <Button size="sm" onClick={() => setBulkOpen(true)} className="h-7">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Segna come pagate
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="h-7">
                        Annulla
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-border cursor-pointer"
                            checked={filteredTableRows.length > 0 && selectedIds.size === filteredTableRows.filter((r) => r.source !== "movimento").length}
                            onChange={toggleSelectAll}
                          />
                        </TableHead>
                        <SortableHead k="data" label="Data" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                        <SortableHead k="numero" label="N° doc" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                        <SortableHead k="aziendaNome" label="Azienda" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                        <SortableHead k="clienteNome" label="Cliente" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                        <SortableHead k="imponibile" label="Base" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                        <SortableHead k="percentualeProvv" label="%" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="center" />
                        <SortableHead k="provvigioneMaturata" label="Maturata" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                        <SortableHead k="provvigionePagata" label="Pagata" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                        <SortableHead k="statoProvvigione" label="Stato" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                        <TableHead className="w-[130px]">Trimestre</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTableRows.length === 0 ? (
                        <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Nessuna riga per i filtri selezionati</TableCell></TableRow>
                      ) : (
                        filteredTableRows.map((r) => {
                          const S = STATO_CONFIG[r.statoProvvigione];
                          const selectable = r.source !== "movimento";
                          return (
                            <TableRow key={r.id} className={`transition-colors ${S?.rowBg || "hover:bg-muted/30"} ${selectedIds.has(r.id) ? "bg-primary/5" : ""}`}>
                              <TableCell>
                                {selectable && (
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-border cursor-pointer"
                                    checked={selectedIds.has(r.id)}
                                    onChange={() => toggleSelectOne(r.id)}
                                  />
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-sm">{format(new Date(r.data), "dd/MM/yy")}</TableCell>
                              <TableCell className="font-mono text-xs">{r.numero}</TableCell>
                              <TableCell className="text-sm font-medium">{r.aziendaNome}</TableCell>
                              <TableCell className="text-sm">{r.clienteNome}</TableCell>
                              <TableCell className="text-right text-sm">{fmtEur(r.imponibile)}</TableCell>
                              <TableCell className="text-center text-xs text-muted-foreground">{r.percentualeProvv}%</TableCell>
                              <TableCell className="text-right text-sm font-semibold text-primary">{fmtEur(r.provvigioneMaturata)}</TableCell>
                              <TableCell className="text-right text-sm text-success">{fmtEur(r.provvigionePagata)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`gap-1 border ${S?.color}`}>
                                  {S && <S.icon className="h-3 w-3" />}
                                  {S?.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {selectable ? (
                                  <Select
                                    value={r.trimestrePagamento ? String(r.trimestrePagamento) : ""}
                                    onValueChange={(v) => setTrimestreInline(r, Number(v))}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="—" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="1">Q1 · Gen-Mar</SelectItem>
                                      <SelectItem value="2">Q2 · Apr-Giu</SelectItem>
                                      <SelectItem value="3">Q3 · Lug-Set</SelectItem>
                                      <SelectItem value="4">Q4 · Ott-Dic</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" className="h-8 gap-1.5 whitespace-nowrap shadow-sm">
                                      <CircleDot className="h-3.5 w-3.5" />
                                      Aggiorna stato
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuItem onClick={() => openPayDialog(r, "pagata")} className="gap-2">
                                      <CheckCircle2 className="h-4 w-4 text-success" />
                                      <span>Pagata</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => quickSetStato(r, "da_pagare")} className="gap-2">
                                      <Clock className="h-4 w-4 text-commission-unpaid" />
                                      <span>Non pagata</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => quickSetStato(r, "scaduta")} className="gap-2">
                                      <AlertTriangle className="h-4 w-4 text-destructive" />
                                      <span>Scaduta</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openPayDialog(r, "parziale")} className="gap-2">
                                      <CircleDot className="h-4 w-4 text-primary" />
                                      <span>Parzialmente pagata</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => quickSetStato(r, "contestazione")} className="gap-2">
                                      <Ban className="h-4 w-4 text-commission-contested" />
                                      <span>In contestazione</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AZIENDE */}
          <TabsContent value="aziende" className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {analytics.perAzienda.length === 0 ? (
                <p className="text-muted-foreground col-span-full text-center py-8">Nessun dato</p>
              ) : (
                analytics.perAzienda.map((a) => (
                  <Card key={a.id} className="hover-lift">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">{a.nome}</CardTitle>
                          <CardDescription>{a.ordini} ordini · {a.clienti} clienti</CardDescription>
                        </div>
                        <Badge variant="outline" className="shrink-0">{a.incidenza.toFixed(0)}%</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Fatturato</p>
                          <p className="font-semibold">{fmtEur(a.fatturato)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Provvigioni</p>
                          <p className="font-semibold text-primary">{fmtEur(a.provvigioni)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Media ordine</p>
                          <p className="font-medium">{fmtEur(a.mediaOrdine)}</p>
                        </div>
                      </div>
                      <Progress value={a.incidenza} className="h-1.5" />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* CLIENTI */}
          <TabsContent value="clienti" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <ClientiList title="Top clienti" icon={<Trophy className="h-4 w-4 text-primary" />} clienti={analytics.perCliente.slice(0, 10)} badge="top" />
              <ClientiList title="In calo / Inattivi" icon={<TrendingDown className="h-4 w-4 text-destructive" />} clienti={analytics.perCliente.filter((c) => c.giorniInattivo > 60).slice(0, 10)} badge="inattivi" />
              <ClientiList title="In crescita" icon={<TrendingUp className="h-4 w-4 text-success" />} clienti={analytics.perCliente.filter((c) => c.giorniInattivo < 30).slice(0, 10)} badge="crescita" />
            </div>
          </TabsContent>

          {/* AI INSIGHTS */}
          <TabsContent value="ai" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Insights automatici</CardTitle>
                <CardDescription>Analisi generate in tempo reale sui tuoi dati</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {analytics.insights.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">Nessun insight rilevante al momento.</p>
                ) : (
                  analytics.insights.map((ins, i) => {
                    const colorMap = {
                      positivo: "border-success/30 bg-success/5 text-success",
                      attenzione: "border-destructive/30 bg-destructive/5 text-destructive",
                      info: "border-primary/30 bg-primary/5 text-primary",
                    };
                    const IconMap = { positivo: TrendingUp, attenzione: AlertTriangle, info: Sparkles };
                    const Icon = IconMap[ins.tipo];
                    return (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${colorMap[ins.tipo]}`}>
                        <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                        <p className="text-sm text-foreground">{ins.testo}</p>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CALENDARIO */}
          <TabsContent value="calendario">
            <div className="grid gap-4 md:grid-cols-3">
              <TimelineColumn title="In arrivo" icon={<Clock className="h-4 w-4 text-warning" />} items={analytics.filteredRows.filter((r) => r.statoProvvigione === "da_pagare" && r.dataPrevistaPagamento).slice(0, 20)} tone="warning" />
              <TimelineColumn title="Scaduti" icon={<AlertTriangle className="h-4 w-4 text-destructive" />} items={analytics.filteredRows.filter((r) => r.statoProvvigione === "da_pagare" && r.giorniRitardo > 0).slice(0, 20)} tone="destructive" />
              <TimelineColumn title="Ricevuti" icon={<CheckCircle2 className="h-4 w-4 text-success" />} items={analytics.filteredRows.filter((r) => r.statoProvvigione === "pagata").slice(0, 20)} tone="success" />
            </div>
          </TabsContent>

          {/* SIMULATORE */}
          <TabsContent value="simulatore">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" />Simulatore guadagno</CardTitle>
                  <CardDescription>Inserisci previsioni per stimare la provvigione totale</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Fatturato previsto (€)</Label>
                    <Input type="number" value={simFatturato} onChange={(e) => setSimFatturato(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Percentuale provvigione (%)</Label>
                    <Input type="number" step="0.1" value={simPct} onChange={(e) => setSimPct(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Bonus (€)</Label>
                      <Input type="number" value={simBonus} onChange={(e) => setSimBonus(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Premi (€)</Label>
                      <Input type="number" value={simPremi} onChange={(e) => setSimPremi(e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-primary/40 bg-gradient-to-br from-primary/10 to-card">
                <CardHeader>
                  <CardTitle>Risultato</CardTitle>
                  <CardDescription>Stima totale del guadagno</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground mb-2">Guadagno stimato</p>
                    <p className="text-5xl font-bold text-primary">{fmtEur2(simTotale)}</p>
                  </div>
                  <div className="space-y-1 text-sm border-t pt-4">
                    <div className="flex justify-between"><span className="text-muted-foreground">Provvigione base:</span><span>{fmtEur2((Number(simFatturato) * Number(simPct)) / 100)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Bonus:</span><span>{fmtEur2(Number(simBonus))}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Premi:</span><span>{fmtEur2(Number(simPremi))}</span></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* BONUS */}
          <TabsContent value="bonus">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-warning" />Premi &amp; Bonus</CardTitle>
                <CardDescription>Traccia i tuoi obiettivi e bonus (sezione in evoluzione)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nessun bonus configurato.</p>
                  <p className="text-xs mt-1">Presto potrai definire premi trimestrali, annuali e contest commerciali.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="riconciliazione">
            <RiconciliazioneSection />
          </TabsContent>

          <TabsContent value="scadenziario">

            <ScadenziarioTab />
          </TabsContent>

          <TabsContent value="matrice">
            <MatriceProvvigioniSection />
          </TabsContent>
        </Tabs>
      </div>

      <PagamentoProvvigioneDialog
        fattura={payDialog.fattura}
        open={payDialog.open}
        initialStato={payDialog.initialStato}
        onOpenChange={(o) => setPayDialog((p) => ({ ...p, open: o }))}
      />

      <MeseDetailSheet
        open={meseDetail.open}
        onOpenChange={(o) => setMeseDetail((s) => ({ ...s, open: o }))}
        detail={meseDetail.detail}
      />

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Segna come pagate — selezione multipla</DialogTitle>
            <DialogDescription>
              Aggiorna {selectedRows.length} provvigioni impostandole come <b>Pagate</b>. Il trimestre scelto verrà applicato a tutte.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Totale maturato selezionato</span>
              <span className="font-semibold text-primary">
                {fmtEur(selectedRows.reduce((s, r) => s + r.provvigioneMaturata, 0))}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Anno</Label>
              <Select value={String(bulkYear)} onValueChange={(v) => setBulkYear(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4].map((o) => {
                    const y = new Date().getFullYear() - o;
                    return <SelectItem key={y} value={String(y)}>{y}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Trimestre di pagamento</Label>
              <Select value={String(bulkTrim)} onValueChange={(v) => setBulkTrim(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Q1 · Gen-Mar</SelectItem>
                  <SelectItem value="2">Q2 · Apr-Giu</SelectItem>
                  <SelectItem value="3">Q3 · Lug-Set</SelectItem>
                  <SelectItem value="4">Q4 · Ott-Dic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Annulla</Button>
            <Button onClick={confirmBulkPagate} disabled={aggiornaBulkPagate.isPending}>
              {aggiornaBulkPagate.isPending ? "Salvataggio…" : `Conferma ${selectedRows.length} righe`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



    </MainLayout>
  );
};

// ============= SUB-COMPONENTS =============

function PeriodoSelector({ value, onChange }: { value: PeriodoFilter; onChange: (p: PeriodoFilter) => void }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const [open, setOpen] = useState(false);
  const label =
    value.tipo === "tutti" ? "Sempre" :
    value.tipo === "anno" ? `Anno ${value.year}` :
    value.tipo === "trimestre" ? `Q${value.quarter} ${value.year}` :
    `${["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"][value.month]} ${value.year}`;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <CalendarClock className="h-4 w-4" />{label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Tipo</Label>
            <div className="grid grid-cols-4 gap-1 mt-1">
              {(["mese","trimestre","anno","tutti"] as const).map((t) => (
                <Button key={t} size="sm" variant={value.tipo === t ? "default" : "outline"} className="h-7 text-xs capitalize" onClick={() => {
                  if (t === "tutti") onChange({ tipo: "tutti" });
                  else if (t === "anno") onChange({ tipo: "anno", year: currentYear });
                  else if (t === "mese") onChange({ tipo: "mese", year: currentYear, month: new Date().getMonth() });
                  else onChange({ tipo: "trimestre", year: currentYear, quarter: (Math.floor(new Date().getMonth() / 3) + 1) as any });
                }}>{t}</Button>
              ))}
            </div>
          </div>
          {value.tipo !== "tutti" && (
            <div>
              <Label className="text-xs">Anno</Label>
              <div className="flex gap-1 mt-1 flex-wrap">
                {years.map((y) => (
                  <Button key={y} size="sm" variant={value.year === y ? "default" : "outline"} className="h-7 text-xs" onClick={() => onChange({ ...value, year: y })}>{y}</Button>
                ))}
              </div>
            </div>
          )}
          {value.tipo === "trimestre" && (
            <div>
              <Label className="text-xs">Trimestre</Label>
              <div className="grid grid-cols-4 gap-1 mt-1">
                {([1,2,3,4] as const).map((q) => (
                  <Button key={q} size="sm" variant={value.quarter === q ? "default" : "outline"} className="h-7 text-xs" onClick={() => onChange({ ...value, quarter: q })}>Q{q}</Button>
                ))}
              </div>
            </div>
          )}
          {value.tipo === "mese" && (
            <div>
              <Label className="text-xs">Mese</Label>
              <div className="grid grid-cols-4 gap-1 mt-1">
                {["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"].map((m, i) => (
                  <Button key={i} size="sm" variant={value.month === i ? "default" : "outline"} className="h-7 text-xs" onClick={() => onChange({ ...value, month: i })}>{m}</Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EconomicoCell({ label, value, accent, big }: { label: string; value: number; accent?: string; big?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`font-bold ${big ? "text-3xl" : "text-xl"} ${accent || "text-foreground"}`}>{fmtEur(value)}</p>
    </div>
  );
}

function KPICard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: "success" | "warning" }) {
  const accentClass = accent === "success" ? "text-success" : accent === "warning" ? "text-warning" : "text-primary";
  return (
    <Card className="hover-lift">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">{label}</p>
          <span className={`${accentClass}`}>{icon}</span>
        </div>
        <p className="text-lg font-bold truncate">{value}</p>
      </CardContent>
    </Card>
  );
}

function GrowthCard({ label, value }: { label: string; value: number }) {
  const isPos = value > 0;
  const isNeg = value < 0;
  const Icon = isPos ? ArrowUpRight : isNeg ? ArrowDownRight : Minus;
  const color = isPos ? "text-success" : isNeg ? "text-destructive" : "text-muted-foreground";
  return (
    <Card className="hover-lift">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-2">{label}</p>
        <div className={`flex items-center gap-1 ${color}`}>
          <Icon className="h-5 w-5" />
          <p className="text-lg font-bold">{value > 0 ? "+" : ""}{value.toFixed(1)}%</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ObjectiveCard({ target, current, pct }: { target: number; current: number; pct: number }) {
  return (
    <Card className="hover-lift col-span-2 md:col-span-1">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Obiettivo mensile</p>
          <Target className="h-4 w-4 text-primary" />
        </div>
        <p className="text-lg font-bold">{pct.toFixed(0)}%</p>
        <Progress value={Math.min(100, pct)} className="h-1.5" />
        <p className="text-xs text-muted-foreground">{fmtEur(current)} / {fmtEur(target)}</p>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Heatmap({
  data,
  obiettivo,
  onCellClick,
}: {
  data: { anno: number; mesi: number[]; fatturato: number[]; media: number }[];
  obiettivo: number;
  onCellClick: (anno: number, mese: number) => void;
}) {
  const mesiLabel = ["G","F","M","A","M","G","L","A","S","O","N","D"];
  const mesiFull = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];

  // Classifica: alto / medio / basso.
  // Bench = max(media annuale, obiettivo mensile). Se non c'è alcun bench, fallback su max riga.
  const classify = (v: number, mediaAnno: number): { tone: "basso" | "medio" | "alto"; ratio: number } => {
    const bench = Math.max(mediaAnno || 0, obiettivo || 0);
    if (bench <= 0) return { tone: v > 0 ? "medio" : "basso", ratio: 0 };
    const ratio = v / bench;
    if (ratio < 0.7) return { tone: "basso", ratio };
    if (ratio < 1.1) return { tone: "medio", ratio };
    return { tone: "alto", ratio };
  };

  const bgFor = (v: number, mediaAnno: number): string => {
    if (v <= 0) return "hsl(var(--muted) / 0.4)";
    const { tone, ratio } = classify(v, mediaAnno);
    // intensity 0.35 → 1
    const intensity = Math.min(1, 0.35 + Math.min(ratio, 2) * 0.35);
    if (tone === "basso") return `hsl(0 75% 55% / ${intensity.toFixed(2)})`;
    if (tone === "medio") return `hsl(45 90% 55% / ${intensity.toFixed(2)})`;
    return `hsl(140 65% 45% / ${intensity.toFixed(2)})`;
  };

  const textColor = (v: number) => (v <= 0 ? "text-muted-foreground" : "text-white drop-shadow-sm");

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[60px_repeat(12,1fr)] gap-1 text-xs text-muted-foreground text-center">
        <div />
        {mesiLabel.map((m, i) => <div key={i}>{m}</div>)}
      </div>
      {data.map((row) => (
        <div key={row.anno} className="grid grid-cols-[60px_repeat(12,1fr)] gap-1">
          <div className="text-xs font-medium flex items-center">{row.anno}</div>
          {row.mesi.map((v, i) => {
            const { tone } = classify(v, row.media);
            const stateLabel = v <= 0 ? "vuoto" : tone;
            const tooltip = `${mesiFull[i]} ${row.anno}\nProvvigioni: ${fmtEur(v)}\nFatturato: ${fmtEur(row.fatturato[i] || 0)}\nStato: ${stateLabel}`;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onCellClick(row.anno, i)}
                title={tooltip}
                className={`aspect-square rounded transition-transform hover:scale-110 hover:ring-2 hover:ring-primary/50 focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-center text-[9px] font-semibold ${textColor(v)}`}
                style={{ background: bgFor(v, row.media) }}
              >
                {v > 0 && v >= 1000 ? `${Math.round(v / 1000)}k` : ""}
              </button>
            );
          })}
        </div>
      ))}
      {/* Legenda */}
      <div className="flex items-center justify-end gap-3 pt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: "hsl(0 75% 55% / 0.7)" }} />Basso</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: "hsl(45 90% 55% / 0.75)" }} />Medio</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: "hsl(140 65% 45% / 0.85)" }} />Alto</div>
      </div>
    </div>
  );
}


function StatoSummaryCard({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent?: "success" | "warning" | "unpaid" | "primary" | "destructive" | "purple" }) {
  const map = {
    success: "text-success",
    warning: "text-warning",
    unpaid: "text-commission-unpaid",
    primary: "text-primary",
    destructive: "text-destructive",
    purple: "text-commission-contested",
  } as const;
  const c = accent ? map[accent] : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`flex items-center justify-between mb-1 ${c}`}>
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className={`text-lg font-bold ${c}`}>{fmtEur(value)}</p>
      </CardContent>
    </Card>
  );
}

function SortableHead({ k, label, sortKey, sortDir, onSort, align }: { k: SortKey; label: string; sortKey: SortKey; sortDir: "asc" | "desc"; onSort: (k: SortKey) => void; align?: "right" | "center" }) {
  return (
    <TableHead className={align === "right" ? "text-right" : align === "center" ? "text-center" : ""}>
      <button onClick={() => onSort(k)} className="hover:text-foreground transition-colors flex items-center gap-1">
        {label}
        {sortKey === k && (sortDir === "asc" ? "↑" : "↓")}
      </button>
    </TableHead>
  );
}

function ClientiList({ title, icon, clienti, badge }: { title: string; icon: React.ReactNode; clienti: any[]; badge: "top" | "inattivi" | "crescita" }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {clienti.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nessun cliente</p>
        ) : (
          clienti.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/40 transition">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{c.nome}</p>
                <p className="text-xs text-muted-foreground">{c.ordini} ordini · {c.giorniInattivo}gg fa</p>
              </div>
              <div className="text-right shrink-0 ml-2">
                <p className="text-sm font-semibold">{fmtEur(c.fatturato)}</p>
                <p className="text-xs text-primary">{fmtEur(c.provvigioni)}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function TimelineColumn({ title, icon, items, tone }: { title: string; icon: React.ReactNode; items: ProvvigioneRow[]; tone: "warning" | "destructive" | "success" }) {
  const borderMap = { warning: "border-l-warning", destructive: "border-l-destructive", success: "border-l-success" };
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">{icon}{title} <Badge variant="outline">{items.length}</Badge></CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nessun elemento</p>
        ) : (
          items.map((r) => (
            <div key={r.id} className={`p-3 rounded border-l-2 ${borderMap[tone]} bg-muted/20`}>
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.aziendaNome}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.clienteNome} · {r.numero}</p>
                </div>
                <p className="text-sm font-semibold text-primary shrink-0">{fmtEur(r.provvigioneMaturata)}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {r.dataEffettivaPagamento ? `Pagato ${format(new Date(r.dataEffettivaPagamento), "dd/MM/yy")}` :
                 r.dataPrevistaPagamento ? `Scadenza ${format(new Date(r.dataPrevistaPagamento), "dd/MM/yy")}` :
                 format(new Date(r.data), "dd/MM/yy")}
                {r.giorniRitardo > 0 && <span className="text-destructive ml-2">+{r.giorniRitardo}gg</span>}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default Provvigioni;
