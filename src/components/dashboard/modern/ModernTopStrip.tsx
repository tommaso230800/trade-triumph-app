/**
 * Striscia superiore in stile "shadcn dashboard": tre celle piatte divise da
 * una linea sottile, ognuna con etichetta, numero protagonista, variazione e
 * un micro-grafico. I contenuti restano quelli dell'agente di commercio
 * (fatturato, mese in corso, andamento) — nessuna metrica da e-commerce.
 */

function sparkPath(values: number[], w = 120, h = 40) {
  if (values.length === 0) return "";
  if (values.length === 1) return `M0 ${h / 2} L${w} ${h / 2}`;
  const max = Math.max(...values);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * step;
      const y = h - 2 - ((v - min) / range) * (h - 4);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function Bars({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex h-10 items-end gap-[3px]">
      {values.map((v, i) => (
        <span
          key={i}
          className="w-[5px] rounded-sm bg-scatto-ink/70"
          style={{ height: `${Math.max(6, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

type Cell = {
  label: string;
  sub?: string;
  value: string;
  deltaPct?: number | null;
  deltaLabel?: string;
  series: number[];
  chart: "line" | "bars";
};

export function ModernTopStrip({ cells }: { cells: Cell[] }) {
  return (
    <div className="grid grid-cols-1 divide-y divide-scatto-line overflow-hidden rounded-xl border border-scatto-line bg-scatto-surface shadow-[0_1px_2px_hsl(225_18%_9%/0.05)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {cells.map((c) => {
        const hasDelta = c.deltaPct !== undefined && c.deltaPct !== null && Number.isFinite(c.deltaPct);
        const positive = hasDelta && (c.deltaPct as number) >= 0;
        return (
          <div key={c.label} className="flex items-end justify-between gap-3 p-4 sm:p-5">
            <div className="min-w-0">
              <p className="text-xs text-scatto-muted">{c.label}</p>
              {c.sub && <p className="text-sm font-semibold text-scatto-ink">{c.sub}</p>}
              <p className="mt-2 font-display text-2xl font-bold tracking-tight tabular-nums text-scatto-ink">
                {c.value}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                <span
                  className={`font-semibold tabular-nums ${
                    !hasDelta ? "text-scatto-muted" : positive ? "text-scatto-success" : "text-scatto-danger"
                  }`}
                >
                  {hasDelta ? `${positive ? "+" : "−"}${Math.abs(c.deltaPct as number).toFixed(1)}%` : "N/D"}
                </span>
                {c.deltaLabel && <span className="text-scatto-muted">{c.deltaLabel}</span>}
              </p>
            </div>
            <div className="flex-shrink-0 text-scatto-ink">
              {c.chart === "bars" ? (
                <Bars values={c.series.slice(-10)} />
              ) : (
                <svg viewBox="0 0 120 40" className="h-10 w-[120px]" aria-hidden="true">
                  <path
                    d={sparkPath(c.series)}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
