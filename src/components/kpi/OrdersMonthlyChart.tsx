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
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--scatto-line))" vertical={false} />
          <XAxis dataKey="mese" stroke="hsl(var(--scatto-muted))" fontSize={10} tickLine={false} axisLine={false} tickMargin={6} />
          <YAxis hide domain={[0, (max: number) => max * 1.2]} />
          <Tooltip
            cursor={{ fill: "hsl(var(--scatto-ink) / 0.04)" }}
            contentStyle={{
              backgroundColor: "hsl(var(--scatto-surface))",
              border: "1px solid hsl(var(--scatto-line))",
              borderRadius: "10px",
              boxShadow: "0 12px 32px -16px hsl(225 18% 9% / 0.35)",
            }}
            labelStyle={{ color: "hsl(var(--scatto-ink))", fontWeight: 600 }}
            formatter={(value: number) => [`${value} ordini`, ""]}
          />
          <Bar dataKey="ordini" radius={[4, 4, 0, 0]} maxBarSize={36}>
            {data.map((m) => (
              <Cell key={m.mese} fill={meseChartColor(m.mese)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 px-1 text-[11px] text-scatto-muted">
        Stessi colori per mese del grafico sopra. Tocca una barra per mese e numero di ordini.
      </p>
    </div>
  );
}
