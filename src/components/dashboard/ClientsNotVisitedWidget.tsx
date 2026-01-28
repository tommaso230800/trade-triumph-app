import { Link } from "react-router-dom";
import { UserX, Phone, MapPin, Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClientsNotVisited } from "@/hooks/useDashboardWidgets";

export function ClientsNotVisitedWidget() {
  const { data: clients = [], isLoading } = useClientsNotVisited(30);

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-card border border-border/50 p-6 shadow-sm animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-4" />
        <div className="h-32 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-warning/10 rounded-lg">
            <UserX className="h-4 w-4 text-warning" />
          </div>
          <div>
            <h3 className="font-semibold text-card-foreground">Clienti da Visitare</h3>
            <p className="text-xs text-muted-foreground">Ultimi 30 giorni</p>
          </div>
        </div>
        {clients.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {clients.length} clienti
          </Badge>
        )}
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-8">
          <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
            <UserX className="h-6 w-6 text-success" />
          </div>
          <p className="text-sm text-muted-foreground">Tutti i clienti sono stati contattati! 🎉</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[280px] overflow-y-auto">
          {clients.slice(0, 6).map((client) => (
            <Link
              key={client.id}
              to={`/clienti/${client.id}`}
              className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all duration-200 group"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-card-foreground truncate group-hover:text-primary transition-colors">
                  {client.nome}
                </p>
                {client.citta && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {client.citta}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {client.daysSinceVisit !== null ? (
                  <Badge variant="outline" className="text-xs gap-1 bg-warning/5 text-warning border-warning/20">
                    <Clock className="h-3 w-3" />
                    {client.daysSinceVisit}g
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-destructive/5 text-destructive border-destructive/20">
                    Mai
                  </Badge>
                )}
                {client.telefono && (
                  <a
                    href={`tel:${client.telefono}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 text-primary" />
                  </a>
                )}
              </div>
            </Link>
          ))}
          {clients.length > 6 && (
            <Link to="/clienti" className="block">
              <Button variant="ghost" size="sm" className="w-full text-xs gap-2 mt-2">
                Vedi altri {clients.length - 6} clienti
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
