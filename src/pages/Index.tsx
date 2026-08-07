// Dashboard principale — redesign "professional light"
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { MainLayout } from "@/components/layout/MainLayout";
import { DashKpiCard } from "@/components/dashboard/DashKpiCard";
import { DashRevenueChart } from "@/components/dashboard/DashRevenueChart";
import { useKPIYoY } from "@/hooks/useKPIYoY";
import { useReorderForecast, type EnrichedForecast } from "@/hooks/useReorderForecast";
import { useAziende } from "@/hooks/useAziende";
import { useOrdini } from "@/hooks/useOrdini";
import { useAuth } from "@/hooks/useAuth";
import { aziendaColorValue, buildAziendaColorMap } from "@/lib/aziendaColor";
import { periodStart, periodEnd, type DashboardPeriod } from "@/lib/periodRange";

import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, Download, Euro, Receipt, ShoppingCart, Users } from "lucide-react";
import agencyLogo from "@/assets/agency-logo.jpg";

const formatNumberIT = (value: number) =>
  Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const formatCurrency = (value: number) => `${formatNumberIT(value)} €`;
const formatCompact = (value: number) =>
  Math.abs(value) >= 10000 ? `${formatNumberIT(value / 1000)}k €` : formatCurrency(value);

type Period = DashboardPeriod;

const periodLabels: Record<Period, string> = {
  mese: "Questo mese",
  trimestre: "Ultimi 3 mesi",
  anno: "Anno",
};


function deltaPct(curr: number, prev: number): number | null {
  if (!prev) return null;
  return ((curr - prev) / prev) * 100;
}

// Sfondo tenue derivato dal colore identità azienda: gli hex si possono
// sfumare con l'alpha, i fallback in CSS var restano su un grigio neutro.
function softBg(color: string) {
  return color.startsWith("#") ? `${color}1f` : "hsl(var(--scatto-ink) / 0.06)";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function relativeTime(iso: string | null) {
  if (!iso) return "N/D";
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "adesso";
  if (diffMin < 60) return `${diffMin} min fa`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h} h fa`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ieri";
  if (d < 30) return `${d} giorni fa`;
  return format(new Date(iso), "d MMM", { locale: it });
}

function daysAgo(iso: string | null | undefined) {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

const Index = () => {
  const now = useMemo(() => new Date(), []);
  const currentMonthIndex = now.getMonth();
  const [period, setPeriod] = useState<Period>("mese");
  const { user } = useAuth();

  const start = useMemo(() => periodStart(period, now), [period, now]);
  const end = useMemo(() => periodEnd(now), [now]);

  const { data: yoy, isLoading: yoyLoading } = useKPIYoY({
    clienteIds: [],
    aziendaIds: [],
    brandIds: [],
    startDate: start,
    endDate: end,
  });

  const { data: forecastData, isLoading: forecastLoading } = useReorderForecast();
  const { data: aziendeList, isLoading: aziendeLoading } = useAziende();
  const { data: ordini, isLoading: ordiniLoading } = useOrdini();

  const aziendaColorMap = useMemo(() => buildAziendaColorMap(aziendeList || []), [aziendeList]);
  const aziendaMap = useMemo(
    () => new Map((aziendeList || []).map((a) => [a.id, a])),
    [aziendeList]
  );

  const isLoading = yoyLoading || forecastLoading || aziendeLoading || ordiniLoading;

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "";
  const hour = now.getHours();
  const greeting = hour < 13 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera";

  // KPI del periodo selezionato (dati reali, confronto con stesso periodo anno prima)
  const fatturato = yoy?.curr.fatturato ?? 0;
  const fatturatoDelta = deltaPct(fatturato, yoy?.prev.fatturato ?? 0);
  const ordiniCount = yoy?.curr.ordiniCount ?? 0;
  const ordiniDelta = deltaPct(ordiniCount, yoy?.prev.ordiniCount ?? 0);
  const clientiAttivi = yoy ? Array.from(yoy.clientiYoY.values()).filter((c) => c.curr > 0).length : 0;
  const clientiPrev = yoy ? Array.from(yoy.clientiYoY.values()).filter((c) => c.prev > 0).length : 0;
  const clientiDelta = deltaPct(clientiAttivi, clientiPrev);
  const ticket = ordiniCount > 0 ? fatturato / ordiniCount : null;
  const ticketPrev = yoy && yoy.prev.ordiniCount > 0 ? yoy.prev.fatturato / yoy.prev.ordiniCount : 0;
  const ticketDelta = ticket !== null ? deltaPct(ticket, ticketPrev) : null;

  const meseCorrente = yoy?.monthlyComparison[currentMonthIndex];
  const insight = (() => {
    if (!meseCorrente || meseCorrente.prev <= 0) return "Nessun confronto disponibile per questo mese.";
    const p = meseCorrente.deltaPct;
    return `Questo mese sei ${p >= 0 ? "+" : "−"}${Math.abs(p).toFixed(1)}% sul ${
      (yoy?.yearPrev ?? now.getFullYear() - 1)
    }`;
  })();

  const fornitori = useMemo(() => {
    if (!yoy) return [];
    return Array.from(yoy.aziendeYoY.values())
      .filter((a) => a.curr > 0)
      .map((a) => ({ ...a, nome: aziendaMap.get(a.id)?.nome || "N/D" }))
      .sort((a, b) => b.curr - a.curr)
      .slice(0, 8);
  }, [yoy, aziendaMap]);
  const fornitoreMax = Math.max(1, ...fornitori.map((f) => f.curr));

  // Da ricontattare: un cliente per riga (prodotto più in ritardo), ordinato
  // per fatturato annuo e per ritardo di riordino.
  const daRicontattare = useMemo(() => {
    const list = (forecastData?.forecasts || []).filter((f) => f.urgenza === "critica");
    const perCliente = new Map<string, EnrichedForecast>();
    list.forEach((f) => {
      const ex = perCliente.get(f.cliente_id);
      if (!ex || (f.giorni_al_riordino ?? 0) < (ex.giorni_al_riordino ?? 0)) perCliente.set(f.cliente_id, f);
    });
    return Array.from(perCliente.values())
      .map((f) => ({
        ...f,
        fatturatoCliente: yoy?.clientiYoY.get(f.cliente_id)?.curr ?? 0,
        ritardo: Math.abs(f.giorni_al_riordino ?? 0),
        giorniUltimoOrdine: daysAgo(f.ultimo_ordine),
      }))
      .sort((a, b) => b.fatturatoCliente - a.fatturatoCliente || b.ritardo - a.ritardo)
      .slice(0, 8);
  }, [forecastData, yoy]);

  const attivitaRecente = useMemo(() => {
    // Stessa regola di KPI/Ordini: esclusi annullato e stand_by, data_ordine come riferimento
    return [...(ordini || [])]
      .filter((o) => o.status !== "annullato" && o.status !== "stand_by")
      .sort(
        (a, b) =>
          new Date(b.data_ordine || b.created_at).getTime() -
          new Date(a.data_ordine || a.created_at).getTime()
      )
      .slice(0, 6);
  }, [ordini]);

  const handleExport = () => {
    const rows: string[][] = [
      ["Dashboard", periodLabels[period], format(now, "dd/MM/yyyy")],
      [],
      ["KPI", "Valore", "Var. %"],
      ["Fatturato", String(Math.round(fatturato)), fatturatoDelta === null ? "N/D" : fatturatoDelta.toFixed(1)],
      ["Ordini", String(ordiniCount), ordiniDelta === null ? "N/D" : ordiniDelta.toFixed(1)],
      ["Clienti attivi", String(clientiAttivi), clientiDelta === null ? "N/D" : clientiDelta.toFixed(1)],
      ["Scontrino medio", ticket === null ? "N/D" : String(Math.round(ticket)), ticketDelta === null ? "N/D" : ticketDelta.toFixed(1)],
      [],
      ["Fornitore", "Fatturato"],
      ...fornitori.map((f) => [f.nome, String(Math.round(f.curr))]),
      [],
      ["Da ricontattare", "Ultimo ordine (giorni)", "Fatturato anno"],
      ...daRicontattare.map((c) => [
        c.cliente_nome,
        c.giorniUltimoOrdine === null ? "N/D" : String(c.giorniUltimoOrdine),
        String(Math.round(c.fatturatoCliente)),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard-${format(now, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout>
      <div className="-m-4 -mt-6 min-h-[100dvh] bg-scatto-bg p-4 pt-6 text-scatto-ink lg:-m-8 lg:p-8">
        <div className="mx-auto max-w-[1400px] space-y-6">
          {/* 1 — HEADER */}
          <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-scatto-surface p-1.5 shadow-[0_6px_20px_-12px_hsl(225_18%_9%/0.4)]">
                <img src={agencyLogo} alt="Logo Mazzi Group" className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-scatto-muted">
                  Mazzi Group
                </p>
                <h1 className="font-display text-2xl font-bold tracking-tight text-scatto-ink lg:text-[32px]">
                  {greeting}{firstName ? `, ${firstName}` : ""}.
                </h1>
                {isLoading ? (
                  <Skeleton className="mt-1 h-4 w-48" />
                ) : (
                  <p className="mt-0.5 text-sm text-scatto-muted">{insight}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex rounded-xl bg-scatto-ink/[0.05] p-1">
                {(Object.keys(periodLabels) as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`min-h-[36px] rounded-lg px-3 text-xs font-semibold transition-colors ${
                      period === p
                        ? "bg-scatto-surface text-scatto-ink shadow-[0_4px_12px_-8px_hsl(225_18%_9%/0.5)]"
                        : "text-scatto-muted"
                    }`}
                  >
                    {periodLabels[p]}
                  </button>
                ))}
              </div>
              <button
                onClick={handleExport}
                className="flex min-h-[44px] items-center gap-2 rounded-xl bg-scatto-surface px-4 text-xs font-semibold text-scatto-ink shadow-[0_6px_20px_-14px_hsl(225_18%_9%/0.6)]"
              >
                <Download className="h-4 w-4" />
                Esporta
              </button>
            </div>
          </header>

          {/* 2 — KPI */}
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[132px] rounded-[20px]" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
              <DashKpiCard label="Fatturato" value={formatCompact(fatturato)} icon={Euro} deltaPct={fatturatoDelta} tone="blu" />
              <DashKpiCard label="Ordini" value={formatNumberIT(ordiniCount)} icon={ShoppingCart} deltaPct={ordiniDelta} tone="viola" />
              <DashKpiCard label="Clienti attivi" value={clientiAttivi > 0 ? formatNumberIT(clientiAttivi) : "N/D"} icon={Users} deltaPct={clientiDelta} tone="verde" />
              <DashKpiCard label="Scontrino medio" value={ticket === null ? "N/D" : formatCurrency(ticket)} icon={Receipt} deltaPct={ticketDelta} tone="ambra" />
            </div>
          )}

          {/* 3 — GRAFICI */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
            <section className="rounded-[20px] bg-scatto-surface p-4 shadow-[0_6px_24px_-12px_hsl(225_18%_9%/0.18)] lg:col-span-2 lg:p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-scatto-ink">
                    <i className="inline-block h-4 w-1 rounded-full bg-scatto-info" />
                    Andamento fatturato
                  </h2>
                  <div className="mt-1.5 flex items-center gap-3 text-[11px] font-medium text-scatto-muted">
                    <span className="flex items-center gap-1.5">
                      <i className="inline-block h-[3px] w-4 rounded-full bg-scatto-info" />
                      {yoy?.yearCurr ?? now.getFullYear()}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <i className="inline-block h-[3px] w-4 rounded-full bg-scatto-muted" />
                      {yoy?.yearPrev ?? now.getFullYear() - 1}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    fatturatoDelta === null
                      ? "text-scatto-muted"
                      : fatturatoDelta >= 0
                      ? "text-scatto-success"
                      : "text-scatto-danger"
                  }`}
                >
                  {fatturatoDelta === null ? "N/D" : `${fatturatoDelta >= 0 ? "+" : "−"}${Math.abs(fatturatoDelta).toFixed(1)}%`}
                </span>
              </div>
              {isLoading ? (
                <Skeleton className="h-[220px] w-full rounded-xl" />
              ) : (
                <DashRevenueChart
                  data={yoy?.monthlyComparison || []}
                  currentMonthIndex={currentMonthIndex}
                  yearCurr={yoy?.yearCurr ?? now.getFullYear()}
                  yearPrev={yoy?.yearPrev ?? now.getFullYear() - 1}
                />
              )}
            </section>

            <section className="rounded-[20px] bg-scatto-surface p-4 shadow-[0_6px_24px_-12px_hsl(225_18%_9%/0.18)] lg:p-6">
              <h2 className="mb-4 flex items-center gap-2 font-display text-base font-semibold tracking-tight text-scatto-ink">
                <i className="inline-block h-4 w-1 rounded-full bg-scatto-violet" />
                Fatturato per fornitore
              </h2>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full rounded-lg" />
                  ))}
                </div>
              ) : fornitori.length === 0 ? (
                <p className="py-8 text-center text-sm text-scatto-muted">N/D</p>
              ) : (
                <div className="space-y-3">
                  {fornitori.map((f) => (
                    <div key={f.id}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-scatto-ink">{f.nome}</span>
                        <span className="flex-shrink-0 font-display text-sm font-semibold tabular-nums text-scatto-ink">
                          {formatCompact(f.curr)}
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-scatto-ink/[0.06]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(4, (f.curr / fornitoreMax) * 100)}%`,
                            backgroundColor: aziendaColorValue(f.id, aziendaColorMap),
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* 4 + 5 — DA RICONTATTARE (protagonista) + ATTIVITÀ RECENTE */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start lg:gap-5">
            <section className="rounded-[20px] bg-scatto-surface p-4 shadow-[0_6px_24px_-12px_hsl(225_18%_9%/0.18)] lg:col-span-2 lg:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold tracking-tight text-scatto-ink">
                  Da ricontattare
                </h2>
                <Link to="/riordino" className="flex items-center gap-0.5 text-xs font-semibold text-scatto-info">
                  Vedi tutti <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                  ))}
                </div>
              ) : daRicontattare.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-semibold text-scatto-ink">Nessun cliente in ritardo</p>
                  <p className="mt-1 text-xs text-scatto-muted">
                    Tutti i clienti sono in linea col loro ritmo di riordino.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-scatto-line">
                  {daRicontattare.map((c) => {
                    const az = aziendaMap.get(c.azienda_id);
                    const color = aziendaColorValue(c.azienda_id, aziendaColorMap);
                    return (
                      <li key={c.cliente_id}>
                        <Link
                          to={`/clienti/${c.cliente_id}`}
                          className="flex min-h-[64px] items-center gap-3 py-3 transition-colors hover:bg-scatto-ink/[0.02]"
                        >
                          <span
                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-bold"
                            style={{ backgroundColor: softBg(color), color }}
                          >
                            {az?.logo_url ? (
                              <img src={az.logo_url} alt={az.nome} className="h-full w-full object-cover" />
                            ) : (
                              initials(c.cliente_nome)
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-bold tracking-tight text-scatto-ink">
                              {c.cliente_nome}
                            </p>
                            <p className="truncate text-xs text-scatto-muted">
                              ultimo ordine:{" "}
                              {c.giorniUltimoOrdine === null
                                ? "N/D"
                                : c.giorniUltimoOrdine === 0
                                ? "oggi"
                                : `${c.giorniUltimoOrdine} giorni fa`}
                            </p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="font-display text-sm font-bold tabular-nums text-scatto-ink">
                              {c.fatturatoCliente > 0 ? formatCompact(c.fatturatoCliente) : "N/D"}
                            </p>
                            <p className="text-[11px] font-medium text-scatto-danger">
                              +{c.ritardo} {c.ritardo === 1 ? "giorno" : "giorni"}
                            </p>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="rounded-[20px] bg-scatto-surface p-4 shadow-[0_6px_24px_-12px_hsl(225_18%_9%/0.18)] lg:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-base font-semibold tracking-tight text-scatto-ink">
                  Attività recente
                </h2>
                <Link to="/ordini" className="flex items-center gap-0.5 text-xs font-semibold text-scatto-info">
                  Vedi tutti <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : attivitaRecente.length === 0 ? (
                <p className="py-8 text-center text-sm text-scatto-muted">Nessun ordine recente</p>
              ) : (
                <ul className="divide-y divide-scatto-line">
                  {attivitaRecente.map((o) => {
                    const color = aziendaColorValue(o.azienda_id, aziendaColorMap);
                    const nomeCliente = o.clienti?.nome || "N/D";
                    return (
                      <li key={o.id}>
                        <Link to="/ordini" className="flex min-h-[56px] items-center gap-3 py-2.5">
                          <span
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-bold"
                            style={{ backgroundColor: softBg(color), color }}
                          >
                            {o.aziende?.logo_url ? (
                              <img src={o.aziende.logo_url} alt={o.aziende?.nome || ""} className="h-full w-full object-cover" />
                            ) : (
                              initials(nomeCliente)
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-scatto-ink">{nomeCliente}</p>
                            <p className="text-[11px] text-scatto-muted">{relativeTime(o.created_at)}</p>
                          </div>
                          <span className="flex-shrink-0 font-display text-sm font-bold tabular-nums text-scatto-ink">
                            {o.totale ? formatCompact(Number(o.totale)) : "N/D"}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
