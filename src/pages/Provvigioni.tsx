import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAziende } from "@/hooks/useAziende";
import { useOrdini } from "@/hooks/useOrdini";
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
import {
  Euro,
  TrendingUp,
  Building2,
  CalendarDays,
  Loader2,
  Percent,
  CheckCircle2,
  Clock,
} from "lucide-react";

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

  const years = useMemo(() => {
    const yearsSet = new Set<number>();
    ordini?.forEach((o) => {
      yearsSet.add(new Date(o.created_at).getFullYear());
    });
    yearsSet.add(currentYear);
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [ordini, currentYear]);

  const provvigioniData = useMemo(() => {
    if (!aziende || !ordini) return [];

    return aziende.map((azienda) => {
      const aziendaOrdini = ordini.filter((o) => {
        if (o.azienda_id !== azienda.id) return false;
        const orderDate = new Date(o.created_at);
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
      const provvigionePercentuale = (azienda as any).provvigione_percentuale || 0;
      const provvigioneCalcolata = fatturatoTrimestre * (provvigionePercentuale / 100);
      const ordiniCount = aziendaOrdini.length;

      // Breakdown per quarter
      const quarterBreakdown = Object.entries(trimestreConfig).map(([key, config]) => {
        const qOrdini = ordini.filter((o) => {
          if (o.azienda_id !== azienda.id) return false;
          const orderDate = new Date(o.created_at);
          return orderDate.getFullYear() === selectedYear && config.mesi.includes(orderDate.getMonth());
        });
        const qFatturato = qOrdini.reduce((sum, o) => sum + Number(o.totale), 0);
        const qProvvigione = qFatturato * (provvigionePercentuale / 100);
        return {
          trimestre: key as Trimestre,
          fatturato: qFatturato,
          provvigione: qProvvigione,
          ordini: qOrdini.length,
        };
      });

      return {
        id: azienda.id,
        nome: azienda.nome,
        settore: azienda.settore,
        provvigionePercentuale,
        fatturatoTrimestre,
        provvigioneCalcolata,
        ordiniCount,
        quarterBreakdown,
        fatturatoAnnuale: quarterBreakdown.reduce((sum, q) => sum + q.fatturato, 0),
        provvigioneAnnuale: quarterBreakdown.reduce((sum, q) => sum + q.provvigione, 0),
      };
    }).sort((a, b) => b.provvigioneCalcolata - a.provvigioneCalcolata);
  }, [aziende, ordini, selectedYear, selectedTrimestre]);

  const totali = useMemo(() => {
    return {
      fatturato: provvigioniData.reduce((sum, a) => sum + a.fatturatoTrimestre, 0),
      provvigioni: provvigioniData.reduce((sum, a) => sum + a.provvigioneCalcolata, 0),
      fatturatoAnnuale: provvigioniData.reduce((sum, a) => sum + a.fatturatoAnnuale, 0),
      provvigioniAnnuali: provvigioniData.reduce((sum, a) => sum + a.provvigioneAnnuale, 0),
      ordini: provvigioniData.reduce((sum, a) => sum + a.ordiniCount, 0),
    };
  }, [provvigioniData]);

  const maxProvvigione = Math.max(...provvigioniData.map((a) => a.provvigioneCalcolata), 1);

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
              Gestione Provvigioni
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
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
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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
                Provvigioni {selectedTrimestre === "tutti" ? "Annuali" : "Trimestre"}
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fatturato Annuale</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totali.fatturatoAnnuale)}
              </div>
              <p className="text-xs text-muted-foreground">Anno {selectedYear}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Provvigioni Annuali</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totali.provvigioniAnnuali)}
              </div>
              <p className="text-xs text-muted-foreground">
                {aziende?.length || 0} aziende
              </p>
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
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                )}
                {isCurrent && !isPast && (
                  <Clock className="h-3.5 w-3.5 text-warning" />
                )}
              </button>
            );
          })}
        </div>

        {/* Provvigioni Table */}
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
                    <TableHead className="w-40">Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {provvigioniData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                          {azienda.ordiniCount}
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {formatCurrency(azienda.provvigioneCalcolata)}
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

        {/* Yearly Breakdown per Azienda */}
        {selectedTrimestre === "tutti" && (
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
        )}
      </div>
    </MainLayout>
  );
};

export default Provvigioni;
