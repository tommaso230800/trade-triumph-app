import { Link } from "react-router-dom";
import { BellRing, ChevronRight, Plus } from "lucide-react";
import { usePromemoria } from "@/hooks/usePromemoria";
import { gruppoDi, quandoLabel } from "@/lib/promemoria";
import { cn } from "@/lib/utils";

const MAX_RIGHE = 5;

/**
 * Promemoria in Home: tutti quelli ancora da fare, non solo di oggi.
 * Prima gli scaduti, poi in ordine di data, così non se ne perde nessuno.
 */
export function PromemoriaWidget() {
  const { data, isLoading } = usePromemoria();
  if (isLoading) return null;
  const now = new Date();
  const daFare = (data ?? [])
    .filter((p) => p.stato !== "fatto")
    .sort((a, b) => a.data_promemoria.localeCompare(b.data_promemoria));

  if (daFare.length === 0) {
    return (
      <Link
        to="/promemoria?nuovo=1"
        className="flex min-h-11 items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground shadow-card"
      >
        <BellRing className="h-4 w-4 text-primary" />
        Nessun promemoria in sospeso
        <span className="ml-auto inline-flex items-center gap-1 font-medium text-primary">
          <Plus className="h-4 w-4" />
          Nuovo
        </span>
      </Link>
    );
  }

  const conta = { scaduti: 0, oggi: 0, poi: 0 };
  for (const p of daFare) {
    const g = gruppoDi(p, now);
    if (g === "scaduti") conta.scaduti += 1;
    else if (g === "oggi") conta.oggi += 1;
    else conta.poi += 1;
  }
  const sintesi = [
    conta.scaduti > 0 ? `${conta.scaduti} ${conta.scaduti === 1 ? "scaduto" : "scaduti"}` : null,
    conta.oggi > 0 ? `${conta.oggi} oggi` : null,
    conta.poi > 0 ? `${conta.poi} in programma` : null,
  ].filter(Boolean).join(" · ");

  return (
    <section className="rounded-xl border bg-card shadow-card">
      <Link to="/promemoria" className="flex min-h-11 items-center gap-2 px-4 pt-3 pb-1">
        <BellRing className="h-4 w-4 text-primary" />
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Promemoria</h2>
          <p className={cn("text-xs tabular-nums", conta.scaduti > 0 ? "text-destructive" : "text-muted-foreground")}>
            {sintesi}
          </p>
        </div>
        <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
      <ul className="divide-y px-4 pb-2">
        {daFare.slice(0, MAX_RIGHE).map((p) => {
          const scaduto = gruppoDi(p, now) === "scaduti";
          return (
            <li key={p.id}>
              <Link to="/promemoria" className="flex min-h-11 items-center justify-between gap-3 py-2">
                <span className="line-clamp-1 min-w-0 text-sm">{p.titolo}</span>
                <span className={cn("shrink-0 text-xs tabular-nums", scaduto ? "font-medium text-destructive" : "text-muted-foreground")}>
                  {quandoLabel(p.data_promemoria, now)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {daFare.length > MAX_RIGHE && (
        <Link to="/promemoria" className="flex min-h-11 items-center justify-center border-t text-sm font-medium text-primary">
          Vedi tutti ({daFare.length})
        </Link>
      )}
    </section>
  );
}
