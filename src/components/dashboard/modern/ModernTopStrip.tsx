/**
 * Striscia superiore in stile "shadcn dashboard": tre celle piatte divise da
 * una linea sottile, ognuna con etichetta, numero protagonista e variazione
 * con il termine di confronto. Niente micro-grafici: il grafico vero è uno. I contenuti restano quelli dell'agente di commercio
 * (fatturato, mese in corso, andamento) — nessuna metrica da e-commerce.
 */

type Cell = {
  label: string;
  sub?: string;
  value: string;
  deltaPct?: number | null;
  deltaLabel?: string;
  /** Non più disegnati: le card dei numeri sono solo numeri (regola unslop). */
  series?: number[];
  chart?: "line" | "bars";
};

export function ModernTopStrip({ cells }: { cells: Cell[] }) {
  return (
    <div className={`grid grid-cols-1 divide-y divide-scatto-line overflow-hidden rounded-xl border border-scatto-line bg-scatto-surface shadow-card sm:divide-x sm:divide-y-0 ${cells.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
      {cells.map((c) => {
        const hasDelta = c.deltaPct !== undefined && c.deltaPct !== null && Number.isFinite(c.deltaPct);
        const positive = hasDelta && (c.deltaPct as number) >= 0;
        return (
          <div key={c.label} className="flex min-w-0 items-end justify-between gap-3 p-4 sm:p-6">
            <div className="min-w-0">
              <p className="text-xs text-scatto-muted">{c.label}</p>
              {c.sub && <p className="text-sm font-semibold text-scatto-ink">{c.sub}</p>}
              <p className="mt-2 font-display text-2xl font-bold tracking-tight tabular-nums text-scatto-ink">
                {c.value}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`font-semibold tabular-nums ${
                    !hasDelta ? "text-scatto-muted" : positive ? "text-scatto-success" : "text-scatto-danger"
                  }`}
                >
                  {hasDelta ? `${positive ? "+" : "−"}${Math.abs(c.deltaPct as number).toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%` : "N/D"}
                </span>
                {c.deltaLabel && <span className="text-scatto-muted">{c.deltaLabel}</span>}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
