import { Link } from "react-router-dom";
import { BookOpen, Package, Users, Phone, MessageSquare, MapPin, TrendingUp, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWeeklyDiaryStats } from "@/hooks/useDashboardWidgets";

const TIPO_LABELS: Record<string, string> = {
  visita: "Visite",
  telefonata: "Telefonate",
  whatsapp: "WhatsApp",
  ordine: "Ordini",
  campioni: "Campioni",
  promo_proposta: "Promo",
  problema: "Problemi",
  recupero_credito: "Recuperi",
};

const TIPO_ICONS: Record<string, React.ElementType> = {
  visita: MapPin,
  telefonata: Phone,
  whatsapp: MessageSquare,
  ordine: Package,
  campioni: Package,
  promo_proposta: TrendingUp,
  problema: TrendingUp,
  recupero_credito: TrendingUp,
};

export function WeeklyActivityWidget() {
  const { data: stats, isLoading } = useWeeklyDiaryStats();

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-card border border-border/50 p-6 shadow-sm animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-4" />
        <div className="h-24 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card border border-border/50 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold text-card-foreground">Attività Settimanale</h3>
        </div>
        <Link to="/diario">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
            Diario
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Main stats - Modern Grid */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="text-center p-4 rounded-xl bg-gradient-to-br from-primary/10 to-transparent">
          <p className="text-2xl font-bold text-primary">{stats?.totalReports || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Report</p>
        </div>
        <div className="text-center p-4 rounded-xl bg-gradient-to-br from-success/10 to-transparent">
          <p className="text-2xl font-bold text-success">{stats?.totalActivities || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Attività</p>
        </div>
        <div className="text-center p-4 rounded-xl bg-gradient-to-br from-info/10 to-transparent">
          <p className="text-2xl font-bold text-info">{stats?.clientiContattati || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Clienti</p>
        </div>
      </div>

      {/* Activities by type */}
      {stats?.activitiesByType && stats.activitiesByType.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stats.activitiesByType.slice(0, 5).map(({ tipo, count }) => {
            const Icon = TIPO_ICONS[tipo] || TrendingUp;
            return (
              <Badge key={tipo} variant="secondary" className="text-xs gap-1.5 py-1">
                <Icon className="h-3 w-3" />
                {TIPO_LABELS[tipo] || tipo}: {count}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Orders linked */}
      {(stats?.totalOrders || 0) > 0 && (
        <div className="flex items-center gap-2 text-sm mt-4 pt-4 border-t border-border/50">
          <Package className="h-4 w-4 text-success" />
          <span className="text-muted-foreground">
            {stats?.totalOrders} ordini collegati questa settimana
          </span>
        </div>
      )}
    </div>
  );
}
