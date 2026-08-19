import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, ArrowDown, Euro, ShoppingCart, Clock } from "lucide-react";
import { formatCurrency } from "./ordiniShared";

interface OrdiniStatsRowProps {
  stats: {
    totale: number;
    inAttesa: number;
    daVerificare: number;
    valoreTotale: number;
  };
  mom?: { variazionePct: number | null };
  isLoading: boolean;
}

/**
 * Striscia sintetica in stile Dashboard: celle piatte divise da una linea
 * sottile, etichetta piccola, numero protagonista, icona in riquadro.
 */
export function OrdiniStatsRow({ stats, mom, isLoading }: OrdiniStatsRowProps) {
  if (isLoading) {
    return <Skeleton className="h-[132px] w-full rounded-xl bg-scatto-surface" />;
  }

  const variazione = mom?.variazionePct ?? null;
  const hasDelta = variazione !== null && Math.abs(variazione) > 0.05;
  const inCrescita = hasDelta && (variazione as number) > 0;

  return (
    <div className="grid grid-cols-1 divide-y divide-scatto-line overflow-hidden rounded-xl border border-scatto-line bg-scatto-surface shadow-[0_1px_2px_hsl(225_18%_9%/0.05)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-sm text-scatto-muted">Valore ordini attivi</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="font-display text-2xl font-bold tracking-tight tabular-nums text-scatto-ink">
              {formatCurrency(stats.valoreTotale)}
            </span>
            {hasDelta && (
              <span
                className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                  inCrescita
                    ? "bg-scatto-success/10 text-scatto-success"
                    : "bg-scatto-danger/10 text-scatto-danger"
                }`}
              >
                {inCrescita ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {Math.abs(variazione as number).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-scatto-muted">Rispetto al mese precedente</p>
        </div>
        <span className="flex-shrink-0 rounded-lg border border-scatto-line p-2.5 text-scatto-muted">
          <Euro className="h-4 w-4" />
        </span>
      </div>

      <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-sm text-scatto-muted">Ordini attivi</p>
          <p className="mt-1 font-display text-2xl font-bold tracking-tight tabular-nums text-scatto-ink">
            {stats.totale}
          </p>
          <p className="mt-1 text-xs text-scatto-muted">Esclusi annullati e stand-by</p>
        </div>
        <span className="flex-shrink-0 rounded-lg border border-scatto-line p-2.5 text-scatto-muted">
          <ShoppingCart className="h-4 w-4" />
        </span>
      </div>

      <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-sm text-scatto-muted">Da verificare</p>
          <p className="mt-1 font-display text-2xl font-bold tracking-tight tabular-nums text-scatto-ink">
            {stats.daVerificare}
          </p>
          <p className="mt-1 text-xs text-scatto-muted">
            {stats.inAttesa > 0 ? `${stats.inAttesa} in attesa` : "Nessun ordine in attesa"}
          </p>
        </div>
        <span className="flex-shrink-0 rounded-lg border border-scatto-line p-2.5 text-scatto-muted">
          <Clock className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}
