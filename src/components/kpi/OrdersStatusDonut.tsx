import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { formatNumberIT } from "./kpiShared";

interface OrdersStatusDonutProps {
  verificati: number;
  inAttesa: number;
  altri: number;
}

export function OrdersStatusDonut({ verificati, inAttesa, altri }: OrdersStatusDonutProps) {
  const totale = verificati + inAttesa + altri;
  const data = [
    { name: "Verificati", value: verificati, color: "hsl(var(--success))" },
    { name: "In attesa", value: inAttesa, color: "hsl(var(--warning))" },
    { name: "Altri", value: altri, color: "hsl(var(--muted-foreground) / 0.3)" },
  ];

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
      <h2 className="mb-3 font-display text-sm font-semibold tracking-tight text-foreground">Distribuzione ordini</h2>
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={30} outerRadius={44} startAngle={90} endAngle={-270} stroke="none">
                {data.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-sm font-bold tabular-nums text-foreground">{formatNumberIT(totale)}</span>
            <span className="text-[9px] text-muted-foreground">ordini</span>
          </div>
        </div>
        <div className="flex-1 space-y-2 text-xs">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 flex-shrink-0 rounded-sm" style={{ backgroundColor: d.color }} />
              <span className="flex-1 text-muted-foreground">{d.name}</span>
              <span className="font-display font-semibold tabular-nums text-foreground">{formatNumberIT(d.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
