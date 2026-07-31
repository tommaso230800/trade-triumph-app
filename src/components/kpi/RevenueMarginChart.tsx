import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "./kpiShared";

interface RevenueMarginChartProps {
  data: { mese: string; fatturato: number; marginePct: number }[];
}

export function RevenueMarginChart({ data }: RevenueMarginChartProps) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-4 px-1 text-[11px] font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2 w-3 rounded-sm bg-primary" />
          Fatturato
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-[3px] w-3 rounded-full bg-warning" />
          Margine %
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="mese" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickMargin={6} />
          <YAxis yAxisId="fatturato" hide domain={[0, (max: number) => max * 1.2]} />
          <YAxis yAxisId="margine" orientation="right" hide domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "10px",
              boxShadow: "var(--shadow-md)",
            }}
            labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
            formatter={(value: number) => [formatCurrency(value), "Fatturato"]}
          />
          <Bar yAxisId="fatturato" dataKey="fatturato" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={36} />
          <Line
            yAxisId="margine"
            type="monotone"
            dataKey="marginePct"
            stroke="hsl(var(--warning))"
            strokeWidth={2.5}
            dot={{ r: 3.5, strokeWidth: 2, stroke: "hsl(var(--card))", fill: "hsl(var(--warning))" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="mt-1 px-1 text-[11px] text-muted-foreground">
        Barre = fatturato · linea ambra = margine %.
      </p>
    </div>
  );
}
