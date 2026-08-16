import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAdvancedKPIStats, AdvancedKPIFilters } from "@/hooks/useAdvancedKPIStats";
import { useKPIYoY } from "@/hooks/useKPIYoY";
import { YoYDimensionPanel } from "@/components/dashboard/YoYDimensionPanel";
import { RevenueTrendChart } from "@/components/dashboard/RevenueTrendChart";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { SectionKicker } from "@/components/dashboard/SectionKicker";
import { InsightsPanel, type Insight } from "@/components/kpi/InsightsPanel";
import { SalesOverviewPanel } from "@/components/kpi/SalesOverviewPanel";
import { QuickStatTiles } from "@/components/kpi/QuickStatTiles";

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
import { buildAziendaColorMap } from "@/lib/aziendaColor";
import { formatCompact, formatCurrency, formatNumberIT, mesiLabel } from "@/components/kpi/kpiShared";
import { MultiSelect } from "@/components/ui/multi-select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, subMonths, subDays, startOfYear } from "date-fns";
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
  ShoppingCart,
  Users,
  Percent,
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
        return { start: subDays(now, 89), end: now };
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
  const aziendaColorMap = useMemo(
    () => buildAziendaColorMap(stats?.allAziende || []),
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
      trimestre: "Ultimi 90 Giorni",
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
        <div className="-m-4 -mt-6 flex min-h-[100dvh] items-center justify-center bg-scatto-bg p-4 pt-6 lg:-m-8 lg:p-8">
          <Loader2 className="h-8 w-8 animate-spin text-scatto-info" />
        </div>
      </MainLayout>
    );
  }

  const momValue = stats?.mom || 0;
  const yoyValue = stats?.yoy || 0;
  const hasYoyData = (stats?.yoyPrevFatturato || 0) > 0;

  return (
    <MainLayout>
      <div className="-m-4 -mt-6 min-h-[100dvh] bg-scatto-bg p-4 pt-6 lg:-m-8 lg:p-8">
        <div className="space-y-6">
          <PageHeader
            title="Analisi KPI"
            description="Performance per cliente, azienda, marchio e periodo"
            actions={
              <>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                    className="gap-2 rounded-xl border-scatto-line bg-scatto-surface text-scatto-ink hover:bg-scatto-bg"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset Filtri
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-xl border-scatto-line bg-scatto-surface text-scatto-ink hover:bg-scatto-bg"
                  disabled={!stats}
                  onClick={() => stats && exportKPIToCSV({ ...stats, periodoLabel: getPeriodoLabel() } as any)}
                >
                  <Download className="h-4 w-4" />
                  Esporta CSV
                </Button>
                <Button
                  size="sm"
                  className="gap-2 rounded-xl bg-scatto-ink text-white hover:bg-scatto-ink/90"
                  disabled={!stats}
                  onClick={() => stats && exportKPIToPDF({ ...stats, periodoLabel: getPeriodoLabel() } as any)}
                >
                  <FileText className="h-4 w-4" />
                  Esporta PDF
                </Button>
              </>
            }
          />

          {/* Filtri a pillole */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={periodPreset} onValueChange={(v) => setPeriodPreset(v as PeriodPreset)}>
              <SelectTrigger className="h-auto w-auto gap-1.5 rounded-full border border-scatto-line bg-scatto-surface px-4 py-2 text-sm font-medium text-scatto-ink shadow-sm [&>svg]:text-scatto-muted">
                <CalendarIcon className="h-3.5 w-3.5 text-scatto-muted" />
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mese">Questo mese</SelectItem>
                <SelectItem value="trimestre">Ultimi 90 giorni</SelectItem>
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
              className="h-auto w-auto min-h-0 rounded-full border-scatto-line bg-scatto-surface px-4 py-2 text-sm font-medium text-scatto-ink shadow-sm"
            />
            <MultiSelect
              options={aziendeOptions}
              values={selectedAziende}
              onValuesChange={setSelectedAziende}
              placeholder="Tutte le aziende"
              className="h-auto w-auto min-h-0 rounded-full border-scatto-line bg-scatto-surface px-4 py-2 text-sm font-medium text-scatto-ink shadow-sm"
            />
            <MultiSelect
              options={brandsOptions}
              values={selectedBrands}
              onValuesChange={setSelectedBrands}
              placeholder="Tutti i marchi"
              className="h-auto w-auto min-h-0 rounded-full border-scatto-line bg-scatto-surface px-4 py-2 text-sm font-medium text-scatto-ink shadow-sm"
            />

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-scatto-muted hover:text-scatto-ink"
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
                    className={cn(
                      "rounded-full border-scatto-line bg-scatto-surface text-scatto-ink hover:bg-scatto-bg",
                      !customStartDate && "text-scatto-muted"
                    )}
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
                    className={cn(
                      "rounded-full border-scatto-line bg-scatto-surface text-scatto-ink hover:bg-scatto-bg",
                      !customEndDate && "text-scatto-muted"
                    )}
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

          {/* Panoramica vendite (andamento per fornitore + ripartizione) */}
          <SalesOverviewPanel
            fatturatoTotale={stats?.fatturatoTotale || 0}
            deltaPct={hasYoyData ? yoyValue : null}
            deltaLabel={hasYoyData ? "vs stesso periodo anno prec." : "nessun dato anno prec."}
            periodoLabel={getPeriodoLabel()}
            mensilePerAzienda={stats?.mensilePerAzienda || []}
            aziende={(stats?.aziendeKPI || []).map((a) => ({
              id: a.id,
              nome: a.nome,
              fatturato_totale: a.fatturato_totale,
            }))}
            colorMap={aziendaColorMap}
          />

          {/* Tessere sintetiche */}
          <QuickStatTiles
            stats={[
              {
                label: "Ordini",
                value: formatNumberIT(stats?.ordiniTotali || 0),
                caption: `${formatNumberIT(stats?.cartoniTotali || 0)} cartoni`,
                icon: ShoppingCart,
              },
              {
                label: "Clienti attivi",
                value: formatNumberIT(stats?.clientiKPI?.length || 0),
                caption: "con almeno un ordine nel periodo",
                icon: Users,
              },
              {
                label: "Scontrino medio",
                value: formatCurrency(stats?.scontrinoMedio || 0),
                caption: "per ordine",
                icon: TrendingUp,
              },
              {
                label: "Margine",
                value: `${(stats?.marginePercentuale || 0).toFixed(1)}%`,
                caption: `utile lordo ${formatCurrency(stats?.utileLordo || 0)}`,
                icon: Percent,
              },
            ]}
          />


          {/* Altri indicatori: confronti e sconti */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard
              icon={Euro}
              label="Utile lordo"
              value={formatCurrency(stats?.utileLordo || 0)}
              caption={`costo: ${formatCurrency(stats?.costoAcquistoTotale || 0)}`}
              tone="success"
            />
            <StatCard
              icon={RotateCcw}
              label="MoM (vs mese prec.)"
              value={`${momValue >= 0 ? "+" : ""}${momValue.toFixed(1)}%`}
              caption="rispetto al mese precedente"
              tone={momValue >= 0 ? "success" : "danger"}
            />
            <StatCard
              icon={CalendarIcon}
              label="YoY (stesso periodo a/p)"
              value={hasYoyData ? `${yoyValue >= 0 ? "+" : ""}${yoyValue.toFixed(1)}%` : "N/D"}
              caption={hasYoyData ? `vs ${formatCurrency(stats?.yoyPrevFatturato || 0)}` : "manca dato anno prec."}
              tone={!hasYoyData ? "info" : yoyValue >= 0 ? "success" : "danger"}
            />
            <StatCard
              icon={Tag}
              label="Sconto medio applicato"
              value={`${(stats?.scontoCascataMedio || 0).toFixed(1)}%`}
              caption={`+ ${(stats?.scontoMedio || 0).toFixed(1)}% sconto globale`}
              tone="warning"
            />
            <StatCard
              icon={Euro}
              label="Sconto merce medio / ordine"
              value={formatCurrency(stats?.scontoMerceMedio || 0)}
              tone="warning"
            />
          </div>

          {/* Grafico principale + distribuzione ordini */}
          {yoy && (
            <div className="grid gap-4 lg:grid-cols-3">
              <SectionCard
                className="lg:col-span-2"
                title={`Andamento · ${yoy.yearPrev} vs ${yoy.yearCurr}`}
                action={
                  yoy.prev.fatturato > 0 && (
                    <span
                      className={`rounded-lg px-2 py-0.5 text-xs font-bold ${
                        yoy.deltaPct >= 0 ? "bg-scatto-success/10 text-scatto-success" : "bg-scatto-danger/10 text-scatto-danger"
                      }`}
                    >
                      {yoy.deltaPct >= 0 ? "↑" : "↓"} {Math.abs(yoy.deltaPct).toFixed(1)}%
                    </span>
                  )
                }
              >
                <RevenueTrendChart
                  data={yoy.monthlyComparison}
                  currentMonthIndex={currentMonthIndex}
                  yearCurr={yoy.yearCurr}
                  yearPrev={yoy.yearPrev}
                />
              </SectionCard>
              {stats?.statusDistribuzione && (
                <OrdersStatusDonut
                  verificati={stats.statusDistribuzione.verificati}
                  inAttesa={stats.statusDistribuzione.inAttesa}
                  altri={stats.statusDistribuzione.altri}
                />
              )}
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

          <SectionKicker tone="info">Volumi</SectionKicker>

          <SectionCard title="Fatturato e margine per mese">
            <RevenueMarginChart
              data={(stats?.ordiniPerMese || [])
                .map((m, i) => ({ mese: mesiLabel[i], fatturato: m.fatturato, marginePct: m.marginePct, ordini: m.ordini }))
                .filter((m) => m.fatturato > 0 || m.ordini > 0)
                .map(({ mese, fatturato, marginePct }) => ({ mese, fatturato, marginePct }))}
            />
          </SectionCard>

          <SectionCard title="Ordini per mese">
            <OrdersMonthlyChart
              data={(stats?.ordiniPerMese || [])
                .map((m, i) => ({ mese: mesiLabel[i], ordini: m.ordini }))
                .filter((m) => m.ordini > 0)}
            />
          </SectionCard>

          <SectionKicker tone="success">Clienti</SectionKicker>

          <ClientMovementBadges
            crescita={clientiClassificati.crescita.length}
            stabili={clientiClassificati.stabili.length}
            calo={clientiClassificati.calo.length}
          />

          <TopClientsGrowthDecline crescita={clientiClassificati.crescita} calo={clientiClassificati.calo} />

          <TopClientsRevenueBars clienti={stats?.clientiKPI || []} />

          <ReorderHeatmap data={stats?.reorderHeatmap || []} />

          <SectionKicker tone="violet">Ripartizioni</SectionKicker>

          <RipartizioniHighlights
            aziendaTop={stats?.aziendeKPI?.[0] || null}
            prodottoTop={stats?.prodottiKPI?.[0] || null}
            fatturatoTotale={stats?.fatturatoTotale || 0}
          />

          <BrandRevenueBars brands={stats?.brandsKPI || []} />

          <SectionKicker tone="warning">Confronto mensile dettagliato</SectionKicker>

          {yoy && (
            <MonthlyComparisonCards data={yoy.monthlyComparison} yearCurr={yoy.yearCurr} yearPrev={yoy.yearPrev} />
          )}

          {/* Detailed Tabs */}
          <Tabs defaultValue="clienti" className="space-y-4">
            <TabsList className="grid w-full max-w-lg grid-cols-4 rounded-xl border border-scatto-line bg-scatto-surface p-1">
              <TabsTrigger value="clienti" className="rounded-lg data-[state=active]:bg-scatto-ink data-[state=active]:text-white">Clienti</TabsTrigger>
              <TabsTrigger value="aziende" className="rounded-lg data-[state=active]:bg-scatto-ink data-[state=active]:text-white">Aziende</TabsTrigger>
              <TabsTrigger value="brands" className="rounded-lg data-[state=active]:bg-scatto-ink data-[state=active]:text-white">Marchi</TabsTrigger>
              <TabsTrigger value="prodotti" className="rounded-lg data-[state=active]:bg-scatto-ink data-[state=active]:text-white">Prodotti</TabsTrigger>
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
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-scatto-muted" />
                <Input
                  placeholder="Cerca cliente..."
                  className="rounded-xl border-scatto-line bg-scatto-surface pl-10 text-scatto-ink"
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
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-scatto-muted" />
                <Input
                  placeholder="Cerca prodotto, azienda o marchio..."
                  className="rounded-xl border-scatto-line bg-scatto-surface pl-10 text-scatto-ink"
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
        </div>
      </div>
    </MainLayout>
  );
};

export default KPI;
