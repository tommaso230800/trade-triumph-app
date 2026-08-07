import { LucideIcon } from "lucide-react";

export type DashKpiTone = "blu" | "viola" | "verde" | "ambra";

interface DashKpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  deltaPct: number | null;
  tone?: DashKpiTone;
}

/**
 * Identità cromatica per tessera: ogni KPI ha il suo colore semantico
 * (sfondo tenue in sfumatura, pastiglia icona piena, numero in tinta scura).
 * I valori restano token del design system, nessun colore scritto a mano.
 */
const tones: Record<DashKpiTone, { base: string; text: string }> = {
  blu: { base: "var(--scatto-info)", text: "214 72% 32%" },
  viola: { base: "var(--scatto-violet)", text: "258 62% 38%" },
  verde: { base: "var(--scatto-success)", text: "161 84% 20%" },
  ambra: { base: "var(--scatto-warning)", text: "30 88% 32%" },
};

export function DashKpiCard({ label, value, icon: Icon, deltaPct, tone = "blu" }: DashKpiCardProps) {
  const positive = deltaPct !== null && deltaPct >= 0;
  const t = tones[tone];

  return (
    <div
      className="rounded-[20px] border p-4 lg:p-6"
      style={{
        background: `linear-gradient(160deg, hsl(${t.base} / 0.14) 0%, hsl(${t.base} / 0.04) 55%, hsl(var(--scatto-surface)) 100%)`,
        borderColor: `hsl(${t.base} / 0.18)`,
        boxShadow: `0 6px 24px -14px hsl(${t.base} / 0.5)`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `hsl(${t.base})`, color: "hsl(var(--scatto-surface))" }}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span
          className="rounded-full px-2 py-1 text-xs font-semibold tabular-nums"
          style={
            deltaPct === null
              ? { backgroundColor: "hsl(var(--scatto-ink) / 0.05)", color: "hsl(var(--scatto-muted))" }
              : positive
              ? { backgroundColor: "hsl(var(--scatto-success) / 0.14)", color: "hsl(var(--scatto-success))" }
              : { backgroundColor: "hsl(var(--scatto-danger) / 0.14)", color: "hsl(var(--scatto-danger))" }
          }
        >
          {deltaPct === null
            ? "N/D"
            : `${positive ? "+" : "−"}${Math.abs(deltaPct).toFixed(1)}%`}
        </span>
      </div>
      <p
        className="mt-4 text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: `hsl(${t.base} / 0.85)` }}
      >
        {label}
      </p>
      <p
        className="mt-1 font-display text-2xl font-bold tracking-tight tabular-nums lg:text-[32px] lg:leading-[1.1]"
        style={{ color: `hsl(${t.text})` }}
      >
        {value}
      </p>
    </div>
  );
}
