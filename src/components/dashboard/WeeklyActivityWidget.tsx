import { Link } from "react-router-dom";
import { BookOpen, Package, Users, Phone, MessageSquare, MapPin, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Attivita Settimanale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover-lift">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Attivita Settimanale
          </CardTitle>
          <Link
            to="/diario"
            className="text-xs text-primary hover:underline"
          >
            Vai al Diario
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{stats?.totalReports || 0}</p>
            <p className="text-xs text-muted-foreground">Report</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{stats?.totalActivities || 0}</p>
            <p className="text-xs text-muted-foreground">Attivita</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{stats?.clientiContattati || 0}</p>
            <p className="text-xs text-muted-foreground">Clienti</p>
          </div>
        </div>

        {/* Activities by type */}
        {stats?.activitiesByType && stats.activitiesByType.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {stats.activitiesByType.slice(0, 5).map(({ tipo, count }) => {
              const Icon = TIPO_ICONS[tipo] || TrendingUp;
              return (
                <Badge key={tipo} variant="secondary" className="text-xs">
                  <Icon className="h-3 w-3 mr-1" />
                  {TIPO_LABELS[tipo] || tipo}: {count}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Orders linked */}
        {(stats?.totalOrders || 0) > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-green-600" />
            <span className="text-muted-foreground">
              {stats?.totalOrders} ordini collegati questa settimana
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
