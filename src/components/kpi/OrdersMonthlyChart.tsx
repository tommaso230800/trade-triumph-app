import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { meseChartColor } from "./kpiShared";

interface OrdersMonthlyChartProps {
  data: { mese: string; ordini: number }[];
}

export function OrdersMonthlyChart({ data }: OrdersMonthlyChartProps) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="mese" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickMargin={6} />
          <YAxis hide domain={[0, (max: number) => max * 1.2]} />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "10px",
              boxShadow: "var(--shadow-md)",
            }}
            labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
            formatter={(value: number) => [`${value} ordini`, ""]}
          />
          <Bar dataKey="ordini" radius={[4, 4, 0, 0]} maxBarSize={36}>
            {data.map((m) => (
              <Cell key={m.mese} fill={meseChartColor(m.mese)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 px-1 text-[11px] text-muted-foreground">
        Stessi colori per mese del grafico sopra. Tocca una barra per mese e numero di ordini.
      </p>
    </div>
  );
}
