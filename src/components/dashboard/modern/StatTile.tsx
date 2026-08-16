import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { DashCard } from "./DashCard";

/**
 * Card statistica compatta (stile "Total Orders" del template shadcndashboard):
 * etichetta, numero protagonista, badge di variazione, icona in riquadro e
 * link opzionale all'approfondimento.
 */
export function StatTile({
  label,
  value,
  deltaPct,
  icon,
  href,
  hrefLabel = "Vedi statistiche",
  hint,
}: {
  label: string;
  value: string;
  deltaPct?: number | null;
  icon: ReactNode;
  href?: string;
  hrefLabel?: string;
  hint?: string;
}) {
  const hasDelta = deltaPct !== undefined && deltaPct !== null && Number.isFinite(deltaPct);
  const positive = hasDelta && (deltaPct as number) >= 0;

  return (
    <DashCard bodyClassName="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-scatto-muted">{label}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="font-display text-2xl font-bold tracking-tight tabular-nums text-scatto-ink">
              {value}
            </span>
            {hasDelta ? (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                  positive
                    ? "bg-scatto-success/10 text-scatto-success"
                    : "bg-scatto-danger/10 text-scatto-danger"
                }`}
              >
                {positive ? "+" : "−"}
                {Math.abs(deltaPct as number).toFixed(1)}%
              </span>
            ) : (
              <span className="rounded-full bg-scatto-ink/5 px-2 py-0.5 text-xs font-semibold text-scatto-muted">
                N/D
              </span>
            )}
          </div>
          {hint && <p className="mt-1 text-xs text-scatto-muted">{hint}</p>}
        </div>
        <span className="flex-shrink-0 rounded-lg border border-scatto-line p-2.5 text-scatto-muted">{icon}</span>
      </div>

      {href && (
        <Link
          to={href}
          className="inline-flex min-h-[44px] w-fit items-center gap-1.5 rounded-lg border border-scatto-line px-4 text-sm font-medium text-scatto-ink transition-colors hover:bg-scatto-ink/[0.03]"
        >
          {hrefLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </DashCard>
  );
}
