import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  /** Non più mostrata: le card dei numeri sono solo numeri. */
  icon?: LucideIcon;
  label: string;
  value: string;
  delta?: { label: string; direction: "up" | "down" | "flat" };
  caption?: string;
  tone?: "info" | "success" | "warning" | "danger" | "violet";
}

const deltaClass: Record<"up" | "down" | "flat", string> = {
  up: "text-scatto-success",
  down: "text-scatto-danger",
  flat: "text-scatto-muted",
};

const deltaArrow: Record<"up" | "down" | "flat", string> = { up: "↑", down: "↓", flat: "→" };

// Tessera KPI unica per tutta la pagina: label, numero grande, variazione con
// il suo confronto. Niente icone di riempimento: il colore vive solo nella
// variazione (verde/rosso = stato).
export function StatCard({ label, value, delta, caption }: StatCardProps) {
  return (
    <div className="rounded-xl border border-scatto-line bg-scatto-surface p-4 shadow-card">
      <p className="break-words text-xs font-medium text-scatto-muted">{label}</p>
      <p className="mt-2 break-words font-display text-2xl font-bold tracking-tight tabular-nums text-scatto-ink">
        {value}
      </p>
      {(delta || caption) && (
        <p className="mt-1 flex items-center gap-2 text-xs">
          {delta && (
            <span className={cn("inline-flex items-center gap-0.5 font-semibold", deltaClass[delta.direction])}>
              {deltaArrow[delta.direction]} {delta.label}
            </span>
          )}
          {caption && <span className="break-words text-scatto-muted">{caption}</span>}
        </p>
      )}
    </div>
  );
}
