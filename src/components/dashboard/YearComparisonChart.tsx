import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  ComposedChart,
  Area,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// Dati storici 2025
const fatturato2025 = {
  gen: 38672,
  feb: 52531,
  mar: 71136,
  apr: 108961,
  mag: 102110,
  giu: 118835,
  lug: 99834,
  ago: 60068,
  set: 62185,
  ott: 66832,
  nov: 55789,
  dic: 15000,
};

const mesiNomi = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

interface YearComparisonChartProps {
  data2026: { mese: string; fatturato: number }[];
}

export function YearComparisonChart({ data2026 }: YearComparisonChartProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);

  // Combina i dati 2025 e 2026
  const combinedData = mesiNomi.map((mese, index) => {
    const data2026Mese = data2026.find(
      (d) => d.mese.toLowerCase() === mese.toLowerCase()
    );
    const fatturato2026 = data2026Mese?.fatturato || 0;
    const fatturato25 = fatturato2025[mese as keyof typeof fatturato2025];
    const differenza = fatturato2026 - fatturato25;
    const percentuale = fatturato25 > 0 ? ((differenza / fatturato25) * 100) : 0;

    return {
      mese: mese.charAt(0).toUpperCase() + mese.slice(1),
      "2025": fatturato25,
      "2026": fatturato2026,
      differenza,
      percentuale,
    };
  });

  // Calcola totali
  const totale2025 = Object.values(fatturato2025).reduce((a, b) => a + b, 0);
  const totale2026 = combinedData.reduce((sum, d) => sum + d["2026"], 0);
  const differenzaTotale = totale2026 - totale2025;
  const percentualeTotale = totale2025 > 0 ? ((differenzaTotale / totale2025) * 100) : 0;

  // Calcola solo per i mesi con dati 2026
  const mesiConDati2026 = combinedData.filter((d) => d["2026"] > 0);
  const comparabile2025 = mesiConDati2026.reduce((sum, d) => sum + d["2025"], 0);
  const comparabile2026 = mesiConDati2026.reduce((sum, d) => sum + d["2026"], 0);
  const differenzaComparabile = comparabile2026 - comparabile2025;
  const percentualeComparabile = comparabile2025 > 0 ? ((differenzaComparabile / comparabile2025) * 100) : 0;

  const TrendIcon = percentualeComparabile > 0 ? TrendingUp : percentualeComparabile < 0 ? TrendingDown : Minus;
  const trendColor = percentualeComparabile > 0 ? "text-success" : percentualeComparabile < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-xs text-muted-foreground">Totale 2025</p>
          <p className="text-xl font-bold text-orange-600">{formatCurrency(totale2025)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-xs text-muted-foreground">Totale 2026 (ad oggi)</p>
          <p className="text-xl font-bold text-primary">{formatCurrency(totale2026)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-xs text-muted-foreground">Confronto stesso periodo</p>
          <p className={`text-xl font-bold ${trendColor}`}>
            {formatCurrency(comparabile2026)} vs {formatCurrency(comparabile2025)}
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-xs text-muted-foreground">Variazione</p>
          <div className="flex items-center gap-2">
            <TrendIcon className={`h-5 w-5 ${trendColor}`} />
            <p className={`text-xl font-bold ${trendColor}`}>
              {percentualeComparabile > 0 ? "+" : ""}{percentualeComparabile.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={combinedData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="mese"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              boxShadow: "var(--shadow-md)",
            }}
            labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
            formatter={(value: number, name: string) => [formatCurrency(value), name]}
          />
          <Legend />
          <Bar dataKey="2025" fill="hsl(30 80% 55%)" radius={[4, 4, 0, 0]} name="2025" />
          <Bar dataKey="2026" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="2026" />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Monthly Comparison Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">Mese</th>
              <th className="text-right p-3 font-medium text-orange-600">2025</th>
              <th className="text-right p-3 font-medium text-primary">2026</th>
              <th className="text-right p-3 font-medium">Diff.</th>
              <th className="text-right p-3 font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            {combinedData.map((row) => {
              const hasData2026 = row["2026"] > 0;
              const diffColor = row.differenza > 0 ? "text-success" : row.differenza < 0 ? "text-destructive" : "text-muted-foreground";
              return (
                <tr key={row.mese} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3 font-medium">{row.mese}</td>
                  <td className="text-right p-3 text-orange-600">{formatCurrency(row["2025"])}</td>
                  <td className="text-right p-3 text-primary">
                    {hasData2026 ? formatCurrency(row["2026"]) : "—"}
                  </td>
                  <td className={`text-right p-3 ${diffColor}`}>
                    {hasData2026 ? (row.differenza > 0 ? "+" : "") + formatCurrency(row.differenza) : "—"}
                  </td>
                  <td className={`text-right p-3 ${diffColor}`}>
                    {hasData2026 ? (row.percentuale > 0 ? "+" : "") + row.percentuale.toFixed(1) + "%" : "—"}
                  </td>
                </tr>
              );
            })}
            {/* Totale */}
            <tr className="border-t-2 border-border bg-muted/50 font-bold">
              <td className="p-3">TOTALE</td>
              <td className="text-right p-3 text-orange-600">{formatCurrency(totale2025)}</td>
              <td className="text-right p-3 text-primary">{formatCurrency(totale2026)}</td>
              <td className={`text-right p-3 ${differenzaTotale >= 0 ? "text-success" : "text-destructive"}`}>
                {differenzaTotale > 0 ? "+" : ""}{formatCurrency(differenzaTotale)}
              </td>
              <td className={`text-right p-3 ${percentualeTotale >= 0 ? "text-success" : "text-destructive"}`}>
                {percentualeTotale > 0 ? "+" : ""}{percentualeTotale.toFixed(1)}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
