import { useMemo } from "react";
import { Clock } from "lucide-react";
import { formatCurrency } from "./kpiShared";
import type { AziendaColorMap } from "@/lib/aziendaColor";
import { aziendaColorValue } from "@/lib/aziendaColor";

type Slice = {
  id: string;
  nome: string;
  valore: number;
  /** Variazione % vs periodo di confronto, se disponibile. */
  deltaPct?: number | null;
};

interface RevenueDistributionDialProps {
  titolo?: string;
  totaleLabel?: string;
  totale: number;
  slices: Slice[];
  colorMap: AziendaColorMap;
}

const TICKS = 60;

/**
 * Quadrante a trattini (stile "revenue distribution"): un anello di 60 tacche
 * colorate in proporzione alla quota di ogni fornitore, con il totale al
 * centro e la legenda sotto. Nessun dato inventato: tutte le quote derivano
 * dai valori passati.
 */
export function RevenueDistributionDial({
  titolo = "Ripartizione fatturato",
  totaleLabel = "Fatturato totale",
  totale,
  slices,
  colorMap,
}: RevenueDistributionDialProps) {
  const ordinate = useMemo(
    () => [...slices].filter((s) => s.valore > 0).sort((a, b) => b.valore - a.valore),
    [slices]
  );
  const somma = ordinate.reduce((s, x) => s + x.valore, 0);

  // Assegna a ogni tacca il fornitore corrispondente alla sua posizione
  // cumulata sul cerchio.
  const tickColors = useMemo(() => {
    if (somma <= 0) return Array.from({ length: TICKS }, () => "hsl(var(--scatto-ink) / 0.08)");
    const colors: string[] = [];
    let idx = 0;
    let acc = 0;
    for (let t = 0; t < TICKS; t++) {
      const soglia = ((t + 1) / TICKS) * somma;
      while (idx < ordinate.length - 1 && acc + ordinate[idx].valore < soglia) {
        acc += ordinate[idx].valore;
        idx++;
      }
      colors.push(aziendaColorValue(ordinate[idx].id, colorMap));
    }
    return colors;
  }, [ordinate, somma, colorMap]);

  return (
    <div className="overflow-hidden rounded-2xl border border-scatto-line bg-scatto-surface shadow-[0_1px_2px_hsl(225_18%_9%/0.05)]">
      <div className="flex items-center gap-2 border-b border-scatto-line px-4 py-3 lg:px-6">
        <Clock className="h-4 w-4 text-scatto-muted" />
        <h2 className="font-display text-sm font-semibold tracking-tight text-scatto-ink">{titolo}</h2>
      </div>

      <div className="p-4 lg:p-6">
        <div className="relative mx-auto aspect-square w-full max-w-[280px]">
          <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden="true">
            {tickColors.map((color, i) => {
              const angle = (i / TICKS) * 360 - 90;
              return (
                <line
                  key={i}
                  x1="100"
                  y1="8"
                  x2="100"
                  y2="24"
                  stroke={color}
                  strokeWidth="4"
                  strokeLinecap="round"
                  transform={`rotate(${angle + 90} 100 100)`}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-scatto-muted">
              {totaleLabel}
            </p>
            <p className="mt-1 font-display text-2xl font-bold tracking-tight tabular-nums text-scatto-ink">
              {formatCurrency(totale)}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {ordinate.length === 0 && (
            <p className="text-center text-xs text-scatto-muted">Nessun dato nel periodo selezionato</p>
          )}
          {ordinate.slice(0, 6).map((s) => {
            const quota = somma > 0 ? (s.valore / somma) * 100 : 0;
            const hasDelta = s.deltaPct !== undefined && s.deltaPct !== null && Number.isFinite(s.deltaPct);
            const positive = hasDelta && (s.deltaPct as number) >= 0;
            return (
              <div key={s.id} className="flex items-center gap-3">
                <span
                  className="h-4 w-1.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: aziendaColorValue(s.id, colorMap) }}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-scatto-ink">{s.nome}</span>
                <span className="font-display text-sm font-semibold tabular-nums text-scatto-ink">
                  {formatCurrency(s.valore)}
                </span>
                <span
                  className={`w-16 text-right text-xs font-semibold tabular-nums ${
                    !hasDelta ? "text-scatto-muted" : positive ? "text-scatto-success" : "text-scatto-danger"
                  }`}
                >
                  {hasDelta
                    ? `${positive ? "+" : "−"}${Math.abs(s.deltaPct as number).toFixed(1)}%`
                    : `${quota.toFixed(1)}%`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
