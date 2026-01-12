import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useClienti } from "@/hooks/useClienti";
import { useOrdini } from "@/hooks/useOrdini";
import { useAziende } from "@/hooks/useAziende";
import { 
  Building2, 
  Users, 
  TrendingUp, 
  Euro,
  ArrowLeft,
  BarChart3,
  Phone,
  MapPin,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";

// Map URL slugs to consorzio names
export const CONSORZI_MAP: Record<string, string> = {
  "adat": "ADAT",
  "cbf": "CBF",
  "beverage-network": "BEVERAGE NETWORK",
  "bottiglierie-fiorentine": "CONSORZIO BOTTIGLIERIE FIORENTINE",
  "rasna": "RASNA",
  "cda": "CDA",
  "san-geminiano": "SAN GEMINIANO",
  "indipendente": "INDIPENDENTE",
};

export const CONSORZI_SLUGS = Object.keys(CONSORZI_MAP);

const ConsorzioDettaglio = () => {
  const { slug } = useParams<{ slug: string }>();
  const consorzioNome = slug ? CONSORZI_MAP[slug] : null;
  const [expandedAziende, setExpandedAziende] = useState<string[]>([]);
  
  const { data: clienti = [], isLoading: loadingClienti } = useClienti();
  const { data: ordini = [], isLoading: loadingOrdini } = useOrdini();
  const { data: aziende = [], isLoading: loadingAziende } = useAziende();

  const toggleAzienda = (aziendaId: string) => {
    setExpandedAziende(prev => 
      prev.includes(aziendaId) 
        ? prev.filter(id => id !== aziendaId)
        : [...prev, aziendaId]
    );
  };

  const consorzioData = useMemo(() => {
    if (!consorzioNome) return null;

    const clientiConsorzio = clienti.filter(c => c.consorzio === consorzioNome);
    
    // Calculate fatturato per azienda with client details
    const fatturatoPerAzienda: Record<string, { 
      nome: string; 
      fatturato: number; 
      ordiniCount: number;
      clienti: Record<string, { nome: string; fatturato: number; ordiniCount: number }>;
    }> = {};
    
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
              ordiniCount: 0,
              clienti: {}
            };
          }
          
          // Add to azienda totals
          fatturatoPerAzienda[ordine.azienda_id].fatturato += ordine.totale || 0;
          fatturatoPerAzienda[ordine.azienda_id].ordiniCount += 1;
          
          // Add to client within azienda
          if (!fatturatoPerAzienda[ordine.azienda_id].clienti[cliente.id]) {
            fatturatoPerAzienda[ordine.azienda_id].clienti[cliente.id] = {
              nome: cliente.nome,
              fatturato: 0,
              ordiniCount: 0
            };
          }
          fatturatoPerAzienda[ordine.azienda_id].clienti[cliente.id].fatturato += ordine.totale || 0;
          fatturatoPerAzienda[ordine.azienda_id].clienti[cliente.id].ordiniCount += 1;
        }
      });
    });

    const totale = Object.values(fatturatoPerAzienda).reduce(
      (sum, a) => sum + a.fatturato, 0
    );

    return {
      nome: consorzioNome,
      clienti: clientiConsorzio,
      clientiCount: clientiConsorzio.length,
      fatturatoPerAzienda: Object.entries(fatturatoPerAzienda)
        .map(([id, data]) => ({ 
          id, 
          ...data,
          clientiList: Object.entries(data.clienti)
            .map(([clienteId, clienteData]) => ({ id: clienteId, ...clienteData }))
            .sort((a, b) => b.fatturato - a.fatturato)
        }))
        .sort((a, b) => b.fatturato - a.fatturato),
      totaleFatturato: totale
    };
  }, [consorzioNome, clienti, ordini, aziende]);

  const isLoading = loadingClienti || loadingOrdini || loadingAziende;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (!consorzioNome) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
          <h1 className="text-xl font-bold text-foreground mb-4">Consorzio non trovato</h1>
          <Link to="/clienti">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Torna ai Clienti
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in px-2 sm:px-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Link to="/clienti">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="page-title">{consorzioNome}</h1>
            <p className="text-body-md text-muted-foreground mt-1">
              Analisi fatturati e clienti del consorzio
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="shadow-card hover-lift">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Clienti</p>
                  <p className="text-xl sm:text-2xl font-bold">{consorzioData?.clientiCount || 0}</p>
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
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Fatturato</p>
                  <p className="text-lg sm:text-2xl font-bold truncate">
                    {formatCurrency(consorzioData?.totaleFatturato || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover-lift">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Aziende</p>
                  <p className="text-xl sm:text-2xl font-bold">
                    {consorzioData?.fatturatoPerAzienda.length || 0}
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
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Media/Cliente</p>
                  <p className="text-lg sm:text-2xl font-bold truncate">
                    {formatCurrency(
                      consorzioData?.clientiCount 
                        ? (consorzioData.totaleFatturato / consorzioData.clientiCount) 
                        : 0
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center text-muted-foreground">
              Caricamento dati...
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Fatturato per Azienda */}
            <Card className="shadow-card hover-lift">
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                <CardTitle className="text-heading-sm flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  Fatturato per Azienda
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                {consorzioData?.fatturatoPerAzienda.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    Nessun ordine registrato
                  </p>
                ) : (
                  <div className="space-y-3">
                    {consorzioData?.fatturatoPerAzienda.map((azienda, index) => (
                      <Collapsible 
                        key={azienda.id} 
                        open={expandedAziende.includes(azienda.id)}
                        onOpenChange={() => toggleAzienda(azienda.id)}
                      >
                        <CollapsibleTrigger asChild>
                          <div
                            className={cn(
                              "flex items-center justify-between p-3 sm:p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors animate-fade-in cursor-pointer",
                              `stagger-${Math.min(index + 1, 6)}`
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm sm:text-base truncate">{azienda.nome}</p>
                                <p className="text-xs text-muted-foreground">
                                  {azienda.ordiniCount} ordini • {azienda.clientiList.length} clienti
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right flex-shrink-0">
                                <p className="font-bold text-sm sm:text-base text-success">
                                  {formatCurrency(azienda.fatturato)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {consorzioData.totaleFatturato > 0 
                                    ? `${((azienda.fatturato / consorzioData.totaleFatturato) * 100).toFixed(1)}%`
                                    : '0%'
                                  }
                                </p>
                              </div>
                              {expandedAziende.includes(azienda.id) 
                                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              }
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="ml-4 sm:ml-6 mt-2 space-y-2 border-l-2 border-muted pl-4">
                            {azienda.clientiList.map((cliente) => (
                              <Link
                                key={cliente.id}
                                to={`/clienti/${cliente.id}`}
                                className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-background hover:bg-muted/30 transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Users className="h-4 w-4 text-primary shrink-0" />
                                  <span className="text-sm truncate">{cliente.nome}</span>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-medium text-success">
                                    {formatCurrency(cliente.fatturato)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {cliente.ordiniCount} ordini
                                  </p>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Clienti del Consorzio */}
            <Card className="shadow-card hover-lift">
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                <CardTitle className="text-heading-sm flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Clienti ({consorzioData?.clientiCount || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                {consorzioData?.clienti.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    Nessun cliente in questo consorzio
                  </p>
                ) : (
                  <div className="space-y-2">
                    {consorzioData?.clienti.map((cliente, index) => (
                      <Link
                        key={cliente.id}
                        to={`/clienti/${cliente.id}`}
                        className={cn(
                          "flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors animate-fade-in block",
                          `stagger-${Math.min(index + 1, 6)}`
                        )}
                      >
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm sm:text-base font-bold text-primary">
                            {cliente.nome.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base truncate">{cliente.nome}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {cliente.citta && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {cliente.citta}
                              </span>
                            )}
                            {cliente.telefono && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {cliente.telefono}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="flex-shrink-0 text-xs">
                          {cliente.status}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ConsorzioDettaglio;
