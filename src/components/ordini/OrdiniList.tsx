import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, type LucideIcon } from "lucide-react";
import { OrdineCard } from "./OrdineCard";
import { OrdiniTable, type OrdiniTableRow } from "./OrdiniTable";

interface OrdiniListEmptyState {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface OrdiniListProps {
  rows: OrdiniTableRow[];
  showStandByColumns?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyState?: OrdiniListEmptyState;
}

export function OrdiniList({ rows, showStandByColumns, isLoading, isError, onRetry, emptyState }: OrdiniListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 md:hidden">
        <Skeleton className="h-24 w-full rounded-2xl bg-scatto-surface" />
        <Skeleton className="h-24 w-full rounded-2xl bg-scatto-surface" />
        <Skeleton className="h-24 w-full rounded-2xl bg-scatto-surface" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-scatto-line bg-scatto-surface py-12 text-center">
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
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-scatto-line bg-scatto-surface py-12 text-center">
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
    <>
      <div className="space-y-3 md:hidden">
        {rows.map(({ ordine, muted, actions, primaryAction, giorniInStandBy }) => (
          <OrdineCard
            key={ordine.id}
            ordine={ordine}
            muted={muted}
            actions={actions}
            primaryAction={primaryAction}
            giorniInStandBy={giorniInStandBy}
          />
        ))}
      </div>
      <OrdiniTable rows={rows} showStandByColumns={showStandByColumns} />
    </>
  );
}
