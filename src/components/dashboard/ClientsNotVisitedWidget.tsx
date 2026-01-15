import { Link } from "react-router-dom";
import { UserX, Phone, MapPin, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClientsNotVisited } from "@/hooks/useDashboardWidgets";

export function ClientsNotVisitedWidget() {
  const { data: clients = [], isLoading } = useClientsNotVisited(30);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Clienti da Visitare
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover-lift">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <UserX className="h-4 w-4 text-warning" />
            Clienti da Visitare
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Ultimi 30 giorni
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Tutti i clienti sono stati contattati
          </p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {clients.slice(0, 8).map((client) => (
              <Link
                key={client.id}
                to={`/clienti/${client.id}`}
                className="flex items-center justify-between p-2 rounded-lg border hover:border-primary/50 hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{client.nome}</p>
                  {client.citta && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {client.citta}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {client.daysSinceVisit !== null ? (
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {client.daysSinceVisit}g
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-warning">
                      Mai
                    </Badge>
                  )}
                  {client.telefono && (
                    <a
                      href={`tel:${client.telefono}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-full hover:bg-primary/10 transition-colors"
                    >
                      <Phone className="h-3.5 w-3.5 text-primary" />
                    </a>
                  )}
                </div>
              </Link>
            ))}
            {clients.length > 8 && (
              <Link to="/clienti">
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  Vedi altri {clients.length - 8} clienti
                </Button>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
