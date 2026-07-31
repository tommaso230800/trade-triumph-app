import { formatCompact } from "./kpiShared";

interface BrandRevenueBarsProps {
  brands: { id: string; name: string; fatturato_totale: number }[];
}

export function BrandRevenueBars({ brands }: BrandRevenueBarsProps) {
  const top = brands.slice(0, 5);
  const max = Math.max(1, ...top.map((b) => b.fatturato_totale));

  if (top.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
      <h2 className="mb-3 flex items-center gap-1.5 font-display text-sm font-semibold tracking-tight text-foreground">
        🏷 Fatturato per marchio
      </h2>
      <div className="space-y-3">
        {top.map((b) => (
          <div key={b.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-semibold text-foreground">{b.name}</span>
              <span className="flex-shrink-0 font-display text-sm font-semibold tabular-nums text-foreground">
                {formatCompact(b.fatturato_totale)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max(4, (b.fatturato_totale / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
