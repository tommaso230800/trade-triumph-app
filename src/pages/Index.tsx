// Dashboard principale
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { MainLayout } from "@/components/layout/MainLayout";
import { RevenueTrendChart } from "@/components/dashboard/RevenueTrendChart";
import { useKPIYoY } from "@/hooks/useKPIYoY";
import { useReorderForecast, type EnrichedForecast } from "@/hooks/useReorderForecast";
import { useClientiAttiviMese } from "@/hooks/useClientiAttiviMese";
import { useAziende } from "@/hooks/useAziende";
import { aziendaDotClass, buildAziendaColorIndex } from "@/lib/aziendaColor";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, ChevronRight, PhoneOff, TrendingUp, TrendingDown, Minus } from "lucide-react";
import agencyLogo from "@/assets/agency-logo.jpg";

// Intl.NumberFormat("it-IT") non raggruppa le migliaia sotto le 5 cifre
// (es. 1014 -> "1014"): raggruppiamo a mano ovunque compaia un numero.
const formatNumberIT = (value: number) =>
  Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

const formatCurrency = (value: number) => `${formatNumberIT(value)} €`;

function formatEuroSplit(value: number) {
  const abs = Math.abs(value);
  const intPart = Math.floor(abs);
  const decPart = Math.round((abs - intPart) * 100);
  return {
    sign: value < 0 ? "-" : "",
    intStr: formatNumberIT(intPart),
    decStr: decPart.toString().padStart(2, "0"),
  };
}

const monthsIT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

const Index = () => {
  const now = useMemo(() => new Date(), []);
  const currentMonthIndex = now.getMonth();
  const yearStart = useMemo(() => new Date(now.getFullYear(), 0, 1), [now]);

  const { data: yoy, isLoading: yoyLoading } = useKPIYoY({
    clienteIds: [],
    aziendaIds: [],
    brandIds: [],
    startDate: yearStart,
    endDate: now,
  });
  const { data: forecastData, isLoading: forecastLoading } = useReorderForecast();
  const { data: clientiAttiviMese, isLoading: clientiAttiviLoading } = useClientiAttiviMese();
  const { data: aziendeList, isLoading: aziendeLoading } = useAziende();
  // Colore identità per posizione nell'elenco reale (non per hash dell'id):
  // con 6-10 aziende un hash su 12 caselle collide troppo spesso.
  const aziendaColorMap = useMemo(() => buildAziendaColorIndex(aziendeList || []), [aziendeList]);

  const isLoading = yoyLoading || forecastLoading || clientiAttiviLoading || aziendeLoading;

  const heroMonth = yoy?.monthlyComparison[currentMonthIndex];
  const meseCorrenteLabel = format(now, "MMMM yyyy", { locale: it });

  const sparkOrdini = useMemo(() => {
    if (!yoy) return [];
    const upTo = yoy.monthlyComparison.slice(0, currentMonthIndex + 1);
    return upTo.slice(Math.max(0, upTo.length - 6));
  }, [yoy, currentMonthIndex]);
  const sparkMax = Math.max(1, ...sparkOrdini.map((m) => m.ordiniCurr));

  const ticketMedioCurr = yoy && yoy.curr.ordiniCount > 0 ? yoy.curr.fatturato / yoy.curr.ordiniCount : 0;
  const ticketMedioPrev = yoy && yoy.prev.ordiniCount > 0 ? yoy.prev.fatturato / yoy.prev.ordiniCount : 0;
  const ticketMedioDeltaPct = ticketMedioPrev > 0 ? ((ticketMedioCurr - ticketMedioPrev) / ticketMedioPrev) * 100 : 0;

  // "Da ricontattare": clienti con almeno un prodotto in ritardo sul riordino
  // (urgenza "critica" = giorni_al_riordino <= 0), un cliente per riga
  // (il prodotto più in ritardo), ordinati per fatturato del cliente.
  const daRicontattare = useMemo(() => {
    const list = (forecastData?.forecasts || []).filter((f) => f.urgenza === "critica");
    const perCliente = new Map<string, EnrichedForecast>();
    list.forEach((f) => {
      const existing = perCliente.get(f.cliente_id);
      if (!existing || (f.giorni_al_riordino ?? 0) < (existing.giorni_al_riordino ?? 0)) {
        perCliente.set(f.cliente_id, f);
      }
    });
    const arr = Array.from(perCliente.values()).map((f) => ({
      ...f,
      fatturatoCliente: yoy?.clientiYoY.get(f.cliente_id)?.curr ?? 0,
    }));
    arr.sort((a, b) => b.fatturatoCliente - a.fatturatoCliente);
    return arr;
  }, [forecastData, yoy]);

  // Fatturato per fornitore (anno in corso): riusa yoy.aziendeYoY per il
  // fatturato e useAziende (già esistente, usato in Aziende.tsx) per i nomi.
  const fornitoriTop = useMemo(() => {
    if (!yoy) return [];
    const nomeMap = new Map((aziendeList || []).map((a) => [a.id, a.nome]));
    return Array.from(yoy.aziendeYoY.values())
      .filter((a) => a.curr > 0)
      .map((a) => ({ ...a, nome: nomeMap.get(a.id) || "—" }))
      .sort((a, b) => b.curr - a.curr)
      .slice(0, 4);
  }, [yoy, aziendeList]);
  const fornitoreMax = Math.max(1, ...fornitoriTop.map((f) => f.curr));

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-5 w-32" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header: identità agenzia + data */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-card p-1.5 shadow-sm ring-1 ring-border">
              <img src={agencyLogo} alt="Agenzia Mazzi Group" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="font-display text-base font-bold leading-tight tracking-tight text-foreground">
                Agenzia Mazzi Group
              </p>
              <p className="text-xs text-muted-foreground">HO.RE.CA · Business &amp; Strategy</p>
            </div>
          </div>
          <div className="text-right text-xs font-medium leading-tight text-muted-foreground">
            <div className="capitalize">{format(now, "EEE d", { locale: it })}</div>
            <div className="capitalize">{format(now, "MMMM", { locale: it })}</div>
          </div>
        </div>

        {/* Hero + andamento: affiancati su desktop, stessa card impilata su mobile */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-stretch">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm lg:col-span-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Fatturato mensile
            </p>
            <p className="mt-2 font-display text-4xl font-bold leading-none tracking-tight tabular-nums text-foreground">
              {formatEuroSplit(heroMonth?.curr ?? 0).sign}
              {formatEuroSplit(heroMonth?.curr ?? 0).intStr}
              <span className="text-xl text-muted-foreground">
                ,{formatEuroSplit(heroMonth?.curr ?? 0).decStr} €
              </span>
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {heroMonth && heroMonth.prev > 0 ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    heroMonth.deltaPct > 0
                      ? "bg-success/10 text-success"
                      : heroMonth.deltaPct < 0
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {heroMonth.deltaPct > 0 ? "↑" : heroMonth.deltaPct < 0 ? "↓" : "→"}{" "}
                  {Math.abs(heroMonth.deltaPct).toFixed(1)}%
                </span>
              ) : null}
              <span className="text-xs text-muted-foreground">
                vs {format(now, "MMMM", { locale: it })} {now.getFullYear() - 1}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm lg:col-span-2">
            <div className="mb-1 flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Andamento fatturato
              </h2>
              {yoy && yoy.prev.fatturato > 0 && (
                <span
                  className={`rounded-lg px-2 py-0.5 text-xs font-bold ${
                    yoy.deltaPct >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {yoy.deltaPct >= 0 ? "↑" : "↓"} {Math.abs(yoy.deltaPct).toFixed(1)}%
                </span>
              )}
            </div>
            <RevenueTrendChart
              data={yoy?.monthlyComparison || []}
              currentMonthIndex={currentMonthIndex}
              yearCurr={yoy?.yearCurr ?? now.getFullYear()}
              yearPrev={yoy?.yearPrev ?? now.getFullYear() - 1}
            />
          </div>
        </div>

        {/* Mini-card KPI: 2x2 su mobile, una riga su desktop */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              Fatturato totale anno
            </p>
            <p className="mt-1.5 font-display text-2xl font-bold leading-none tracking-tight tabular-nums text-foreground">
              {formatNumberIT((yoy?.curr.fatturato ?? 0) / 1000)}k <span className="text-sm text-muted-foreground">€</span>
            </p>
            {yoy && yoy.prev.fatturato > 0 && (
              <p className={`mt-1.5 text-xs font-semibold ${yoy.deltaPct >= 0 ? "text-success" : "text-destructive"}`}>
                {yoy.deltaPct >= 0 ? "↑" : "↓"} {Math.abs(yoy.deltaPct).toFixed(1)}% vs {yoy.yearPrev}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              Ordini · trend
            </p>
            <p className="mt-1.5 font-display text-2xl font-bold leading-none tracking-tight tabular-nums text-foreground">
              {formatNumberIT(yoy?.curr.ordiniCount ?? 0)}
            </p>
            <div className="mt-2 flex h-6 items-end gap-[3px]">
              {sparkOrdini.map((m, i) => (
                <span
                  key={i}
                  className={`flex-1 rounded-sm ${i === sparkOrdini.length - 1 ? "bg-primary" : "bg-muted"}`}
                  style={{ height: `${Math.max(12, (m.ordiniCurr / sparkMax) * 100)}%` }}
                />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              Clienti attivi
            </p>
            <p className="mt-1.5 font-display text-2xl font-bold leading-none tracking-tight tabular-nums text-foreground">
              {formatNumberIT(clientiAttiviMese ?? 0)}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">questo mese</p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              Ticket medio
            </p>
            <p className="mt-1.5 font-display text-2xl font-bold leading-none tracking-tight tabular-nums text-foreground">
              {formatNumberIT(ticketMedioCurr)} <span className="text-sm text-muted-foreground">€</span>
            </p>
            {ticketMedioPrev > 0 && (
              <p className={`mt-1.5 text-xs font-semibold ${ticketMedioDeltaPct >= 0 ? "text-success" : "text-destructive"}`}>
                {ticketMedioDeltaPct >= 0 ? "↑" : "↓"} {Math.abs(ticketMedioDeltaPct).toFixed(1)}%
              </p>
            )}
          </div>
        </div>

        {/* Fatturato per fornitore + Da ricontattare: affiancati su desktop */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
          {fornitoriTop.length > 0 && (
            <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
              <h2 className="mb-3 px-1 text-sm font-semibold tracking-tight text-foreground">
                Fatturato per fornitore
              </h2>
              <div className="space-y-3">
                {fornitoriTop.map((f) => (
                  <div key={f.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">{f.nome}</span>
                      <span className="flex-shrink-0 font-display text-sm font-semibold tabular-nums text-foreground">
                        {formatNumberIT(f.curr / 1000)}k €
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${aziendaDotClass(f.id, aziendaColorMap)}`}
                        style={{ width: `${Math.max(4, (f.curr / fornitoreMax) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
                  Da ricontattare
                </h2>
                {daRicontattare.length > 0 && (
                  <span className="rounded-full bg-destructive px-2 py-0.5 text-[11px] font-bold text-destructive-foreground">
                    {daRicontattare.length}
                  </span>
                )}
              </div>
              {daRicontattare.length > 4 && (
                <Link to="/riordino" className="flex items-center gap-0.5 text-xs font-semibold text-primary">
                  Vedi tutti
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>

            {daRicontattare.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/50 bg-card py-10 text-center">
                <PhoneOff className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Nessun cliente in ritardo sul riordino</p>
                <p className="text-xs text-muted-foreground">Tutti i clienti sono in linea col loro ritmo abituale.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {daRicontattare.slice(0, 4).map((f) => {
                  const ritardo = Math.abs(f.giorni_al_riordino ?? 0);
                  const grave = ritardo >= 5;
                  return (
                    <Link
                      key={f.cliente_id}
                      to={`/clienti/${f.cliente_id}`}
                      className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border/50 bg-card p-3.5 shadow-sm"
                    >
                      <span className={`absolute inset-y-2 left-0 w-1 rounded-r-full ${aziendaDotClass(f.azienda_id, aziendaColorMap)}`} />
                      <div className="min-w-0 flex-1 pl-2">
                        <p className="truncate text-[15px] font-bold tracking-tight text-foreground">
                          {f.cliente_nome}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className={`h-2 w-2 flex-shrink-0 rounded-full ${aziendaDotClass(f.azienda_id, aziendaColorMap)}`} />
                          <span className="truncate">
                            {f.prodotto_nome} · {f.azienda_nome}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2.5">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                              grave ? "bg-destructive/12 text-destructive" : "bg-warning/15 text-warning"
                            }`}
                          >
                            +{ritardo} {ritardo === 1 ? "giorno" : "giorni"}
                          </span>
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {formatCurrency(f.fatturatoCliente)}/anno
                          </span>
                        </div>
                      </div>
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
