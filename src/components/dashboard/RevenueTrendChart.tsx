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
      <div className="mb-2 flex items-center gap-4 px-1 text-[11px] font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-[3px] w-3 rounded-full bg-primary" />
          {yearCurr}
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-[3px] w-3 rounded-full bg-muted-foreground/40" />
          {yearPrev}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.22} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="mese"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            interval={1}
          />
          <YAxis hide domain={[0, (max: number) => max * 1.15]} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "10px",
              boxShadow: "var(--shadow-md)",
            }}
            labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
            formatter={(value: number, name: string) => [
              formatCurrency(value),
              name === "curr" ? String(yearCurr) : String(yearPrev),
            ]}
          />
          <Line
            type="monotone"
            dataKey="prev"
            stroke="hsl(var(--muted-foreground) / 0.45)"
            strokeWidth={2}
            dot={false}
            activeDot={false}
          />
          <Area
            type="monotone"
            dataKey="curr"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#revenueTrendFill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "hsl(var(--card))" }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
