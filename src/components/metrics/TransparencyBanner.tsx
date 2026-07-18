import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * FASE 1.3 — Banner di trasparenza.
 * Mostra in modo esplicito quanti ordini sono inclusi/esclusi negli aggregati
 * economici della pagina, per rendere immediatamente comprensibile perché
 * i totali differiscono tra Dashboard, KPI, Ordini e Provvigioni.
 *
 * Regole di inclusione allineate a `src/lib/metricsEngine.ts`:
 *  - Esclusi: bozza, da_confermare, stand_by, annullato
 *  - Inclusi: tutti gli altri (confermato/evaso/in_attesa/spedito/completato…)
 */

const EXCLUDED = ["bozza", "da_confermare", "stand_by", "annullato"];

type Props = {
  scope: "dashboard" | "kpi" | "ordini" | "provvigioni";
  className?: string;
};

export function TransparencyBanner({ scope, className }: Props) {
  const { data } = useQuery({
    queryKey: ["transparency-banner"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ordini").select("status");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const r of data ?? []) {
        const k = (r.status || "").toLowerCase() || "sconosciuto";
        counts[k] = (counts[k] ?? 0) + 1;
      }
      const inclusi = Object.entries(counts)
        .filter(([k]) => !EXCLUDED.includes(k))
        .reduce((s, [, v]) => s + v, 0);
      const esclusi = Object.entries(counts)
        .filter(([k]) => EXCLUDED.includes(k))
        .reduce((s, [, v]) => s + v, 0);
      return { counts, inclusi, esclusi, totale: inclusi + esclusi };
    },
    staleTime: 60_000,
  });

  if (!data) return null;

  const scopeLabel: Record<Props["scope"], string> = {
    dashboard: "Dashboard",
    kpi: "KPI",
    ordini: "Ordini",
    provvigioni: "Provvigioni",
  };

  const dettaglioEsclusi = EXCLUDED
    .map((k) => `${k}: ${data.counts[k] ?? 0}`)
    .join(" · ");

  return (
    <div
      className={
        "flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-surface-glass px-3 py-2 text-xs text-muted-foreground " +
        (className ?? "")
      }
    >
      <Info className="h-3.5 w-3.5 shrink-0" />
      <span>
        <strong className="text-foreground">{scopeLabel[scope]}</strong> — negli aggregati:
      </span>
      <Badge variant="secondary" className="font-mono">
        {data.inclusi} inclusi
      </Badge>
      <Badge variant="outline" className="font-mono">
        {data.esclusi} esclusi
      </Badge>
      <span className="opacity-70">su {data.totale} ordini totali</span>
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="ml-auto underline decoration-dotted underline-offset-2 hover:text-foreground"
            >
              perché?
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-xs">
            <p className="mb-1 font-semibold">Esclusi dagli aggregati economici</p>
            <p className="mb-2 opacity-80">
              Bozze, ordini da confermare, in Stand-by e annullati non contribuiscono
              a fatturato, KPI e provvigioni finché non vengono confermati.
            </p>
            <p className="font-mono opacity-90">{dettaglioEsclusi}</p>
            <p className="mt-2 opacity-70">
              Fonte del fatturato: campo <code>ordini.totale</code> (proforma).
              Data di riferimento: <code>data_conferma</code> se presente,
              altrimenti <code>data_ordine</code>.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
