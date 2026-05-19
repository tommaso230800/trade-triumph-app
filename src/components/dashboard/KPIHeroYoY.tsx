import { TrendingUp, TrendingDown, Euro, Package, Building2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DimensionYoY } from "@/hooks/useKPIYoY";

const fmt = (v: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

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
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-5 animate-fade-in">
      {/* YoY totale */}
      <div className="rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30 p-4 shadow-card">
        <div className="flex items-center gap-2">
          <TrendI className={cn("h-4 w-4", trendC)} />
          <p className="text-xs text-muted-foreground">YoY · {yearCurr} vs {yearPrev}</p>
        </div>
        <p className={cn("text-2xl font-bold mt-1", trendC)}>
          {delta >= 0 ? "+" : ""}{deltaPct.toFixed(1)}%
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {fmt(fattCurr)} vs {fmt(fattPrev)}
        </p>
      </div>

      {/* Best azienda */}
      <div className="rounded-xl bg-card p-4 shadow-card">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <p className="text-xs text-muted-foreground">Azienda top</p>
        </div>
        {bestAzienda ? (
          <>
            <p className="text-sm font-bold mt-1 truncate">{aziendeNames.get(bestAzienda.id) || "—"}</p>
            <p className="text-base font-bold text-primary">{fmt(bestAzienda.curr)}</p>
            <p className={cn("text-[11px]", bestAzienda.deltaPct >= 0 ? "text-success" : "text-destructive")}>
              {bestAzienda.prev > 0 ? `${bestAzienda.deltaPct >= 0 ? "+" : ""}${bestAzienda.deltaPct.toFixed(1)}% YoY` : "nuova"}
            </p>
          </>
        ) : <p className="text-sm text-muted-foreground mt-2">—</p>}
      </div>

      {/* Best prodotto */}
      <div className="rounded-xl bg-card p-4 shadow-card">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <p className="text-xs text-muted-foreground">Prodotto top</p>
        </div>
        {bestProdotto ? (
          <>
            <p className="text-sm font-bold mt-1 truncate">{prodottiNames.get(bestProdotto.id) || "—"}</p>
            <p className="text-base font-bold text-primary">{fmt(bestProdotto.curr)}</p>
            <p className={cn("text-[11px]", bestProdotto.deltaPct >= 0 ? "text-success" : "text-destructive")}>
              {bestProdotto.prev > 0 ? `${bestProdotto.deltaPct >= 0 ? "+" : ""}${bestProdotto.deltaPct.toFixed(1)}% YoY` : "nuovo"}
            </p>
          </>
        ) : <p className="text-sm text-muted-foreground mt-2">—</p>}
      </div>

      {/* Cliente in crescita */}
      <div className="rounded-xl bg-gradient-to-br from-success/15 to-success/5 border border-success/30 p-4 shadow-card">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-success" />
          <p className="text-xs text-muted-foreground">Cliente in crescita</p>
        </div>
        {bestCliente ? (
          <>
            <p className="text-sm font-bold mt-1 truncate">{clientiNames.get(bestCliente.id) || "—"}</p>
            <p className="text-base font-bold text-success">+{bestCliente.deltaPct.toFixed(1)}%</p>
            <p className="text-[11px] text-muted-foreground">{fmt(bestCliente.curr)} vs {fmt(bestCliente.prev)}</p>
          </>
        ) : <p className="text-sm text-muted-foreground mt-2">—</p>}
      </div>

      {/* Cliente in calo */}
      <div className="rounded-xl bg-gradient-to-br from-destructive/15 to-destructive/5 border border-destructive/30 p-4 shadow-card">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-destructive" />
          <p className="text-xs text-muted-foreground">Cliente in calo</p>
        </div>
        {worstCliente ? (
          <>
            <p className="text-sm font-bold mt-1 truncate">{clientiNames.get(worstCliente.id) || "—"}</p>
            <p className="text-base font-bold text-destructive">{worstCliente.deltaPct.toFixed(1)}%</p>
            <p className="text-[11px] text-muted-foreground">{fmt(worstCliente.curr)} vs {fmt(worstCliente.prev)}</p>
          </>
        ) : <p className="text-sm text-muted-foreground mt-2">—</p>}
      </div>
    </div>
  );
}
