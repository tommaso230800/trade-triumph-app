import { Euro, ShoppingCart, Package, Box, TrendingUp, Percent } from "lucide-react";
import { formatCompact, formatCurrency, formatNumberIT } from "./kpiShared";

interface KPITilesProps {
  fatturatoTotale: number;
  ordiniTotali: number;
  pezziTotali: number;
  cartoniTotali: number;
  scontrinoMedio: number;
  marginePercentuale: number;
}

export function KPITiles({
  fatturatoTotale,
  ordiniTotali,
  pezziTotali,
  cartoniTotali,
  scontrinoMedio,
  marginePercentuale,
}: KPITilesProps) {
  const tiles = [
    { label: "Fatturato totale", value: formatCompact(fatturatoTotale), icon: Euro },
    { label: "Ordini", value: formatNumberIT(ordiniTotali), icon: ShoppingCart },
    { label: "Pezzi totali", value: formatNumberIT(pezziTotali), icon: Package },
    { label: "Cartoni", value: formatNumberIT(cartoniTotali), icon: Box },
    { label: "Scontrino medio", value: formatCurrency(scontrinoMedio), icon: TrendingUp },
    { label: "Margine", value: `${marginePercentuale.toFixed(1)}%`, icon: Percent },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="flex items-center justify-between gap-2 rounded-2xl border border-border/50 bg-card p-4 shadow-sm"
        >
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-muted-foreground">{t.label}</p>
            <p className="mt-1 truncate font-display text-lg font-bold tabular-nums tracking-tight text-foreground">
              {t.value}
            </p>
          </div>
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <t.icon className="h-4 w-4" />
          </div>
        </div>
      ))}
    </div>
  );
}
