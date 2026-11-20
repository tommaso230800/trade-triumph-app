import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, ArrowDown, Euro, ShoppingCart } from "lucide-react";
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
    return <Skeleton className="h-24 w-full rounded-xl bg-scatto-surface" />;
  }

  const variazione = mom?.variazionePct ?? null;
  const hasDelta = variazione !== null && Math.abs(variazione) > 0.05;
  const inCrescita = hasDelta && (variazione as number) > 0;

  // Una sola striscia orizzontale, anche su iPhone: valore e numero degli
  // ordini attivi affiancati, separati da una linea sottile.
  return (
    <div className="grid grid-cols-2 divide-x divide-scatto-line overflow-hidden rounded-xl border border-scatto-line bg-scatto-surface shadow-card">
      <div className="min-w-0 p-4 sm:p-6">
        <p className="flex items-center gap-2 text-xs text-scatto-muted">
          <Euro className="hidden h-4 w-4 sm:block" />
          Valore ordini attivi
        </p>
        <p className="mt-1 break-words font-display text-2xl font-bold tracking-tight tabular-nums text-scatto-ink">
          {formatCurrency(stats.valoreTotale)}
        </p>
        {hasDelta && (
          <span
            className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${
              inCrescita ? "text-scatto-success" : "text-scatto-danger"
            }`}
          >
            {inCrescita ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(variazione as number).toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
            <span className="hidden font-normal text-scatto-muted sm:inline">vs mese prec.</span>
          </span>
        )}
      </div>

      <div className="min-w-0 p-4 sm:p-6">
        <p className="flex items-center gap-2 text-xs text-scatto-muted">
          <ShoppingCart className="hidden h-4 w-4 sm:block" />
          Ordini attivi
        </p>
        <p className="mt-1 font-display text-2xl font-bold tracking-tight tabular-nums text-scatto-ink">
          {stats.totale}
        </p>
        <p className="mt-1 hidden text-xs text-scatto-muted sm:block">Esclusi annullati e stand-by</p>
      </div>
    </div>
  );
}
