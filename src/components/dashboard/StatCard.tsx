import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: { label: string; direction: "up" | "down" | "flat" };
  caption?: string;
  tone?: "info" | "success" | "warning" | "danger" | "violet";
}

const toneIconClass: Record<NonNullable<StatCardProps["tone"]>, string> = {
  info: "text-scatto-info",
  success: "text-scatto-success",
  warning: "text-scatto-warning",
  danger: "text-scatto-danger",
  violet: "text-scatto-violet",
};

const deltaClass: Record<"up" | "down" | "flat", string> = {
  up: "text-scatto-success",
  down: "text-scatto-danger",
  flat: "text-scatto-muted",
};

const deltaArrow: Record<"up" | "down" | "flat", string> = { up: "↑", down: "↓", flat: "→" };

// Tessera KPI unica per tutta la pagina: icona piccola tinteggiata, label,
// numero grande, badge di variazione. Niente sfondo colorato pieno — il
// colore vive solo su icona e badge, come nelle reference.
export function StatCard({ icon: Icon, label, value, delta, caption, tone = "info" }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-scatto-line bg-scatto-surface p-4 shadow-[0_6px_24px_-14px_hsl(225_18%_9%/0.16)]">
      <div className="flex items-center gap-2">
        <span className={cn("flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-scatto-ink/[0.05]", toneIconClass[tone])}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="truncate text-xs font-medium text-scatto-muted">{label}</p>
      </div>
      <p className="mt-2.5 truncate font-display text-2xl font-bold tabular-nums tracking-tight text-scatto-ink">
        {value}
      </p>
      {(delta || caption) && (
        <p className="mt-1 flex items-center gap-1.5 text-[11px]">
          {delta && (
            <span className={cn("inline-flex items-center gap-0.5 font-semibold", deltaClass[delta.direction])}>
              {deltaArrow[delta.direction]} {delta.label}
            </span>
          )}
          {caption && <span className="truncate text-scatto-muted">{caption}</span>}
        </p>
      )}
    </div>
  );
}
