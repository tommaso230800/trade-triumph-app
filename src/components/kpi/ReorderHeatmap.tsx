import { Fragment } from "react";
import { mesiLettera } from "./kpiShared";

interface ReorderHeatmapProps {
  data: { clienteId: string; nome: string; mesi: number[] }[];
}

function intensityClass(value: number, max: number) {
  if (value <= 0) return "bg-muted";
  const ratio = value / max;
  if (ratio < 0.4) return "bg-primary/25";
  if (ratio < 0.75) return "bg-primary/55";
  return "bg-primary";
}

export function ReorderHeatmap({ data }: ReorderHeatmapProps) {
  if (data.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
      <h2 className="mb-3 flex items-center gap-1.5 font-display text-sm font-semibold tracking-tight text-foreground">
        🗓 Intensità riordini per cliente
      </h2>
      <div className="grid grid-cols-[minmax(58px,72px)_repeat(12,minmax(0,1fr))] items-center gap-1">
        <span />
        {mesiLettera.map((m, i) => (
          <span key={i} className="text-center font-display text-[10px] text-muted-foreground">
            {m}
          </span>
        ))}
        {data.map((row) => {
          const max = Math.max(1, ...row.mesi);
          return (
            <Fragment key={row.clienteId}>
              <span className="truncate pr-1 text-[11px] text-muted-foreground">{row.nome}</span>
              {row.mesi.map((v, i) => (
                <span
                  key={i}
                  className={`aspect-square rounded ${intensityClass(v, max)}`}
                  title={`${v} ${v === 1 ? "ordine" : "ordini"}`}
                />
              ))}
            </Fragment>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Fila scura continua = cliente regolare · celle chiare = mesi saltati, da recuperare.
      </p>
    </div>
  );
}
