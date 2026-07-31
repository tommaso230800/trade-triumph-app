export interface Insight {
  emoji: string;
  bold: string;
  text: string;
}

interface InsightsPanelProps {
  insights: Insight[];
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  if (insights.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
      <h2 className="mb-3 flex items-center gap-1.5 font-display text-sm font-semibold tracking-tight text-foreground">
        💡 Cosa dicono i numeri
      </h2>
      <div className="space-y-3">
        {insights.map((ins, i) => (
          <div key={i} className="flex items-start gap-2.5 text-sm leading-snug text-foreground">
            <span className="flex-shrink-0 text-base leading-none">{ins.emoji}</span>
            <p>
              <span className="font-semibold">{ins.bold}</span> {ins.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
