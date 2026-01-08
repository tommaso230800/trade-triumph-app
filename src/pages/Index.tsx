import { MainLayout } from "@/components/layout/MainLayout";
import { KPICard } from "@/components/dashboard/KPICard";
import { RecentOrders } from "@/components/dashboard/RecentOrders";
import { UpcomingReminders } from "@/components/dashboard/UpcomingReminders";
import { ShoppingCart, Users, Building2, Euro, TrendingUp, Target } from "lucide-react";

const Index = () => {
  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="mt-1 text-muted-foreground">
              Bentornato! Ecco il riepilogo della tua attività.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
            <span className="text-sm text-muted-foreground">Oggi:</span>
            <span className="font-medium text-foreground">
              {new Date().toLocaleDateString("it-IT", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Fatturato Mensile"
            value="€ 45.230"
            change={12.5}
            changeLabel="vs mese scorso"
            icon={<Euro className="h-6 w-6" />}
            variant="primary"
          />
          <KPICard
            title="Ordini Totali"
            value="128"
            change={8.2}
            changeLabel="vs mese scorso"
            icon={<ShoppingCart className="h-6 w-6" />}
            variant="success"
          />
          <KPICard
            title="Clienti Attivi"
            value="47"
            change={3.1}
            changeLabel="nuovi questo mese"
            icon={<Users className="h-6 w-6" />}
            variant="default"
          />
          <KPICard
            title="Aziende Partner"
            value="12"
            change={0}
            changeLabel="invariato"
            icon={<Building2 className="h-6 w-6" />}
            variant="default"
          />
        </div>

        {/* Secondary KPIs */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <KPICard
            title="Tasso Conversione"
            value="68%"
            change={5.3}
            icon={<TrendingUp className="h-6 w-6" />}
            variant="default"
          />
          <KPICard
            title="Obiettivo Mensile"
            value="78%"
            change={2.1}
            icon={<Target className="h-6 w-6" />}
            variant="warning"
          />
          <KPICard
            title="Valore Medio Ordine"
            value="€ 353"
            change={-2.4}
            icon={<Euro className="h-6 w-6" />}
            variant="default"
          />
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentOrders />
          </div>
          <div>
            <UpcomingReminders />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
