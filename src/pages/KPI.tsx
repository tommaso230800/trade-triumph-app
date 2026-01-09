import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useKPIStats, PeriodFilter } from "@/hooks/useKPIStats";
import { KPICard } from "@/components/dashboard/KPICard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { YearComparisonChart } from "@/components/dashboard/YearComparisonChart";
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
  Users,
  Package,
  Building2,
  ShoppingCart,
  Search,
  Loader2,
  BarChart3,
  PieChart,
  Calendar,
  GitCompare,
} from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);

const KPI = () => {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("tutti");
  const { data: stats, isLoading } = useKPIStats(periodFilter);
  const [clientSearch, setClientSearch] = useState("");
  const [prodottoSearch, setProdottoSearch] = useState("");
  const [consorzioFilter, setConsorzioFilter] = useState<string>("tutti");

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const filteredClienti = stats?.clientiKPI.filter((c) => {
    const matchSearch = c.nome.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.azienda?.toLowerCase().includes(clientSearch.toLowerCase());
    const matchConsorzio = consorzioFilter === "tutti" || c.consorzio === consorzioFilter;
    return matchSearch && matchConsorzio;
  }) || [];

  const filteredProdotti = stats?.prodottiKPI.filter((p) =>
    p.nome.toLowerCase().includes(prodottoSearch.toLowerCase()) ||
    p.azienda_nome.toLowerCase().includes(prodottoSearch.toLowerCase())
  ) || [];

  const maxFatturato = Math.max(...(stats?.clientiKPI.map((c) => c.fatturato) || [1]));
  const maxProdottoFatturato = Math.max(...(stats?.prodottiKPI.map((p) => p.fatturato_totale) || [1]));

  const consorzi = [...new Set(stats?.clientiKPI.map((c) => c.consorzio).filter(Boolean))] as string[];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header with Period Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
              Analisi KPI
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Analisi dettagliata delle performance aziendali
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutti i periodi</SelectItem>
                <SelectItem value="mese">Questo Mese</SelectItem>
                <SelectItem value="trimestre">Questo Trimestre</SelectItem>
                <SelectItem value="anno">Quest'Anno</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main KPIs */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Fatturato Totale"
            value={formatCurrency(stats?.fatturatoTotale || 0)}
            icon={<Euro className="h-5 w-5 lg:h-6 lg:w-6" />}
            variant="primary"
          />
          <KPICard
            title="Valore Medio Ordine"
            value={formatCurrency(stats?.valoremedioOrdine || 0)}
            icon={<ShoppingCart className="h-5 w-5 lg:h-6 lg:w-6" />}
            variant="success"
          />
          <KPICard
            title="Prezzo Medio Listino"
            value={formatCurrency(stats?.prezzoMedioProdotto || 0)}
            icon={<Package className="h-5 w-5 lg:h-6 lg:w-6" />}
            variant="default"
          />
          <KPICard
            title="Prezzo Medio Vendita"
            value={formatCurrency(stats?.prezzoMedioVendita || 0)}
            icon={<TrendingUp className="h-5 w-5 lg:h-6 lg:w-6" />}
            variant="default"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg bg-card p-4 shadow-card">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Clienti</p>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.clientiTotali || 0}</p>
          </div>
          <div className="rounded-lg bg-card p-4 shadow-card">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Ordini</p>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.ordiniTotali || 0}</p>
          </div>
          <div className="rounded-lg bg-card p-4 shadow-card">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Prodotti</p>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.prodottiTotali || 0}</p>
          </div>
          <div className="rounded-lg bg-card p-4 shadow-card">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Aziende</p>
            </div>
            <p className="text-2xl font-bold mt-1">{stats?.aziendeTotali || 0}</p>
          </div>
          <div className="rounded-lg bg-card p-4 shadow-card">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <p className="text-xs text-muted-foreground">Completati</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-success">{stats?.ordiniCompletati || 0}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-card p-4 lg:p-6 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Andamento Fatturato Mensile</h3>
            </div>
            <SalesChart data={stats?.ordiniPerMese || []} type="area" />
          </div>
          <div className="rounded-xl bg-card p-4 lg:p-6 shadow-card max-h-[500px] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Fatturato per Consorzio e Azienda</h3>
            </div>
            <div className="space-y-4">
              {stats?.consorzioAziendeStats.map((cs) => (
                <div key={cs.consorzio} className="space-y-2">
                  <div className="flex justify-between text-sm border-b border-border pb-1">
                    <span className="font-semibold text-primary">{cs.consorzio}</span>
                    <span className="font-semibold">
                      {formatCurrency(cs.fatturato_totale)}
                    </span>
                  </div>
                  <div className="space-y-3 pl-3">
                    {cs.aziende.map((azienda, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground font-medium">{azienda.azienda_nome}</span>
                          <span className="font-medium">{formatCurrency(azienda.fatturato)}</span>
                        </div>
                        <Progress
                          value={(azienda.fatturato / (cs.fatturato_totale || 1)) * 100}
                          className="h-1.5"
                        />
                        {/* Clienti breakdown */}
                        <div className="pl-3 space-y-1 border-l border-border/50">
                          {azienda.clienti.map((cliente) => (
                            <div key={cliente.cliente_id} className="flex justify-between text-xs">
                              <span className="text-muted-foreground/80">{cliente.cliente_nome}</span>
                              <span className="text-muted-foreground">{formatCurrency(cliente.fatturato)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Year Comparison */}
        <div className="rounded-xl bg-card p-4 lg:p-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <GitCompare className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Confronto 2025 vs 2026</h3>
          </div>
          <YearComparisonChart data2026={stats?.ordiniPerMese || []} />
        </div>

        {/* Detailed Tabs */}
        <Tabs defaultValue="clienti" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="clienti">Clienti</TabsTrigger>
            <TabsTrigger value="prodotti">Prodotti</TabsTrigger>
            <TabsTrigger value="aziende">Aziende</TabsTrigger>
          </TabsList>

          {/* Clienti Tab */}
          <TabsContent value="clienti" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cerca cliente..."
                  className="pl-10"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                />
              </div>
              <Select value={consorzioFilter} onValueChange={setConsorzioFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Consorzio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutti">Tutti i Consorzi</SelectItem>
                  {consorzi.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl bg-card shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Cliente</TableHead>
                      <TableHead>Consorzio</TableHead>
                      <TableHead>Città</TableHead>
                      <TableHead>Ordini</TableHead>
                      <TableHead>Fatturato</TableHead>
                      <TableHead className="w-32">Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClienti.map((cliente) => (
                      <TableRow key={cliente.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div>
                            <p className="font-medium">{cliente.nome}</p>
                            <p className="text-xs text-muted-foreground">{cliente.azienda || "—"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {cliente.consorzio ? (
                            <Badge variant="outline">{cliente.consorzio}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {cliente.citta || "—"}
                        </TableCell>
                        <TableCell>{cliente.ordini_count}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(cliente.fatturato)}
                        </TableCell>
                        <TableCell>
                          <Progress
                            value={(cliente.fatturato / maxFatturato) * 100}
                            className="h-2"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
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
                placeholder="Cerca prodotto..."
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
                      <TableHead>Prezzo Listino</TableHead>
                      <TableHead>Pz Venduti</TableHead>
                      <TableHead>N° Ordini</TableHead>
                      <TableHead>Fatturato</TableHead>
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
                        <TableCell>{formatCurrency(prodotto.prezzo_listino)}</TableCell>
                        <TableCell>{prodotto.quantita_venduta}</TableCell>
                        <TableCell>{prodotto.ordini_count}</TableCell>
                        <TableCell className="font-semibold">
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
                      <TableHead>Ordini</TableHead>
                      <TableHead>Pz Venduti</TableHead>
                      <TableHead>Fatturato</TableHead>
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
                          <TableCell>{azienda.ordini_count}</TableCell>
                          <TableCell>{azienda.prodotti_venduti}</TableCell>
                          <TableCell className="font-semibold">
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
