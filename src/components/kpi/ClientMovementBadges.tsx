import { SectionCard } from "@/components/dashboard/SectionCard";

interface ClientMovementBadgesProps {
  crescita: number;
  stabili: number;
  calo: number;
}

export function ClientMovementBadges({ crescita, stabili, calo }: ClientMovementBadgesProps) {
  const items = [
    { n: crescita, label: "in crescita", className: "bg-scatto-success/10 text-scatto-success" },
    { n: stabili, label: "stabili", className: "bg-scatto-ink/[0.05] text-scatto-muted" },
    { n: calo, label: "in calo", className: "bg-scatto-danger/10 text-scatto-danger" },
  ];

  return (
    <SectionCard title="Movimento clienti · vs anno precedente">
      <div className="flex gap-2.5">
        {items.map((it) => (
          <div key={it.label} className={`flex-1 rounded-xl py-3 text-center ${it.className}`}>
            <p className="font-display text-2xl font-bold tabular-nums">{it.n}</p>
            <p className="mt-0.5 text-[10.5px] font-medium">{it.label}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
