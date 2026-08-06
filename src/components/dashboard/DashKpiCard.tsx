import { LucideIcon } from "lucide-react";

interface DashKpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  deltaPct: number | null;
}

/**
 * Card KPI della dashboard: chip icona in alto a sinistra, variazione % in alto
 * a destra (verde/rossa), etichetta maiuscola e numero grande.
 * Se la variazione non è calcolabile mostra "N/D", mai una percentuale finta.
 */
export function DashKpiCard({ label, value, icon: Icon, deltaPct }: DashKpiCardProps) {
  const positive = deltaPct !== null && deltaPct >= 0;
  return (
    <div
      className="rounded-[20px] bg-scatto-surface p-4 lg:p-6"
      style={{ boxShadow: "0 6px 24px -12px hsl(225 18% 9% / 0.18)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-scatto-ink/[0.06] text-scatto-ink">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span
          className={`text-xs font-semibold tabular-nums ${
            deltaPct === null
              ? "text-scatto-muted"
              : positive
              ? "text-scatto-success"
              : "text-scatto-danger"
          }`}
        >
          {deltaPct === null
            ? "N/D"
            : `${positive ? "+" : "−"}${Math.abs(deltaPct).toFixed(1)}%`}
        </span>
      </div>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-scatto-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold tracking-tight tabular-nums text-scatto-ink lg:text-[32px] lg:leading-[1.1]">
        {value}
      </p>
    </div>
  );
}
