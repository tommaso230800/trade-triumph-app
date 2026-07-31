import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "./kpiShared";

export interface KpiEntityCardItem {
  id: string;
  nome: string;
  fatturato: number;
  facts: string[];
  pct: number;
}

interface KpiEntityCardsProps {
  items: KpiEntityCardItem[];
  emptyLabel: string;
}

// Stessa struttura a card per Aziende/Marchi/Prodotti, ad ogni larghezza:
// niente più tabella HTML con overflow-x-auto, che su iPhone richiedeva
// scroll orizzontale. Il "fatto" è il dato protagonista, il resto sono
// etichette compatte che vanno a capo se non c'entrano, mai tagliate.
export function KpiEntityCards({ items, emptyLabel }: KpiEntityCardsProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-card p-8 text-center text-muted-foreground shadow-card">{emptyLabel}</div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-xl bg-card p-4 shadow-card">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-sm font-semibold text-foreground">{item.nome}</p>
            <p className="flex-shrink-0 font-display text-base font-bold tabular-nums tracking-tight text-foreground">
              {formatCurrency(item.fatturato)}
            </p>
          </div>
          {item.facts.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {item.facts.map((fact, i) => (
                <span key={i}>{fact}</span>
              ))}
            </div>
          )}
          <Progress value={item.pct} className="mt-3 h-1.5" />
        </div>
      ))}
    </div>
  );
}
