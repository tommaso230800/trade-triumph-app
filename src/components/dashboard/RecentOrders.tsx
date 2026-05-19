import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useOrdini } from "@/hooks/useOrdini";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Loader2 } from "lucide-react";

const statusConfig = {
  completato: { label: "Completato", variant: "success" as const },
  in_attesa: { label: "In Attesa", variant: "warning" as const },
  spedito: { label: "Spedito", variant: "info" as const },
  annullato: { label: "Annullato", variant: "destructive" as const },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);

const formatDate = (dateString: string | null, fallbackDate: string) => {
  const date = new Date(dateString || fallbackDate);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Oggi";
  if (diffDays === 1) return "Ieri";
  if (diffDays < 7) return `${diffDays} giorni fa`;
  return format(date, "dd MMM", { locale: it });
};

export function RecentOrders() {
  const { data: ordini, isLoading } = useOrdini();
  
  // Get last 5 non-cancelled orders
  const recentOrders = ordini
    ?.filter((o) => o.status !== "annullato" && o.status !== "stand_by")
    .slice(0, 5) || [];

  if (isLoading) {
    return (
      <div className="rounded-xl bg-card p-6 shadow-card animate-fade-in">
        <h3 className="text-lg font-semibold text-card-foreground mb-6">Ordini Recenti</h3>
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card p-6 shadow-card animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-card-foreground">Ordini Recenti</h3>
        <a href="/ordini" className="text-sm font-medium text-primary hover:underline">
          Vedi tutti
        </a>
      </div>
      <div className="space-y-4">
        {recentOrders.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nessun ordine</p>
        ) : (
          recentOrders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold text-sm">
                  {(order.clienti?.nome || "?").charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-card-foreground">{order.clienti?.nome || "—"}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.codice} · {formatDate(order.data_ordine, order.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge
                  className={cn(
                    "font-medium",
                    statusConfig[order.status]?.variant === "success" &&
                      "bg-success/10 text-success hover:bg-success/20",
                    statusConfig[order.status]?.variant === "warning" &&
                      "bg-warning/10 text-warning hover:bg-warning/20",
                    statusConfig[order.status]?.variant === "info" &&
                      "bg-info/10 text-info hover:bg-info/20",
                    statusConfig[order.status]?.variant === "destructive" &&
                      "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  )}
                >
                  {statusConfig[order.status]?.label || order.status}
                </Badge>
                <span className="font-semibold text-card-foreground">{formatCurrency(Number(order.totale))}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}