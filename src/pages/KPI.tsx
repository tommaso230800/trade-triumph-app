import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAdvancedKPIStats, AdvancedKPIFilters } from "@/hooks/useAdvancedKPIStats";
import { KPICard } from "@/components/dashboard/KPICard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { ClientGrowthWidget } from "@/components/dashboard/ClientGrowthWidget";
import { YearComparisonChart } from "@/components/dashboard/YearComparisonChart";
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
  Users,
  Package,
  Building2,
  ShoppingCart,
  Search,
  Loader2,
  BarChart3,
  CalendarIcon,
  Tag,
  BoxIcon,
  Filter,
  RotateCcw,
  Download,
  FileText,
} from "lucide-react";
import { exportKPIToPDF, exportKPIToCSV } from "@/lib/exportKPI";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);

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

  const resetFilters = () => {
    setSelectedClienti([]);
    setSelectedAziende([]);
    setSelectedBrands([]);
    setPeriodPreset("anno");
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
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
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
              Analisi KPI Avanzata
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Filtra e analizza le performance per cliente, azienda, brand e periodo
            </p>
          </div>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={resetFilters} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset Filtri
            </Button>
          )}
        </div>

        {/* Filters Bar */}
        <div className="rounded-xl bg-card p-4 shadow-card space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filtri Avanzati
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* Period Preset */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Periodo</label>
              <Select value={periodPreset} onValueChange={(v) => setPeriodPreset(v as PeriodPreset)}>
                <SelectTrigger>
                  <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Periodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mese">Questo Mese</SelectItem>
                  <SelectItem value="trimestre">Ultimi 3 Mesi</SelectItem>
                  <SelectItem value="semestre">Ultimi 6 Mesi</SelectItem>
                  <SelectItem value="anno">Anno in Corso</SelectItem>
                  <SelectItem value="custom">Personalizzato</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            {periodPreset === "custom" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Da</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !customStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customStartDate ? format(customStartDate, "dd/MM/yyyy", { locale: it }) : "Seleziona"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">A</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !customEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customEndDate ? format(customEndDate, "dd/MM/yyyy", { locale: it }) : "Seleziona"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            {/* Clienti Multi-Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Clienti</label>
              <MultiSelect
                options={clientiOptions}
                values={selectedClienti}
                onValuesChange={setSelectedClienti}
                placeholder="Tutti i clienti"
              />
            </div>

            {/* Aziende Multi-Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Aziende</label>
              <MultiSelect
                options={aziendeOptions}
                values={selectedAziende}
                onValuesChange={setSelectedAziende}
                placeholder="Tutte le aziende"
              />
            </div>

            {/* Brands Multi-Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Marchi</label>
              <MultiSelect
                options={brandsOptions}
                values={selectedBrands}
                onValuesChange={setSelectedBrands}
                placeholder="Tutti i marchi"
              />
            </div>
          </div>

          {/* Active filters summary */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              {selectedClienti.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Users className="h-3 w-3" />
                  {selectedClienti.length} clienti
                </Badge>
              )}
              {selectedAziende.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Building2 className="h-3 w-3" />
                  {selectedAziende.length} aziende
                </Badge>
              )}
              {selectedBrands.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Tag className="h-3 w-3" />
                  {selectedBrands.length} marchi
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Main KPIs */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-6 animate-fade-in">
          <KPICard
            title="Fatturato Totale"
            value={formatCurrency(stats?.fatturatoTotale || 0)}
            change={stats?.trendPercentage ? Math.round(stats.trendPercentage) : undefined}
            changeLabel="vs periodo precedente"
            icon={<Euro className="h-5 w-5 lg:h-6 lg:w-6" />}
            variant="primary"
          />
          <KPICard
            title="Ordini"
            value={stats?.ordiniTotali || 0}
            icon={<ShoppingCart className="h-5 w-5 lg:h-6 lg:w-6" />}
            variant="success"
          />
          <KPICard
            title="Cartoni Totali"
            value={(stats?.cartoniTotali || 0).toLocaleString("it-IT")}
            icon={<BoxIcon className="h-5 w-5 lg:h-6 lg:w-6" />}
            variant="default"
          />
          <KPICard
            title="Pezzi Totali"
            value={(stats?.pezziTotali || 0).toLocaleString("it-IT")}
            icon={<Package className="h-5 w-5 lg:h-6 lg:w-6" />}
            variant="default"
          />
          <KPICard
            title="Scontrino Medio"
            value={formatCurrency(stats?.scontrinoMedio || 0)}
            icon={<TrendingUp className="h-5 w-5 lg:h-6 lg:w-6" />}
            variant="default"
          />
          <div className="rounded-lg bg-card p-4 shadow-card">
            <div className="flex items-center gap-2">
              {(stats?.trendPercentage || 0) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <p className="text-xs text-muted-foreground">Trend periodo</p>
            </div>
            <p className={cn(
              "text-2xl font-bold mt-1",
              (stats?.trendPercentage || 0) >= 0 ? "text-success" : "text-destructive"
            )}>
              {(stats?.trendPercentage || 0) >= 0 ? "+" : ""}{(stats?.trendPercentage || 0).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Detail KPIs: confronti, sconti, margine */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 animate-fade-in">
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

        {/* Top Growers / Decliners */}
        <div className="grid gap-6 lg:grid-cols-2 animate-fade-in">
          <div className="rounded-xl bg-card p-4 lg:p-6 shadow-card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              Top 5 Clienti in Crescita
            </h3>
            {(stats?.topGrowers || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun dato di confronto disponibile</p>
            ) : (
              <div className="space-y-3">
                {(stats?.topGrowers || []).map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{c.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {formatCurrency(c.fatturato)} vs {formatCurrency(c.fatturato_2025 || 0)}
                      </p>
                    </div>
                    <Badge className="bg-success/10 text-success hover:bg-success/20 shrink-0">
                      +{c.variazione_pct.toFixed(1)}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-card p-4 lg:p-6 shadow-card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              Top 5 Clienti in Calo
            </h3>
            {(stats?.topDecliners || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun dato di confronto disponibile</p>
            ) : (
              <div className="space-y-3">
                {(stats?.topDecliners || []).map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{c.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {formatCurrency(c.fatturato)} vs {formatCurrency(c.fatturato_2025 || 0)}
                      </p>
                    </div>
                    <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20 shrink-0">
                      {c.variazione_pct.toFixed(1)}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-card p-4 lg:p-6 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Andamento Fatturato Mensile 2026</h3>
            </div>
            <SalesChart data={stats?.ordiniPerMese || []} type="area" />
          </div>
          <div className="rounded-xl bg-card p-4 lg:p-6 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Ordini per Mese 2026</h3>
            </div>
            <SalesChart data={stats?.ordiniPerMese || []} type="bar" />
          </div>
        </div>

        {/* Client Growth Widget */}
        <ClientGrowthWidget clienti={stats?.clientiKPI || []} />

        {/* Year Comparison Chart - Confronto Mese per Mese 2025 vs 2026 */}
        <div className="rounded-xl bg-card p-4 lg:p-6 shadow-card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Confronto Fatturato Mese per Mese: 2025 vs 2026
          </h3>
          <YearComparisonChart data2026={stats?.ordiniPerMese || []} />
        </div>

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
                          <TableCell className="text-right">{azienda.cartoni_venduti.toLocaleString("it-IT")}</TableCell>
                          <TableCell className="text-right">{azienda.prodotti_venduti.toLocaleString("it-IT")}</TableCell>
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
                          <TableCell className="text-right">{brand.quantita_venduta.toLocaleString("it-IT")}</TableCell>
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
                        <TableCell className="text-right">{prodotto.cartoni_venduti.toLocaleString("it-IT")}</TableCell>
                        <TableCell className="text-right">{prodotto.quantita_venduta.toLocaleString("it-IT")}</TableCell>
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
      </div>
    </MainLayout>
  );
};

export default KPI;
