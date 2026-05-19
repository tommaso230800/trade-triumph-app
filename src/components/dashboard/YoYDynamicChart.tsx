import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  data: { mese: string; curr: number; prev: number; delta: number; deltaPct: number }[];
  yearCurr: number;
  yearPrev: number;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

export function YoYDynamicChart({ data, yearCurr, yearPrev }: Props) {
  const totCurr = data.reduce((s, d) => s + d.curr, 0);
  const totPrev = data.reduce((s, d) => s + d.prev, 0);
  const diff = totCurr - totPrev;
  const pct = totPrev > 0 ? (diff / totPrev) * 100 : 0;

  const monthsWithCurr = data.filter(d => d.curr > 0);
  const compPrev = monthsWithCurr.reduce((s, d) => s + d.prev, 0);
  const compCurr = monthsWithCurr.reduce((s, d) => s + d.curr, 0);
  const compDiff = compCurr - compPrev;
  const compPct = compPrev > 0 ? (compDiff / compPrev) * 100 : 0;

  const Icon = compPct > 0 ? TrendingUp : compPct < 0 ? TrendingDown : Minus;
  const trendColor = compPct > 0 ? "text-success" : compPct < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">Totale {yearPrev}</p>
          <p className="text-xl font-bold text-orange-500">{fmt(totPrev)}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">Totale {yearCurr}</p>
          <p className="text-xl font-bold text-primary">{fmt(totCurr)}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">Stesso periodo</p>
          <p className={`text-base font-bold ${trendColor}`}>{fmt(compCurr)}</p>
          <p className="text-[11px] text-muted-foreground">vs {fmt(compPrev)}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">Variazione</p>
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${trendColor}`} />
            <p className={`text-xl font-bold ${trendColor}`}>
              {compPct > 0 ? "+" : ""}{compPct.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="mese" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}
            tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
            formatter={(v: number, n: string) => [fmt(v), n]}
          />
          <Legend />
          <Bar dataKey="prev" fill="hsl(30 80% 55%)" radius={[4,4,0,0]} name={String(yearPrev)} />
          <Bar dataKey="curr" fill="hsl(var(--primary))" radius={[4,4,0,0]} name={String(yearCurr)} />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left p-3 font-medium">Mese</th>
              <th className="text-right p-3 font-medium text-orange-500">{yearPrev}</th>
              <th className="text-right p-3 font-medium text-primary">{yearCurr}</th>
              <th className="text-right p-3 font-medium">Diff.</th>
              <th className="text-right p-3 font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            {data.map(r => {
              const has = r.curr > 0;
              const c = r.delta > 0 ? "text-success" : r.delta < 0 ? "text-destructive" : "text-muted-foreground";
              return (
                <tr key={r.mese} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3 font-medium">{r.mese}</td>
                  <td className="text-right p-3 text-orange-500">{fmt(r.prev)}</td>
                  <td className="text-right p-3 text-primary">{has ? fmt(r.curr) : "—"}</td>
                  <td className={`text-right p-3 ${c}`}>{has ? (r.delta > 0 ? "+" : "") + fmt(r.delta) : "—"}</td>
                  <td className={`text-right p-3 ${c}`}>{has && r.prev > 0 ? (r.deltaPct > 0 ? "+" : "") + r.deltaPct.toFixed(1) + "%" : "—"}</td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-border bg-muted/40 font-bold">
              <td className="p-3">TOTALE</td>
              <td className="text-right p-3 text-orange-500">{fmt(totPrev)}</td>
              <td className="text-right p-3 text-primary">{fmt(totCurr)}</td>
              <td className={`text-right p-3 ${diff >= 0 ? "text-success" : "text-destructive"}`}>
                {diff > 0 ? "+" : ""}{fmt(diff)}
              </td>
              <td className={`text-right p-3 ${pct >= 0 ? "text-success" : "text-destructive"}`}>
                {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
