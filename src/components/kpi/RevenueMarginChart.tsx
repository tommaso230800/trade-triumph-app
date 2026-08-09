import {
  ComposedChart, Bar, Cell, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatCurrency, meseChartColor } from "./kpiShared";

interface RevenueMarginChartProps {
  data: { mese: string; fatturato: number; marginePct: number }[];
}

export function RevenueMarginChart({ data }: RevenueMarginChartProps) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-4 px-1 text-[11px] font-medium text-scatto-muted">
        <span>Ogni mese ha il suo colore, ripetuto identico nel grafico ordini</span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-[3px] w-3 rounded-full bg-scatto-warning" />
          Margine %
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--scatto-line))" vertical={false} />
          <XAxis dataKey="mese" stroke="hsl(var(--scatto-muted))" fontSize={10} tickLine={false} axisLine={false} tickMargin={6} />
          <YAxis yAxisId="fatturato" hide domain={[0, (max: number) => max * 1.2]} />
          <YAxis yAxisId="margine" orientation="right" hide domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--scatto-surface))",
              border: "1px solid hsl(var(--scatto-line))",
              borderRadius: "10px",
              boxShadow: "0 12px 32px -16px hsl(225 18% 9% / 0.35)",
            }}
            labelStyle={{ color: "hsl(var(--scatto-ink))", fontWeight: 600 }}
            formatter={(value: number) => [formatCurrency(value), "Fatturato"]}
          />
          <Bar yAxisId="fatturato" dataKey="fatturato" radius={[4, 4, 0, 0]} maxBarSize={36}>
            {data.map((m) => (
              <Cell key={m.mese} fill={meseChartColor(m.mese)} />
            ))}
          </Bar>
          <Line
            yAxisId="margine"
            type="monotone"
            dataKey="marginePct"
            stroke="hsl(var(--scatto-warning))"
            strokeWidth={2.5}
            dot={{ r: 3.5, strokeWidth: 2, stroke: "hsl(var(--scatto-surface))", fill: "hsl(var(--scatto-warning))" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="mt-1 px-1 text-[11px] text-scatto-muted">
        Barre = fatturato · linea ambra = margine %.
      </p>
    </div>
  );
}
