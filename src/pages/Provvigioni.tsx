import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAziende } from "@/hooks/useAziende";
import { useOrdini, useUpdateProvvigionePagata } from "@/hooks/useOrdini";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Euro,
  TrendingUp,
  Building2,
  CalendarDays,
  Loader2,
  Percent,
  CheckCircle2,
  Clock,
  FileText,
  Check,
  X,
  Receipt,
} from "lucide-react";
import { ScadenziarioTab } from "@/components/provvigioni/ScadenziarioTab";
import { useScadenziario } from "@/hooks/useScadenziario";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);

type Trimestre = "Q1" | "Q2" | "Q3" | "Q4" | "tutti";

const trimestreConfig = {
  Q1: { label: "Gen - Mar", mesi: [0, 1, 2], color: "bg-blue-500" },
  Q2: { label: "Apr - Giu", mesi: [3, 4, 5], color: "bg-green-500" },
  Q3: { label: "Lug - Set", mesi: [6, 7, 8], color: "bg-orange-500" },
  Q4: { label: "Ott - Dic", mesi: [9, 10, 11], color: "bg-purple-500" },
};

const getCurrentQuarter = (): Trimestre => {
  const month = new Date().getMonth();
  if (month <= 2) return "Q1";
  if (month <= 5) return "Q2";
  if (month <= 8) return "Q3";
  return "Q4";
};

const Provvigioni = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedTrimestre, setSelectedTrimestre] = useState<Trimestre>(getCurrentQuarter());

  const { data: aziende, isLoading: aziendeLoading } = useAziende();
  const { data: ordini, isLoading: ordiniLoading } = useOrdini();
  const updateProvvigionePagata = useUpdateProvvigionePagata();
  const { fattureIncassate, segnaProvvigioneIncassata } = useScadenziario();

  const years = useMemo(() => {
    const yearsSet = new Set<number>();
    ordini?.forEach((o) => {
      yearsSet.add(new Date(o.data_ordine || o.created_at).getFullYear());
    });
    yearsSet.add(currentYear);
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [ordini, currentYear]);

  // Filter orders based on year and quarter, exclude cancelled orders
  // Scadenziario invoices mapped to look like orders for the Ordini tab
  const scadenziarioAsOrdini = useMemo(() => {
    return fattureIncassate.filter((f) => {
      const incassoDate = new Date(f.data_incasso!);
      const incassoYear = incassoDate.getFullYear();
      const incassoMonth = incassoDate.getMonth();

      if (incassoYear !== selectedYear) return false;

      if (selectedTrimestre !== "tutti") {
        const trimestreMesi = trimestreConfig[selectedTrimestre].mesi;
        if (!trimestreMesi.includes(incassoMonth)) return false;
      }

      return true;
    }).map((f) => ({
      id: f.id,
      codice: f.numero_fattura,
      data_ordine: f.data_incasso,
      created_at: f.created_at,
      aziendaNome: f.azienda_nome,
      clienteNome: f.cliente_nome,
      totale: Number(f.importo),
      provvigionePercentuale: Number(f.percentuale_provvigione),
      provvigioneCalcolata: Number(f.provvigione_calcolata),
      provvigione_pagata: f.provvigione_incassata,
      fromScadenziario: true as const,
    }));
  }, [fattureIncassate, selectedYear, selectedTrimestre]);

  const filteredOrdini = useMemo(() => {
    if (!ordini || !aziende) return [];

    return ordini.filter((o) => {
      if (o.status === "annullato") return false;
      
      const orderDate = new Date(o.data_ordine || o.created_at);
      const orderYear = orderDate.getFullYear();
      const orderMonth = orderDate.getMonth();

      if (orderYear !== selectedYear) return false;

      if (selectedTrimestre !== "tutti") {
        const trimestreMesi = trimestreConfig[selectedTrimestre].mesi;
        if (!trimestreMesi.includes(orderMonth)) return false;
      }

      return true;
    }).map((o) => {
      const azienda = aziende.find((a) => a.id === o.azienda_id);
      const provvigionePercentuale = azienda?.provvigione_percentuale || 0;
      const provvigioneCalcolata = Number(o.totale) * (provvigionePercentuale / 100);
      return {
        id: o.id,
        codice: o.codice,
        data_ordine: o.data_ordine,
        created_at: o.created_at,
        aziendaNome: azienda?.nome || "—",
        clienteNome: o.clienti?.nome || "—",
        totale: Number(o.totale),
        provvigionePercentuale,
        provvigioneCalcolata,
        provvigione_pagata: o.provvigione_pagata,
        fromScadenziario: false as const,
      };
    });
  }, [ordini, aziende, selectedYear, selectedTrimestre]);

  const allProvvigioniRows = useMemo(() => {
    return [...filteredOrdini, ...scadenziarioAsOrdini].sort((a, b) => {
      const dateA = new Date(a.data_ordine || a.created_at);
      const dateB = new Date(b.data_ordine || b.created_at);
      return dateB.getTime() - dateA.getTime();
    });
  }, [filteredOrdini, scadenziarioAsOrdini]);

  const provvigioniData = useMemo(() => {
    if (!aziende || !ordini) return [];

    // Filter out cancelled orders first
    const validOrdini = ordini.filter(o => o.status !== "annullato");

    return aziende.map((azienda) => {
      const aziendaOrdini = validOrdini.filter((o) => {
        if (o.azienda_id !== azienda.id) return false;
        const orderDate = new Date(o.data_ordine || o.created_at);
        const orderYear = orderDate.getFullYear();
        const orderMonth = orderDate.getMonth();

        if (orderYear !== selectedYear) return false;

        if (selectedTrimestre !== "tutti") {
          const trimestreMesi = trimestreConfig[selectedTrimestre].mesi;
          if (!trimestreMesi.includes(orderMonth)) return false;
        }

        return true;
      });

      const fatturatoTrimestre = aziendaOrdini.reduce(
        (sum, o) => sum + Number(o.totale),
        0
      );
      const provvigionePercentuale = azienda.provvigione_percentuale || 0;
      const provvigioneCalcolata = fatturatoTrimestre * (provvigionePercentuale / 100);
      const ordiniCount = aziendaOrdini.length;
      const ordiniPagati = aziendaOrdini.filter((o) => o.provvigione_pagata).length;
      const provvigionePagata = aziendaOrdini
        .filter((o) => o.provvigione_pagata)
        .reduce((sum, o) => sum + Number(o.totale) * (provvigionePercentuale / 100), 0);

      // Breakdown per quarter
      const quarterBreakdown = Object.entries(trimestreConfig).map(([key, config]) => {
        const qOrdini = validOrdini.filter((o) => {
          if (o.azienda_id !== azienda.id) return false;
          const orderDate = new Date(o.data_ordine || o.created_at);
          return orderDate.getFullYear() === selectedYear && config.mesi.includes(orderDate.getMonth());
        });
        const qFatturato = qOrdini.reduce((sum, o) => sum + Number(o.totale), 0);
        const qProvvigione = qFatturato * (provvigionePercentuale / 100);
        const qPagati = qOrdini.filter((o) => o.provvigione_pagata).length;
        return {
          trimestre: key as Trimestre,
          fatturato: qFatturato,
          provvigione: qProvvigione,
          ordini: qOrdini.length,
          pagati: qPagati,
        };
      });

      return {
        id: azienda.id,
        nome: azienda.nome,
        settore: azienda.settore,
        provvigionePercentuale,
        fatturatoTrimestre,
        provvigioneCalcolata,
        provvigionePagata,
        ordiniCount,
        ordiniPagati,
        quarterBreakdown,
        fatturatoAnnuale: quarterBreakdown.reduce((sum, q) => sum + q.fatturato, 0),
        provvigioneAnnuale: quarterBreakdown.reduce((sum, q) => sum + q.provvigione, 0),
      };
    }).sort((a, b) => b.provvigioneCalcolata - a.provvigioneCalcolata);
  }, [aziende, ordini, selectedYear, selectedTrimestre]);

  const totali = useMemo(() => {
    const provvigioniPagate = filteredOrdini
      .filter((o) => o.provvigione_pagata)
      .reduce((sum, o) => sum + o.provvigioneCalcolata, 0);
    const provvigioniDaPagare = filteredOrdini
      .filter((o) => !o.provvigione_pagata)
      .reduce((sum, o) => sum + o.provvigioneCalcolata, 0);

    return {
      fatturato: provvigioniData.reduce((sum, a) => sum + a.fatturatoTrimestre, 0),
      provvigioni: provvigioniData.reduce((sum, a) => sum + a.provvigioneCalcolata, 0),
      fatturatoAnnuale: provvigioniData.reduce((sum, a) => sum + a.fatturatoAnnuale, 0),
      provvigioniAnnuali: provvigioniData.reduce((sum, a) => sum + a.provvigioneAnnuale, 0),
      ordini: provvigioniData.reduce((sum, a) => sum + a.ordiniCount, 0),
      provvigioniPagate,
      provvigioniDaPagare,
      ordiniPagati: filteredOrdini.filter((o) => o.provvigione_pagata).length,
      ordiniDaPagare: filteredOrdini.filter((o) => !o.provvigione_pagata).length,
    };
  }, [provvigioniData, filteredOrdini]);

  const maxProvvigione = Math.max(...provvigioniData.map((a) => a.provvigioneCalcolata), 1);

  const handleToggleProvvigione = (ordineId: string, currentValue: boolean) => {
    updateProvvigionePagata.mutate({ id: ordineId, provvigione_pagata: !currentValue });
  };

  const isLoading = aziendeLoading || ordiniLoading;

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
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="page-title">Gestione Provvigioni</h1>
            <p className="text-body-md text-muted-foreground">
              Calcolo e verifica delle provvigioni trimestrali per azienda
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <Select
                value={String(selectedYear)}
                onValueChange={(v) => setSelectedYear(Number(v))}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select
              value={selectedTrimestre}
              onValueChange={(v) => setSelectedTrimestre(v as Trimestre)}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutti i Trimestri</SelectItem>
                <SelectItem value="Q1">Q1 (Gen - Mar)</SelectItem>
                <SelectItem value="Q2">Q2 (Apr - Giu)</SelectItem>
                <SelectItem value="Q3">Q3 (Lug - Set)</SelectItem>
                <SelectItem value="Q4">Q4 (Ott - Dic)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Fatturato {selectedTrimestre === "tutti" ? "Annuale" : "Trimestre"}
              </CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totali.fatturato)}
              </div>
              <p className="text-xs text-muted-foreground">
                {totali.ordini} ordini totali
              </p>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Provvigioni Totali
              </CardTitle>
              <Percent className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(totali.provvigioni)}
              </div>
              <p className="text-xs text-muted-foreground">
                Da {provvigioniData.filter((a) => a.provvigioneCalcolata > 0).length} aziende
              </p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">
                Pagate
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {formatCurrency(totali.provvigioniPagate)}
              </div>
              <p className="text-xs text-green-600 dark:text-green-500">
                {totali.ordiniPagati} ordini
              </p>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Da Incassare
              </CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {formatCurrency(totali.provvigioniDaPagare)}
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-500">
                {totali.ordiniDaPagare} ordini
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Annuali</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totali.provvigioniAnnuali)}
              </div>
              <p className="text-xs text-muted-foreground">Anno {selectedYear}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quarter Status Pills */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(trimestreConfig).map(([key, config]) => {
            const isCurrent = key === getCurrentQuarter() && selectedYear === currentYear;
            const isPast = 
              selectedYear < currentYear || 
              (selectedYear === currentYear && config.mesi[2] < new Date().getMonth());
            
            return (
              <button
                key={key}
                onClick={() => setSelectedTrimestre(key as Trimestre)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                  selectedTrimestre === key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:bg-muted"
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${config.color}`} />
                <span className="text-sm font-medium">{key}</span>
                <span className="text-xs opacity-70">{config.label}</span>
                {isPast && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                )}
                {isCurrent && !isPast && (
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="ordini" className="space-y-4">
          <TabsList>
            <TabsTrigger value="ordini" className="gap-2">
              <FileText className="h-4 w-4" />
              Ordini ({allProvvigioniRows.length})
            </TabsTrigger>
            <TabsTrigger value="aziende" className="gap-2">
              <Building2 className="h-4 w-4" />
              Per Azienda
            </TabsTrigger>
            <TabsTrigger value="riepilogo" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Riepilogo Annuale
            </TabsTrigger>
            <TabsTrigger value="scadenziario" className="gap-2">
              <Receipt className="h-4 w-4" />
              Scadenziario
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab - Main view for tracking payments */}
          <TabsContent value="ordini">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Dettaglio Ordini - Stato Provvigioni
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Codice</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Azienda</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Origine</TableHead>
                        <TableHead className="text-right">Totale</TableHead>
                        <TableHead className="text-center">%</TableHead>
                        <TableHead className="text-right">Provvigione</TableHead>
                        <TableHead className="text-center">Pagata</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allProvvigioniRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            Nessun ordine per il periodo selezionato
                          </TableCell>
                        </TableRow>
                      ) : (
                        allProvvigioniRows.map((row) => (
                          <TableRow 
                            key={`${row.fromScadenziario ? 'sc' : 'ord'}-${row.id}`} 
                            className={`hover:bg-muted/30 ${row.provvigione_pagata ? 'bg-green-50/50 dark:bg-green-950/10' : ''}`}
                          >
                            <TableCell className="font-mono font-medium">
                              {row.codice}
                            </TableCell>
                            <TableCell>
                              {format(new Date(row.data_ordine || row.created_at), "dd MMM yyyy", { locale: it })}
                            </TableCell>
                            <TableCell className="font-medium">
                              {row.aziendaNome}
                            </TableCell>
                            <TableCell>
                              {row.clienteNome}
                            </TableCell>
                            <TableCell>
                              {row.fromScadenziario ? (
                                <Badge variant="secondary" className="text-xs">
                                  <Receipt className="h-3 w-3 mr-1" />
                                  Scadenziario
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  <FileText className="h-3 w-3 mr-1" />
                                  Ordine
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(row.totale)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="font-mono">
                                {row.provvigionePercentuale}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold text-primary">
                              {formatCurrency(row.provvigioneCalcolata)}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Switch
                                  checked={row.provvigione_pagata}
                                  onCheckedChange={() => {
                                    if (row.fromScadenziario) {
                                      segnaProvvigioneIncassata.mutate({
                                        id: row.id,
                                        data_incasso_provvigione: new Date().toISOString().split('T')[0],
                                      });
                                    } else {
                                      handleToggleProvvigione(row.id, row.provvigione_pagata);
                                    }
                                  }}
                                  disabled={updateProvvigionePagata.isPending || segnaProvvigioneIncassata.isPending}
                                />
                                {row.provvigione_pagata ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <X className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Companies Tab */}
          <TabsContent value="aziende">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Dettaglio Provvigioni per Azienda
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Azienda</TableHead>
                        <TableHead className="text-center">% Provv.</TableHead>
                        <TableHead className="text-right">Fatturato</TableHead>
                        <TableHead className="text-center">Ordini</TableHead>
                        <TableHead className="text-right">Provvigione</TableHead>
                        <TableHead className="text-right">Pagata</TableHead>
                        <TableHead className="w-40">Performance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {provvigioniData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Nessun dato disponibile per il periodo selezionato
                          </TableCell>
                        </TableRow>
                      ) : (
                        provvigioniData.map((azienda) => (
                          <TableRow key={azienda.id} className="hover:bg-muted/30">
                            <TableCell>
                              <div>
                                <p className="font-medium">{azienda.nome}</p>
                                <p className="text-xs text-muted-foreground">
                                  {azienda.settore || "—"}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={azienda.provvigionePercentuale > 0 ? "default" : "secondary"}
                                className="font-mono"
                              >
                                {azienda.provvigionePercentuale}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(azienda.fatturatoTrimestre)}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm">
                                {azienda.ordiniPagati}/{azienda.ordiniCount}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-bold text-primary">
                              {formatCurrency(azienda.provvigioneCalcolata)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              {formatCurrency(azienda.provvigionePagata)}
                            </TableCell>
                            <TableCell>
                              <Progress
                                value={(azienda.provvigioneCalcolata / maxProvvigione) * 100}
                                className="h-2"
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Yearly Summary Tab */}
          <TabsContent value="riepilogo">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Riepilogo Trimestrale {selectedYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Azienda</TableHead>
                        <TableHead className="text-center">Q1</TableHead>
                        <TableHead className="text-center">Q2</TableHead>
                        <TableHead className="text-center">Q3</TableHead>
                        <TableHead className="text-center">Q4</TableHead>
                        <TableHead className="text-right">Totale Annuo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {provvigioniData.map((azienda) => (
                        <TableRow key={azienda.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">{azienda.nome}</TableCell>
                          {azienda.quarterBreakdown.map((q) => (
                            <TableCell key={q.trimestre} className="text-center">
                              <div className="text-xs text-muted-foreground">
                                {formatCurrency(q.fatturato)}
                              </div>
                              <div className="font-medium text-primary text-sm">
                                {formatCurrency(q.provvigione)}
                              </div>
                              <div className="text-xs text-green-600">
                                {q.pagati}/{q.ordini} pagati
                              </div>
                            </TableCell>
                          ))}
                          <TableCell className="text-right">
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(azienda.fatturatoAnnuale)}
                            </div>
                            <div className="font-bold text-primary">
                              {formatCurrency(azienda.provvigioneAnnuale)}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Totals Row */}
                      <TableRow className="bg-muted/70 font-bold">
                        <TableCell>TOTALE</TableCell>
                        {["Q1", "Q2", "Q3", "Q4"].map((q) => {
                          const qTotale = provvigioniData.reduce(
                            (sum, a) => sum + (a.quarterBreakdown.find((qb) => qb.trimestre === q)?.provvigione || 0),
                            0
                          );
                          return (
                            <TableCell key={q} className="text-center text-primary">
                              {formatCurrency(qTotale)}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right text-primary text-lg">
                          {formatCurrency(totali.provvigioniAnnuali)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scadenziario Tab */}
          <TabsContent value="scadenziario">
            <ScadenziarioTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Provvigioni;
