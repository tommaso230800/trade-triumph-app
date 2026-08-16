export type RangePreset = "7d" | "30d" | "90d" | "1y";

export const rangeLabels: Record<RangePreset, string> = {
  "7d": "7G",
  "30d": "30G",
  "90d": "90G",
  "1y": "1A",
};

export const rangeDescriptions: Record<RangePreset, string> = {
  "7d": "Ultimi 7 giorni",
  "30d": "Ultimi 30 giorni",
  "90d": "Ultimi 90 giorni",
  "1y": "Ultimi 12 mesi",
};

/** Giorni indietro (oggi incluso) per ogni preset. */
export const rangeDays: Record<RangePreset, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
};

interface PeriodRangeTabsProps {
  value: RangePreset | null;
  onChange: (v: RangePreset) => void;
  className?: string;
}

/** Selettore compatto 7G / 30G / 90G / 1A (finestre rolling che finiscono oggi). */
export function PeriodRangeTabs({ value, onChange, className }: PeriodRangeTabsProps) {
  return (
    <div className={`inline-flex rounded-xl bg-scatto-ink/[0.06] p-1 ${className || ""}`}>
      {(Object.keys(rangeLabels) as RangePreset[]).map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          title={rangeDescriptions[r]}
          aria-pressed={value === r}
          className={`min-h-[36px] rounded-lg px-3 text-xs font-semibold transition-colors ${
            value === r
              ? "bg-scatto-surface text-scatto-ink shadow-[0_2px_6px_-3px_hsl(225_18%_9%/0.4)]"
              : "text-scatto-muted hover:text-scatto-ink"
          }`}
        >
          {rangeLabels[r]}
        </button>
      ))}
    </div>
  );
}
