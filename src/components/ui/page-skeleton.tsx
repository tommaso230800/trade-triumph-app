import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Sagoma di caricamento che ricalca una pagina tipo dell'app:
 * titolo, riga di KPI e lista. Da usare al posto degli spinner a schermo pieno.
 */
export function PageSkeleton({ kpis = 4, rows = 5, className }: { kpis?: number; rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-6", className)} aria-busy="true" aria-label="Caricamento">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      {kpis > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: kpis }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      )}
      <ListSkeleton rows={rows} />
    </div>
  );
}

/** Sagoma di una lista a righe (cliente/ordine/prodotto). */
export function ListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("divide-y rounded-xl border bg-card", className)} aria-busy="true" aria-label="Caricamento">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
