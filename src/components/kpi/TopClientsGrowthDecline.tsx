import { formatCurrency } from "./kpiShared";

interface ClienteVariazione {
  id: string;
  nome: string;
  fatturato: number;
  fatturato_2025: number | null;
  variazionePct: number;
}

interface TopClientsGrowthDeclineProps {
  crescita: ClienteVariazione[];
  calo: ClienteVariazione[];
}

function ClientRow({ rank, c, positive }: { rank: number; c: ClienteVariazione; positive: boolean }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-border/50 py-2.5 last:border-b-0">
      <span className="w-4 flex-shrink-0 font-display text-xs font-bold text-muted-foreground">{rank}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{c.nome}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {formatCurrency(c.fatturato)} vs {formatCurrency(c.fatturato_2025 || 0)}
        </p>
      </div>
      <span
        className={`flex-shrink-0 rounded-md px-2 py-0.5 font-display text-xs font-bold ${
          positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
        }`}
      >
        {positive ? "+" : ""}
        {c.variazionePct.toFixed(0)}%
      </span>
    </div>
  );
}

export function TopClientsGrowthDecline({ crescita, calo }: TopClientsGrowthDeclineProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
        <h2 className="mb-1 font-display text-sm font-semibold tracking-tight text-success">↗ Top 5 in crescita</h2>
        {crescita.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">Nessun cliente in crescita significativa.</p>
        ) : (
          crescita.slice(0, 5).map((c, i) => <ClientRow key={c.id} rank={i + 1} c={c} positive />)
        )}
      </div>
      <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
        <h2 className="mb-1 font-display text-sm font-semibold tracking-tight text-destructive">↘ Top 5 in calo</h2>
        {calo.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">Nessun cliente in calo significativo.</p>
        ) : (
          calo.slice(0, 5).map((c, i) => <ClientRow key={c.id} rank={i + 1} c={c} positive={false} />)
        )}
      </div>
    </div>
  );
}
