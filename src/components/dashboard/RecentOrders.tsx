import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const orders = [
  {
    id: "ORD-001",
    client: "Rossi S.r.l.",
    amount: "€ 2.450,00",
    status: "completato",
    date: "Oggi",
  },
  {
    id: "ORD-002",
    client: "Bianchi & Co.",
    amount: "€ 1.890,00",
    status: "in_attesa",
    date: "Ieri",
  },
  {
    id: "ORD-003",
    client: "Verde Distribuzione",
    amount: "€ 5.200,00",
    status: "spedito",
    date: "2 giorni fa",
  },
  {
    id: "ORD-004",
    client: "Tech Solutions",
    amount: "€ 980,00",
    status: "completato",
    date: "3 giorni fa",
  },
  {
    id: "ORD-005",
    client: "Alfa Trading",
    amount: "€ 3.100,00",
    status: "in_attesa",
    date: "5 giorni fa",
  },
];

const statusConfig = {
  completato: { label: "Completato", variant: "success" as const },
  in_attesa: { label: "In Attesa", variant: "warning" as const },
  spedito: { label: "Spedito", variant: "info" as const },
};

export function RecentOrders() {
  return (
    <div className="rounded-xl bg-card p-6 shadow-card animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-card-foreground">Ordini Recenti</h3>
        <a href="/ordini" className="text-sm font-medium text-primary hover:underline">
          Vedi tutti
        </a>
      </div>
      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold text-sm">
                {order.client.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-card-foreground">{order.client}</p>
                <p className="text-sm text-muted-foreground">{order.id} · {order.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge
                className={cn(
                  "font-medium",
                  statusConfig[order.status as keyof typeof statusConfig].variant === "success" &&
                    "bg-success/10 text-success hover:bg-success/20",
                  statusConfig[order.status as keyof typeof statusConfig].variant === "warning" &&
                    "bg-warning/10 text-warning hover:bg-warning/20",
                  statusConfig[order.status as keyof typeof statusConfig].variant === "info" &&
                    "bg-info/10 text-info hover:bg-info/20"
                )}
              >
                {statusConfig[order.status as keyof typeof statusConfig].label}
              </Badge>
              <span className="font-semibold text-card-foreground">{order.amount}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
