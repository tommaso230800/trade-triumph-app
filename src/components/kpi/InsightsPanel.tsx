import { SectionCard } from "@/components/dashboard/SectionCard";

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
    <SectionCard title="Cosa dicono i numeri">
      <div className="space-y-3">
        {insights.map((ins, i) => (
          <div key={i} className="flex items-start gap-2.5 text-sm leading-snug text-scatto-ink">
            <span className="flex-shrink-0 text-base leading-none">{ins.emoji}</span>
            <p>
              <span className="font-semibold">{ins.bold}</span> {ins.text}
            </p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
