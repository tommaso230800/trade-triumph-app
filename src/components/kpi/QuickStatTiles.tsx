import type { LucideIcon } from "lucide-react";
import { formatNumber } from "@/lib/format";

export type QuickStat = {
  label: string;
  value: string;
  caption?: string;
  /** Variazione mostrata come pillola verde/rossa. */
  deltaPct?: number | null;
  /** Non più mostrata: le card dei numeri sono solo numeri. */
  icon?: LucideIcon;
};

/**
 * Riga di tessere sintetiche in stile dashboard analytics: etichetta piccola,
 * numero protagonista e variazione. Niente icone di riempimento.
 */
export function QuickStatTiles({ stats }: { stats: QuickStat[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => {
        const hasDelta = s.deltaPct !== undefined && s.deltaPct !== null && Number.isFinite(s.deltaPct);
        const positive = hasDelta && (s.deltaPct as number) >= 0;
        return (
          <div
            key={s.label}
            className="rounded-xl border border-scatto-line bg-scatto-surface p-4 shadow-card"
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
                      className={`rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${
                        positive ? "bg-scatto-success/10 text-scatto-success" : "bg-scatto-danger/10 text-scatto-danger"
                      }`}
                    >
                      {positive ? "+" : "−"}
                      {formatNumber(Math.abs(s.deltaPct as number), 1)}%
                    </span>
                  )}
                </div>
                {s.caption && <p className="mt-1 truncate text-xs text-scatto-muted">{s.caption}</p>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
