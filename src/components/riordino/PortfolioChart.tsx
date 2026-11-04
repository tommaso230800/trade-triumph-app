import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { analyzePair, type IntelligenceOrder } from "@/lib/reorderIntelligence";

interface Props {
  ordersByPair: Record<string, IntelligenceOrder[]>;
  aziendaFilter: string; // "all" o azienda_id
  tolleranza: number;
  mesi?: number;
}

// Ricalcola lo stato di ogni coppia alla fine di ciascun mese passato,
// usando solo gli ordini fino a quella data: nessun dato inventato,
// è lo stesso motore applicato retroattivamente.
export function PortfolioChart({ ordersByPair, aziendaFilter, tolleranza, mesi = 6 }: Props) {
  const dati = useMemo(() => {
    const punti: Array<{ mese: string; regolari: number; in_ritardo: number; sospetti: number; persistenti: number }> = [];
    const oggi = new Date();
    for (let m = mesi - 1; m >= 0; m--) {
      const fine = new Date(Date.UTC(oggi.getUTCFullYear(), oggi.getUTCMonth() - m + 1, 0));
      const fineIso = fine.toISOString().slice(0, 10);
      const label = fine.toLocaleDateString("it-IT", { month: "short", year: "2-digit" });
      const p = { mese: label, regolari: 0, in_ritardo: 0, sospetti: 0, persistenti: 0 };
      for (const [key, orders] of Object.entries(ordersByPair)) {
        if (aziendaFilter !== "all" && !key.endsWith(`|${aziendaFilter}`)) continue;
        const storico = orders.filter((o) => o.data_ordine <= fineIso);
        if (storico.length < 3) continue;
        const [cliente_id, azienda_id] = key.split("|");
        const analisi = analyzePair(cliente_id, azienda_id, storico, [], { today: fineIso, tolleranza });
        if (analisi.affidabilita === "insufficiente") continue;
        if (analisi.rallentamento === "persistente") p.persistenti++;
        else if (analisi.rallentamento === "anomalo" || analisi.rallentamento === "in_recupero") p.sospetti++;
        else if (analisi.stato === "ritardo") p.in_ritardo++;
        else p.regolari++;
      }
      punti.push(p);
    }
    return punti;
  }, [ordersByPair, aziendaFilter, tolleranza, mesi]);

  if (!dati.length) return null;

  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer>
        <AreaChart data={dati} margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="mese" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={36} />
          <Tooltip
            content={({ active, payload, label }: any) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-lg border border-border bg-popover p-3 text-xs shadow-md">
                  <p className="font-semibold">{label}</p>
                  {payload.map((e: any) => (
                    <p key={e.dataKey} className="mt-0.5 flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: e.color }} />
                      {e.name}: <span className="font-semibold tabular-nums">{e.value}</span>
                    </p>
                  ))}
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="regolari" name="Regolari" stackId="1" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.35} />
          <Area type="monotone" dataKey="in_ritardo" name="In ritardo" stackId="1" stroke="hsl(var(--warning))" fill="hsl(var(--warning))" fillOpacity={0.35} />
          <Area type="monotone" dataKey="sospetti" name="Sospetti" stackId="1" stroke="hsl(var(--info))" fill="hsl(var(--info))" fillOpacity={0.35} />
          <Area type="monotone" dataKey="persistenti" name="Rallentamenti persistenti" stackId="1" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.4} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
