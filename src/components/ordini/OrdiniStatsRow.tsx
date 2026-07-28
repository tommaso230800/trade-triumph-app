import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "./ordiniShared";

interface OrdiniStatsRowProps {
  stats: {
    totale: number;
    inAttesa: number;
    completati: number;
    valoreTotale: number;
  };
  isLoading: boolean;
}

export function OrdiniStatsRow({ stats, isLoading }: OrdiniStatsRowProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-[92px] w-full rounded-2xl lg:h-[104px]" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-[72px] rounded-2xl" />
          <Skeleton className="h-[72px] rounded-2xl" />
          <Skeleton className="h-[72px] rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Dato protagonista */}
      <Card className="p-4 lg:p-6">
        <p className="text-xs text-muted-foreground">Valore ordini attivi</p>
        <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums text-card-foreground lg:text-4xl">
          {formatCurrency(stats.valoreTotale)}
        </p>
      </Card>

      {/* Dati di supporto */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 lg:p-4">
          <p className="text-xs text-muted-foreground">Ordini</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-card-foreground lg:text-2xl">
            {stats.totale}
          </p>
        </Card>
        <Card className="p-3 lg:p-4">
          <p className="text-xs text-muted-foreground">In attesa</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-warning lg:text-2xl">
            {stats.inAttesa}
          </p>
        </Card>
        <Card className="p-3 lg:p-4">
          <p className="text-xs text-muted-foreground">Completati</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-success lg:text-2xl">
            {stats.completati}
          </p>
        </Card>
      </div>
    </div>
  );
}
