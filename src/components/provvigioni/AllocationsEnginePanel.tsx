/**
 * AllocationsEnginePanel — Fase 2, Step 2.3
 * Compatto pannello che mostra lo stato del motore di riconciliazione M:N
 * e permette di persistere / rimuovere le allocazioni calcolate.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useReconciliationEngine } from "@/hooks/useReconciliationEngine";
import { Loader2, Save, Trash2, Layers } from "lucide-react";
import { useMemo } from "react";

const fmtEur = (n: number) =>
  n.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

type Props = {
  estrattoId?: string | null;
  all?: boolean;
  from?: string | null;
  to?: string | null;
  compact?: boolean;
  title?: string;
};

export function AllocationsEnginePanel({ estrattoId, all, from, to, compact, title }: Props) {
  const engine = useReconciliationEngine({ estrattoId, all, from, to });
  const kpi = engine.result?.kpi;

  const savedByType = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of engine.saved) m[a.tipo] = (m[a.tipo] ?? 0) + 1;
    return m;
  }, [engine.saved]);

  if (!estrattoId && !all) {
    return (
      <Card className="surface-glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4" /> Motore di riconciliazione M:N
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Seleziona un estratto per attivare il motore many-to-many.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="surface-glass">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            {title ?? "Motore riconciliazione M:N"}
          </span>
          <Badge variant="outline" className="text-xs">Fase 2</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {engine.isLoading || !kpi ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Analisi cluster in corso…
          </div>
        ) : (
          <>
            <div className={`grid gap-3 ${compact ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-4"}`}>
              <Stat label="Totale PDF" value={fmtEur(kpi.totale_pdf)} />
              <Stat label="Totale CRM" value={fmtEur(kpi.totale_crm)} />
              <Stat label="Coperto" value={fmtEur(kpi.coperto)} tone="ok" />
              <Stat label="Scoperto" value={fmtEur(kpi.scoperto)} tone={kpi.scoperto > 0 ? "warn" : "ok"} />
              <Stat label="Sovrapagato" value={fmtEur(kpi.sovrapagato)} tone={kpi.sovrapagato > 0 ? "warn" : "muted"} />
              <Stat label="Bonus/Abbuoni" value={fmtEur(kpi.bonus_abbuoni)} />
              <Stat label="Perfect match" value={String(kpi.perfect_matches)} tone="ok" />
              <Stat label="Allocazioni" value={String(kpi.allocazioni_totali)} />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Salvate: <b className="text-foreground">{engine.saved.length}</b></span>
              {Object.entries(savedByType).map(([k, v]) => (
                <Badge key={k} variant="secondary" className="text-[10px]">{k}: {v}</Badge>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => engine.persist(false)}
                disabled={engine.isPersisting || !kpi.allocazioni_totali}
              >
                {engine.isPersisting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Salva {kpi.allocazioni_totali} allocazioni
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => engine.clear(false)}
                disabled={engine.isClearing || engine.saved.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Rimuovi automatiche
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "muted";
}) {
  const cls =
    tone === "ok"
      ? "text-emerald-500"
      : tone === "warn"
      ? "text-amber-500"
      : tone === "muted"
      ? "text-muted-foreground"
      : "text-foreground";
  return (
    <div className="rounded-lg border border-border/50 bg-background/30 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold ${cls}`}>{value}</div>
    </div>
  );
}
