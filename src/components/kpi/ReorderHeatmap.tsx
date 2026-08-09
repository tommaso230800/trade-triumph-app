import { Fragment } from "react";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { mesiLettera } from "./kpiShared";

interface ReorderHeatmapProps {
  data: { clienteId: string; nome: string; mesi: number[] }[];
}

// Scala assoluta (non più relativa al massimo della riga): 0 ordini = nessun
// riordino quel mese, 1 = riordino raro, 2 = nella norma, 3+ = frequente.
// Semaforo grigio/rosso/ambra/verde, coerente con gli altri stati dell'app.
function intensityClass(value: number) {
  if (value <= 0) return "bg-scatto-ink/[0.06]";
  if (value === 1) return "bg-scatto-danger/70";
  if (value === 2) return "bg-scatto-warning/70";
  return "bg-scatto-success";
}

export function ReorderHeatmap({ data }: ReorderHeatmapProps) {
  if (data.length === 0) return null;

  return (
    <SectionCard title="Intensità riordini per cliente">
      <div className="grid grid-cols-[minmax(58px,72px)_repeat(12,minmax(0,1fr))] items-center gap-1">
        <span />
        {mesiLettera.map((m, i) => (
          <span key={i} className="text-center font-display text-[10px] text-scatto-muted">
            {m}
          </span>
        ))}
        {data.map((row) => (
          <Fragment key={row.clienteId}>
            <span className="truncate pr-1 text-[11px] text-scatto-muted">{row.nome}</span>
            {row.mesi.map((v, i) => (
              <span
                key={i}
                className={`aspect-square rounded ${intensityClass(v)}`}
                title={`${v} ${v === 1 ? "ordine" : "ordini"}`}
              />
            ))}
          </Fragment>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3.5 gap-y-1 text-[11px] text-scatto-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-scatto-ink/[0.06]" />
          Nessun ordine
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-scatto-danger/70" />
          Bassa (1)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-scatto-warning/70" />
          Media (2)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-scatto-success" />
          Alta (3+)
        </span>
      </div>
    </SectionCard>
  );
}
