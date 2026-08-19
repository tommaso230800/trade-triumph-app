import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, type LucideIcon } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { it } from "date-fns/locale";
import type { Ordine } from "@/hooks/useOrdini";
import { OrdineCard } from "./OrdineCard";
import type { OrdiniTableRow } from "./ordiniShared";

const getOrderDate = (ordine: Ordine) => new Date(ordine.data_ordine || ordine.created_at);
const dayKey = (date: Date) => format(date, "yyyy-MM-dd");

// "Oggi 7 agosto" / "Ieri 6 agosto" / "mar 4 agosto" per i giorni più vecchi.
const groupLabel = (date: Date) => {
  const giorno = format(date, "d MMMM", { locale: it });
  if (isToday(date)) return `Oggi ${giorno}`;
  if (isYesterday(date)) return `Ieri ${giorno}`;
  return `${format(date, "EEE", { locale: it })} ${giorno}`;
};

interface OrdiniListEmptyState {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface OrdiniListProps {
  rows: OrdiniTableRow[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyState?: OrdiniListEmptyState;
  /** Modalità selezione multipla: ogni card mostra una casella, il tocco seleziona. */
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  /** Seleziona/deseleziona in blocco tutti gli ordini di un giorno. */
  onToggleDay?: (ids: string[], select: boolean) => void;
}

// Un'unica lista di card ad ogni larghezza (niente tabella desktop separata):
// da 375px a 1440px è lo stesso design, solo le card si ridispongono in più
// colonne quando c'è spazio.
export function OrdiniList({
  rows,
  isLoading,
  isError,
  onRetry,
  emptyState,
  selectionMode,
  selectedIds,
  onToggleSelect,
  onToggleDay,
}: OrdiniListProps) {
  // Righe già ordinate per data_ordine DESC dalla query: giorni uguali sono
  // sempre contigui, quindi un raggruppamento in un solo passaggio basta.
  const groups = useMemo(() => {
    const map = new Map<string, { date: Date; rows: OrdiniTableRow[] }>();
    for (const row of rows) {
      const date = getOrderDate(row.ordine);
      const key = dayKey(date);
      if (!map.has(key)) map.set(key, { date, rows: [] });
      map.get(key)!.rows.push(row);
    }
    return Array.from(map.values());
  }, [rows]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Skeleton className="h-24 w-full rounded-xl bg-scatto-surface" />
        <Skeleton className="h-24 w-full rounded-xl bg-scatto-surface" />
        <Skeleton className="h-24 w-full rounded-xl bg-scatto-surface" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-scatto-line bg-scatto-surface py-12 text-center">
        <AlertCircle className="h-8 w-8 text-scatto-danger" />
        <div>
          <p className="text-sm font-bold text-scatto-ink">Non è stato possibile caricare gli ordini</p>
          <p className="mt-1 text-xs text-scatto-muted">Controlla la connessione e riprova.</p>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            className="border-scatto-accent font-bold text-scatto-accent hover:bg-scatto-accent/10"
            onClick={onRetry}
          >
            Riprova
          </Button>
        )}
      </div>
    );
  }

  if (rows.length === 0 && emptyState) {
    const Icon = emptyState.icon;
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-scatto-line bg-scatto-surface py-12 text-center">
        <Icon className="h-8 w-8 text-scatto-muted" />
        <p className="text-sm font-bold text-scatto-ink">{emptyState.title}</p>
        {emptyState.description && <p className="text-xs text-scatto-muted">{emptyState.description}</p>}
        {emptyState.actionLabel && emptyState.onAction && (
          <Button
            size="sm"
            className="mt-2 bg-scatto-accent font-bold text-white hover:bg-scatto-accent/90"
            onClick={emptyState.onAction}
          >
            {emptyState.actionLabel}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const groupIds = group.rows.map((r) => r.ordine.id);
        const allSelected = selectionMode && groupIds.every((id) => selectedIds?.has(id));
        const someSelected = selectionMode && !allSelected && groupIds.some((id) => selectedIds?.has(id));
        return (
          <div key={dayKey(group.date)} className="space-y-2">
            <div className="flex items-center gap-2.5 px-1">
              {selectionMode && (
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={() => onToggleDay?.(groupIds, !allSelected)}
                  className="h-4 w-4 flex-shrink-0 border-scatto-line data-[state=checked]:border-scatto-accent data-[state=checked]:bg-scatto-accent"
                />
              )}
              <h3 className="flex-shrink-0 whitespace-nowrap text-xs font-bold uppercase tracking-wide text-scatto-ink/70">
                {groupLabel(group.date)}
              </h3>
              <span className="h-px flex-1 bg-scatto-line" />
              <span className="flex-shrink-0 text-xs font-semibold text-scatto-muted">
                {group.rows.length} {group.rows.length === 1 ? "ordine" : "ordini"}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {group.rows.map(({ ordine, muted, actions, primaryAction, giorniInStandBy }) => (
                <OrdineCard
                  key={ordine.id}
                  ordine={ordine}
                  muted={muted}
                  actions={actions}
                  primaryAction={primaryAction}
                  giorniInStandBy={giorniInStandBy}
                  selectionMode={selectionMode}
                  selected={selectedIds?.has(ordine.id)}
                  onToggleSelect={() => onToggleSelect?.(ordine.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
