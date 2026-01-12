import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useClienti } from "@/hooks/useClienti";
import { useOrdini } from "@/hooks/useOrdini";
import { useAziende } from "@/hooks/useAziende";
import { 
  Building2, 
  Users, 
  TrendingUp, 
  Euro, 
  ChevronDown,
  ChevronRight,
  BarChart3
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const CONSORZI = [
  "CONSORZIO BOTTIGLIERIE FIORENTINE",
  "CONSORZIO GROSSISTI TOSCANI",
  "CONSORZIO DISTRIBUZIONE BEVANDE",
  "CONSORZIO VINI ITALIANI",
  "GRUPPO ACQUISTO HORECA",
] as const;

const Consorzi = () => {
  const { data: clienti = [], isLoading: loadingClienti } = useClienti();
  const { data: ordini = [], isLoading: loadingOrdini } = useOrdini();
  const { data: aziende = [], isLoading: loadingAziende } = useAziende();
  const [openConsorzi, setOpenConsorzi] = useState<string[]>([]);

  const toggleConsorzio = (consorzio: string) => {
    setOpenConsorzi(prev =>
      prev.includes(consorzio)
        ? prev.filter(c => c !== consorzio)
        : [...prev, consorzio]
    );
  };

  // Calculate stats per consorzio
  const consorziStats = useMemo(() => {
    return CONSORZI.map(consorzio => {
      const clientiConsorzio = clienti.filter(c => c.consorzio === consorzio);
      
      // Calculate fatturato per azienda for this consorzio
      const fatturatoPerAzienda: Record<string, { nome: string; fatturato: number; ordiniCount: number }> = {};
      
      clientiConsorzio.forEach(cliente => {
        const clienteOrdini = ordini.filter(o => o.cliente_id === cliente.id);
        
        clienteOrdini.forEach(ordine => {
          if (ordine.azienda_id) {
            const azienda = aziende.find(a => a.id === ordine.azienda_id);
            const aziendaNome = azienda?.nome || "Sconosciuta";
            
            if (!fatturatoPerAzienda[ordine.azienda_id]) {
              fatturatoPerAzienda[ordine.azienda_id] = {
                nome: aziendaNome,
                fatturato: 0,
                ordiniCount: 0
              };
            }
            fatturatoPerAzienda[ordine.azienda_id].fatturato += ordine.totale || 0;
            fatturatoPerAzienda[ordine.azienda_id].ordiniCount += 1;
          }
        });
      });

      const totaleConsorzio = Object.values(fatturatoPerAzienda).reduce(
        (sum, a) => sum + a.fatturato, 0
      );

      return {
        nome: consorzio,
        clientiCount: clientiConsorzio.length,
        clienti: clientiConsorzio,
        fatturatoPerAzienda: Object.entries(fatturatoPerAzienda)
          .map(([id, data]) => ({ id, ...data }))
          .sort((a, b) => b.fatturato - a.fatturato),
        totaleFatturato: totaleConsorzio
      };
    }).filter(c => c.clientiCount > 0 || c.nome === CONSORZI[0]);
  }, [clienti, ordini, aziende]);

  const isLoading = loadingClienti || loadingOrdini || loadingAziende;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in px-2 sm:px-0">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="page-title">Consorzi</h1>
          <p className="text-body-md text-muted-foreground">
            Analisi fatturati per consorzio e azienda
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="shadow-card hover-lift">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Consorzi</p>
                  <p className="text-xl sm:text-2xl font-bold">{consorziStats.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover-lift">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Clienti Totali</p>
                  <p className="text-xl sm:text-2xl font-bold">
                    {consorziStats.reduce((sum, c) => sum + c.clientiCount, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover-lift">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
                  <Euro className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Fatturato Tot.</p>
                  <p className="text-lg sm:text-2xl font-bold truncate">
                    {formatCurrency(consorziStats.reduce((sum, c) => sum + c.totaleFatturato, 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover-lift">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Aziende Attive</p>
                  <p className="text-xl sm:text-2xl font-bold">{aziende.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Consorzi List */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="shadow-card">
              <CardContent className="p-8 text-center text-muted-foreground">
                Caricamento dati...
              </CardContent>
            </Card>
          ) : consorziStats.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-8 text-center text-muted-foreground">
                Nessun consorzio trovato
              </CardContent>
            </Card>
          ) : (
            consorziStats.map((consorzio, index) => (
              <Card 
                key={consorzio.nome} 
                className={cn(
                  "shadow-card hover-lift overflow-hidden animate-fade-in",
                  `stagger-${Math.min(index + 1, 6)}`
                )}
              >
                <Collapsible
                  open={openConsorzi.includes(consorzio.nome)}
                  onOpenChange={() => toggleConsorzio(consorzio.nome)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors p-4 sm:p-6">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-base sm:text-lg truncate">{consorzio.nome}</CardTitle>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {consorzio.clientiCount} clienti
                              </Badge>
                              <Badge variant="outline" className="text-xs text-success">
                                {formatCurrency(consorzio.totaleFatturato)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {openConsorzi.includes(consorzio.nome) ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 px-4 pb-4 sm:px-6 sm:pb-6">
                      <Separator className="mb-4" />
                      
                      {consorzio.fatturatoPerAzienda.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-4">
                          Nessun ordine registrato per questo consorzio
                        </p>
                      ) : (
                        <div className="space-y-3">
                          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                            Fatturato per Azienda
                          </h4>
                          <div className="space-y-2">
                            {consorzio.fatturatoPerAzienda.map((azienda) => (
                              <div
                                key={azienda.id}
                                className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm sm:text-base truncate">{azienda.nome}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {azienda.ordiniCount} ordini
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0 ml-2">
                                  <p className="font-bold text-sm sm:text-base text-success">
                                    {formatCurrency(azienda.fatturato)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {consorzio.totaleFatturato > 0 
                                      ? `${((azienda.fatturato / consorzio.totaleFatturato) * 100).toFixed(1)}%`
                                      : '0%'
                                    }
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Clienti del consorzio */}
                          <Separator className="my-4" />
                          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                            Clienti ({consorzio.clientiCount})
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {consorzio.clienti.map((cliente) => (
                              <div
                                key={cliente.id}
                                className="flex items-center gap-2 p-2 sm:p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                              >
                                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-bold text-primary">
                                    {cliente.nome.charAt(0)}
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs sm:text-sm font-medium truncate">{cliente.nome}</p>
                                  <p className="text-xs text-muted-foreground truncate">{cliente.citta || 'N/A'}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Consorzi;
