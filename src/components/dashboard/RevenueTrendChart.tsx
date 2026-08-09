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

interface RevenueTrendChartProps {
  data: { mese: string; curr: number; prev: number }[];
  currentMonthIndex: number;
  yearCurr: number;
  yearPrev: number;
}

// Intl.NumberFormat("it-IT") non raggruppa le migliaia sotto le 5 cifre
// (es. 1014 -> "1014"): raggruppiamo a mano.
const formatNumberIT = (value: number) =>
  Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const formatCurrency = (value: number) => `${formatNumberIT(value)} €`;

// Stessa palette/ricetta di DashRevenueChart (Dashboard) — anno corrente in
// grafite piena, anno precedente in rosso, coerenti con la direzione "Scatto".
export function RevenueTrendChart({ data, currentMonthIndex, yearCurr, yearPrev }: RevenueTrendChartProps) {
  // Il fatturato dell'anno corrente esiste solo fino al mese in corso: i mesi
  // futuri restano null (non zero) così la linea si interrompe invece di
  // scendere a 0, che sarebbe un dato falso.
  const chartData = data.map((d, i) => ({
    ...d,
    curr: i <= currentMonthIndex ? d.curr : null,
  }));

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 px-1 text-[11px] font-medium text-scatto-muted">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-[3px] w-3 rounded-full bg-scatto-ink" />
          {yearCurr}
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-[3px] w-3 rounded-full bg-scatto-danger" />
          {yearPrev}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--scatto-ink))" stopOpacity={0.16} />
              <stop offset="95%" stopColor="hsl(var(--scatto-ink))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--scatto-line))" vertical={false} />
          <XAxis
            dataKey="mese"
            stroke="hsl(var(--scatto-muted))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            interval={1}
          />
          <YAxis hide domain={[0, (max: number) => max * 1.15]} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--scatto-surface))",
              border: "1px solid hsl(var(--scatto-line))",
              borderRadius: "10px",
              boxShadow: "0 12px 32px -16px hsl(225 18% 9% / 0.35)",
            }}
            labelStyle={{ color: "hsl(var(--scatto-ink))", fontWeight: 600 }}
            formatter={(value: number, name: string) => [
              formatCurrency(value),
              name === "curr" ? String(yearCurr) : String(yearPrev),
            ]}
          />
          <Line
            type="monotone"
            dataKey="prev"
            stroke="hsl(var(--scatto-danger))"
            strokeWidth={2}
            dot={false}
            activeDot={false}
          />
          <Area
            type="monotone"
            dataKey="curr"
            stroke="hsl(var(--scatto-ink))"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#revenueTrendFill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--scatto-surface))" }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
