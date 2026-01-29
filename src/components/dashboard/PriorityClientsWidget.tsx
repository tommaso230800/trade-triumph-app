import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientStatusBadge } from "@/components/commercial/ClientStatusBadge";
import { useClientiCommercialiPrioritari, ClienteCommerciale } from "@/hooks/useClientCommercialData";
import { 
  AlertTriangle, 
  Target, 
  TrendingUp, 
  RefreshCw, 
  ArrowRight,
  Flame,
  DollarSign,
  Zap,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

const prioritaConfig = {
  rischio: {
    icon: Flame,
    label: "A Rischio",
    color: "text-red-500",
    bgClass: "bg-red-500/10 border-red-500/30",
  },
  sotto_target: {
    icon: Target,
    label: "Sotto Target",
    color: "text-amber-500",
    bgClass: "bg-amber-500/10 border-amber-500/30",
  },
  alto_potenziale: {
    icon: TrendingUp,
    label: "Alto Potenziale",
    color: "text-green-500",
    bgClass: "bg-green-500/10 border-green-500/30",
  },
  routine: {
    icon: Clock,
    label: "Routine",
    color: "text-muted-foreground",
    bgClass: "bg-muted/50 border-muted",
  },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

export function PriorityClientsWidget() {
  const { data: clienti, isLoading, refetch } = useClientiCommercialiPrioritari();

  // Prendi solo i primi 8 clienti prioritari (escludendo routine se possibile)
  const clientiPrioritari = (clienti || [])
    .filter(c => c.priorita !== "routine")
    .slice(0, 8);

  // Se non ci sono abbastanza, aggiungi routine
  const clientiDaMostrare = clientiPrioritari.length < 4
    ? [...clientiPrioritari, ...(clienti || []).filter(c => c.priorita === "routine").slice(0, 4 - clientiPrioritari.length)]
    : clientiPrioritari;

  // Conta per categoria
  const conti = {
    rischio: (clienti || []).filter(c => c.priorita === "rischio").length,
    sotto_target: (clienti || []).filter(c => c.priorita === "sotto_target").length,
    alto_potenziale: (clienti || []).filter(c => c.priorita === "alto_potenziale").length,
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Clienti Priorità Giorno
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            Clienti Priorità Giorno
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Summary badges */}
        <div className="flex flex-wrap gap-2 mt-2">
          {conti.rischio > 0 && (
            <Badge className="bg-red-500/10 text-red-600 border-red-500/30 gap-1">
              <Flame className="h-3 w-3" /> {conti.rischio} a rischio
            </Badge>
          )}
          {conti.sotto_target > 0 && (
            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
              <Target className="h-3 w-3" /> {conti.sotto_target} sotto target
            </Badge>
          )}
          {conti.alto_potenziale > 0 && (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/30 gap-1">
              <TrendingUp className="h-3 w-3" /> {conti.alto_potenziale} in crescita
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {clientiDaMostrare.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nessun cliente con priorità particolare oggi
          </p>
        ) : (
          <>
            {clientiDaMostrare.map((cliente) => {
              const config = prioritaConfig[cliente.priorita];
              const Icon = config.icon;
              
              return (
                <Link
                  key={cliente.id}
                  to={`/assistente-pre-visita?cliente=${cliente.id}`}
                  className={cn(
                    "block rounded-lg border p-3 transition-all hover:shadow-md hover:border-primary/50",
                    config.bgClass
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={cn("p-1.5 rounded-lg bg-background/50", config.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{cliente.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {cliente.azienda || cliente.consorzio || "—"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <ClientStatusBadge 
                            semaforo={cliente.statoCliente.semaforo} 
                            size="sm"
                          />
                          <span className="text-xs text-muted-foreground">
                            {cliente.giorniSenzaOrdine < 999 
                              ? `${cliente.giorniSenzaOrdine}gg fa`
                              : "Mai ordinato"
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-sm">{formatCurrency(cliente.fatturato)}</p>
                      {cliente.fatturato_2025 && cliente.fatturato_2025 > 0 && (
                        <p className={cn(
                          "text-xs",
                          cliente.statoCliente.crescitaPercentuale >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {cliente.statoCliente.crescitaPercentuale >= 0 ? "+" : ""}
                          {cliente.statoCliente.crescitaPercentuale.toFixed(0)}%
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
            
            <Link to="/assistente-pre-visita">
              <Button variant="ghost" size="sm" className="w-full mt-2 gap-2">
                Vedi tutti i clienti
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
