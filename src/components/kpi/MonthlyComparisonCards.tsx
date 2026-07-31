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

// Un'unica struttura a griglia per mobile e desktop (stesso markup, nessun
// blocco duplicato nascosto via CSS): solo dimensioni/spaziature si adattano,
// niente tabella HTML che richieda scroll orizzontale su iPhone.
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
      <div className="grid grid-cols-[1fr_1.2fr_1.2fr_1.2fr] gap-1 bg-muted/40 px-3 py-2 text-[9.5px] font-semibold uppercase tracking-wide text-muted-foreground sm:gap-2 sm:px-4 sm:py-2.5 sm:text-[10.5px]">
        <span>Mese</span>
        <span className="text-right">{yearPrev}</span>
        <span className="text-right">{yearCurr}</span>
        <span className="text-right">Diff.</span>
      </div>
      {rows.map((r) => (
        <div
          key={r.mese}
          className="grid grid-cols-[1fr_1.2fr_1.2fr_1.2fr] gap-1 border-t border-border/50 px-3 py-2 text-[11px] sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
        >
          <span className="truncate font-medium text-foreground">{r.mese}</span>
          <span className="text-right tabular-nums text-muted-foreground">
            {r.prev > 0 ? formatCurrency(r.prev) : "N/D"}
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
      <div className="grid grid-cols-[1fr_1.2fr_1.2fr_1.2fr] gap-1 border-t-2 border-border bg-muted/40 px-3 py-2.5 text-[11px] font-bold sm:gap-2 sm:px-4 sm:py-3 sm:text-sm">
        <span className="font-display">TOTALE</span>
        <span className="text-right tabular-nums text-muted-foreground">
          {totPrev > 0 ? formatCurrency(totPrev) : "N/D"}
        </span>
        <span className="text-right tabular-nums">{formatCurrency(totCurr)}</span>
        <span className={`text-right tabular-nums ${totDelta >= 0 ? "text-success" : "text-destructive"}`}>
          {totPrev > 0 ? `${totDelta >= 0 ? "+" : ""}${formatCurrency(totDelta)}` : "—"}
        </span>
      </div>
    </div>
  );
}
