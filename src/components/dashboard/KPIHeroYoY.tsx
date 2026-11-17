import { TrendingUp, TrendingDown, Euro, Package, Building2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DimensionYoY } from "@/hooks/useKPIYoY";
import { formatEuroInt, formatNumber } from "@/lib/format";

const fmt = (v: number) =>
  formatEuroInt(v);

interface Props {
  fattCurr: number;
  fattPrev: number;
  delta: number;
  deltaPct: number;
  yearCurr: number;
  yearPrev: number;
  aziendeYoY: Map<string, DimensionYoY>;
  prodottiYoY: Map<string, DimensionYoY>;
  clientiYoY: Map<string, DimensionYoY>;
  aziendeNames: Map<string, string>;
  prodottiNames: Map<string, string>;
  clientiNames: Map<string, string>;
}

function topBy<T>(arr: T[], by: (t: T) => number, asc = false) {
  return [...arr].sort((a, b) => (asc ? by(a) - by(b) : by(b) - by(a)))[0];
}

export function KPIHeroYoY({
  fattCurr, fattPrev, delta, deltaPct, yearCurr, yearPrev,
  aziendeYoY, prodottiYoY, clientiYoY,
  aziendeNames, prodottiNames, clientiNames,
}: Props) {
  const az = Array.from(aziendeYoY.values());
  const pr = Array.from(prodottiYoY.values());
  const cl = Array.from(clientiYoY.values());

  const bestAzienda = topBy(az, x => x.curr);
  const bestProdotto = topBy(pr, x => x.curr);
  const bestCliente = topBy(cl.filter(c => c.prev > 0), x => x.deltaPct);
  const worstCliente = topBy(cl.filter(c => c.prev > 0 && c.curr < c.prev), x => x.deltaPct, true);

  const TrendI = delta >= 0 ? TrendingUp : TrendingDown;
  const trendC = delta >= 0 ? "text-success" : "text-destructive";

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
      {/* YoY totale */}
      <div className="rounded-xl border bg-card p-4 shadow-card">
        <div className="flex items-center gap-2">
          <TrendI className={cn("h-4 w-4", trendC)} />
          <p className="text-xs text-muted-foreground">YoY · {yearCurr} vs {yearPrev}</p>
        </div>
        <p className={cn("text-2xl font-bold tabular-nums mt-1", trendC)}>
          {delta >= 0 ? "+" : ""}{formatNumber(deltaPct, 1)}%
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {fmt(fattCurr)} vs {fmt(fattPrev)}
        </p>
      </div>

      {/* Best azienda */}
      <div className="rounded-xl border bg-card p-4 shadow-card">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <p className="text-xs text-muted-foreground">Azienda top</p>
        </div>
        {bestAzienda ? (
          <>
            <p className="text-sm font-bold mt-1 truncate">{aziendeNames.get(bestAzienda.id) || "—"}</p>
            <p className="text-base font-bold tabular-nums">{fmt(bestAzienda.curr)}</p>
            <p className={cn("text-xs", bestAzienda.deltaPct >= 0 ? "text-success" : "text-destructive")}>
              {bestAzienda.prev > 0 ? `${bestAzienda.deltaPct >= 0 ? "+" : ""}${formatNumber(bestAzienda.deltaPct, 1)}% YoY` : "nuova"}
            </p>
          </>
        ) : <p className="text-sm text-muted-foreground mt-2">—</p>}
      </div>

      {/* Best prodotto */}
      <div className="rounded-xl border bg-card p-4 shadow-card">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <p className="text-xs text-muted-foreground">Prodotto top</p>
        </div>
        {bestProdotto ? (
          <>
            <p className="text-sm font-bold mt-1 truncate">{prodottiNames.get(bestProdotto.id) || "—"}</p>
            <p className="text-base font-bold tabular-nums">{fmt(bestProdotto.curr)}</p>
            <p className={cn("text-xs", bestProdotto.deltaPct >= 0 ? "text-success" : "text-destructive")}>
              {bestProdotto.prev > 0 ? `${bestProdotto.deltaPct >= 0 ? "+" : ""}${formatNumber(bestProdotto.deltaPct, 1)}% YoY` : "nuovo"}
            </p>
          </>
        ) : <p className="text-sm text-muted-foreground mt-2">—</p>}
      </div>

      {/* Cliente in crescita */}
      <div className="rounded-xl border bg-card p-4 shadow-card">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-success" />
          <p className="text-xs text-muted-foreground">Cliente in crescita</p>
        </div>
        {bestCliente ? (
          <>
            <p className="text-sm font-bold mt-1 truncate">{clientiNames.get(bestCliente.id) || "—"}</p>
            <p className="text-base font-bold tabular-nums text-success">+{formatNumber(bestCliente.deltaPct, 1)}%</p>
            <p className="text-xs text-muted-foreground">{fmt(bestCliente.curr)} vs {fmt(bestCliente.prev)}</p>
          </>
        ) : <p className="text-sm text-muted-foreground mt-2">—</p>}
      </div>

      {/* Cliente in calo */}
      <div className="rounded-xl border bg-card p-4 shadow-card">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-destructive" />
          <p className="text-xs text-muted-foreground">Cliente in calo</p>
        </div>
        {worstCliente ? (
          <>
            <p className="text-sm font-bold mt-1 truncate">{clientiNames.get(worstCliente.id) || "—"}</p>
            <p className="text-base font-bold tabular-nums text-destructive">{formatNumber(worstCliente.deltaPct, 1)}%</p>
            <p className="text-xs text-muted-foreground">{fmt(worstCliente.curr)} vs {fmt(worstCliente.prev)}</p>
          </>
        ) : <p className="text-sm text-muted-foreground mt-2">—</p>}
      </div>
    </div>
  );
}
