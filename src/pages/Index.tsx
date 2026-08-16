// Dashboard principale — redesign "professional light"
import { useMemo, useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { MainLayout } from "@/components/layout/MainLayout";
import { DashRevenueChart } from "@/components/dashboard/DashRevenueChart";
import { DashCard } from "@/components/dashboard/modern/DashCard";
import { StatTile } from "@/components/dashboard/modern/StatTile";
import { useKPIYoY } from "@/hooks/useKPIYoY";
import { useAdvancedKPIStats, type AdvancedKPIFilters } from "@/hooks/useAdvancedKPIStats";
import { useReorderForecast, type EnrichedForecast } from "@/hooks/useReorderForecast";
import { useAziende } from "@/hooks/useAziende";
import { useOrdini, type Ordine } from "@/hooks/useOrdini";
import { useOrdiniRighe } from "@/hooks/useOrdiniRighe";
import { useClienti } from "@/hooks/useClienti";
import { useBrands } from "@/hooks/useBrands";
import { useAuth } from "@/hooks/useAuth";
import { aziendaColorValue, buildAziendaColorMap } from "@/lib/aziendaColor";
import { periodStart, periodEnd, type DashboardPeriod } from "@/lib/periodRange";
import { supabase } from "@/integrations/supabase/client";

import { Skeleton } from "@/components/ui/skeleton";
import { Drawer, DrawerContent, DrawerClose } from "@/components/ui/drawer";
import type { ProformaData } from "@/components/ordini/ProformaDialog";
import {
  ChevronRight,
  Download,
  Euro,
  ShoppingCart,
  Users,
  Receipt,
  TrendingUp,
  Building2,
  AlertTriangle,
  Package,
} from "lucide-react";
import agencyLogo from "@/assets/agency-logo.jpg";

// html2canvas + jsPDF pesano ~590kB: caricati solo al primo "Apri proforma",
// non nel bundle iniziale della dashboard (pagina più visitata dell'app).
const ProformaDialog = lazy(() =>
  import("@/components/ordini/ProformaDialog").then((m) => ({ default: m.ProformaDialog }))
);

const formatNumberIT = (value: number) =>
  Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const formatCurrency = (value: number) => `${formatNumberIT(value)} €`;
const formatCompact = (value: number) =>
  Math.abs(value) >= 10000 ? `${formatNumberIT(value / 1000)}k €` : formatCurrency(value);
/** Con centesimi, per righe/totale ordine — dove la precisione conta. */
const formatCurrencyPrecise = (value: number) =>
  `${value.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

type Period = DashboardPeriod;

const periodLabels: Record<Period, string> = {
  mese: "Mese",
  trimestre: "90 giorni",
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

const statusLabels: Record<Ordine["status"], string> = {
  completato: "Completato",
  in_attesa: "In attesa",
  spedito: "Spedito",
  annullato: "Annullato",
  stand_by: "Stand-by",
};

/** Subtotale di una riga ordine: stessa formula di ModificaOrdineDialog (pezzi × prezzo, sconti a cascata). */
function rigaSubtotale(riga: { quantita_pezzi: number; quantita_cartoni: number; prezzo_unitario: number; sc1: number; sc2: number; sc3: number; pezziPerCartone: number }): number {
  const pezziTotali = riga.quantita_pezzi + riga.quantita_cartoni * riga.pezziPerCartone;
  const prezzoBase = pezziTotali * riga.prezzo_unitario;
  const scontoTotale = 1 - (1 - riga.sc1 / 100) * (1 - riga.sc2 / 100) * (1 - riga.sc3 / 100);
  return prezzoBase * (1 - scontoTotale);
}

/** Percorso SVG di uno sparkline da una serie di valori, normalizzato al viewBox 300x56. */
function buildSparkPath(values: number[]): string {
  if (values.length === 0) return "";
  if (values.length === 1) return `M0 28 L300 28`;
  const width = 300;
  const height = 56;
  const pad = 3;
  const max = Math.max(...values);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = (width - pad * 2) / (values.length - 1);
  return values
    .map((v, i) => {
      const x = pad + i * stepX;
      const y = height - pad - ((v - min) / range) * (height - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

/** Pillola compatta per una riga fornitore: "nuovo" se assente l'anno prima, altrimenti su/giù. */
function FornitorePill({ curr, prev }: { curr: number; prev: number }) {
  if (prev <= 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-scatto-ink/5 px-2 py-0.5 text-[11px] font-semibold text-scatto-muted">
        nuovo
      </span>
    );
  }
  const d = ((curr - prev) / prev) * 100;
  return <DeltaBadge deltaPct={d} />;
}

function DeltaBadge({ deltaPct, size = "sm" }: { deltaPct: number | null; size?: "sm" | "md" }) {
  const positive = deltaPct !== null && deltaPct >= 0;
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold tabular-nums ${
        size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]"
      } ${
        deltaPct === null
          ? "bg-scatto-ink/5 text-scatto-muted"
          : positive
          ? "bg-scatto-success/[0.14] text-scatto-success"
          : "bg-scatto-danger/[0.14] text-scatto-danger"
      }`}
    >
      {deltaPct === null ? "N/D" : `${positive ? "↑" : "↓"} ${Math.abs(deltaPct).toFixed(1)}%`}
    </span>
  );
}

const Index = () => {
  const now = useMemo(() => new Date(), []);
  const currentMonthIndex = now.getMonth();
  const [period, setPeriod] = useState<Period>("mese");
  const { user } = useAuth();

  // Stessi confini della pagina KPI (periodo aperto, mese in corso incluso):
  // dashboard e KPI devono leggere esattamente gli stessi ordini.
  const start = useMemo(() => periodStart(period, now), [period, now]);
  const end = useMemo(() => periodEnd(now), [now]);

  const kpiFilters: AdvancedKPIFilters = useMemo(
    () => ({ clienteIds: [], aziendaIds: [], brandIds: [], startDate: start, endDate: end }),
    [start, end]
  );

  const { data: yoy, isLoading: yoyLoading } = useKPIYoY(kpiFilters);
  const { data: stats, isLoading: statsLoading } = useAdvancedKPIStats(kpiFilters);

  const { data: forecastData, isLoading: forecastLoading } = useReorderForecast();
  const { data: aziendeList, isLoading: aziendeLoading } = useAziende();
  const { data: ordini, isLoading: ordiniLoading } = useOrdini();
  const { data: clienti } = useClienti();
  const { data: brands } = useBrands();

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const { data: selectedOrderRighe } = useOrdiniRighe(selectedOrderId ?? undefined);
  const [isProformaOpen, setIsProformaOpen] = useState(false);
  const [proformaData, setProformaData] = useState<ProformaData | null>(null);

  const aziendaColorMap = useMemo(() => buildAziendaColorMap(aziendeList || []), [aziendeList]);
  const aziendaMap = useMemo(
    () => new Map((aziendeList || []).map((a) => [a.id, a])),
    [aziendeList]
  );

  const isLoading = yoyLoading || statsLoading || forecastLoading || aziendeLoading || ordiniLoading;

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "";
  const hour = now.getHours();
  const greeting = hour < 13 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera";

  // KPI del periodo selezionato: stessa fonte della pagina KPI
  // (useAdvancedKPIStats con gli stessi filtri) — i numeri devono coincidere.
  const fatturato = stats?.fatturatoTotale ?? 0;
  const fatturatoDelta = deltaPct(fatturato, yoy?.prev.fatturato ?? 0);
  const ordiniCount = stats?.ordiniTotali ?? 0;
  const ordiniDelta = deltaPct(ordiniCount, yoy?.prev.ordiniCount ?? 0);
  const clientiAttivi = stats ? stats.clientiKPI.filter((c) => c.fatturato > 0).length : 0;
  const clientiPrev = yoy ? Array.from(yoy.clientiYoY.values()).filter((c) => c.prev > 0).length : 0;
  const clientiDelta = deltaPct(clientiAttivi, clientiPrev);
  const ticket = ordiniCount > 0 ? (stats?.scontrinoMedio ?? fatturato / ordiniCount) : null;
  const ticketPrev = yoy && yoy.prev.ordiniCount > 0 ? yoy.prev.fatturato / yoy.prev.ordiniCount : 0;
  const ticketDelta = ticket !== null ? deltaPct(ticket, ticketPrev) : null;
  const cartoniTotali = stats?.cartoniTotali ?? 0;
  const pezziTotali = stats?.pezziTotali ?? 0;
  const marginePct = stats?.marginePercentuale ?? null;

  // Confronto sui soli mesi CHIUSI dell'anno (mai il mese in corso, che è
  // parziale): stessa fonte dati del grafico sotto (yoy.monthlyComparison),
  // così il badge e la linea del grafico non possono più raccontare due
  // storie diverse — unica funzione di calcolo condivisa (deltaPct sopra).
  const chartClosedComparison = useMemo(() => {
    if (!yoy) return null;
    const closedMonths = yoy.monthlyComparison.slice(0, currentMonthIndex);
    if (closedMonths.length === 0) return null;
    const curr = closedMonths.reduce((s, m) => s + m.curr, 0);
    const prev = closedMonths.reduce((s, m) => s + m.prev, 0);
    return {
      curr,
      prev,
      deltaPct: deltaPct(curr, prev),
      monthsIncluded: closedMonths.length,
      lastMonthLabel: closedMonths[closedMonths.length - 1]?.mese,
    };
  }, [yoy, currentMonthIndex]);

  const yearPrev = yoy?.yearPrev ?? now.getFullYear() - 1;
  const heroPeriodText: Record<Period, string> = {
    mese: format(start, "MMMM yyyy", { locale: it }),
    trimestre: "ultimi 90 giorni",
    anno: `Gen–${format(end, "MMM yyyy", { locale: it })}`,
  };
  const heroConfrontoText: Record<Period, string> = {
    mese: `vs ${format(start, "MMMM", { locale: it })} ${yearPrev}`,
    trimestre: `vs stesso periodo ${yearPrev}`,
    anno: `vs stesso periodo ${yearPrev} (mesi chiusi)`,
  };
  const sparkValues = (yoy?.monthlyComparison || [])
    .slice(0, currentMonthIndex + 1)
    .map((m) => m.curr);
  const sparkPath = buildSparkPath(sparkValues.length > 0 ? sparkValues : [0]);

  const insight = (() => {
    if (!chartClosedComparison || chartClosedComparison.prev <= 0 || chartClosedComparison.deltaPct === null) {
      return "Nessun confronto disponibile sui mesi chiusi di quest'anno.";
    }
    const p = chartClosedComparison.deltaPct;
    return `Nei mesi chiusi (Gen–${chartClosedComparison.lastMonthLabel}) sei ${p >= 0 ? "+" : "−"}${Math.abs(p).toFixed(1)}% sul ${yearPrev}`;
  })();

  // Obiettivo mensile: media del fatturato negli ultimi 12 mesi (stessa logica
  // già usata in KPI/Provvigioni) — nessun target reale impostabile esiste
  // oggi, è una stima automatica.
  const obiettivoMensile = useMemo(() => {
    if (!yoy) return null;
    const rolling: number[] = [];
    for (let k = 1; k <= 12; k++) {
      const raw = currentMonthIndex - k;
      const idx = ((raw % 12) + 12) % 12;
      rolling.push(raw >= 0 ? yoy.monthlyComparison[idx].curr : yoy.monthlyComparison[idx].prev);
    }
    const obiettivo = rolling.some((v) => v > 0) ? rolling.reduce((a, b) => a + b, 0) / 12 : 0;
    const fatturatoMese = yoy.monthlyComparison[currentMonthIndex]?.curr ?? 0;
    return { obiettivo, fatturatoMese };
  }, [yoy, currentMonthIndex]);
  const giorniNelMese = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const giorniRimanenti = Math.max(0, giorniNelMese - now.getDate());

  const fornitori = useMemo(() => {
    if (!yoy) return [];
    return Array.from(yoy.aziendeYoY.values())
      .filter((a) => a.curr > 0)
      .map((a) => ({ ...a, nome: aziendaMap.get(a.id)?.nome || "N/D" }))
      .sort((a, b) => b.curr - a.curr)
      .slice(0, 10);
  }, [yoy, aziendaMap]);
  const [fornitoriEspanso, setFornitoriEspanso] = useState(false);
  const fornitoriVisibili = fornitoriEspanso ? fornitori : fornitori.slice(0, 5);
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

  const selectedOrder = selectedOrderId ? attivitaRecente.find((o) => o.id === selectedOrderId) ?? null : null;
  const selectedOrderTotale = selectedOrder ? Number(selectedOrder.totale) : 0;

  // Apre la proforma dell'ordine selezionato: stessa costruzione dati di
  // handleShowProforma in pagina Ordini, righe recuperate al volo (codice e
  // brand non servono altrove in dashboard quindi non sono nell'hook condiviso).
  const handleApriProforma = async (order: Ordine) => {
    const cliente = clienti?.find((c) => c.id === order.cliente_id);
    const azienda = aziendeList?.find((a) => a.id === order.azienda_id);

    const { data: righeData } = await supabase
      .from("ordini_righe")
      .select(`*, prodotti (nome, codice, pezzi_per_cartone, brand_id)`)
      .eq("ordine_id", order.id);

    setProformaData({
      codice: order.codice || `ORD-${order.id.slice(0, 8)}`,
      created_at: order.created_at,
      cliente_nome: cliente?.nome || order.clienti?.nome || "N/A",
      cliente_indirizzo: cliente?.indirizzo || undefined,
      cliente_citta: cliente?.citta || undefined,
      cliente_cap: cliente?.cap || undefined,
      cliente_piva: cliente?.partita_iva || undefined,
      azienda_nome: azienda?.nome || order.aziende?.nome || "N/A",
      azienda_indirizzo: azienda?.indirizzo || undefined,
      azienda_citta: azienda?.citta || undefined,
      tipo_pagamento: order.tipo_pagamento || "Contanti",
      sconto: Number(order.sconto) || 0,
      sconto_merce: Number(order.sconto_merce) || 0,
      totale: Number(order.totale),
      note: order.note || undefined,
      righe: (righeData || []).map((r: any) => {
        const brandName = brands?.find((b) => b.id === r.prodotti?.brand_id)?.name;
        return {
          prodotto_codice: r.prodotti?.codice || undefined,
          prodotto_nome: r.prodotti?.nome || "Prodotto",
          prodotto_brand: brandName,
          prezzo_unitario: Number(r.prezzo_unitario),
          quantita_pezzi: r.quantita_pezzi,
          quantita_cartoni: r.quantita_cartoni,
          pezzi_per_cartone: r.prodotti?.pezzi_per_cartone || 1,
          sc1: Number(r.sc1) || 0,
          sc2: Number(r.sc2) || 0,
          sc3: Number(r.sc3) || 0,
          is_omaggio: !!r.is_omaggio,
        };
      }),
    });
    setSelectedOrderId(null);
    setIsProformaOpen(true);
  };

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

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-1 rounded-xl bg-scatto-ink/[0.06] p-1 sm:flex-initial">
                {(Object.keys(periodLabels) as Period[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`min-h-[36px] flex-1 rounded-lg px-3 text-xs font-semibold transition-colors sm:flex-initial ${
                      period === p
                        ? "bg-scatto-ink text-white shadow-[0_2px_6px_-2px_hsl(225_18%_9%/0.4)]"
                        : "text-scatto-muted hover:text-scatto-ink"
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

          {/* 2 — KPI: fatturato protagonista + tessere di supporto */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr,1fr]">
              <Skeleton className="h-[260px] rounded-xl" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[120px] rounded-xl" />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr,1fr]">
              <DashCard bodyClassName="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-scatto-muted">
                      Fatturato · <span className="capitalize">{heroPeriodText[period]}</span>
                    </p>
                    <p className="mt-1 font-display text-3xl font-bold tracking-tight tabular-nums text-scatto-ink sm:text-4xl">
                      {formatCurrency(fatturato)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <DeltaBadge deltaPct={fatturatoDelta} size="md" />
                      <span className="text-xs text-scatto-muted">{heroConfrontoText[period]}</span>
                    </div>
                  </div>
                  <span className="flex-shrink-0 rounded-lg border border-scatto-line p-2.5 text-scatto-muted">
                    <Euro className="h-5 w-5" />
                  </span>
                </div>

                <svg viewBox="0 0 300 56" preserveAspectRatio="none" className="h-14 w-full" aria-hidden="true">
                  <path
                    d={sparkPath}
                    fill="none"
                    stroke="hsl(var(--scatto-ink))"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                {obiettivoMensile && obiettivoMensile.obiettivo > 0 && (
                  <div className="border-t border-scatto-line pt-4">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-sm font-semibold text-scatto-ink">
                        Obiettivo di {format(now, "MMMM", { locale: it })}
                      </h3>
                      <span className="ml-auto text-sm font-bold tabular-nums text-scatto-ink">
                        {Math.round(Math.min((obiettivoMensile.fatturatoMese / obiettivoMensile.obiettivo) * 100, 100))}%
                      </span>
                    </div>
                    <div className="my-3 h-2 w-full overflow-hidden rounded-full bg-scatto-ink/5">
                      <div
                        className="h-full rounded-full bg-scatto-ink"
                        style={{
                          width: `${Math.min((obiettivoMensile.fatturatoMese / obiettivoMensile.obiettivo) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-scatto-muted">
                      <span>
                        {formatCurrency(obiettivoMensile.fatturatoMese)} su {formatCurrency(obiettivoMensile.obiettivo)}
                      </span>
                      <span>{giorniRimanenti > 0 ? `restano ${giorniRimanenti} giorni` : "ultimo giorno"}</span>
                    </div>
                  </div>
                )}
              </DashCard>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <StatTile
                  label="Ordini"
                  value={formatNumberIT(ordiniCount)}
                  deltaPct={ordiniDelta}
                  icon={<ShoppingCart className="h-5 w-5" />}
                  href="/ordini"
                  hrefLabel="Vedi ordini"
                />
                <StatTile
                  label="Clienti attivi"
                  value={clientiAttivi > 0 ? formatNumberIT(clientiAttivi) : "N/D"}
                  deltaPct={clientiDelta}
                  icon={<Users className="h-5 w-5" />}
                  href="/clienti"
                  hrefLabel="Vedi clienti"
                />
                <StatTile
                  label="Scontrino medio"
                  value={ticket === null ? "N/D" : formatCurrency(ticket)}
                  deltaPct={ticketDelta}
                  icon={<Receipt className="h-5 w-5" />}
                  href="/kpi"
                />
                <DashCard bodyClassName="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-scatto-muted">Cartoni</p>
                    <p className="mt-1 font-display text-xl font-bold tabular-nums text-scatto-ink">
                      {formatNumberIT(cartoniTotali)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-scatto-muted">Pezzi</p>
                    <p className="mt-1 font-display text-xl font-bold tabular-nums text-scatto-ink">
                      {formatNumberIT(pezziTotali)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-scatto-muted">Margine</p>
                    <p className="mt-1 font-display text-xl font-bold tabular-nums text-scatto-ink">
                      {marginePct === null ? "N/D" : `${marginePct.toFixed(1)}%`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-scatto-muted">Fornitori</p>
                    <p className="mt-1 font-display text-xl font-bold tabular-nums text-scatto-ink">
                      {formatNumberIT(fornitori.length)}
                    </p>
                  </div>
                </DashCard>
              </div>
            </div>
          )}

          {/* 3 — GRAFICI */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <DashCard
              className="lg:col-span-2"
              title="Andamento fatturato"
              icon={<TrendingUp className="h-4 w-4" />}
              action={
                <div className="text-right">
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      chartClosedComparison?.deltaPct == null
                        ? "text-scatto-muted"
                        : chartClosedComparison.deltaPct >= 0
                        ? "text-scatto-success"
                        : "text-scatto-danger"
                    }`}
                  >
                    {chartClosedComparison?.deltaPct == null
                      ? "N/D"
                      : `${chartClosedComparison.deltaPct >= 0 ? "+" : "−"}${Math.abs(chartClosedComparison.deltaPct).toFixed(1)}%`}
                  </span>
                  <p className="mt-0.5 text-xs text-scatto-muted">
                    {chartClosedComparison
                      ? `Gen–${chartClosedComparison.lastMonthLabel} · mesi chiusi`
                      : "nessun mese chiuso"}
                  </p>
                </div>
              }
            >
              <div className="mb-4 flex items-center gap-3 text-xs text-scatto-muted">
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-[3px] w-4 rounded-full bg-scatto-ink" />
                  {yoy?.yearCurr ?? now.getFullYear()}
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-[3px] w-4 rounded-full bg-scatto-danger" />
                  {yoy?.yearPrev ?? now.getFullYear() - 1}
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
            </DashCard>

            <DashCard title="Fatturato per fornitore" icon={<Building2 className="h-4 w-4" />}>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full rounded-lg" />
                  ))}
                </div>
              ) : fornitori.length === 0 ? (
                <p className="py-8 text-center text-sm text-scatto-muted">N/D</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {fornitoriVisibili.map((f) => {
                      const color = aziendaColorValue(f.id, aziendaColorMap);
                      return (
                        <div key={f.id}>
                          <div className="mb-1.5 flex items-center gap-2">
                            <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold text-scatto-ink">
                              <i
                                className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                              <span className="truncate">{f.nome}</span>
                            </span>
                            <FornitorePill curr={f.curr} prev={f.prev} />
                            <span
                              className="flex-shrink-0 font-display text-sm font-semibold tabular-nums"
                              style={{ color }}
                            >
                              {formatCompact(f.curr)}
                            </span>
                          </div>
                          <div
                            className="h-2.5 w-full overflow-hidden rounded-full"
                            style={{ backgroundColor: softBg(color) }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(4, (f.curr / fornitoreMax) * 100)}%`,
                                backgroundColor: color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {fornitori.length > 5 && (
                    <button
                      onClick={() => setFornitoriEspanso((v) => !v)}
                      className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-scatto-muted touch-target"
                    >
                      {fornitoriEspanso ? "Mostra solo i primi 5" : `Mostra tutti e ${fornitori.length}`}
                      <ChevronRight className={`h-3.5 w-3.5 transition-transform ${fornitoriEspanso ? "rotate-90" : ""}`} />
                    </button>
                  )}
                </>
              )}
            </DashCard>
          </div>

          {/* 4 + 5 — DA RICONTATTARE (protagonista) + ULTIMI ORDINI */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
            <DashCard
              className="lg:col-span-2"
              title="Da ricontattare"
              icon={<AlertTriangle className="h-4 w-4" />}
              action={
                <Link to="/riordino" className="flex items-center gap-0.5 text-xs font-semibold text-scatto-info">
                  Vedi tutti <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              }
              bodyClassName="p-0 sm:p-0"
            >
              {isLoading ? (
                <div className="space-y-2 p-4 sm:p-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-xl" />
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
                          className="flex min-h-[64px] items-center gap-3 px-4 py-3 transition-colors hover:bg-scatto-ink/[0.02] sm:px-5"
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
            </DashCard>

            <DashCard
              title="Ultimi ordini"
              icon={<Package className="h-4 w-4" />}
              action={
                <Link to="/ordini" className="flex items-center gap-0.5 text-xs font-semibold text-scatto-info">
                  Tutti <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              }
              bodyClassName="p-0 sm:p-0"
            >
              {isLoading ? (
                <div className="space-y-2 p-4 sm:p-5">
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
                        <button
                          type="button"
                          onClick={() => setSelectedOrderId(o.id)}
                          className="flex min-h-[56px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-scatto-ink/[0.03] sm:px-5 touch-target"
                        >
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
                          <ChevronRight className="h-4 w-4 flex-shrink-0 text-scatto-muted" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </DashCard>
          </div>
        </div>
      </div>

      {/* Scheda ordine: righe + totale, resta in dashboard (non naviga a /ordini) */}
      <Drawer open={!!selectedOrderId} onOpenChange={(open) => { if (!open) setSelectedOrderId(null); }}>
        <DrawerContent className="max-h-[86vh] rounded-t-[22px] bg-scatto-surface">
          {selectedOrder && (
            <>
              <div
                className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-white"
                style={{ backgroundColor: aziendaColorValue(selectedOrder.azienda_id, aziendaColorMap) }}
              >
                <span className="truncate">{selectedOrder.aziende?.nome || "N/D"}</span>
                <span className="ml-auto flex-shrink-0 rounded-full bg-white/[0.24] px-2.5 py-0.5 text-[11px] font-bold">
                  {statusLabels[selectedOrder.status]}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pt-4">
                <div className="mb-3.5 flex items-center gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[17px] font-bold tracking-tight text-scatto-ink">
                      {selectedOrder.clienti?.nome || "N/D"}
                    </p>
                    <p className="text-xs text-scatto-muted">
                      {selectedOrder.codice} · {relativeTime(selectedOrder.created_at)}
                    </p>
                  </div>
                  <div className="ml-auto flex-shrink-0 text-right">
                    <p className="text-lg font-bold tabular-nums text-scatto-ink">
                      {formatCurrencyPrecise(selectedOrderTotale)}
                    </p>
                    <p className="text-xs text-scatto-muted">
                      {selectedOrderRighe?.length ?? 0} {(selectedOrderRighe?.length ?? 0) === 1 ? "riga" : "righe"}
                    </p>
                  </div>
                </div>

                <p className="mb-0.5 mt-4 text-[10.5px] font-bold uppercase tracking-[0.11em] text-scatto-muted">
                  Righe
                </p>
                {!selectedOrderRighe ? (
                  <div className="space-y-2 py-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-6 w-full" />
                    ))}
                  </div>
                ) : (
                  selectedOrderRighe.map((r) => {
                    const qty = r.quantita_cartoni > 0 ? `${r.quantita_cartoni}ct` : `${r.quantita_pezzi}×`;
                    const importo = rigaSubtotale({
                      quantita_pezzi: r.quantita_pezzi,
                      quantita_cartoni: r.quantita_cartoni,
                      prezzo_unitario: Number(r.prezzo_unitario),
                      sc1: Number(r.sc1) || 0,
                      sc2: Number(r.sc2) || 0,
                      sc3: Number(r.sc3) || 0,
                      pezziPerCartone: r.prodotti?.pezzi_per_cartone || 1,
                    });
                    return (
                      <div key={r.id} className="flex items-baseline gap-2.5 border-b border-scatto-line py-2 text-sm last:border-0">
                        <span className="min-w-[34px] flex-shrink-0 font-bold tabular-nums text-scatto-muted">{qty}</span>
                        <span className="flex-1 truncate font-medium text-scatto-ink">{r.prodotti?.nome || "Prodotto"}</span>
                        <span className="flex-shrink-0 font-bold tabular-nums text-scatto-ink">{formatCurrencyPrecise(importo)}</span>
                      </div>
                    );
                  })
                )}

                <div className="mt-1.5 flex items-baseline border-t-2 border-scatto-ink pt-3 font-bold text-scatto-ink">
                  <span className="text-sm">Totale imponibile</span>
                  <span className="ml-auto text-base tabular-nums">{formatCurrencyPrecise(selectedOrderTotale)}</span>
                </div>
              </div>

              <div className="flex gap-2.5 px-4 py-4 safe-bottom">
                <DrawerClose asChild>
                  <button
                    type="button"
                    className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-scatto-muted shadow-[inset_0_0_0_1px_hsl(var(--scatto-line))] touch-target"
                  >
                    Chiudi
                  </button>
                </DrawerClose>
                <button
                  type="button"
                  onClick={() => selectedOrder && handleApriProforma(selectedOrder)}
                  className="flex-1 rounded-xl bg-scatto-ink px-4 py-3 text-sm font-semibold text-white touch-target"
                >
                  Apri proforma
                </button>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>

      {isProformaOpen && (
        <Suspense fallback={null}>
          <ProformaDialog open={isProformaOpen} onOpenChange={setIsProformaOpen} data={proformaData} />
        </Suspense>
      )}
    </MainLayout>
  );
};

export default Index;
