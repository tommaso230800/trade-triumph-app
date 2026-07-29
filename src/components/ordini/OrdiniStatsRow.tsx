import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, ArrowDown } from "lucide-react";
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

export function OrdiniStatsRow({ stats, mom, isLoading }: OrdiniStatsRowProps) {
  if (isLoading) {
    return <Skeleton className="h-[132px] w-full rounded-2xl bg-scatto-surface" />;
  }

  const variazione = mom?.variazionePct ?? null;
  const inCrescita = variazione !== null && variazione > 0.05;
  const inCalo = variazione !== null && variazione < -0.05;

  return (
    <div className="overflow-hidden rounded-2xl border border-scatto-line bg-scatto-surface p-5 shadow-[0_1px_2px_rgba(32,20,15,0.05)]">
      <p className="text-[11px] font-bold uppercase tracking-wider text-scatto-muted">Valore ordini attivi</p>
      <div className="-mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-[2.75rem] font-extrabold leading-none tracking-tighter tabular-nums text-scatto-ink lg:text-6xl">
          {formatCurrency(stats.valoreTotale)}
        </p>
        {variazione !== null && (inCrescita || inCalo) && (
          <span
            className={`flex items-center gap-0.5 rounded-full px-2 py-1 text-sm font-bold tabular-nums ${
              inCrescita ? "bg-scatto-success/15 text-scatto-success" : "bg-scatto-danger/15 text-scatto-danger"
            }`}
          >
            {inCrescita ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
            {Math.abs(variazione).toFixed(1)}%
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-1 border-t border-scatto-line pt-3 text-xs text-scatto-muted">
        <span className="font-bold tabular-nums text-scatto-ink">{stats.totale}</span>
        <span>ordini</span>
        <span>·</span>
        <span className="font-bold tabular-nums text-scatto-warning">{stats.inAttesa}</span>
        <span>in attesa</span>
        <span>·</span>
        <span className="font-bold tabular-nums text-scatto-accent">{stats.daVerificare}</span>
        <span>da verificare</span>
      </div>
    </div>
  );
}
