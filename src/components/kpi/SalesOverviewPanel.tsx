import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, PieChart as PieIcon } from "lucide-react";
import { formatCompact, formatCurrency, mesiLabel } from "./kpiShared";
import type { AziendaColorMap } from "@/lib/aziendaColor";
import { aziendaColorValue } from "@/lib/aziendaColor";

type AziendaRow = {
  id: string;
  nome: string;
  fatturato_totale: number;
};

interface SalesOverviewPanelProps {
  fatturatoTotale: number;
  deltaPct: number | null;
  deltaLabel: string;
  periodoLabel: string;
  /** 12 record mese → { aziendaId: fatturato } */
  mensilePerAzienda: Record<string, number>[];
  aziende: AziendaRow[];
  colorMap: AziendaColorMap;
}

const ALTRI_ID = "__altri__";

/**
 * Panoramica vendite in stile "analytics dashboard": a sinistra il fatturato
 * protagonista con barre mensili impilate per fornitore (colori identità
 * azienda), a destra la ripartizione del fatturato per fornitore.
 * Tutti i numeri provengono dai dati già calcolati da useAdvancedKPIStats.
 */
export function SalesOverviewPanel({
  fatturatoTotale,
  deltaPct,
  deltaLabel,
  periodoLabel,
  mensilePerAzienda,
  aziende,
  colorMap,
}: SalesOverviewPanelProps) {
  const top = useMemo(
    () => [...aziende].sort((a, b) => b.fatturato_totale - a.fatturato_totale).slice(0, 5),
    [aziende]
  );

  const serie = useMemo(() => {
    const topIds = new Set(top.map((a) => a.id));
    return (mensilePerAzienda || [])
      .map((perAz, i) => {
        const row: Record<string, number | string> = { mese: mesiLabel[i] };
        let altri = 0;
        let totale = 0;
        Object.entries(perAz || {}).forEach(([id, val]) => {
          totale += val;
          if (topIds.has(id)) row[id] = (Number(row[id]) || 0) + val;
          else altri += val;
        });
        if (altri > 0) row[ALTRI_ID] = altri;
        row.__tot = totale;
        return row;
      })
      .filter((r) => Number(r.__tot) > 0);
  }, [mensilePerAzienda, top]);

  const hasAltri = serie.some((r) => Number(r[ALTRI_ID]) > 0);
  const hasDelta = deltaPct !== null && Number.isFinite(deltaPct);
  const positive = hasDelta && (deltaPct as number) >= 0;

  const totaleRipartizione = aziende.reduce((s, a) => s + a.fatturato_totale, 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-scatto-line bg-scatto-surface shadow-[0_6px_24px_-14px_hsl(225_18%_9%/0.16)]">
      <div className="grid grid-cols-1 divide-y divide-scatto-line lg:grid-cols-[1.9fr,1fr] lg:divide-x lg:divide-y-0">
        {/* Colonna sinistra: andamento */}
        <div className="p-4 lg:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight text-scatto-ink">
              <Activity className="h-4 w-4 text-scatto-muted" />
              Panoramica vendite
            </h2>
            {hasDelta && (
              <span
                className={`rounded-lg px-2 py-0.5 text-xs font-bold tabular-nums ${
                  positive ? "bg-scatto-success/10 text-scatto-success" : "bg-scatto-danger/10 text-scatto-danger"
                }`}
              >
                {positive ? "+" : "−"}
                {Math.abs(deltaPct as number).toFixed(1)}%
              </span>
            )}
          </div>

          <p className="text-xs text-scatto-muted">Fatturato · {periodoLabel}</p>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-display text-3xl font-bold tracking-tight tabular-nums text-scatto-ink lg:text-4xl">
              {formatCurrency(fatturatoTotale)}
            </span>
            {hasDelta && (
              <span
                className={`text-sm font-semibold tabular-nums ${
                  positive ? "text-scatto-success" : "text-scatto-danger"
                }`}
              >
                {positive ? "+" : "−"}
                {Math.abs(deltaPct as number).toFixed(1)}%
              </span>
            )}
            <span className="text-xs text-scatto-muted">{deltaLabel}</span>
          </div>

          {/* Legenda fornitori */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            {top.map((a) => (
              <span key={a.id} className="flex items-center gap-1.5 text-xs text-scatto-muted">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: aziendaColorValue(a.id, colorMap) }}
                />
                {a.nome}
              </span>
            ))}
            {hasAltri && (
              <span className="flex items-center gap-1.5 text-xs text-scatto-muted">
                <span className="h-2.5 w-2.5 rounded-sm bg-scatto-muted/40" />
                Altri
              </span>
            )}
          </div>

          <div className="mt-4 h-[260px] w-full">
            {serie.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-scatto-muted">
                Nessun ordine nel periodo selezionato
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serie} margin={{ top: 4, right: 4, left: -12, bottom: 0 }} barCategoryGap="28%">
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--scatto-line))" />
                  <XAxis
                    dataKey="mese"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--scatto-muted))" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={54}
                    tick={{ fontSize: 11, fill: "hsl(var(--scatto-muted))" }}
                    tickFormatter={(v) => formatCompact(Number(v))}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--scatto-ink) / 0.04)" }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--scatto-line))",
                      background: "hsl(var(--scatto-surface))",
                      fontSize: 12,
                    }}
                    formatter={(value: number, name: string) => [
                      formatCurrency(Number(value)),
                      name === ALTRI_ID ? "Altri" : top.find((a) => a.id === name)?.nome || name,
                    ]}
                  />
                  {top.map((a, i) => (
                    <Bar
                      key={a.id}
                      dataKey={a.id}
                      stackId="f"
                      fill={aziendaColorValue(a.id, colorMap)}
                      radius={!hasAltri && i === top.length - 1 ? [4, 4, 0, 0] : undefined}
                    />
                  ))}
                  {hasAltri && (
                    <Bar dataKey={ALTRI_ID} stackId="f" fill="hsl(var(--scatto-muted) / 0.4)" radius={[4, 4, 0, 0]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Colonna destra: ripartizione fornitori */}
        <div className="p-4 lg:p-6">
          <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold tracking-tight text-scatto-ink">
            <PieIcon className="h-4 w-4 text-scatto-muted" />
            Ripartizione fornitori
          </h2>

          <div className="rounded-xl border border-scatto-line bg-scatto-bg/60 p-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-scatto-muted">
              Fatturato totale
            </p>
            <p className="mt-1 font-display text-2xl font-bold tracking-tight tabular-nums text-scatto-ink">
              {formatCurrency(fatturatoTotale)}
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {top.length === 0 && <p className="text-xs text-scatto-muted">Nessun fornitore nel periodo</p>}
            {top.map((a) => {
              const quota = totaleRipartizione > 0 ? (a.fatturato_totale / totaleRipartizione) * 100 : 0;
              const color = aziendaColorValue(a.id, colorMap);
              return (
                <div key={a.id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-1 rounded-full" style={{ backgroundColor: color }} />
                    <span className="flex-1 truncate text-xs font-medium text-scatto-ink">{a.nome}</span>
                    <span className="font-display text-xs font-semibold tabular-nums text-scatto-ink">
                      {formatCurrency(a.fatturato_totale)}
                    </span>
                    <span className="w-12 text-right text-xs tabular-nums text-scatto-muted">
                      {quota.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-scatto-ink/[0.06]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(2, quota)}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
