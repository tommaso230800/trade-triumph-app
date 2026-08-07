import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DashRevenueChartProps {
  data: { mese: string; curr: number; prev: number }[];
  currentMonthIndex: number;
  yearCurr: number;
  yearPrev: number;
}

const formatNumberIT = (value: number) =>
  Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/**
 * Andamento fatturato anno corrente (area morbida) vs anno precedente (linea).
 * I mesi futuri restano null così la linea si interrompe invece di crollare a 0.
 */
export function DashRevenueChart({ data, currentMonthIndex, yearCurr, yearPrev }: DashRevenueChartProps) {
  const chartData = data.map((d, i) => ({
    ...d,
    curr: i <= currentMonthIndex ? d.curr : null,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="dashRevenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--scatto-info))" stopOpacity={0.55} />
            <stop offset="55%" stopColor="hsl(var(--scatto-info))" stopOpacity={0.18} />
            <stop offset="100%" stopColor="hsl(var(--scatto-info))" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--scatto-line))" vertical={false} />
        <XAxis
          dataKey="mese"
          stroke="hsl(var(--scatto-muted))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval="preserveStartEnd"
          minTickGap={8}
        />
        <YAxis hide domain={[0, (max: number) => max * 1.15]} />
        <Tooltip
          cursor={{ stroke: "hsl(var(--scatto-line))" }}
          contentStyle={{
            backgroundColor: "hsl(var(--scatto-surface))",
            border: "1px solid hsl(var(--scatto-line))",
            borderRadius: "14px",
            boxShadow: "0 12px 32px -16px hsl(225 18% 9% / 0.35)",
            fontSize: 12,
          }}
          labelStyle={{ color: "hsl(var(--scatto-ink))", fontWeight: 700 }}
          formatter={(value: number, name: string) => [
            `${name === "curr" ? yearCurr : yearPrev}: ${formatNumberIT(value)} €`,
            "",
          ]}
          separator=""
        />
        <Line
          type="monotone"
          dataKey="prev"
          stroke="hsl(var(--scatto-muted))"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={false}
          activeDot={false}
        />
        <Area
          type="monotone"
          dataKey="curr"
          stroke="hsl(var(--scatto-info))"
          strokeWidth={3.5}
          fill="url(#dashRevenueFill)"
          dot={false}
          activeDot={{
            r: 5,
            fill: "hsl(var(--scatto-info))",
            strokeWidth: 6,
            stroke: "hsl(var(--scatto-info) / 0.25)",
          }}
          connectNulls={false}
        />

      </ComposedChart>
    </ResponsiveContainer>
  );
}
