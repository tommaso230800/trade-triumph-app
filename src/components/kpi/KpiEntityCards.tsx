import { Progress } from "@/components/ui/progress";
import { SectionCard } from "@/components/dashboard/SectionCard";
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
    return <SectionCard className="p-8 text-center text-scatto-muted">{emptyLabel}</SectionCard>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {items.map((item) => (
        <SectionCard key={item.id} className="p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-sm font-semibold text-scatto-ink">{item.nome}</p>
            <p className="flex-shrink-0 font-display text-base font-bold tabular-nums tracking-tight text-scatto-ink">
              {formatCurrency(item.fatturato)}
            </p>
          </div>
          {item.facts.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-scatto-muted">
              {item.facts.map((fact, i) => (
                <span key={i}>{fact}</span>
              ))}
            </div>
          )}
          <Progress value={item.pct} className="mt-3 h-1.5" />
        </SectionCard>
      ))}
    </div>
  );
}
