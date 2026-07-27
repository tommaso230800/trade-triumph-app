// Dashboard principale
import { MainLayout } from "@/components/layout/MainLayout";

import { KPICard } from "@/components/dashboard/KPICard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { WeeklyActivityWidget } from "@/components/dashboard/WeeklyActivityWidget";
import { PriorityClientsWidget } from "@/components/dashboard/PriorityClientsWidget";
import { ReorderAlertsWidget } from "@/components/dashboard/ReorderAlertsWidget";
import { useStats } from "@/hooks/useStats";
import { useOrdini } from "@/hooks/useOrdini";
import { useCanvassAttive } from "@/hooks/useCanvass";
import { ShoppingCart, Users, Building2, Euro, TrendingUp, Target, Bell, Phone, Calendar, Mail, Loader2, Tag, AlertTriangle, ArrowRight, BarChart3, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { format, isToday, isTomorrow, parseISO, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { TransparencyBanner } from "@/components/metrics/TransparencyBanner";
import { Skeleton } from "@/components/ui/skeleton";

const statusConfig = {
  completato: { label: "Completato", className: "bg-success/10 text-success" },
  in_attesa: { label: "In Attesa", className: "bg-warning/10 text-warning" },
  spedito: { label: "Spedito", className: "bg-info/10 text-info" },
  annullato: { label: "Annullato", className: "bg-destructive/10 text-destructive" },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

const Index = () => {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: ordini, isLoading: ordiniLoading } = useOrdini();
  const { data: canvassAttive = [] } = useCanvassAttive();

  const recentOrdini = ordini?.slice(0, 5) || [];
  
  // Promozioni in scadenza (entro 7 giorni)
  const today = new Date();
  const promoInScadenza = canvassAttive.filter(c => {
    const dataFine = parseISO(c.data_fine);
    const daysLeft = differenceInDays(dataFine, today);
    return daysLeft >= 0 && daysLeft <= 7;
  });

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Oggi";
    if (isTomorrow(date)) return "Domani";
    return format(date, "dd MMM", { locale: it });
  };

  if (statsLoading) {
    return (
      <MainLayout>
        <div className="space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        <TransparencyBanner scope="dashboard" />
        {/* Header - Modern & Clean */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="space-y-2 animate-fade-in">
            <p className="text-sm font-medium text-primary">Dashboard</p>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              Bentornato! 👋
            </h1>
            <p className="text-muted-foreground max-w-lg">
              Ecco il riepilogo della tua attività commerciale
            </p>
          </div>
          <div className="flex items-center gap-3 animate-fade-in stagger-1">
            <div className="flex items-center gap-2 rounded-full bg-card px-4 py-2 shadow-sm border border-border/50">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {new Date().toLocaleDateString("it-IT", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Alert Promozioni Attive - Glass Effect */}
        {canvassAttive.length > 0 && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/20 p-5 animate-fade-in stagger-1">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 rounded-xl">
                  <Tag className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">
                      {canvassAttive.length} Promozioni Attive
                    </p>
                    {promoInScadenza.length > 0 && (
                      <Badge variant="destructive" className="animate-pulse-soft">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {promoInScadenza.length} in scadenza
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {canvassAttive.slice(0, 2).map(c => c.nome).join(", ")}
                    {canvassAttive.length > 2 && ` +${canvassAttive.length - 2}`}
                  </p>
                </div>
              </div>
              <Link to="/canvass">
                <Button variant="ghost" size="sm" className="gap-2 text-primary">
                  Vedi tutte
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* KPI Grid - Modern Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 animate-fade-in stagger-2">
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

        {/* Charts Row - Clean Design */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-card p-6 shadow-sm border border-border/50 animate-fade-in stagger-3">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold text-card-foreground">Andamento Fatturato</h3>
              </div>
            </div>
            <SalesChart data={stats?.ordiniPerMese || []} type="area" />
          </div>
          <div className="rounded-2xl bg-card p-6 shadow-sm border border-border/50 animate-fade-in stagger-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <ShoppingCart className="h-4 w-4 text-success" />
                </div>
                <h3 className="font-semibold text-card-foreground">Ordini per Mese</h3>
              </div>
            </div>
            <SalesChart data={stats?.ordiniPerMese || []} type="bar" />
          </div>
        </div>

        {/* Secondary KPIs - Compact Row */}
        <div className="grid gap-4 grid-cols-3 animate-fade-in stagger-5">
          <div className="rounded-2xl bg-card p-5 shadow-sm border border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-muted rounded-xl">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tasso Conversione</p>
                <p className="text-xl font-bold">{stats?.tassoConversione || 0}%</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-card p-5 shadow-sm border border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-success/10 rounded-xl">
                <Target className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ordini Completati</p>
                <p className="text-xl font-bold">{stats?.ordiniCompletati || 0}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-card p-5 shadow-sm border border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <Euro className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valore Medio</p>
                <p className="text-xl font-bold">{formatCurrency(stats?.valoremedioOrdine || 0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6">
          {/* Recent Orders - Clean List */}
          <div className="rounded-2xl bg-card p-6 shadow-sm border border-border/50 animate-fade-in stagger-5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold text-card-foreground">Ordini Recenti</h3>
              </div>
              <Link to="/ordini">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
                  Vedi tutti
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            {ordiniLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : recentOrdini.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground">Nessun ordine ancora</p>
                <Link to="/ordini">
                  <Button variant="outline" size="sm" className="mt-4">
                    Crea il primo ordine
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrdini.map((order, index) => (
                  <div
                    key={order.id}
                    className="group flex items-center justify-between rounded-xl bg-muted/30 hover:bg-muted/50 p-4 transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                        {order.clienti?.nome?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-medium text-card-foreground">{order.clienti?.nome || "Cliente"}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.codice} · {format(new Date(order.data_ordine || order.created_at), "dd/MM")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={cn("text-xs", statusConfig[order.status].className)}>
                        {statusConfig[order.status].label}
                      </Badge>
                      <span className="font-semibold text-card-foreground">{formatCurrency(Number(order.totale))}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Bottom Widgets Row */}
        <div className="grid gap-6 lg:grid-cols-3 animate-fade-in stagger-6">
          <ReorderAlertsWidget />
          <PriorityClientsWidget />
          <WeeklyActivityWidget />
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
