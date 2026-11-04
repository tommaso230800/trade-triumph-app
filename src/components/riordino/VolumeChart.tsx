import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Cell,
} from "recharts";
import type { PairIntelligence } from "@/lib/reorderIntelligence";
import { Button } from "@/components/ui/button";

type Unita = "cartoni" | "pezzi" | "valore";

const UNITA_LABEL: Record<Unita, string> = {
  cartoni: "Cartoni",
  pezzi: "Pezzi",
  valore: "Valore €",
};

const fmtD = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "2-digit" });

export function VolumeChart({ pair, height = 240 }: { pair: PairIntelligence; height?: number }) {
  const [unita, setUnita] = useState<Unita>("valore");

  const dati = useMemo(
    () =>
      pair.volumi.map((v, i) => ({
        idx: i + 1,
        label: fmtD(v.data),
        valore: unita === "valore" ? Math.round(v.valore) : unita === "cartoni" ? v.cartoni : v.pezzi,
        data: v.data,
      })),
    [pair.volumi, unita]
  );

  const media = useMemo(
    () => (dati.length ? dati.reduce((s, d) => s + d.valore, 0) / dati.length : 0),
    [dati]
  );

  // evidenzia gli ultimi 3 ordini se in calo persistente
  const sogliaCalo = pair.calo_volumi ? dati.length - 3 : -1;

  if (!dati.length) {
    return <p className="p-4 text-sm text-muted-foreground">Nessun dato sui volumi per questa coppia.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Unità:</span>
        {(Object.keys(UNITA_LABEL) as Unita[]).map((u) => (
          <Button
            key={u}
            size="sm"
            variant={unita === u ? "default" : "outline"}
            className="h-8 px-2 text-xs"
            onClick={() => setUnita(u)}
          >
            {UNITA_LABEL[u]}
          </Button>
        ))}
      </div>

      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <BarChart data={dati} margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="idx" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={48} />
            <Tooltip
              content={({ active, payload }: any) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload;
                return (
                  <div className="rounded-lg border border-border bg-popover p-3 text-xs shadow-md">
                    <p className="font-semibold">{fmtD(p.data)}</p>
                    <p className="mt-1">
                      {UNITA_LABEL[unita]}: <span className="font-semibold tabular-nums">{p.valore.toLocaleString("it-IT")}</span>
                    </p>
                    <p className="text-muted-foreground">Media storica: {Math.round(media).toLocaleString("it-IT")}</p>
                  </div>
                );
              }}
            />
            <ReferenceLine
              y={media}
              stroke="hsl(var(--primary))"
              strokeDasharray="6 4"
              label={{ value: "Media", position: "insideTopLeft", fontSize: 10, fill: "hsl(var(--primary))" }}
            />
            <Bar dataKey="valore" radius={[4, 4, 0, 0]}>
              {dati.map((d, i) => (
                <Cell
                  key={d.idx}
                  fill={sogliaCalo >= 0 && i >= sogliaCalo ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                  fillOpacity={sogliaCalo >= 0 && i >= sogliaCalo ? 0.9 : 0.75}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {pair.calo_volumi && (
        <p className="text-xs text-destructive">
          Calo dei volumi del {Math.abs(pair.calo_volumi_pct || 0)}% negli ultimi ordini rispetto alla media storica.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Le colonne mostrano dati reali degli ordini; la linea tratteggiata è la media storica.
      </p>
    </div>
  );
}
