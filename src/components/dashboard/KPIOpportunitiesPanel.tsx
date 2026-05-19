import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Target,
  Loader2,
  ArrowRight,
  Lightbulb,
  Users,
  Package,
} from "lucide-react";
import type { DimensionYoY } from "@/hooks/useKPIYoY";

const fmtEUR = (v: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

type AIAction = {
  priorita: "alta" | "media" | "bassa";
  tipo: "recupero" | "crescita" | "rischio" | "opportunita";
  titolo: string;
  descrizione: string;
  target_nome: string;
  target_tipo: "cliente" | "prodotto" | "azienda" | "brand";
};

type AIResponse = { sintesi: string; azioni: AIAction[] };

interface Props {
  yoy: {
    yearCurr: number;
    yearPrev: number;
    curr: { fatturato: number };
    prev: { fatturato: number };
    deltaPct: number;
    clientiYoY: Map<string, DimensionYoY>;
    prodottiYoY: Map<string, DimensionYoY>;
    aziendeYoY: Map<string, DimensionYoY>;
    brandsYoY: Map<string, DimensionYoY>;
  };
  clientiNames: Map<string, string>;
  prodottiNames: Map<string, string>;
  aziendeNames: Map<string, string>;
  brandsNames: Map<string, string>;
}

function topByPredicate(
  map: Map<string, DimensionYoY>,
  names: Map<string, string>,
  predicate: (d: DimensionYoY) => boolean,
  sortFn: (a: DimensionYoY, b: DimensionYoY) => number,
  n = 5
) {
  return Array.from(map.values())
    .filter(predicate)
    .sort(sortFn)
    .slice(0, n)
    .map((d) => ({ ...d, nome: names.get(d.id) || "—" }));
}

export function KPIOpportunitiesPanel({ yoy, clientiNames, prodottiNames, aziendeNames, brandsNames }: Props) {
  const navigate = useNavigate();
  const [aiData, setAiData] = useState<AIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const opportunities = useMemo(() => {
    const topGrowers = topByPredicate(
      yoy.clientiYoY, clientiNames,
      (d) => d.prev > 0 && d.delta > 0,
      (a, b) => b.deltaPct - a.deltaPct
    );
    const topDecliners = topByPredicate(
      yoy.clientiYoY, clientiNames,
      (d) => d.prev > 0 && d.curr > 0 && d.delta < 0,
      (a, b) => a.deltaPct - b.deltaPct
    );
    const lostClienti = topByPredicate(
      yoy.clientiYoY, clientiNames,
      (d) => d.prev > 0 && d.curr === 0,
      (a, b) => b.prev - a.prev
    );
    const decliningProducts = topByPredicate(
      yoy.prodottiYoY, prodottiNames,
      (d) => d.prev > 0 && d.delta < 0,
      (a, b) => a.delta - b.delta
    );
    const newProducts = topByPredicate(
      yoy.prodottiYoY, prodottiNames,
      (d) => d.prev === 0 && d.curr > 0,
      (a, b) => b.curr - a.curr
    );
    const growingBrands = topByPredicate(
      yoy.brandsYoY, brandsNames,
      (d) => d.prev > 0 && d.deltaPct > 10,
      (a, b) => b.deltaPct - a.deltaPct,
      3
    );
    return { topGrowers, topDecliners, lostClienti, decliningProducts, newProducts, growingBrands };
  }, [yoy, clientiNames, prodottiNames, brandsNames]);

  const runAI = async () => {
    setLoading(true);
    setError(null);
    setAiData(null);
    try {
      const snapshot = {
        yearCurr: yoy.yearCurr,
        yearPrev: yoy.yearPrev,
        fattCurr: yoy.curr.fatturato,
        fattPrev: yoy.prev.fatturato,
        deltaPct: yoy.deltaPct,
        topGrowers: opportunities.topGrowers,
        topDecliners: opportunities.topDecliners,
        lostClienti: opportunities.lostClienti,
        decliningProducts: opportunities.decliningProducts,
        newProducts: opportunities.newProducts,
      };
      const { data, error: invokeErr } = await supabase.functions.invoke("analyze-kpi", { body: { snapshot } });
      if (invokeErr) throw invokeErr;
      if (data?.error) throw new Error(data.error);
      setAiData(data as AIResponse);
    } catch (e: any) {
      setError(e?.message || "Errore durante l'analisi AI");
    } finally {
      setLoading(false);
    }
  };

  const goToCliente = (nome: string) => {
    const match = Array.from(clientiNames.entries()).find(([, n]) => n === nome);
    if (match) navigate(`/clienti/${match[0]}`);
    else navigate("/clienti");
  };

  const prioColor = (p: AIAction["priorita"]) =>
    p === "alta" ? "bg-destructive/15 text-destructive border-destructive/40"
    : p === "media" ? "bg-warning/15 text-warning border-warning/40"
    : "bg-muted text-muted-foreground border-border";

  const tipoIcon = (t: AIAction["tipo"]) =>
    t === "recupero" ? <TrendingDown className="h-4 w-4" />
    : t === "crescita" ? <TrendingUp className="h-4 w-4" />
    : t === "rischio" ? <AlertCircle className="h-4 w-4" />
    : <Lightbulb className="h-4 w-4" />;

  return (
    <div className="space-y-6">
      {/* Rules-based opportunities */}
      <div className="rounded-xl bg-card p-4 lg:p-6 shadow-card space-y-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Opportunità Automatiche</h3>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {opportunities.lostClienti.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-destructive" />
                <h4 className="font-semibold text-sm">Clienti da Recuperare</h4>
                <Badge variant="outline" className="ml-auto">{opportunities.lostClienti.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Non hanno ordinato nel {yoy.yearCurr}. Fatturato perso:{" "}
                <span className="font-semibold text-destructive">
                  {fmtEUR(opportunities.lostClienti.reduce((s, c) => s + c.prev, 0))}
                </span>
              </p>
              <div className="space-y-1 pt-1">
                {opportunities.lostClienti.slice(0, 3).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => goToCliente(c.nome)}
                    className="w-full flex items-center justify-between text-xs hover:bg-muted/50 rounded px-2 py-1 transition-colors"
                  >
                    <span className="truncate">{c.nome}</span>
                    <span className="text-muted-foreground shrink-0">{fmtEUR(c.prev)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {opportunities.topDecliners.length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-warning" />
                <h4 className="font-semibold text-sm">Clienti a Rischio</h4>
                <Badge variant="outline" className="ml-auto">{opportunities.topDecliners.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Calo significativo, visita prioritaria.</p>
              <div className="space-y-1 pt-1">
                {opportunities.topDecliners.slice(0, 3).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => goToCliente(c.nome)}
                    className="w-full flex items-center justify-between text-xs hover:bg-muted/50 rounded px-2 py-1 transition-colors"
                  >
                    <span className="truncate">{c.nome}</span>
                    <span className="text-destructive font-semibold shrink-0">{c.deltaPct.toFixed(0)}%</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {opportunities.topGrowers.length > 0 && (
            <div className="rounded-lg border border-success/30 bg-success/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <h4 className="font-semibold text-sm">Clienti da Spingere</h4>
                <Badge variant="outline" className="ml-auto">{opportunities.topGrowers.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Stanno crescendo: proponi upsell e nuovi prodotti.</p>
              <div className="space-y-1 pt-1">
                {opportunities.topGrowers.slice(0, 3).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => goToCliente(c.nome)}
                    className="w-full flex items-center justify-between text-xs hover:bg-muted/50 rounded px-2 py-1 transition-colors"
                  >
                    <span className="truncate">{c.nome}</span>
                    <span className="text-success font-semibold shrink-0">+{c.deltaPct.toFixed(0)}%</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {opportunities.decliningProducts.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-semibold text-sm">Prodotti da Riproporre</h4>
                <Badge variant="outline" className="ml-auto">{opportunities.decliningProducts.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">In calo: usali come leva di canvass o promo.</p>
              <div className="space-y-1 pt-1">
                {opportunities.decliningProducts.slice(0, 3).map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs px-2 py-1">
                    <span className="truncate">{p.nome}</span>
                    <span className="text-destructive shrink-0">{fmtEUR(p.delta)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI analysis */}
      <div className="rounded-xl bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-primary/20 p-4 lg:p-6 shadow-card space-y-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Analisi AI & Azioni Consigliate</h3>
          </div>
          <Button onClick={runAI} disabled={loading} size="sm" className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {aiData ? "Rigenera" : "Genera analisi"}
          </Button>
        </div>

        {!aiData && !loading && !error && (
          <p className="text-sm text-muted-foreground">
            Clicca "Genera analisi" per ottenere una sintesi e un piano d'azione AI basato sui dati YoY filtrati.
          </p>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {aiData && (
          <div className="space-y-4">
            {aiData.sintesi && (
              <div className="rounded-lg bg-card/60 p-3 text-sm leading-relaxed">
                {aiData.sintesi}
              </div>
            )}

            {aiData.azioni?.length > 0 ? (
              <div className="space-y-2">
                {aiData.azioni.map((a, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-card p-3 border border-border hover:border-primary/40 transition-colors space-y-2"
                  >
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className={cn("rounded p-1.5", prioColor(a.priorita))}>{tipoIcon(a.tipo)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm">{a.titolo}</h4>
                          <Badge variant="outline" className={cn("text-[10px]", prioColor(a.priorita))}>
                            {a.priorita}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">{a.tipo}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{a.descrizione}</p>
                        {a.target_nome && (
                          <p className="text-xs mt-1">
                            <span className="text-muted-foreground">Target:</span>{" "}
                            <span className="font-medium">{a.target_nome}</span>
                          </p>
                        )}
                      </div>
                      {a.target_tipo === "cliente" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 shrink-0"
                          onClick={() => goToCliente(a.target_nome)}
                        >
                          Apri <ArrowRight className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nessuna azione suggerita.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
