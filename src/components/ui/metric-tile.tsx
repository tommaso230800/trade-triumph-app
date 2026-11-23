import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "default" | "primary" | "success" | "warning" | "danger" | "info";

// Lo stato si mostra con un piccolo pallino colorato, non con un'icona
// (regola unslop: le card dei numeri sono numeri; categorie → pallino di stato).
const toneDot: Record<Tone, string> = {
  default: "",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
};

/**
 * Tessera numerica compatta condivisa (conteggi e totali di supporto in
 * testa alle pagine): etichetta, numero e, opzionale, pallino di stato.
 * Il colore di `tone` va solo sul pallino e comunica uno stato, mai decoro.
 * `icon` resta accettato per compatibilità ma non viene più mostrato.
 * Con `onClick` diventa un filtro toccabile (`active` evidenzia la selezione).
 */
export function MetricTile({
  label,
  value,
  tone = "default",
  hint,
  onClick,
  active,
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  hint?: ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-medium text-muted-foreground">{label}</p>
        {tone !== "default" && <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", toneDot[tone])} />}
      </div>
      <p className="mt-2 break-words font-display text-2xl font-bold tracking-tight tabular-nums text-card-foreground">{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
    </>
  );
  const base = cn(
    "min-w-0 rounded-xl border bg-card p-4 text-left shadow-card",
    active ? "border-primary ring-1 ring-primary/30" : "border-border",
    className,
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={active} className={cn(base, "min-h-11 transition-colors hover:border-primary/50")}>
        {body}
      </button>
    );
  }
  return <div className={base}>{body}</div>;
}
