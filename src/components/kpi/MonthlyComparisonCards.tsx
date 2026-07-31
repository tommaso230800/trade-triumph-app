import { formatCurrency } from "./kpiShared";

interface MonthRow {
  mese: string;
  curr: number;
  prev: number;
  delta: number;
}

interface MonthlyComparisonCardsProps {
  data: MonthRow[];
  yearCurr: number;
  yearPrev: number;
}

export function MonthlyComparisonCards({ data, yearCurr, yearPrev }: MonthlyComparisonCardsProps) {
  // Solo i mesi già trascorsi quest'anno: un mese futuro (curr = 0) non ha
  // un vero confronto da mostrare, mostrarlo con un delta calcolato sul solo
  // valore dell'anno precedente sarebbe fuorviante (sembrerebbe un calo reale).
  const rows = data.filter((r) => r.curr > 0);
  if (rows.length === 0) return null;

  const totCurr = rows.reduce((s, r) => s + r.curr, 0);
  const totPrev = rows.reduce((s, r) => s + r.prev, 0);
  const totDelta = totCurr - totPrev;

  return (
    <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
      {/* Desktop: tabella */}
      <div className="hidden md:block">
        <div className="grid grid-cols-4 bg-muted/40 px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Mese</span>
          <span className="text-right">{yearPrev}</span>
          <span className="text-right">{yearCurr}</span>
          <span className="text-right">Diff.</span>
        </div>
        {rows.map((r) => (
          <div key={r.mese} className="grid grid-cols-4 border-t border-border/50 px-4 py-2.5 text-sm">
            <span className="font-medium text-foreground">{r.mese}</span>
            <span className="text-right tabular-nums text-muted-foreground">
              {r.prev > 0 ? formatCurrency(r.prev) : "—"}
            </span>
            <span className="text-right tabular-nums text-foreground">{r.curr > 0 ? formatCurrency(r.curr) : "—"}</span>
            <span
              className={`text-right font-semibold tabular-nums ${
                r.delta >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {r.prev > 0 ? `${r.delta >= 0 ? "+" : ""}${formatCurrency(r.delta)}` : "—"}
            </span>
          </div>
        ))}
        <div className="grid grid-cols-4 border-t-2 border-border bg-muted/40 px-4 py-3 text-sm font-bold">
          <span className="font-display">TOTALE</span>
          <span className="text-right tabular-nums text-muted-foreground">{formatCurrency(totPrev)}</span>
          <span className="text-right tabular-nums">{formatCurrency(totCurr)}</span>
          <span className={`text-right tabular-nums ${totDelta >= 0 ? "text-success" : "text-destructive"}`}>
            {totDelta >= 0 ? "+" : ""}
            {formatCurrency(totDelta)}
          </span>
        </div>
      </div>

      {/* Mobile: card per mese */}
      <div className="divide-y divide-border/50 md:hidden">
        {rows.map((r) => (
          <div key={r.mese} className="flex items-center justify-between gap-3 p-4">
            <span className="font-semibold text-foreground">{r.mese}</span>
            <div className="text-right">
              <p className="font-display text-sm font-bold tabular-nums text-foreground">
                {r.curr > 0 ? formatCurrency(r.curr) : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {r.prev > 0 ? `vs ${formatCurrency(r.prev)}` : "nessun confronto"}
              </p>
            </div>
            <span
              className={`flex-shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${
                r.delta >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              }`}
            >
              {r.prev > 0 ? `${r.delta >= 0 ? "+" : ""}${formatCurrency(r.delta)}` : "—"}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 bg-muted/40 p-4">
          <span className="font-display font-bold text-foreground">TOTALE</span>
          <p className="font-display text-sm font-bold tabular-nums text-foreground">{formatCurrency(totCurr)}</p>
          <span
            className={`flex-shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${
              totDelta >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            }`}
          >
            {totDelta >= 0 ? "+" : ""}
            {formatCurrency(totDelta)}
          </span>
        </div>
      </div>
    </div>
  );
}
