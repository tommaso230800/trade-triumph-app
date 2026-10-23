import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  ReferenceLine,
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
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useAziendaColorMap, aziendaColorValue } from "@/lib/aziendaColor";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fmtEur = (v: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

const STATO_CONFIG: Record<StatoProvvigione, { label: string; color: string; rowBg?: string; icon: any; iconColor: string }> = {
  pagata: { label: "Pagata", color: "status-prov-paid", icon: CheckCircle2, iconColor: "text-success" },
  da_pagare: { label: "Non pagata", color: "status-prov-unpaid", icon: Clock, iconColor: "text-commission-unpaid" },
  scaduta: { label: "Scaduta", color: "status-prov-overdue", rowBg: "bg-destructive/10 hover:bg-destructive/15 border-l-4 border-l-destructive", icon: AlertTriangle, iconColor: "text-destructive" },
  parziale: { label: "Parzialmente pagata", color: "status-prov-partial", icon: CircleDot, iconColor: "text-primary" },
  contestazione: { label: "In contestazione", color: "status-prov-contested", icon: Ban, iconColor: "text-commission-contested" },
};

// Stili condivisi della pagina (scope "scatto", coerenti con la pagina Ordini).
const provInputCls =
  "flex-1 rounded-xl border-scatto-line bg-scatto-surface text-scatto-ink placeholder:text-scatto-muted focus-visible:ring-scatto-accent";
const provTabCls =
  "gap-2 rounded-lg text-scatto-muted hover:text-scatto-ink data-[state=active]:bg-scatto-accent data-[state=active]:text-white data-[state=active]:shadow-none";
const provCardCls =
  "rounded-xl border border-scatto-line bg-scatto-surface shadow-[0_1px_2px_hsl(225_18%_9%/0.05)]";

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

  const { data: aziende } = useAziende();
  const { data: clienti } = useClienti();
  const { fattureIncassate, fattureScadute, aggiornaStatoProvvigione, aggiornaTrimestrePagamento, aggiornaBulkPagate } = useScadenziario();
  const aziendaColorMap = useAziendaColorMap();

  const filters: ProvvigioniFilters = { aziendaId, clienteId, periodo, search };
  const analytics = useProvvigioniAnalytics(filters);

  // Serie mensile senza i mesi vuoti iniziali: la finestra resta di 24 mesi,
  // ma se i dati partono più avanti la curva non spreca spazio su mesi a 0.
  const serieMensileVisibile = useMemo(() => {
    const idx = analytics.serieMensile.findIndex((m) => m.fatturato > 0 || m.provvigioni > 0);
    return idx >= 0 ? analytics.serieMensile.slice(idx) : analytics.serieMensile;
  }, [analytics.serieMensile]);

  // Aziende con lo stesso nome ma id diversi: quasi sempre un'anagrafica
  // duplicata a database, non un caso reale di due fornitori omonimi — lo
  // segnaliamo (sola lettura) invece di provare a unificarle qui.
  const aziendeDuplicate = useMemo(() => {
    const byName = new Map<string, { nome: string; ids: Set<string> }>();
    analytics.perAzienda.forEach((a) => {
      const key = a.nome.trim().toLowerCase();
      if (!byName.has(key)) byName.set(key, { nome: a.nome, ids: new Set() });
      byName.get(key)!.ids.add(a.id);
    });
    return Array.from(byName.values())
      .filter((g) => g.ids.size > 1)
      .map((g) => g.nome);
  }, [analytics.perAzienda]);

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


  return (
    <MainLayout>
      <div className="space-y-6 animate-rise-in pb-8">
        {/* Pannello con scope proprio (token --scatto-*), coerente con Ordini. */}
        <div className="space-y-6 rounded-2xl bg-scatto-bg p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-bold tracking-tight text-scatto-ink">Provvigioni</h1>
            <p className="text-sm text-scatto-muted">Centro di controllo economico — filtra, analizza, gestisci pagamenti</p>
          </div>
        </div>

        {/* STICKY FILTER BAR */}
        <div className="sticky top-0 z-20 -mx-4 lg:-mx-6 px-4 lg:px-6 py-3 bg-scatto-bg/90 backdrop-blur-xl border-b border-scatto-line">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
              <Building2 className="h-4 w-4 text-scatto-muted shrink-0" />
              <Select value={aziendaId} onValueChange={(v) => setAziendaId(v)}>
                <SelectTrigger className={provInputCls}>
                  <SelectValue placeholder="Seleziona azienda" />
                </SelectTrigger>
                <SelectContent className="border-scatto-line bg-scatto-surface text-scatto-ink">
                  <SelectItem value="tutte" className="focus:bg-scatto-bg focus:text-scatto-ink">Tutte le aziende</SelectItem>
                  {aziende?.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="focus:bg-scatto-bg focus:text-scatto-ink">{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <PeriodoSelector value={periodo} onChange={setPeriodo} />

            <div className="flex items-center gap-2 flex-1 min-w-[180px]">
              <Users className="h-4 w-4 text-scatto-muted shrink-0" />
              <Select value={clienteId} onValueChange={(v) => setClienteId(v)}>
                <SelectTrigger className={provInputCls}>
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent className="border-scatto-line bg-scatto-surface text-scatto-ink">
                  <SelectItem value="tutti" className="focus:bg-scatto-bg focus:text-scatto-ink">Tutti i clienti</SelectItem>
                  {clienti?.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="focus:bg-scatto-bg focus:text-scatto-ink">{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-scatto-muted" />
              <Input
                placeholder="Cerca ordine, cliente, azienda..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`pl-9 ${provInputCls}`}
              />
            </div>
          </div>
        </div>

        {/* CONTO ECONOMICO PERSONALE: striscia piatta, un dato protagonista */}
        <section className="overflow-hidden rounded-xl border border-scatto-line bg-scatto-surface shadow-[0_1px_2px_hsl(225_18%_9%/0.05)]">
          <header className="flex items-center gap-2 border-b border-scatto-line px-4 py-3 sm:px-5">
            <Wallet className="h-4 w-4 text-scatto-muted" />
            <h2 className="font-display text-base font-semibold tracking-tight text-scatto-ink">Il tuo Conto Economico</h2>
            {aziendaId !== "tutte" && (
              <span className="ml-auto rounded-full bg-scatto-accent/10 px-2.5 py-0.5 text-xs font-semibold text-scatto-accent">
                {aziende?.find((a) => a.id === aziendaId)?.nome}
              </span>
            )}
          </header>
          <div className="grid grid-cols-2 divide-x divide-y divide-scatto-line md:grid-cols-5 md:divide-y-0">
            <EconomicoCell label="Oggi" value={analytics.contoEconomico.guadagnoOggi} accent="text-scatto-success" />
            <EconomicoCell label="Questo mese" value={analytics.contoEconomico.guadagnoMese} accent="text-scatto-accent" big />
            <EconomicoCell label="Quest'anno" value={analytics.contoEconomico.guadagnoAnno} />
            <EconomicoCell label="Media/giorno" value={analytics.contoEconomico.mediaGiornaliera} accent="text-scatto-muted" />
            <EconomicoCell label={`Previsione ${format(now, "MMM", { locale: it })}`} value={analytics.contoEconomico.previsioneFineMese} accent="text-scatto-warning" />
          </div>
        </section>

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
          <TabsList className="w-full flex-wrap h-auto justify-start gap-1 rounded-xl border border-scatto-line bg-scatto-surface p-1">
            <TabsTrigger value="overview" className={provTabCls}><LineChartIcon className="h-4 w-4" />Overview</TabsTrigger>
            <TabsTrigger value="provvigioni" className={provTabCls}><Euro className="h-4 w-4" />Provvigioni</TabsTrigger>
            <TabsTrigger value="aziende" className={provTabCls}><Building2 className="h-4 w-4" />Aziende</TabsTrigger>
            <TabsTrigger value="clienti" className={provTabCls}><Users className="h-4 w-4" />Clienti</TabsTrigger>
            <TabsTrigger value="bonus" className={provTabCls}><Trophy className="h-4 w-4" />Bonus</TabsTrigger>
            <TabsTrigger value="scadenziario" className={provTabCls}><Receipt className="h-4 w-4" />Scadenziario</TabsTrigger>
            <TabsTrigger value="riconciliazione" className={provTabCls}><Sparkles className="h-4 w-4" />Riconciliazione</TabsTrigger>
            <TabsTrigger value="matrice" className={provTabCls}><Percent className="h-4 w-4" />Matrice</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-5">
            {aziendeDuplicate.length > 0 && (
              <div className="flex items-start gap-2.5 rounded-xl border border-scatto-danger/30 bg-scatto-danger/5 p-3.5 text-sm text-scatto-danger">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>
                  <b className="font-semibold">Da sistemare nei dati:</b>{" "}
                  {aziendeDuplicate.length === 1
                    ? `l'azienda "${aziendeDuplicate[0]}" compare più volte a database con anagrafiche diverse`
                    : `${aziendeDuplicate.length} aziende compaiono più volte a database con anagrafiche diverse (${aziendeDuplicate.join(", ")})`}
                  {" "}— le percentuali qui sotto sono spezzate tra le due schede finché non vengono unificate.
                </p>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Andamento provvigioni" icon={<LineChartIcon className="h-4 w-4" />}>
                {(() => {
                  const data = serieMensileVisibile;
                  const n = data.length;
                  const chartData = data.map((d, i) => ({
                    ...d,
                    provvSolid: i < n - 1 ? d.provvigioni : null,
                    provvInCorso: i >= n - 2 ? d.provvigioni : null,
                  }));
                  const completati = data.slice(0, Math.max(0, n - 1));
                  const media = completati.length ? completati.reduce((s, d) => s + d.provvigioni, 0) / completati.length : 0;
                  return (
                    <>
                      <ResponsiveContainer width="100%" height={260}>
                        <ComposedChart data={chartData}>
                          <defs>
                            <linearGradient id="colorP" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(var(--scatto-info))" stopOpacity={0.35} />
                              <stop offset="100%" stopColor="hsl(var(--scatto-info))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--scatto-line))" />
                          <XAxis dataKey="mese" stroke="hsl(var(--scatto-muted))" fontSize={11} />
                          <YAxis stroke="hsl(var(--scatto-muted))" fontSize={11} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                          <Tooltip
                            contentStyle={{ background: "hsl(var(--scatto-surface))", border: "1px solid hsl(var(--scatto-line))", borderRadius: 8 }}
                            formatter={(v: number) => [fmtEur(v), "Provvigioni"]}
                            labelFormatter={(label) => (data[n - 1]?.mese === label ? `${label} · in corso` : label)}
                          />
                          {media > 0 && (
                            <ReferenceLine
                              y={media}
                              stroke="hsl(var(--scatto-muted))"
                              strokeDasharray="5 4"
                              label={{ value: `media ${fmtEur(Math.round(media))}`, position: "insideTopRight", fill: "hsl(var(--scatto-muted))", fontSize: 11 }}
                            />
                          )}
                          <Area type="monotone" dataKey="provvSolid" stroke="hsl(var(--scatto-info))" strokeWidth={2.2} fill="url(#colorP)" connectNulls={false} dot={false} />
                          <Line type="monotone" dataKey="provvInCorso" stroke="hsl(var(--scatto-info) / 0.55)" strokeWidth={2.2} strokeDasharray="4 3" dot={{ r: 3 }} connectNulls activeDot={{ r: 4 }} legendType="none" />
                        </ComposedChart>
                      </ResponsiveContainer>
                      <p className="mt-1 text-[11px] text-scatto-muted">
                        Il tratto tratteggiato è il mese in corso, ancora incompleto.
                      </p>
                    </>
                  );
                })()}
              </ChartCard>

              <ChartCard title="Fatturato e incidenza provvigioni" icon={<TrendingUp className="h-4 w-4" />}>
                {(() => {
                  const data = serieMensileVisibile.map((d) => ({
                    ...d,
                    incidenza: d.fatturato > 0 ? (d.provvigioni / d.fatturato) * 100 : null,
                  }));
                  const conDati = data.filter((d): d is typeof d & { incidenza: number } => d.incidenza !== null);
                  const mediaIncidenza = conDati.length ? conDati.reduce((s, d) => s + d.incidenza, 0) / conDati.length : 0;
                  return (
                    <>
                      <ResponsiveContainer width="100%" height={260}>
                        <ComposedChart data={data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--scatto-line))" />
                          <XAxis dataKey="mese" stroke="hsl(var(--scatto-muted))" fontSize={11} />
                          <YAxis yAxisId="left" stroke="hsl(var(--scatto-muted))" fontSize={11} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                          <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--scatto-success))" fontSize={11} tickFormatter={(v) => `${v.toFixed(1)}%`} domain={["dataMin - 1", "dataMax + 1"]} />
                          <Tooltip
                            contentStyle={{ background: "hsl(var(--scatto-surface))", border: "1px solid hsl(var(--scatto-line))", borderRadius: 8 }}
                            formatter={(v: number, name: string) => (name === "fatturato" ? [fmtEur(v), "Fatturato"] : [`${v.toFixed(1)}%`, "Provvigione effettiva"])}
                          />
                          <Legend wrapperStyle={{ fontSize: 11 }} formatter={(value) => (value === "fatturato" ? "Fatturato" : "Provvigione effettiva %")} />
                          {mediaIncidenza > 0 && (
                            <ReferenceLine
                              yAxisId="right"
                              y={mediaIncidenza}
                              stroke="hsl(var(--scatto-success))"
                              strokeDasharray="5 4"
                              label={{ value: `media ${mediaIncidenza.toFixed(1)}%`, position: "insideBottomRight", fill: "hsl(var(--scatto-success))", fontSize: 11 }}
                            />
                          )}
                          <Bar yAxisId="left" dataKey="fatturato" fill="hsl(var(--scatto-info) / 0.22)" radius={[3, 3, 0, 0]} name="fatturato" />
                          <Line yAxisId="right" type="monotone" dataKey="incidenza" stroke="hsl(var(--scatto-success))" strokeWidth={2.2} dot={{ r: 2.5 }} connectNulls name="incidenza" />
                        </ComposedChart>
                      </ResponsiveContainer>
                      <p className="mt-1 text-[11px] text-scatto-muted">
                        La linea è la provvigione realmente incassata sul fatturato: un mese sotto la media va controllato.
                      </p>
                    </>
                  );
                })()}
              </ChartCard>

              <ChartCard title="Ripartizione per azienda" icon={<Building2 className="h-4 w-4" />}>
                {(() => {
                  const top = analytics.perAzienda.slice(0, 8);
                  if (top.length === 0) return <p className="py-8 text-center text-sm text-scatto-muted">Nessun dato</p>;
                  const totale = top.reduce((s, a) => s + a.provvigioni, 0) || 1;
                  const max = top[0]?.provvigioni || 1;
                  return (
                    <div className="space-y-3">
                      {top.map((a) => {
                        const color = aziendaColorValue(a.id, aziendaColorMap);
                        return (
                          <div key={a.id}>
                            <div className="mb-1.5 flex items-center gap-2">
                              <span className="h-2.5 w-2.5 flex-shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                              <span className="min-w-0 flex-1 truncate text-sm font-medium text-scatto-ink">{a.nome}</span>
                              <span className="flex-shrink-0 text-sm font-semibold tabular-nums text-scatto-ink">{fmtEur(a.provvigioni)}</span>
                              <span className="w-12 flex-shrink-0 text-right text-xs tabular-nums text-scatto-muted">
                                {((a.provvigioni / totale) * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-scatto-ink/[0.06]">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${Math.max(4, (a.provvigioni / max) * 100)}%`, backgroundColor: color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </ChartCard>

              <ChartCard title="Mese corrente · andamento giornaliero" icon={<CalendarClock className="h-4 w-4" />}>
                {(() => {
                  const data = analytics.seriaGiornaliera;
                  const obiettivo = analytics.kpi.obiettivoMensile;
                  const ultimoConDati = [...data].reverse().find((d) => d.cumulato !== null);
                  const cumFinale = ultimoConDati?.cumulato || 0;
                  const maxAsse = Math.max(obiettivo, cumFinale, ...data.map((d) => d.valore || 0), 1) * 1.15;
                  const step = maxAsse / 4;
                  const ticks = [0, step, step * 2, step * 3, step * 4];
                  return (
                    <>
                      <ResponsiveContainer width="100%" height={260}>
                        <ComposedChart data={data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--scatto-line))" />
                          <XAxis dataKey="giorno" stroke="hsl(var(--scatto-muted))" fontSize={10} />
                          <YAxis stroke="hsl(var(--scatto-muted))" fontSize={10} ticks={ticks} domain={[0, maxAsse]} tickFormatter={(v) => fmtEur(Math.round(v))} />
                          <Tooltip
                            contentStyle={{ background: "hsl(var(--scatto-surface))", border: "1px solid hsl(var(--scatto-line))", borderRadius: 8 }}
                            formatter={(v: number, name: string) => [fmtEur(v), name === "cumulato" ? "Progressivo" : "Giornaliera"]}
                            labelFormatter={(l) => `Giorno ${l}`}
                          />
                          {obiettivo > 0 && (
                            <ReferenceLine
                              y={obiettivo}
                              stroke="hsl(var(--scatto-warning))"
                              strokeDasharray="5 4"
                              label={{ value: `obiettivo ${fmtEur(obiettivo)}`, position: "insideTopRight", fill: "hsl(var(--scatto-warning))", fontSize: 11 }}
                            />
                          )}
                          <Bar dataKey="valore" fill="hsl(var(--scatto-info) / 0.35)" radius={[2, 2, 0, 0]} name="valore" />
                          <Line type="monotone" dataKey="cumulato" stroke="hsl(var(--scatto-info))" strokeWidth={2.4} dot={false} connectNulls name="cumulato" />
                        </ComposedChart>
                      </ResponsiveContainer>
                      <p className="mt-1 text-[11px] text-scatto-muted">
                        Progressivo del mese: <b className="font-semibold text-scatto-ink">{fmtEur(cumFinale)}</b>
                        {obiettivo > 0 && <> · {Math.round((cumFinale / obiettivo) * 100)}% dell'obiettivo</>}
                      </p>
                    </>
                  );
                })()}
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
            <section className={provCardCls}>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-scatto-line px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-scatto-muted" />
                  <h2 className="font-display text-base font-semibold tracking-tight text-scatto-ink">Liquidato per trimestre di pagamento</h2>
                </div>
                <p className="text-xs text-scatto-muted">
                  Basato sul trimestre in cui l'azienda ha effettivamente liquidato la provvigione
                </p>
              </header>
              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {analytics.perTrimestrePagamento.map((t) => {
                    const active = trimestreFilter === t.trimestre;
                    return (
                      <button
                        key={t.trimestre}
                        onClick={() => setTrimestreFilter(active ? 0 : (t.trimestre as 1 | 2 | 3 | 4))}
                        className={`text-left rounded-xl border p-4 transition-colors ${active ? "border-scatto-accent bg-scatto-accent/5" : "border-scatto-line bg-scatto-surface hover:bg-scatto-bg"}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-scatto-ink">Q{t.trimestre}</span>
                          <span className="text-xs text-scatto-muted">{["Gen-Mar","Apr-Giu","Lug-Set","Ott-Dic"][t.trimestre-1]}</span>
                        </div>
                        <p className={`text-xl font-bold tabular-nums ${active ? "text-scatto-accent" : "text-scatto-ink"}`}>{fmtEur(t.liquidato)}</p>
                        <p className="text-xs text-scatto-muted mt-1">{t.conteggio} provvigioni</p>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.perTrimestrePagamento.map((t) => ({ name: `Q${t.trimestre}`, liquidato: t.liquidato }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--scatto-line))" />
                      <XAxis dataKey="name" stroke="hsl(var(--scatto-muted))" fontSize={11} />
                      <YAxis stroke="hsl(var(--scatto-muted))" fontSize={11} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ background: "hsl(var(--scatto-surface))", border: "1px solid hsl(var(--scatto-line))", borderRadius: 8 }} formatter={(v: number) => fmtEur(v)} />
                      <Bar dataKey="liquidato" radius={[6, 6, 0, 0]}>
                        {analytics.perTrimestrePagamento.map((t, i) => (
                          <Cell key={i} fill={trimestreFilter === t.trimestre ? "hsl(var(--scatto-accent))" : "hsl(var(--scatto-accent) / 0.4)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className={provCardCls}>
              <div className="flex flex-col gap-3 border-b border-scatto-line px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {(["tutte", "pagata", "da_pagare", "scaduta", "parziale", "contestazione"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatoFilter(s)}
                        className={`min-h-[36px] rounded-lg border px-3 text-xs font-semibold transition-colors ${
                          statoFilter === s
                            ? "border-scatto-accent bg-scatto-accent text-white"
                            : "border-scatto-line bg-scatto-surface text-scatto-ink hover:bg-scatto-bg"
                        }`}
                      >
                        {s === "tutte" ? "Tutte" : STATO_CONFIG[s].label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="rounded-lg border-scatto-line bg-scatto-surface text-scatto-ink hover:bg-scatto-bg" onClick={exportExcel}><Download className="h-4 w-4 mr-1" />Excel{trimestreFilter !== 0 ? ` Q${trimestreFilter}` : ""}</Button>
                    <Button size="sm" variant="outline" className="rounded-lg border-scatto-line bg-scatto-surface text-scatto-ink hover:bg-scatto-bg" onClick={exportPDF}><Download className="h-4 w-4 mr-1" />PDF{trimestreFilter !== 0 ? ` Q${trimestreFilter}` : ""}</Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-scatto-line pt-3">
                  <span className="mr-1 text-xs font-medium uppercase tracking-wide text-scatto-muted">Trimestre pagamento:</span>
                  {([0, 1, 2, 3, 4] as const).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setTrimestreFilter(q)}
                      className={`min-h-[32px] rounded-lg border px-3 text-xs font-semibold transition-colors ${
                        trimestreFilter === q
                          ? "border-scatto-accent bg-scatto-accent text-white"
                          : "border-scatto-line bg-scatto-surface text-scatto-ink hover:bg-scatto-bg"
                      }`}
                    >
                      {q === 0 ? "Tutti" : `Q${q}`}
                    </button>
                  ))}
                  {selectedRows.length > 0 && (
                    <div className="ml-auto flex items-center gap-2 rounded-lg border border-scatto-accent/40 bg-scatto-accent/5 px-3 py-1.5">
                      <span className="text-xs font-medium text-scatto-ink">{selectedRows.length} selezionate</span>
                      <Button size="sm" onClick={() => setBulkOpen(true)} className="h-7 bg-scatto-accent font-bold text-white hover:bg-scatto-accent/90">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Segna come pagate
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="h-7 text-scatto-muted hover:text-scatto-ink">
                        Annulla
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-3 sm:p-4">
                {/* Mobile: una card per riga, niente scorrimento orizzontale */}
                <div className="space-y-3 lg:hidden">
                  {filteredTableRows.length === 0 ? (
                    <p className="py-8 text-center text-sm text-scatto-muted">Nessuna riga per i filtri selezionati</p>
                  ) : (
                    filteredTableRows.map((r) => {
                      const S = STATO_CONFIG[r.statoProvvigione];
                      const selectable = r.source !== "movimento";
                      return (
                        <div
                          key={r.id}
                          className={`rounded-xl border bg-scatto-surface p-3.5 ${
                            r.statoProvvigione === "scaduta" ? "border-scatto-danger/50" : "border-scatto-line"
                          } ${selectedIds.has(r.id) ? "ring-2 ring-scatto-accent ring-offset-2 ring-offset-scatto-bg" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-start gap-2.5">
                              {selectable && (
                                <input
                                  type="checkbox"
                                  aria-label={`Seleziona provvigione ${r.numero}`}
                                  className="mt-1 h-5 w-5 flex-shrink-0 rounded border-scatto-line cursor-pointer accent-scatto-accent"
                                  checked={selectedIds.has(r.id)}
                                  onChange={() => toggleSelectOne(r.id)}
                                />
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-scatto-ink">{r.aziendaNome}</p>
                                <p className="truncate text-xs text-scatto-muted">
                                  {r.clienteNome} · {r.numero} · {format(new Date(r.data), "dd/MM/yy")}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className={`flex-shrink-0 gap-1 border ${S?.color}`}>
                              {S && <S.icon className="h-3 w-3" />}
                              {S?.label}
                            </Badge>
                          </div>
                          <div className="mt-3 flex items-end justify-between gap-3">
                            <div>
                              <p className="text-xs text-scatto-muted">Maturata</p>
                              <p className="font-display text-xl font-bold tabular-nums tracking-tight text-scatto-ink">{fmtEur(r.provvigioneMaturata)}</p>
                              <p className="mt-0.5 text-xs tabular-nums text-scatto-muted">
                                Base {fmtEur(r.imponibile)} · {r.percentualeProvv}% · Pagata <span className="font-semibold text-scatto-success">{fmtEur(r.provvigionePagata)}</span>
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" className="h-9 gap-1.5 whitespace-nowrap bg-scatto-accent font-bold text-white hover:bg-scatto-accent/90">
                                  <CircleDot className="h-3.5 w-3.5" />
                                  Stato
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56 border-scatto-line bg-scatto-surface text-scatto-ink">
                                <DropdownMenuItem onClick={() => openPayDialog(r, "pagata")} className="gap-2 focus:bg-scatto-bg focus:text-scatto-ink">
                                  <CheckCircle2 className="h-4 w-4 text-scatto-success" />
                                  <span>Pagata</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => quickSetStato(r, "da_pagare")} className="gap-2 focus:bg-scatto-bg focus:text-scatto-ink">
                                  <Clock className="h-4 w-4 text-commission-unpaid" />
                                  <span>Non pagata</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => quickSetStato(r, "scaduta")} className="gap-2 focus:bg-scatto-bg focus:text-scatto-ink">
                                  <AlertTriangle className="h-4 w-4 text-scatto-danger" />
                                  <span>Scaduta</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openPayDialog(r, "parziale")} className="gap-2 focus:bg-scatto-bg focus:text-scatto-ink">
                                  <CircleDot className="h-4 w-4 text-scatto-accent" />
                                  <span>Parzialmente pagata</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => quickSetStato(r, "contestazione")} className="gap-2 focus:bg-scatto-bg focus:text-scatto-ink">
                                  <Ban className="h-4 w-4 text-commission-contested" />
                                  <span>In contestazione</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          {selectable && (
                            <div className="mt-3 border-t border-scatto-line pt-3">
                              <Select
                                value={r.trimestrePagamento ? String(r.trimestrePagamento) : ""}
                                onValueChange={(v) => setTrimestreInline(r, Number(v))}
                              >
                                <SelectTrigger className="h-11 rounded-lg border-scatto-line bg-scatto-surface text-xs text-scatto-ink">
                                  <SelectValue placeholder="Trimestre di pagamento —" />
                                </SelectTrigger>
                                <SelectContent className="border-scatto-line bg-scatto-surface text-scatto-ink">
                                  <SelectItem value="1" className="focus:bg-scatto-bg focus:text-scatto-ink">Q1 · Gen-Mar</SelectItem>
                                  <SelectItem value="2" className="focus:bg-scatto-bg focus:text-scatto-ink">Q2 · Apr-Giu</SelectItem>
                                  <SelectItem value="3" className="focus:bg-scatto-bg focus:text-scatto-ink">Q3 · Lug-Set</SelectItem>
                                  <SelectItem value="4" className="focus:bg-scatto-bg focus:text-scatto-ink">Q4 · Ott-Dic</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                {/* Desktop: tabella completa */}
                <div className="hidden lg:block">
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
                <p className="text-scatto-muted col-span-full text-center py-8">Nessun dato</p>
              ) : (
                analytics.perAzienda.map((a) => (
                  <section key={a.id} className={provCardCls}>
                    <header className="flex items-start justify-between gap-2 border-b border-scatto-line px-4 py-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-base font-semibold tracking-tight text-scatto-ink">{a.nome}</h3>
                        <p className="text-xs text-scatto-muted">{a.ordini} ordini · {a.clienti} clienti</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-scatto-accent/10 px-2.5 py-0.5 text-xs font-semibold text-scatto-accent">{a.incidenza.toFixed(0)}%</span>
                    </header>
                    <div className="space-y-3 p-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-scatto-muted">Fatturato</p>
                          <p className="font-semibold tabular-nums text-scatto-ink">{fmtEur(a.fatturato)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-scatto-muted">Provvigioni</p>
                          <p className="font-semibold tabular-nums text-scatto-accent">{fmtEur(a.provvigioni)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-scatto-muted">Media ordine</p>
                          <p className="font-medium tabular-nums text-scatto-ink">{fmtEur(a.mediaOrdine)}</p>
                        </div>
                      </div>
                      <Progress value={a.incidenza} className="h-1.5" />
                    </div>
                  </section>
                ))
              )}
            </div>
          </TabsContent>

          {/* CLIENTI */}
          <TabsContent value="clienti" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <ClientiList title="Top clienti" icon={<Trophy className="h-4 w-4 text-scatto-accent" />} clienti={analytics.perCliente.slice(0, 10)} badge="top" />
              <ClientiList title="In calo / Inattivi" icon={<TrendingDown className="h-4 w-4 text-scatto-danger" />} clienti={analytics.perCliente.filter((c) => c.giorniInattivo > 60).slice(0, 10)} badge="inattivi" />
              <ClientiList title="In crescita" icon={<TrendingUp className="h-4 w-4 text-scatto-success" />} clienti={analytics.perCliente.filter((c) => c.giorniInattivo < 30).slice(0, 10)} badge="crescita" />
            </div>
          </TabsContent>

          {/* BONUS */}
          <TabsContent value="bonus">
            <section className={provCardCls}>
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-scatto-line px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-scatto-warning" />
                  <h2 className="font-display text-base font-semibold tracking-tight text-scatto-ink">Premi &amp; Bonus</h2>
                </div>
                <p className="text-xs text-scatto-muted">Traccia i tuoi obiettivi e bonus (sezione in evoluzione)</p>
              </header>
              <div className="p-4 sm:p-5">
                <div className="py-12 text-center text-scatto-muted">
                  <Trophy className="mx-auto mb-3 h-12 w-12 opacity-30" />
                  <p className="text-sm">Nessun bonus configurato.</p>
                  <p className="mt-1 text-xs">Presto potrai definire premi trimestrali, annuali e contest commerciali.</p>
                </div>
              </div>
            </section>
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
    <div className="p-4 sm:p-5">
      <p className="text-xs uppercase tracking-wide text-scatto-muted">{label}</p>
      <p className={`mt-1 font-display font-bold tracking-tight tabular-nums ${big ? "text-3xl" : "text-xl"} ${accent || "text-scatto-ink"}`}>{fmtEur(value)}</p>
    </div>
  );
}

function KPICard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: "success" | "warning" }) {
  const accentClass = accent === "success" ? "text-scatto-success" : accent === "warning" ? "text-scatto-warning" : "text-scatto-muted";
  return (
    <div className={provCardCls}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-scatto-muted">{label}</p>
          <span className={accentClass}>{icon}</span>
        </div>
        <p className="truncate text-lg font-bold tabular-nums tracking-tight text-scatto-ink">{value}</p>
      </div>
    </div>
  );
}

function GrowthCard({ label, value }: { label: string; value: number }) {
  const isPos = value > 0;
  const isNeg = value < 0;
  const Icon = isPos ? ArrowUpRight : isNeg ? ArrowDownRight : Minus;
  const color = isPos ? "text-scatto-success" : isNeg ? "text-scatto-danger" : "text-scatto-muted";
  return (
    <div className={provCardCls}>
      <div className="p-4">
        <p className="text-xs text-scatto-muted mb-2">{label}</p>
        <div className={`flex items-center gap-1 ${color}`}>
          <Icon className="h-5 w-5" />
          <p className="text-lg font-bold tabular-nums">{value > 0 ? "+" : ""}{value.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}

function ObjectiveCard({ target, current, pct }: { target: number; current: number; pct: number }) {
  return (
    <div className={`${provCardCls} col-span-2 md:col-span-1`}>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-scatto-muted">Obiettivo mensile</p>
          <Target className="h-4 w-4 text-scatto-accent" />
        </div>
        <p className="text-lg font-bold tabular-nums text-scatto-ink">{pct.toFixed(0)}%</p>
        <Progress value={Math.min(100, pct)} className="h-1.5" />
        <p className="text-xs tabular-nums text-scatto-muted">{fmtEur(current)} / {fmtEur(target)}</p>
      </div>
    </div>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={provCardCls}>
      <header className="flex items-center gap-2 border-b border-scatto-line px-4 py-3 sm:px-5">
        {icon && <span className="text-scatto-muted">{icon}</span>}
        <h2 className="font-display text-sm font-semibold tracking-tight text-scatto-ink">{title}</h2>
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
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
    if (v <= 0) return "hsl(var(--scatto-line) / 0.5)";
    const { tone, ratio } = classify(v, mediaAnno);
    // intensity 0.35 → 1
    const intensity = Math.min(1, 0.35 + Math.min(ratio, 2) * 0.35);
    if (tone === "basso") return `hsl(var(--scatto-danger) / ${intensity.toFixed(2)})`;
    if (tone === "medio") return `hsl(var(--scatto-warning) / ${intensity.toFixed(2)})`;
    return `hsl(var(--scatto-success) / ${intensity.toFixed(2)})`;
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
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: "hsl(var(--scatto-danger) / 0.7)" }} />Basso</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: "hsl(var(--scatto-warning) / 0.75)" }} />Medio</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: "hsl(var(--scatto-success) / 0.85)" }} />Alto</div>
      </div>
    </div>
  );
}


function StatoSummaryCard({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent?: "success" | "warning" | "unpaid" | "primary" | "destructive" | "purple" }) {
  const map = {
    success: "text-scatto-success",
    warning: "text-scatto-warning",
    unpaid: "text-commission-unpaid",
    primary: "text-scatto-accent",
    destructive: "text-scatto-danger",
    purple: "text-commission-contested",
  } as const;
  const c = accent ? map[accent] : "text-scatto-ink";
  return (
    <div className={provCardCls}>
      <div className="p-4">
        <div className={`flex items-center justify-between mb-1 ${c}`}>
          {icon}
          <span className="text-xs text-scatto-muted">{label}</span>
        </div>
        <p className={`text-lg font-bold tabular-nums ${c}`}>{fmtEur(value)}</p>
      </div>
    </div>
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
    <section className={provCardCls}>
      <header className="flex items-center gap-2 border-b border-scatto-line px-4 py-3 sm:px-5">
        <span className="text-scatto-muted">{icon}</span>
        <h2 className="font-display text-sm font-semibold tracking-tight text-scatto-ink">{title}</h2>
      </header>
      <div className="space-y-1 p-3">
        {clienti.length === 0 ? (
          <p className="py-4 text-center text-xs text-scatto-muted">Nessun cliente</p>
        ) : (
          clienti.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-scatto-bg">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-scatto-ink">{c.nome}</p>
                <p className="text-xs text-scatto-muted">{c.ordini} ordini · {c.giorniInattivo}gg fa</p>
              </div>
              <div className="ml-2 shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums text-scatto-ink">{fmtEur(c.fatturato)}</p>
                <p className="text-xs tabular-nums text-scatto-accent">{fmtEur(c.provvigioni)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default Provvigioni;
