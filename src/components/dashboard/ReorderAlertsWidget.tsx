import { useReorderAlerts } from "@/hooks/useReorderTracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

export function ReorderAlertsWidget() {
  const { data: alerts = [], isLoading } = useReorderAlerts();

  if (isLoading) return null;
  if (alerts.length === 0) return null;

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Avvisi Riordino ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.slice(0, 5).map((alert) => (
          <Link
            key={alert.id}
            to={`/clienti/${alert.cliente_id}`}
            className="flex items-start justify-between gap-2 p-3 rounded-lg bg-background hover:bg-accent/50 transition-colors border"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{alert.cliente_nome}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Package className="h-3 w-3" />
                {alert.azienda_nome}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                Media riordino: {Math.round(alert.media_giorni_riordino)} gg
              </p>
              {alert.ultimo_ordine_data && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ultimo: {format(parseISO(alert.ultimo_ordine_data), "d MMM yyyy", { locale: it })}
                </p>
              )}
            </div>
            <Badge variant="destructive" className="text-xs shrink-0">
              +{alert.giorni_ritardo} gg
            </Badge>
          </Link>
        ))}
        {alerts.length > 5 && (
          <p className="text-xs text-muted-foreground text-center">
            e altri {alerts.length - 5} avvisi...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
