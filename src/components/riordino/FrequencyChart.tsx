import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  CartesianGrid,
} from "recharts";
import { Link } from "react-router-dom";
import type { PairIntelligence, StatoIntervallo } from "@/lib/reorderIntelligence";
import { Button } from "@/components/ui/button";

const COLOR: Record<StatoIntervallo, string> = {
  regolare: "hsl(var(--success))",
  anomalo: "hsl(var(--warning))",
  persistente: "hsl(var(--destructive))",
};

const STATO_LABEL: Record<StatoIntervallo, string> = {
  regolare: "Regolare",
  anomalo: "Rallentamento anomalo",
  persistente: "Rallentamento persistente",
};

const fmtD = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "2-digit" });

interface Props {
  pair: PairIntelligence;
  height?: number;
}

export function FrequencyChart({ pair, height = 280 }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [finestra, setFinestra] = useState<number>(0); // 0 = tutto lo storico

  const punti = useMemo(() => {
    const all = pair.intervalli.map((iv, i) => ({
      ...iv,
      idx: i + 1,
      label: fmtD(iv.to_data),
      giorni: iv.giorni,
      stato: iv.stato,
      from_data: iv.from_data,
      to_data: iv.to_data,
      to_ordine_id: iv.to_ordine_id,
      scostamento_giorni: iv.scostamento_giorni,
      scostamento_pct: iv.scostamento_pct,
    }));
    return finestra > 0 ? all.slice(-finestra) : all;
  }, [pair.intervalli, finestra]);

  // zone rosse per rallentamenti consecutivi
  const zone = useMemo(() => {
    const out: Array<{ x1: number; x2: number }> = [];
    let start: number | null = null;
    punti.forEach((p, i) => {
      if (p.stato === "persistente" && start === null) start = p.idx;
      if (p.stato !== "persistente" && start !== null) {
        out.push({ x1: start, x2: punti[i - 1].idx });
        start = null;
      }
    });
    if (start !== null) out.push({ x1: start, x2: punti[punti.length - 1].idx });
    return out;
  }, [punti]);

  if (!pair.intervalli.length) {
    return <p className="p-4 text-sm text-muted-foreground">Storico insufficiente per il grafico degli intervalli.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Mostra:</span>
        {[
          { v: 5, l: "Ultimi 5" },
          { v: 10, l: "10" },
          { v: 20, l: "20" },
          { v: 0, l: "Tutto" },
        ].map((o) => (
          <Button
            key={o.v}
            size="sm"
            variant={finestra === o.v ? "default" : "outline"}
            className="h-8 px-2 text-xs"
            onClick={() => setFinestra(o.v)}
          >
            {o.l}
          </Button>
        ))}
      </div>

      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <ComposedChart data={punti} margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="idx" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              width={44}
              label={{ value: "giorni", angle: -90, position: "insideLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip content={<FrequencyTooltip pair={pair} />} />
            {zone.map((z, i) => (
              <ReferenceArea key={i} x1={z.x1} x2={z.x2} fill="hsl(var(--destructive))" fillOpacity={0.08} />
            ))}
            <Line type="stepAfter" dataKey="frequenza_storica" stroke="hsl(var(--primary))" strokeDasharray="6 4" dot={false} name="Baseline storica disponibile" connectNulls={false} />
            <Line type="stepAfter" dataKey="frequenza_recente" stroke="hsl(var(--info))" strokeDasharray="2 3" dot={false} name="Frequenza recente" />
            <Line type="stepAfter" dataKey="frequenza_operativa" stroke="hsl(var(--success))" dot={false} name="Frequenza operativa" connectNulls={false} />
            <Line type="stepAfter" dataKey="soglia_tolleranza" stroke="hsl(var(--warning))" strokeDasharray="3 3" dot={false} name="Operativa + tolleranza" connectNulls={false} />
            <Line
              type="linear"
              dataKey="giorni"
              stroke="hsl(var(--foreground))"
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                return (
                  <circle
                    key={`${payload.idx}-${payload.giorni}`}
                    onClick={() => setSelected(payload.idx)}
                    cx={cx}
                    cy={cy}
                    r={payload.stato === "regolare" ? 4 : 6}
                    fill={COLOR[payload.stato as StatoIntervallo]}
                    stroke="hsl(var(--background))"
                    strokeWidth={1.5}
                  />
                );
              }}
              activeDot={{ r: 7, onClick: (_: unknown, props: any) => setSelected(props.payload.idx) }}
              name="Intervallo reale"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {selected !== null && (() => {
        const iv = pair.intervalli[selected - 1];
        if (!iv) return null;
        return <div className="space-y-2 rounded-lg border border-border p-3 text-xs">
          <p>{fmtD(iv.from_data)} → {fmtD(iv.to_data)} · <strong>{iv.giorni} giorni</strong></p>
          {[...iv.from_ordine_ids, ...iv.to_ordine_ids].map(id => <Link key={id} className="block break-all text-primary underline" to={`/ordini?cliente=${pair.cliente_id}&azienda=${pair.azienda_id}&storico=1&ordine=${id}`}>Apri ordine {id}</Link>)}
        </div>;
      })()}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR.regolare }} /> Regolare</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR.anomalo }} /> Anomalo</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR.persistente }} /> Persistente</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4" style={{ background: "hsl(var(--primary))" }} /> Baseline storica</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4" style={{ background: "hsl(var(--warning))" }} /> Operativa + tolleranza</span>
        <span className="text-success">Frequenza operativa</span>
        <span className="text-info">Frequenza recente</span>
      </div>
    </div>
  );
}

function FrequencyTooltip({ active, payload, pair }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="max-w-64 rounded-lg border border-border bg-popover p-3 text-xs shadow-md">
      <p className="font-semibold">{STATO_LABEL[p.stato as StatoIntervallo]}</p>
      <p className="mt-1 text-muted-foreground">
        {fmtD(p.from_data)} → {fmtD(p.to_data)}
      </p>
      <div className="mt-2 space-y-0.5">
        <p>Giorni tra gli ordini: <span className="font-semibold tabular-nums">{p.giorni}</span></p>
        <p>Frequenza abituale: <span className="tabular-nums">{Math.round(pair.frequenza_abituale || 0)} gg</span></p>
        <p>
          Scostamento:{" "}
          <span className={`tabular-nums ${p.scostamento_giorni > 0 ? "text-warning" : "text-success"}`}>
            {p.scostamento_giorni > 0 ? "+" : ""}{p.scostamento_giorni} gg ({p.scostamento_pct > 0 ? "+" : ""}{p.scostamento_pct}%)
          </span>
        </p>
      </div>
      <Link
        to={`/ordini?cliente=${pair.cliente_id}&azienda=${pair.azienda_id}`}
        className="mt-2 block text-primary underline underline-offset-2"
      >
        Apri gli ordini del cliente
      </Link>
    </div>
  );
}
