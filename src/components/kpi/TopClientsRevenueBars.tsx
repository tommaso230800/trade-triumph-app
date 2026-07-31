import { chartColorByIndex, formatCurrency } from "./kpiShared";

interface TopClientsRevenueBarsProps {
  clienti: { id: string; nome: string; fatturato: number }[];
}

export function TopClientsRevenueBars({ clienti }: TopClientsRevenueBarsProps) {
  const top = clienti.slice(0, 5);
  const max = Math.max(1, ...top.map((c) => c.fatturato));

  if (top.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
      <h2 className="mb-3 font-display text-sm font-semibold tracking-tight text-foreground">
        Top clienti per fatturato
      </h2>
      <div className="space-y-3">
        {top.map((c, i) => (
          <div key={c.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-semibold text-foreground">{c.nome}</span>
              <span className="flex-shrink-0 font-display text-sm font-semibold tabular-nums text-foreground">
                {formatCurrency(c.fatturato)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(4, (c.fatturato / max) * 100)}%`,
                  backgroundColor: chartColorByIndex(i),
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
