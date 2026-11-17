import { Link } from "react-router-dom";
import { BellRing, ChevronRight } from "lucide-react";
import { usePromemoria } from "@/hooks/usePromemoria";
import { gruppoDi, quandoLabel } from "@/lib/promemoria";
import { cn } from "@/lib/utils";

/**
 * Promemoria scaduti e di oggi in Home. Non compare se non c'è niente da fare
 * oggi: niente rumore in dashboard.
 */
export function PromemoriaWidget() {
  const { data } = usePromemoria();
  const now = new Date();
  const urgenti = (data ?? []).filter((p) => {
    const g = gruppoDi(p, now);
    return g === "scaduti" || g === "oggi";
  });
  if (urgenti.length === 0) return null;
  const scaduti = urgenti.filter((p) => gruppoDi(p, now) === "scaduti").length;

  return (
    <section className="rounded-xl border bg-card shadow-card">
      <Link to="/promemoria" className="flex min-h-11 items-center gap-2 px-4 pt-3 pb-1">
        <BellRing className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold">Promemoria</h2>
        <span className="text-sm text-muted-foreground tabular-nums">
          {scaduti > 0 ? `${scaduti} scaduti · ` : ""}{urgenti.length} per oggi
        </span>
        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
      </Link>
      <ul className="divide-y px-4 pb-2">
        {urgenti.slice(0, 3).map((p) => {
          const scaduto = new Date(p.data_promemoria).getTime() < now.getTime();
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
    </section>
  );
}
