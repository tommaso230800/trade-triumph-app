import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type ClientGrowthData = {
  id: string;
  nome: string;
  fatturato: number;
  fatturato_2025: number | null;
};

interface ClientGrowthWidgetProps {
  clienti: ClientGrowthData[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);

export function ClientGrowthWidget({ clienti }: ClientGrowthWidgetProps) {
  // Filter clients with 2025 data and calculate growth
  const clientiConCrescita = clienti
    .filter((c) => c.fatturato_2025 && c.fatturato_2025 > 0)
    .map((c) => ({
      ...c,
      crescitaPercentuale: ((c.fatturato - (c.fatturato_2025 || 0)) / (c.fatturato_2025 || 1)) * 100,
      differenza: c.fatturato - (c.fatturato_2025 || 0),
    }))
    .sort((a, b) => b.crescitaPercentuale - a.crescitaPercentuale);

  const inCrescita = clientiConCrescita.filter((c) => c.crescitaPercentuale > 5);
  const inDecrescita = clientiConCrescita.filter((c) => c.crescitaPercentuale < -5);
  const stabili = clientiConCrescita.filter((c) => c.crescitaPercentuale >= -5 && c.crescitaPercentuale <= 5);

  return (
    <div className="rounded-xl bg-card p-4 lg:p-6 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Confronto vs 2025</h3>
        <div className="flex gap-2 text-xs">
          <span className="flex items-center gap-1 text-success">
            <TrendingUp className="h-3 w-3" /> {inCrescita.length}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Minus className="h-3 w-3" /> {stabili.length}
          </span>
          <span className="flex items-center gap-1 text-destructive">
            <TrendingDown className="h-3 w-3" /> {inDecrescita.length}
          </span>
        </div>
      </div>

      {clientiConCrescita.length === 0 ? (
        <p className="text-center text-muted-foreground py-4 text-sm">
          Nessun cliente con fatturato 2025 registrato
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Top Crescita */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-success flex items-center gap-1">
              <TrendingUp className="h-4 w-4" /> Top Crescita
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {inCrescita.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-success/5 border border-success/20"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{c.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(c.fatturato)} vs {formatCurrency(c.fatturato_2025 || 0)}
                    </p>
                  </div>
                  <span className="text-success font-semibold text-sm flex-shrink-0 ml-2">
                    +{c.crescitaPercentuale.toFixed(0)}%
                  </span>
                </div>
              ))}
              {inCrescita.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Nessun cliente in crescita
                </p>
              )}
            </div>
          </div>

          {/* Top Decrescita */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-destructive flex items-center gap-1">
              <TrendingDown className="h-4 w-4" /> Top Decrescita
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {inDecrescita.slice(-5).reverse().map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-destructive/5 border border-destructive/20"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{c.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(c.fatturato)} vs {formatCurrency(c.fatturato_2025 || 0)}
                    </p>
                  </div>
                  <span className="text-destructive font-semibold text-sm flex-shrink-0 ml-2">
                    {c.crescitaPercentuale.toFixed(0)}%
                  </span>
                </div>
              ))}
              {inDecrescita.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Nessun cliente in decrescita
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
