import { useMemo } from "react";
import { TrendingUp, TrendingDown, AlertCircle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DimensionYoY } from "@/hooks/useKPIYoY";

const fmtEUR = (v: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

interface YoYDimensionPanelProps {
  title: string;
  data: Map<string, DimensionYoY> | undefined;
  names: Map<string, string>;
  yearCurr: number;
  yearPrev: number;
  topN?: number;
}

export function YoYDimensionPanel({ title, data, names, yearCurr, yearPrev, topN = 5 }: YoYDimensionPanelProps) {
  const { growers, decliners, lost, newOnes } = useMemo(() => {
    const arr = Array.from(data?.values() || []);
    const growers = arr
      .filter((d) => d.prev > 0 && d.delta > 0)
      .sort((a, b) => b.deltaPct - a.deltaPct)
      .slice(0, topN);
    const decliners = arr
      .filter((d) => d.prev > 0 && d.curr > 0 && d.delta < 0)
      .sort((a, b) => a.deltaPct - b.deltaPct)
      .slice(0, topN);
    const lost = arr
      .filter((d) => d.prev > 0 && d.curr === 0)
      .sort((a, b) => b.prev - a.prev)
      .slice(0, topN);
    const newOnes = arr
      .filter((d) => d.prev === 0 && d.curr > 0)
      .sort((a, b) => b.curr - a.curr)
      .slice(0, topN);
    return { growers, decliners, lost, newOnes };
  }, [data, topN]);

  const nameOf = (id: string) => names.get(id) || "—";

  const Section = ({
    icon: Icon,
    iconClass,
    heading,
    items,
    mode,
  }: {
    icon: any;
    iconClass: string;
    heading: string;
    items: DimensionYoY[];
    mode: "delta" | "lost" | "new";
  }) => (
    <div className="rounded-lg bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", iconClass)} />
        <h4 className="text-sm font-semibold">{heading}</h4>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">Nessun dato</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate flex-1" title={nameOf(it.id)}>
                {nameOf(it.id)}
              </span>
              {mode === "delta" && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-muted-foreground">
                    {fmtEUR(it.prev)} → {fmtEUR(it.curr)}
                  </span>
                  <Badge
                    className={cn(
                      "shrink-0",
                      it.delta >= 0
                        ? "bg-success/15 text-success hover:bg-success/25"
                        : "bg-destructive/15 text-destructive hover:bg-destructive/25"
                    )}
                  >
                    {it.delta >= 0 ? "+" : ""}
                    {it.deltaPct.toFixed(0)}%
                  </Badge>
                </div>
              )}
              {mode === "lost" && (
                <Badge variant="outline" className="shrink-0 text-destructive border-destructive/40">
                  -{fmtEUR(it.prev)}
                </Badge>
              )}
              {mode === "new" && (
                <Badge variant="outline" className="shrink-0 text-success border-success/40">
                  +{fmtEUR(it.curr)}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="rounded-xl bg-card p-4 lg:p-6 shadow-card space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">
          Confronto {yearCurr} vs {yearPrev}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Section icon={TrendingUp} iconClass="text-success" heading="Top in crescita" items={growers} mode="delta" />
        <Section icon={TrendingDown} iconClass="text-destructive" heading="Top in calo" items={decliners} mode="delta" />
        <Section icon={AlertCircle} iconClass="text-warning" heading="Persi (no ordini)" items={lost} mode="lost" />
        <Section icon={Sparkles} iconClass="text-primary" heading="Nuovi / Riattivati" items={newOnes} mode="new" />
      </div>
    </div>
  );
}
