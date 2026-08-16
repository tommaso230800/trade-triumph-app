import type { LucideIcon } from "lucide-react";

export type QuickStat = {
  label: string;
  value: string;
  caption?: string;
  /** Variazione mostrata come pillola verde/rossa. */
  deltaPct?: number | null;
  icon: LucideIcon;
};

/**
 * Riga di tessere sintetiche in stile dashboard analytics: etichetta piccola,
 * numero protagonista, pillola di variazione e icona in un riquadro chiaro.
 */
export function QuickStatTiles({ stats }: { stats: QuickStat[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => {
        const hasDelta = s.deltaPct !== undefined && s.deltaPct !== null && Number.isFinite(s.deltaPct);
        const positive = hasDelta && (s.deltaPct as number) >= 0;
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="rounded-2xl border border-scatto-line bg-scatto-surface p-4 shadow-[0_6px_24px_-14px_hsl(225_18%_9%/0.16)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-scatto-muted">{s.label}</p>
                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                  <span className="font-display text-2xl font-bold tracking-tight tabular-nums text-scatto-ink">
                    {s.value}
                  </span>
                  {hasDelta && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                        positive ? "bg-scatto-success/10 text-scatto-success" : "bg-scatto-danger/10 text-scatto-danger"
                      }`}
                    >
                      {positive ? "+" : "−"}
                      {Math.abs(s.deltaPct as number).toFixed(1)}%
                    </span>
                  )}
                </div>
                {s.caption && <p className="mt-1 truncate text-xs text-scatto-muted">{s.caption}</p>}
              </div>
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-scatto-line bg-scatto-bg text-scatto-ink">
                <Icon className="h-4 w-4" />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
