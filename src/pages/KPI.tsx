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
import { ClientRevenueCards } from "@/components/kpi/ClientRevenueCards";
import { KpiEntityCards } from "@/components/kpi/KpiEntityCards";
import { buildAziendaColorIndex } from "@/lib/aziendaColor";
import { formatCurrency, formatNumberIT, mesiLabel } from "@/components/kpi/kpiShared";
import { MultiSelect } from "@/components/ui/multi-select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { it } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Euro,
  TrendingUp,
  Search,
  Loader2,
  CalendarIcon,
  Tag,
  RotateCcw,
  Download,
  FileText,
} from "lucide-react";
import { exportKPIToPDF, exportKPIToCSV } from "@/lib/exportKPI";

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
  // Colore identità per posizione nell'elenco reale (non per hash dell'id):
  // con più aziende un hash su 12 caselle collide troppo spesso.
  const aziendaColorMap = useMemo(
    () => buildAziendaColorIndex(stats?.allAziende || []),
    [stats?.allAziende]
  );
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
  const maxAziendaFatturato = Math.max(...(stats?.aziendeKPI?.map((a) => a.fatturato_totale) || [1]));
  const maxBrandFatturato = Math.max(...(stats?.brandsKPI?.map((b) => b.fatturato_totale) || [1]));

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

        {/* Altri indicatori: confronti, sconti, margine — colore fisso per
            ruolo, come nel mockup (richiesta esplicita, deroga puntuale al
            "un solo accento" di CLAUDE.md solo per queste tessere). */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 animate-fade-in">
          <div className="rounded-lg bg-gradient-to-br from-kpi-utile/15 to-kpi-utile/5 border border-kpi-utile/30 p-4 shadow-card transition-transform hover:-translate-y-0.5">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-kpi-utile" />
              <p className="text-xs text-muted-foreground">Utile lordo</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-kpi-utile">
              {formatCurrency(stats?.utileLordo || 0)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              costo: {formatCurrency(stats?.costoAcquistoTotale || 0)}
            </p>
          </div>

          <div className="rounded-lg bg-gradient-to-br from-kpi-margine/15 to-kpi-margine/5 border border-kpi-margine/30 p-4 shadow-card transition-transform hover:-translate-y-0.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-kpi-margine" />
              <p className="text-xs text-muted-foreground">Margine %</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-kpi-margine">
              {(stats?.marginePercentuale || 0).toFixed(1)}%
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              su fatturato periodo
            </p>
          </div>

          <div className="rounded-lg bg-gradient-to-br from-kpi-mom/15 to-kpi-mom/5 border border-kpi-mom/30 p-4 shadow-card transition-transform hover:-translate-y-0.5">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-kpi-mom" />
              <p className="text-xs text-muted-foreground">MoM (mese vs precedente)</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-kpi-mom">
              {(stats?.mom || 0) >= 0 ? "+" : ""}{(stats?.mom || 0).toFixed(1)}%
            </p>
          </div>

          <div className="rounded-lg bg-gradient-to-br from-kpi-yoy/15 to-kpi-yoy/5 border border-kpi-yoy/30 p-4 shadow-card transition-transform hover:-translate-y-0.5">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-kpi-yoy" />
              <p className="text-xs text-muted-foreground">YoY (stesso periodo a/p)</p>
            </div>
            {(stats?.yoyPrevFatturato || 0) > 0 ? (
              <>
                <p className="text-2xl font-bold mt-1 text-kpi-yoy">
                  {(stats?.yoy || 0) >= 0 ? "+" : ""}{(stats?.yoy || 0).toFixed(1)}%
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  vs {formatCurrency(stats?.yoyPrevFatturato || 0)}
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold mt-1 text-muted-foreground">N/D</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">manca dato anno prec. filtrato</p>
              </>
            )}
          </div>

          <div className="rounded-lg bg-gradient-to-br from-kpi-sconto1/15 to-kpi-sconto1/5 border border-kpi-sconto1/30 p-4 shadow-card transition-transform hover:-translate-y-0.5">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-kpi-sconto1" />
              <p className="text-xs text-muted-foreground">Sconto medio applicato</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-kpi-sconto1">
              {(stats?.scontoCascataMedio || 0).toFixed(1)}%
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              + {(stats?.scontoMedio || 0).toFixed(1)}% sconto globale
            </p>
          </div>

          <div className="rounded-lg bg-gradient-to-br from-kpi-sconto2/15 to-kpi-sconto2/5 border border-kpi-sconto2/30 p-4 shadow-card transition-transform hover:-translate-y-0.5">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-kpi-sconto2" />
              <p className="text-xs text-muted-foreground">Sconto merce medio / ordine</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-kpi-sconto2">
              {formatCurrency(stats?.scontoMerceMedio || 0)}
            </p>
          </div>
        </div>

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

            <ClientRevenueCards clienti={filteredClienti} yearPrev={yoy?.yearPrev} aziendaColorMap={aziendaColorMap} />
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
            <KpiEntityCards
              items={(stats?.aziendeKPI || []).map((azienda) => ({
                id: azienda.id,
                nome: azienda.nome,
                fatturato: azienda.fatturato_totale,
                facts: [
                  azienda.settore || "Settore n/d",
                  `${azienda.ordini_count} ordini`,
                  `${formatNumberIT(azienda.cartoni_venduti)} cartoni`,
                  `${formatNumberIT(azienda.prodotti_venduti)} pz`,
                ],
                pct: (azienda.fatturato_totale / maxAziendaFatturato) * 100,
              }))}
              emptyLabel="Nessuna azienda trovata"
            />
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
            <KpiEntityCards
              items={(stats?.brandsKPI || []).map((brand) => ({
                id: brand.id,
                nome: brand.name,
                fatturato: brand.fatturato_totale,
                facts: [
                  brand.azienda_nome || "Azienda n/d",
                  `${brand.ordini_count} ordini`,
                  `${formatNumberIT(brand.quantita_venduta)} pz venduti`,
                ],
                pct: (brand.fatturato_totale / maxBrandFatturato) * 100,
              }))}
              emptyLabel="Nessun marchio trovato"
            />
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

            <KpiEntityCards
              items={filteredProdotti.map((prodotto) => ({
                id: prodotto.id,
                nome: prodotto.nome,
                fatturato: prodotto.fatturato_totale,
                facts: [
                  prodotto.azienda_nome,
                  prodotto.brand_nome || "Marchio n/d",
                  formatCurrency(prodotto.prezzo_listino),
                  `${formatNumberIT(prodotto.cartoni_venduti)} cartoni`,
                  `${formatNumberIT(prodotto.quantita_venduta)} pz`,
                  `${prodotto.ordini_count} ordini`,
                ],
                pct: (prodotto.fatturato_totale / maxProdottoFatturato) * 100,
              }))}
              emptyLabel="Nessun prodotto trovato"
            />
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
