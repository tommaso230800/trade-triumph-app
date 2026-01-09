import { MainLayout } from "@/components/layout/MainLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { useStats } from "@/hooks/useStats";
import { useOrdini } from "@/hooks/useOrdini";
import { usePromemoria } from "@/hooks/usePromemoria";
import { ShoppingCart, Users, Building2, Euro, TrendingUp, Target, Bell, Phone, Calendar, Mail, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { it } from "date-fns/locale";

const statusConfig = {
  completato: { label: "Completato", className: "bg-success/10 text-success hover:bg-success/20" },
  in_attesa: { label: "In Attesa", className: "bg-warning/10 text-warning hover:bg-warning/20" },
  spedito: { label: "Spedito", className: "bg-info/10 text-info hover:bg-info/20" },
  annullato: { label: "Annullato", className: "bg-destructive/10 text-destructive hover:bg-destructive/20" },
};

const tipoIcons = {
  call: Phone,
  email: Mail,
  documento: Calendar,
  scadenza: Calendar,
};

const prioritaColors = {
  alta: "border-l-destructive bg-destructive/5",
  media: "border-l-warning bg-warning/5",
  bassa: "border-l-info bg-info/5",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

const Index = () => {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: ordini, isLoading: ordiniLoading } = useOrdini();
  const { data: promemoria, isLoading: promemoriaLoading } = usePromemoria();

  const recentOrdini = ordini?.slice(0, 5) || [];
  const pendingPromemoria = promemoria?.filter((p) => !p.completato).slice(0, 3) || [];

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Oggi";
    if (isTomorrow(date)) return "Domani";
    return format(date, "dd MMM", { locale: it });
  };

  if (statsLoading) {
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
      <div className="space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="mt-1 text-muted-foreground text-sm lg:text-base">
              Bentornato! Ecco il riepilogo della tua attività.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">Oggi:</span>
            <span className="font-medium text-foreground">
              {new Date().toLocaleDateString("it-IT", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Fatturato Mensile"
            value={formatCurrency(stats?.fatturatoMensile || 0)}
            change={12.5}
            changeLabel="vs mese scorso"
            icon={<Euro className="h-5 w-5 lg:h-6 lg:w-6" />}
            variant="primary"
          />
          <KPICard
            title="Ordini Totali"
            value={stats?.ordiniTotali || 0}
            change={8.2}
            changeLabel="vs mese scorso"
            icon={<ShoppingCart className="h-5 w-5 lg:h-6 lg:w-6" />}
            variant="success"
          />
          <KPICard
            title="Clienti Attivi"
            value={stats?.clientiAttivi || 0}
            change={stats?.clientiNuovi || 0}
            changeLabel="nuovi questo mese"
            icon={<Users className="h-5 w-5 lg:h-6 lg:w-6" />}
            variant="default"
          />
          <KPICard
            title="Aziende Partner"
            value={stats?.aziendePartner || 0}
            icon={<Building2 className="h-5 w-5 lg:h-6 lg:w-6" />}
            variant="default"
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-card p-4 lg:p-6 shadow-card animate-fade-in">
            <h3 className="text-lg font-semibold text-card-foreground mb-4">Andamento Fatturato</h3>
            <SalesChart data={stats?.ordiniPerMese || []} type="area" />
          </div>
          <div className="rounded-xl bg-card p-4 lg:p-6 shadow-card animate-fade-in">
            <h3 className="text-lg font-semibold text-card-foreground mb-4">Ordini per Mese</h3>
            <SalesChart data={stats?.ordiniPerMese || []} type="bar" />
          </div>
        </div>

        {/* Secondary KPIs */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          <KPICard
            title="Tasso Conversione"
            value={`${stats?.tassoConversione || 0}%`}
            icon={<TrendingUp className="h-5 w-5 lg:h-6 lg:w-6" />}
            variant="default"
          />
          <KPICard
            title="Ordini Completati"
            value={stats?.ordiniCompletati || 0}
            icon={<Target className="h-5 w-5 lg:h-6 lg:w-6" />}
            variant="success"
          />
          <KPICard
            title="Valore Medio Ordine"
            value={formatCurrency(stats?.valoremedioOrdine || 0)}
            icon={<Euro className="h-5 w-5 lg:h-6 lg:w-6" />}
            variant="default"
          />
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Orders */}
          <div className="lg:col-span-2 rounded-xl bg-card p-4 lg:p-6 shadow-card animate-fade-in">
            <div className="mb-4 lg:mb-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-card-foreground">Ordini Recenti</h3>
              <Link to="/ordini" className="text-sm font-medium text-primary hover:underline">
                Vedi tutti
              </Link>
            </div>
            {ordiniLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : recentOrdini.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nessun ordine ancora</p>
            ) : (
              <div className="space-y-3">
                {recentOrdini.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-border p-3 lg:p-4 transition-colors hover:bg-muted/50 gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold text-sm">
                        {order.clienti?.nome?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-medium text-card-foreground">{order.clienti?.nome || "Cliente"}</p>
                        <p className="text-xs lg:text-sm text-muted-foreground">
                          {order.codice} · {format(new Date(order.created_at), "dd/MM/yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <Badge className={statusConfig[order.status].className}>
                        {statusConfig[order.status].label}
                      </Badge>
                      <span className="font-semibold text-card-foreground">{formatCurrency(Number(order.totale))}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reminders */}
          <div className="rounded-xl bg-card p-4 lg:p-6 shadow-card animate-fade-in">
            <div className="mb-4 lg:mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-card-foreground">Promemoria</h3>
              </div>
              <Link to="/promemoria" className="text-sm font-medium text-primary hover:underline">
                Vedi tutti
              </Link>
            </div>
            {promemoriaLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : pendingPromemoria.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nessun promemoria</p>
            ) : (
              <div className="space-y-3">
                {pendingPromemoria.map((reminder) => {
                  const Icon = tipoIcons[reminder.tipo];
                  return (
                    <div
                      key={reminder.id}
                      className={cn(
                        "rounded-lg border-l-4 p-3 transition-colors hover:bg-muted/30",
                        prioritaColors[reminder.priorita]
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-muted p-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-card-foreground truncate">{reminder.titolo}</p>
                          <p className="text-xs text-muted-foreground">
                            {getDateLabel(reminder.data)} {reminder.orario && `· ${reminder.orario?.slice(0, 5)}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
