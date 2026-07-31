import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AllocationsEnginePanel } from "@/components/provvigioni/AllocationsEnginePanel";
import { useAdvancedKPIStats, AdvancedKPIFilters } from "@/hooks/useAdvancedKPIStats";
import { useKPIYoY } from "@/hooks/useKPIYoY";
import { YoYDimensionPanel } from "@/components/dashboard/YoYDimensionPanel";
import { KPIOpportunitiesPanel } from "@/components/dashboard/KPIOpportunitiesPanel";
import { RevenueTrendChart } from "@/components/dashboard/RevenueTrendChart";
import { KPITiles } from "@/components/kpi/KPITiles";
import { InsightsPanel, type Insight } from "@/components/kpi/InsightsPanel";
import { MonthlyGoalCard } from "@/components/kpi/MonthlyGoalCard";
import { RevenueMarginChart } from "@/components/kpi/RevenueMarginChart";
import { OrdersMonthlyChart } from "@/components/kpi/OrdersMonthlyChart";
import { ClientMovementBadges } from "@/components/kpi/ClientMovementBadges";
import { TopClientsGrowthDecline } from "@/components/kpi/TopClientsGrowthDecline";
import { TopClientsRevenueBars } from "@/components/kpi/TopClientsRevenueBars";
import { ReorderHeatmap } from "@/components/kpi/ReorderHeatmap";
import { RipartizioniHighlights } from "@/components/kpi/RipartizioniHighlights";
import { BrandRevenueBars } from "@/components/kpi/BrandRevenueBars";
import { OrdersStatusDonut } from "@/components/kpi/OrdersStatusDonut";
import { MonthlyComparisonCards } from "@/components/kpi/MonthlyComparisonCards";
import { formatCurrency, formatNumberIT, mesiLabel } from "@/components/kpi/kpiShared";
import { MultiSelect } from "@/components/ui/multi-select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { it } from "date-fns/locale";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Euro,
  TrendingUp,
  TrendingDown,
  Search,
  Loader2,
  CalendarIcon,
  Tag,
  RotateCcw,
  Download,
  FileText,
} from "lucide-react";
import { exportKPIToPDF, exportKPIToCSV } from "@/lib/exportKPI";
import { TransparencyBanner } from "@/components/metrics/TransparencyBanner";

type PeriodPreset = "mese" | "trimestre" | "semestre" | "anno" | "custom";

const KPI = () => {
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("anno");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [selectedClienti, setSelectedClienti] = useState<string[]>([]);
  const [selectedAziende, setSelectedAziende] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [prodottoSearch, setProdottoSearch] = useState("");

  // Calculate date range from preset
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (periodPreset) {
      case "mese":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "trimestre":
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      case "semestre":
        return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
      case "anno":
        return { start: startOfYear(now), end: now };
      case "custom":
        return { start: customStartDate || null, end: customEndDate || null };
      default:
        return { start: null, end: null };
    }
  }, [periodPreset, customStartDate, customEndDate]);

  const filters: AdvancedKPIFilters = {
    clienteIds: selectedClienti,
    aziendaIds: selectedAziende,
    brandIds: selectedBrands,
    startDate: dateRange.start,
    endDate: dateRange.end,
  };

  const { data: stats, isLoading } = useAdvancedKPIStats(filters);
  const { data: yoy } = useKPIYoY(filters);

  const aziendeNames = useMemo(() => {
    const m = new Map<string, string>();
    (stats?.allAziende || []).forEach((a: any) => m.set(a.id, a.nome));
    return m;
  }, [stats?.allAziende]);
  const clientiNames = useMemo(() => {
    const m = new Map<string, string>();
    (stats?.allClienti || []).forEach((c: any) => m.set(c.id, c.nome));
    return m;
  }, [stats?.allClienti]);
  const prodottiNames = useMemo(() => {
    const m = new Map<string, string>();
    (stats?.prodottiKPI || []).forEach((p) => m.set(p.id, p.nome));
    return m;
  }, [stats?.prodottiKPI]);
  const brandsNames = useMemo(() => {
    const m = new Map<string, string>();
    (stats?.allBrands || []).forEach((b: any) => m.set(b.id, b.name));
    return m;
  }, [stats?.allBrands]);

  // Movimento clienti vs anno precedente: stessa soglia ±5% già usata in
  // ClientGrowthWidget, per restare coerenti col resto dell'app.
  const clientiClassificati = useMemo(() => {
    const conConfronto = (stats?.clientiKPI || [])
      .filter((c) => (c.fatturato_2025 || 0) > 0)
      .map((c) => ({
        ...c,
        variazionePct: ((c.fatturato - (c.fatturato_2025 || 0)) / (c.fatturato_2025 || 1)) * 100,
      }));
    const crescita = conConfronto.filter((c) => c.variazionePct > 5).sort((a, b) => b.variazionePct - a.variazionePct);
    const calo = conConfronto.filter((c) => c.variazionePct < -5).sort((a, b) => a.variazionePct - b.variazionePct);
    const stabili = conConfronto.filter((c) => c.variazionePct >= -5 && c.variazionePct <= 5);
    return { crescita, calo, stabili };
  }, [stats?.clientiKPI]);

  // Obiettivo mensile: media del fatturato negli ultimi 12 mesi (stessa logica
  // già usata in Provvigioni per l'obiettivo mensile) — nessun target reale
  // impostabile esiste oggi, è una stima automatica.
  const now = useMemo(() => new Date(), []);
  const currentMonthIndex = now.getMonth();
  const obiettivoMensile = useMemo(() => {
    if (!yoy) return null;
    const rolling: number[] = [];
    for (let k = 1; k <= 12; k++) {
      const raw = currentMonthIndex - k;
      const idx = ((raw % 12) + 12) % 12;
      rolling.push(raw >= 0 ? yoy.monthlyComparison[idx].curr : yoy.monthlyComparison[idx].prev);
    }
    const obiettivo = rolling.some((v) => v > 0) ? rolling.reduce((a, b) => a + b, 0) / 12 : 0;
    const fatturatoMese = yoy.monthlyComparison[currentMonthIndex]?.curr ?? 0;
    return { obiettivo, fatturatoMese };
  }, [yoy, currentMonthIndex]);

  // Insight automatici: frasi derivate da numeri già calcolati (nessun dato
  // nuovo, nessuna IA) — stesso approccio già in uso in Provvigioni.
  const insights = useMemo<Insight[]>(() => {
    if (!stats) return [];
    const list: Insight[] = [];

    const mesiConDati = stats.ordiniPerMese.filter((m) => m.fatturato > 0);
    if (mesiConDati.length > 0) {
      const maxFatt = Math.max(...mesiConDati.map((m) => m.fatturato));
      const recordIdx = stats.ordiniPerMese.findIndex((m) => m.fatturato === maxFatt);
      const record = stats.ordiniPerMese[recordIdx];
      const prevMonth = recordIdx > 0 ? stats.ordiniPerMese[recordIdx - 1] : null;
      const deltaVsPrev = prevMonth && prevMonth.fatturato > 0
        ? ((record.fatturato - prevMonth.fatturato) / prevMonth.fatturato) * 100
        : null;
      list.push({
        emoji: "📈",
        bold: `${mesiLabel[recordIdx]} è il mese record`,
        text: `con ${formatCurrency(record.fatturato)}${
          deltaVsPrev !== null ? ` (${deltaVsPrev >= 0 ? "+" : ""}${deltaVsPrev.toFixed(1)}% su ${mesiLabel[recordIdx - 1]})` : ""
        }.`,
      });
    }

    if (clientiClassificati.calo.length > 0) {
      const peggiori = clientiClassificati.calo.slice(0, 2).map((c) => c.nome).join(" e ");
      list.push({
        emoji: "⚠️",
        bold: `${clientiClassificati.calo.length} client${clientiClassificati.calo.length === 1 ? "e" : "i"} in calo`,
        text: `${peggiori} ${clientiClassificati.calo.length === 1 ? "ha" : "hanno"} perso oltre il ${Math.abs(
          Math.round(clientiClassificati.calo[0]?.variazionePct ?? 0)
        )}%. Da ricontattare.`,
      });
    }

    const aziendaTop = stats.aziendeKPI[0];
    if (aziendaTop && stats.fatturatoTotale > 0) {
      const quota = (aziendaTop.fatturato_totale / stats.fatturatoTotale) * 100;
      list.push({
        emoji: "🏆",
        bold: `${aziendaTop.nome} è il fornitore principale`,
        text: `${formatCurrency(aziendaTop.fatturato_totale)}, il ${quota.toFixed(0)}% del totale.`,
      });
    }

    return list;
  }, [stats, clientiClassificati]);

  const resetFilters = () => {
    setSelectedClienti([]);
    setSelectedAziende([]);
    setSelectedBrands([]);
    setPeriodPreset("anno");
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
  };

  const getPeriodoLabel = () => {
    const fmt = (d?: Date | null) => (d ? format(d, "dd/MM/yyyy", { locale: it }) : "—");
    const labels: Record<PeriodPreset, string> = {
      mese: "Questo Mese",
      trimestre: "Ultimi 3 Mesi",
      semestre: "Ultimi 6 Mesi",
      anno: "Anno in Corso",
      custom: `${fmt(dateRange.start)} → ${fmt(dateRange.end)}`,
    };
    return labels[periodPreset] || "Periodo";
  };

  const hasActiveFilters = selectedClienti.length > 0 || selectedAziende.length > 0 || selectedBrands.length > 0;

  // Build options for multi-select
  const clientiOptions = useMemo(() => 
    (stats?.allClienti || []).map(c => ({ value: c.id, label: c.nome })),
    [stats?.allClienti]
  );

  const aziendeOptions = useMemo(() => 
    (stats?.allAziende || []).map(a => ({ value: a.id, label: a.nome })),
    [stats?.allAziende]
  );

  const brandsOptions = useMemo(() => 
    (stats?.allBrands || []).map(b => ({ value: b.id, label: b.name })),
    [stats?.allBrands]
  );

  // Filter tables by search
  const filteredClienti = useMemo(() => 
    (stats?.clientiKPI || []).filter((c) =>
      c.nome.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.azienda?.toLowerCase().includes(clientSearch.toLowerCase())
    ),
    [stats?.clientiKPI, clientSearch]
  );

  const filteredProdotti = useMemo(() =>
    (stats?.prodottiKPI || []).filter((p) =>
      p.nome.toLowerCase().includes(prodottoSearch.toLowerCase()) ||
      p.azienda_nome.toLowerCase().includes(prodottoSearch.toLowerCase()) ||
      p.brand_nome?.toLowerCase().includes(prodottoSearch.toLowerCase())
    ),
    [stats?.prodottiKPI, prodottoSearch]
  );

  const maxFatturato = Math.max(...(stats?.clientiKPI?.map((c) => c.fatturato) || [1]));
  const maxProdottoFatturato = Math.max(...(stats?.prodottiKPI?.map((p) => p.fatturato_totale) || [1]));

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <TransparencyBanner scope="kpi" />
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Analisi KPI
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Performance per cliente, azienda, marchio e periodo
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={resetFilters} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset Filtri
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={!stats}
              onClick={() => stats && exportKPIToCSV({ ...stats, periodoLabel: getPeriodoLabel() } as any)}
            >
              <Download className="h-4 w-4" />
              Esporta CSV
            </Button>
            <Button
              size="sm"
              className="gap-2"
              disabled={!stats}
              onClick={() => stats && exportKPIToPDF({ ...stats, periodoLabel: getPeriodoLabel() } as any)}
            >
              <FileText className="h-4 w-4" />
              Esporta PDF
            </Button>
          </div>
        </div>

        {/* Filtri a chip */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={periodPreset} onValueChange={(v) => setPeriodPreset(v as PeriodPreset)}>
            <SelectTrigger className="h-auto w-auto gap-1.5 rounded-full border-none bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm [&>svg]:text-primary-foreground">
              <CalendarIcon className="h-3.5 w-3.5" />
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mese">Questo mese</SelectItem>
              <SelectItem value="trimestre">Ultimi 3 mesi</SelectItem>
              <SelectItem value="semestre">Ultimi 6 mesi</SelectItem>
              <SelectItem value="anno">Anno in corso</SelectItem>
              <SelectItem value="custom">Personalizzato</SelectItem>
            </SelectContent>
          </Select>

          <MultiSelect
            options={clientiOptions}
            values={selectedClienti}
            onValuesChange={setSelectedClienti}
            placeholder="Tutti i clienti"
            className="h-auto w-auto min-h-0 rounded-full border-border/60 bg-card px-4 py-2 text-sm font-medium shadow-sm"
          />
          <MultiSelect
            options={aziendeOptions}
            values={selectedAziende}
            onValuesChange={setSelectedAziende}
            placeholder="Tutte le aziende"
            className="h-auto w-auto min-h-0 rounded-full border-border/60 bg-card px-4 py-2 text-sm font-medium shadow-sm"
          />
          <MultiSelect
            options={brandsOptions}
            values={selectedBrands}
            onValuesChange={setSelectedBrands}
            placeholder="Tutti i marchi"
            className="h-auto w-auto min-h-0 rounded-full border-border/60 bg-card px-4 py-2 text-sm font-medium shadow-sm"
          />

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>

        {/* Custom Date Range */}
        {periodPreset === "custom" && (
          <div className="flex flex-wrap gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("rounded-full", !customStartDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customStartDate ? format(customStartDate, "dd/MM/yyyy", { locale: it }) : "Da"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customStartDate} onSelect={setCustomStartDate} initialFocus className="pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("rounded-full", !customEndDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customEndDate ? format(customEndDate, "dd/MM/yyyy", { locale: it }) : "A"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customEndDate} onSelect={setCustomEndDate} initialFocus className="pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Tessere KPI */}
        <KPITiles
          fatturatoTotale={stats?.fatturatoTotale || 0}
          ordiniTotali={stats?.ordiniTotali || 0}
          pezziTotali={stats?.pezziTotali || 0}
          cartoniTotali={stats?.cartoniTotali || 0}
          scontrinoMedio={stats?.scontrinoMedio || 0}
          marginePercentuale={stats?.marginePercentuale || 0}
        />

        {/* Andamento anno corrente vs precedente */}
        {yoy && (
          <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
            <div className="mb-1 flex items-center justify-between px-1">
              <h2 className="flex items-center gap-1.5 font-display text-sm font-semibold tracking-tight text-foreground">
                📊 Andamento · {yoy.yearPrev} vs {yoy.yearCurr}
              </h2>
              {yoy.prev.fatturato > 0 && (
                <span
                  className={`rounded-lg px-2 py-0.5 text-xs font-bold ${
                    yoy.deltaPct >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {yoy.deltaPct >= 0 ? "↑" : "↓"} {Math.abs(yoy.deltaPct).toFixed(1)}%
                </span>
              )}
            </div>
            <RevenueTrendChart
              data={yoy.monthlyComparison}
              currentMonthIndex={currentMonthIndex}
              yearCurr={yoy.yearCurr}
              yearPrev={yoy.yearPrev}
            />
          </div>
        )}

        {/* Insight automatici */}
        <InsightsPanel insights={insights} />

        {/* Obiettivo mensile (stima: media ultimi 12 mesi) */}
        {obiettivoMensile && (
          <MonthlyGoalCard
            meseLabel={format(now, "MMMM", { locale: it })}
            fatturatoMese={obiettivoMensile.fatturatoMese}
            obiettivo={obiettivoMensile.obiettivo}
          />
        )}

        <h2 className="flex items-center gap-2 px-1 pt-4 text-[11px] font-bold uppercase tracking-widest text-primary">
          <span className="inline-block h-3.5 w-1 rounded-sm bg-primary" />
          Volumi
        </h2>

        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
          <h3 className="mb-1 px-1 text-sm font-semibold tracking-tight text-foreground">📈 Fatturato e margine per mese</h3>
          <RevenueMarginChart
            data={(stats?.ordiniPerMese || [])
              .map((m, i) => ({ mese: mesiLabel[i], fatturato: m.fatturato, marginePct: m.marginePct, ordini: m.ordini }))
              .filter((m) => m.fatturato > 0 || m.ordini > 0)
              .map(({ mese, fatturato, marginePct }) => ({ mese, fatturato, marginePct }))}
          />
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
          <h3 className="mb-1 px-1 text-sm font-semibold tracking-tight text-foreground">🛒 Ordini per mese</h3>
          <OrdersMonthlyChart
            data={(stats?.ordiniPerMese || [])
              .map((m, i) => ({ mese: mesiLabel[i], ordini: m.ordini }))
              .filter((m) => m.ordini > 0)}
          />
        </div>

        <h2 className="flex items-center gap-2 px-1 pt-4 text-[11px] font-bold uppercase tracking-widest text-success">
          <span className="inline-block h-3.5 w-1 rounded-sm bg-success" />
          Clienti
        </h2>

        <ClientMovementBadges
          crescita={clientiClassificati.crescita.length}
          stabili={clientiClassificati.stabili.length}
          calo={clientiClassificati.calo.length}
        />

        <TopClientsGrowthDecline crescita={clientiClassificati.crescita} calo={clientiClassificati.calo} />

        <TopClientsRevenueBars clienti={stats?.clientiKPI || []} />

        <ReorderHeatmap data={stats?.reorderHeatmap || []} />

        <h2 className="flex items-center gap-2 px-1 pt-4 text-[11px] font-bold uppercase tracking-widest text-violet-500">
          <span className="inline-block h-3.5 w-1 rounded-sm bg-violet-500" />
          Ripartizioni
        </h2>

        <RipartizioniHighlights
          aziendaTop={stats?.aziendeKPI?.[0] || null}
          prodottoTop={stats?.prodottiKPI?.[0] || null}
          fatturatoTotale={stats?.fatturatoTotale || 0}
        />

        <div className="grid gap-3 lg:grid-cols-2">
          <BrandRevenueBars brands={stats?.brandsKPI || []} />
          {stats?.statusDistribuzione && (
            <OrdersStatusDonut
              verificati={stats.statusDistribuzione.verificati}
              inAttesa={stats.statusDistribuzione.inAttesa}
              altri={stats.statusDistribuzione.altri}
            />
          )}
        </div>

        <h2 className="flex items-center gap-2 px-1 pt-4 text-[11px] font-bold uppercase tracking-widest text-warning">
          <span className="inline-block h-3.5 w-1 rounded-sm bg-warning" />
          Confronto mensile dettagliato
        </h2>

        {yoy && (
          <MonthlyComparisonCards data={yoy.monthlyComparison} yearCurr={yoy.yearCurr} yearPrev={yoy.yearPrev} />
        )}

        <h2 className="flex items-center gap-2 px-1 pt-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          <span className="inline-block h-3.5 w-1 rounded-sm bg-muted-foreground" />
          Altri indicatori
        </h2>

        {/* Detail KPIs: confronti, sconti, margine */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 animate-fade-in">
          <div className="rounded-lg bg-gradient-to-br from-success/15 to-success/5 border border-success/30 p-4 shadow-card transition-transform hover:-translate-y-0.5">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-success" />
              <p className="text-xs text-muted-foreground">Utile lordo</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-success">
              {formatCurrency(stats?.utileLordo || 0)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              costo: {formatCurrency(stats?.costoAcquistoTotale || 0)}
            </p>
          </div>

          <div className="rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30 p-4 shadow-card transition-transform hover:-translate-y-0.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Margine %</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-primary">
              {(stats?.marginePercentuale || 0).toFixed(1)}%
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              su fatturato periodo
            </p>
          </div>

          <div className="rounded-lg bg-card p-4 shadow-card transition-transform hover:-translate-y-0.5">
            <div className="flex items-center gap-2">
              {(stats?.mom || 0) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <p className="text-xs text-muted-foreground">MoM (mese vs precedente)</p>
            </div>
            <p className={cn(
              "text-2xl font-bold mt-1",
              (stats?.mom || 0) >= 0 ? "text-success" : "text-destructive"
            )}>
              {(stats?.mom || 0) >= 0 ? "+" : ""}{(stats?.mom || 0).toFixed(1)}%
            </p>
          </div>

          <div className="rounded-lg bg-card p-4 shadow-card transition-transform hover:-translate-y-0.5">
            <div className="flex items-center gap-2">
              {(stats?.yoy || 0) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <p className="text-xs text-muted-foreground">YoY (stesso periodo a/p)</p>
            </div>
            <p className={cn(
              "text-2xl font-bold mt-1",
              (stats?.yoy || 0) >= 0 ? "text-success" : "text-destructive"
            )}>
              {(stats?.yoy || 0) >= 0 ? "+" : ""}{(stats?.yoy || 0).toFixed(1)}%
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              vs {formatCurrency(stats?.yoyPrevFatturato || 0)}
            </p>
          </div>

          <div className="rounded-lg bg-card p-4 shadow-card transition-transform hover:-translate-y-0.5">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Sconto medio applicato</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-foreground">
              {(stats?.scontoCascataMedio || 0).toFixed(1)}%
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              + {(stats?.scontoMedio || 0).toFixed(1)}% sconto globale
            </p>
          </div>

          <div className="rounded-lg bg-card p-4 shadow-card transition-transform hover:-translate-y-0.5">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Sconto merce medio / ordine</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-foreground">
              {formatCurrency(stats?.scontoMerceMedio || 0)}
            </p>
          </div>
        </div>

        {/* Opportunities + AI */}
        {yoy && (
          <KPIOpportunitiesPanel
            yoy={yoy}
            clientiNames={clientiNames}
            prodottiNames={prodottiNames}
            aziendeNames={aziendeNames}
            brandsNames={brandsNames}
          />
        )}

        {/* Detailed Tabs */}
        <Tabs defaultValue="clienti" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 max-w-lg">
            <TabsTrigger value="clienti">Clienti</TabsTrigger>
            <TabsTrigger value="aziende">Aziende</TabsTrigger>
            <TabsTrigger value="brands">Marchi</TabsTrigger>
            <TabsTrigger value="prodotti">Prodotti</TabsTrigger>
          </TabsList>

          {/* Clienti Tab */}
          <TabsContent value="clienti" className="space-y-4">
            {yoy && (
              <YoYDimensionPanel
                title="Clienti — Crescita, Calo e Opportunità"
                data={yoy.clientiYoY}
                names={clientiNames}
                yearCurr={yoy.yearCurr}
                yearPrev={yoy.yearPrev}
              />
            )}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca cliente..."
                className="pl-10"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
            </div>

            <div className="rounded-xl bg-card shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Cliente</TableHead>
                      <TableHead>Consorzio</TableHead>
                      <TableHead className="text-right">Ordini</TableHead>
                      <TableHead className="text-right">Fatturato 2026</TableHead>
                      <TableHead className="text-right">Fatturato 2025</TableHead>
                      <TableHead className="text-right">Var %</TableHead>
                      <TableHead className="w-32">Avanzamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClienti.map((cliente) => {
                      const fat2025 = cliente.fatturato_2025 || 0;
                      const variazione = fat2025 > 0 
                        ? ((cliente.fatturato - fat2025) / fat2025) * 100 
                        : 0;
                      const avanzamento = fat2025 > 0 
                        ? Math.min((cliente.fatturato / fat2025) * 100, 100) 
                        : 0;
                      
                      return (
                        <TableRow key={cliente.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div>
                              <p className="font-medium">{cliente.nome}</p>
                              <p className="text-xs text-muted-foreground">{cliente.citta || "—"}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {cliente.consorzio ? (
                              <Badge variant="outline">{cliente.consorzio}</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{cliente.ordini_count}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(cliente.fatturato)}
                          </TableCell>
                          <TableCell className="text-right text-orange-500">
                            {fat2025 > 0 ? formatCurrency(fat2025) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            {fat2025 > 0 ? (
                              <span className={cn(
                                "font-semibold",
                                variazione > 0 ? "text-success" : variazione < 0 ? "text-destructive" : "text-muted-foreground"
                              )}>
                                {variazione > 0 ? "+" : ""}{variazione.toFixed(0)}%
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            {fat2025 > 0 ? (
                              <div className="flex items-center gap-2">
                                <Progress value={avanzamento} className="h-2 flex-1" />
                                <span className="text-xs text-muted-foreground w-10 text-right">
                                  {avanzamento.toFixed(0)}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredClienti.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nessun cliente trovato
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Aziende Tab */}
          <TabsContent value="aziende" className="space-y-4">
            {yoy && (
              <YoYDimensionPanel
                title="Aziende — Performance YoY"
                data={yoy.aziendeYoY}
                names={aziendeNames}
                yearCurr={yoy.yearCurr}
                yearPrev={yoy.yearPrev}
              />
            )}
            <div className="rounded-xl bg-card shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Azienda</TableHead>
                      <TableHead>Settore</TableHead>
                      <TableHead className="text-right">Ordini</TableHead>
                      <TableHead className="text-right">Cartoni</TableHead>
                      <TableHead className="text-right">Pezzi</TableHead>
                      <TableHead className="text-right">Fatturato</TableHead>
                      <TableHead className="w-32">Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats?.aziendeKPI.map((azienda) => {
                      const maxAziendaFatturato = Math.max(
                        ...(stats?.aziendeKPI.map((a) => a.fatturato_totale) || [1])
                      );
                      return (
                        <TableRow key={azienda.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{azienda.nome}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {azienda.settore || "—"}
                          </TableCell>
                          <TableCell className="text-right">{azienda.ordini_count}</TableCell>
                          <TableCell className="text-right">{formatNumberIT(azienda.cartoni_venduti)}</TableCell>
                          <TableCell className="text-right">{formatNumberIT(azienda.prodotti_venduti)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(azienda.fatturato_totale)}
                          </TableCell>
                          <TableCell>
                            <Progress
                              value={(azienda.fatturato_totale / maxAziendaFatturato) * 100}
                              className="h-2"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {(stats?.aziendeKPI?.length || 0) === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nessuna azienda trovata
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Brands Tab */}
          <TabsContent value="brands" className="space-y-4">
            {yoy && (
              <YoYDimensionPanel
                title="Marchi — Performance YoY"
                data={yoy.brandsYoY}
                names={brandsNames}
                yearCurr={yoy.yearCurr}
                yearPrev={yoy.yearPrev}
              />
            )}
            <div className="rounded-xl bg-card shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Marchio</TableHead>
                      <TableHead>Azienda</TableHead>
                      <TableHead className="text-right">Ordini</TableHead>
                      <TableHead className="text-right">Pezzi Venduti</TableHead>
                      <TableHead className="text-right">Fatturato</TableHead>
                      <TableHead className="w-32">Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats?.brandsKPI.map((brand) => {
                      const maxBrandFatturato = Math.max(
                        ...(stats?.brandsKPI.map((b) => b.fatturato_totale) || [1])
                      );
                      return (
                        <TableRow key={brand.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Tag className="h-4 w-4 text-primary" />
                              {brand.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {brand.azienda_nome || "—"}
                          </TableCell>
                          <TableCell className="text-right">{brand.ordini_count}</TableCell>
                          <TableCell className="text-right">{formatNumberIT(brand.quantita_venduta)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(brand.fatturato_totale)}
                          </TableCell>
                          <TableCell>
                            <Progress
                              value={(brand.fatturato_totale / maxBrandFatturato) * 100}
                              className="h-2"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {(stats?.brandsKPI?.length || 0) === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nessun marchio trovato
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Prodotti Tab */}
          <TabsContent value="prodotti" className="space-y-4">
            {yoy && (
              <YoYDimensionPanel
                title="Prodotti — Da spingere, da recuperare"
                data={yoy.prodottiYoY}
                names={prodottiNames}
                yearCurr={yoy.yearCurr}
                yearPrev={yoy.yearPrev}
              />
            )}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca prodotto, azienda o marchio..."
                className="pl-10"
                value={prodottoSearch}
                onChange={(e) => setProdottoSearch(e.target.value)}
              />
            </div>

            <div className="rounded-xl bg-card shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Prodotto</TableHead>
                      <TableHead>Azienda</TableHead>
                      <TableHead>Marchio</TableHead>
                      <TableHead className="text-right">Prezzo</TableHead>
                      <TableHead className="text-right">Cartoni</TableHead>
                      <TableHead className="text-right">Pezzi</TableHead>
                      <TableHead className="text-right">N° Ordini</TableHead>
                      <TableHead className="text-right">Fatturato</TableHead>
                      <TableHead className="w-32">Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProdotti.map((prodotto) => (
                      <TableRow key={prodotto.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{prodotto.nome}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {prodotto.azienda_nome}
                        </TableCell>
                        <TableCell>
                          {prodotto.brand_nome ? (
                            <Badge variant="outline" className="gap-1">
                              <Tag className="h-3 w-3" />
                              {prodotto.brand_nome}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(prodotto.prezzo_listino)}</TableCell>
                        <TableCell className="text-right">{formatNumberIT(prodotto.cartoni_venduti)}</TableCell>
                        <TableCell className="text-right">{formatNumberIT(prodotto.quantita_venduta)}</TableCell>
                        <TableCell className="text-right">{prodotto.ordini_count}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(prodotto.fatturato_totale)}
                        </TableCell>
                        <TableCell>
                          <Progress
                            value={(prodotto.fatturato_totale / maxProdottoFatturato) * 100}
                            className="h-2"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredProdotti.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          Nessun prodotto trovato
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Fase 2 — Motore di riconciliazione M:N (globale) */}
        <div className="mt-6">
          <AllocationsEnginePanel all title="Riconciliazione M:N — vista globale" />
        </div>
      </div>
    </MainLayout>

  );
};

export default KPI;
