import { formatCompact, formatCurrency } from "./kpiShared";

interface MonthlyGoalCardProps {
  meseLabel: string;
  fatturatoMese: number;
  obiettivo: number;
}

export function MonthlyGoalCard({ meseLabel, fatturatoMese, obiettivo }: MonthlyGoalCardProps) {
  if (obiettivo <= 0) return null;

  const pct = Math.min((fatturatoMese / obiettivo) * 100, 100);
  const mancano = Math.max(obiettivo - fatturatoMese, 0);

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-display text-sm font-semibold tracking-tight text-foreground">
          🎯 Obiettivo {meseLabel}
        </h2>
        <span className="font-display text-xs font-medium tabular-nums text-muted-foreground">
          {formatCompact(fatturatoMese)} / {formatCompact(obiettivo)}
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {pct.toFixed(0)}% raggiunto
        {mancano > 0 ? ` · mancano ${formatCurrency(mancano)} all'obiettivo` : " · obiettivo raggiunto"}
      </p>
      <p className="mt-1 text-[10.5px] text-muted-foreground/70">
        Obiettivo stimato sulla media del fatturato degli ultimi 12 mesi.
      </p>
    </div>
  );
}
