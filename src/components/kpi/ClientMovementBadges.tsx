interface ClientMovementBadgesProps {
  crescita: number;
  stabili: number;
  calo: number;
}

export function ClientMovementBadges({ crescita, stabili, calo }: ClientMovementBadgesProps) {
  const items = [
    { n: crescita, label: "in crescita", className: "bg-success/10 text-success" },
    { n: stabili, label: "stabili", className: "bg-muted text-muted-foreground" },
    { n: calo, label: "in calo", className: "bg-destructive/10 text-destructive" },
  ];

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
      <h2 className="mb-3 font-display text-sm font-semibold tracking-tight text-foreground">
        Movimento clienti · vs anno precedente
      </h2>
      <div className="flex gap-2.5">
        {items.map((it) => (
          <div key={it.label} className={`flex-1 rounded-xl py-3 text-center ${it.className}`}>
            <p className="font-display text-2xl font-bold tabular-nums">{it.n}</p>
            <p className="mt-0.5 text-[10.5px] font-medium">{it.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
