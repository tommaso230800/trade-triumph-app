import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Info, PackageSearch, RotateCcw, Search } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useAziende } from "@/hooks/useAziende";
import { useClienti } from "@/hooks/useClienti";
import { useProdotti } from "@/hooks/useProdotti";
import { useOrderYears, useProductStats, useStatsCoverage } from "@/hooks/useProductStats";
import {
  comparisonRange, defaultCompareYear, matchesSearch, mergeStats, periodRange, sortRows, totals, variation,
  type MergedProductRow, type PeriodMode, type SortKey, type Variation,
} from "@/lib/productStats";

const STORAGE_KEY = "statistiche-prodotti-filtri-v1";
const PAGE = 50;
const MONTHS = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const eur = (v: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v);
const num = (v: number) => new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 }).format(v);
const fmtDate = (iso: string) => iso.split("-").reverse().join("/");
// Oggi nel fuso dell'agenzia (Europe/Rome), indipendente dal fuso del dispositivo.
const todayIso = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

interface Filters {
  year: number; compareYear: number | "none"; mode: PeriodMode; month: number; from: string; to: string;
  azienda: string; cliente: string; prodotto: string; includeUnsold: boolean; sort: SortKey; dir: "asc" | "desc";
}

const defaultFilters = (): Filters => {
  const [y, m] = todayIso().split("-").map(Number);
  return { year: y, compareYear: defaultCompareYear(y), mode: "ytd", month: m, from: `${y}-01-01`, to: todayIso(), azienda: "", cliente: "", prodotto: "", includeUnsold: false, sort: "fatturato", dir: "desc" };
};

function loadFilters(): Filters {
  const base = defaultFilters();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    // Filters persist; year and comparison restart only when the calendar year has changed since saving.
    if (!saved) return base;
    const sameYear = saved.savedYear === base.year;
    return { ...base, ...saved, year: sameYear ? saved.year ?? base.year : base.year, compareYear: sameYear ? saved.compareYear ?? base.compareYear : base.compareYear };
  } catch {
    return base;
  }
}

function VarBadge({ v, money }: { v: Variation; money?: boolean }) {
  if (v.kind === "na") return <span className="text-xs text-muted-foreground">Dati non disponibili</span>;
  if (v.kind === "none") return <span className="text-xs text-muted-foreground">—</span>;
  if (v.kind === "new") return <span className="text-xs font-semibold text-info">Nuovo</span>;
  const up = v.diff >= 0;
  return (
    <span className={`text-xs font-semibold tabular-nums ${up ? "text-success" : "text-destructive"}`}>
      {up ? "+" : "−"}{money ? eur(Math.abs(v.diff)) : num(Math.abs(v.diff))} · {up ? "+" : "−"}{Math.abs(v.pct).toLocaleString("it-IT", { maximumFractionDigits: 1 })}%
    </span>
  );
}

export default function StatisticheProdotti() {
  const [f, setF] = useState<Filters>(loadFilters);
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(PAGE);
  const set = (patch: Partial<Filters>) => { setF((prev) => ({ ...prev, ...patch })); setVisible(PAGE); };
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...f, savedYear: Number(todayIso().slice(0, 4)) })); }, [f]);

  const years = useOrderYears();
  const { data: aziende } = useAziende();
  const { data: clienti } = useClienti();
  const { data: catalogo } = useProdotti(f.azienda || undefined);

  const range = useMemo(() => periodRange(f.mode, f.year, todayIso(), f.month, { from: f.from, to: f.to }), [f.mode, f.year, f.month, f.from, f.to]);
  const prevRange = useMemo(() => (f.compareYear === "none" ? null : comparisonRange(range, f.compareYear)), [range, f.compareYear]);
  const filters = { azienda_id: f.azienda || null, cliente_id: f.cliente || null, prodotto_id: f.prodotto || null };

  const current = useProductStats(range, filters);
  const previous = useProductStats(prevRange, filters);
  const coverage = useStatsCoverage(range, filters);
  const prevCoverage = useStatsCoverage(prevRange, filters);

  const aziendaNames = useMemo(() => new Map((aziende ?? []).map((a) => [a.id, a.nome])), [aziende]);
  const previousAvailable = !!prevRange && (prevCoverage.data?.ordini_con_righe ?? 0) > 0;

  const rows = useMemo(() => {
    const cat = (catalogo ?? []).filter((p) => !f.prodotto || p.id === f.prodotto).map((p) => ({ id: p.id, nome: p.nome, codice: p.codice, formato: p.formato, azienda_id: p.azienda_id }));
    const merged = mergeStats(current.data ?? [], prevRange ? previous.data ?? [] : null, cat, { includeUnsold: f.includeUnsold, aziendaNames });
    return sortRows(merged.filter((r) => matchesSearch(r, search)), f.sort, f.dir);
  }, [current.data, previous.data, prevRange, catalogo, f.includeUnsold, f.prodotto, f.sort, f.dir, aziendaNames, search]);

  const sum = useMemo(() => totals(rows), [rows]);
  const prevSum = useMemo(() => rows.reduce((a, r) => ({ fatturato: a.fatturato + (r.prev?.fatturato ?? 0), cartoni: a.cartoni + (r.prev?.cartoni ?? 0), pezzi: a.pezzi + (r.prev?.pezzi ?? 0) }), { fatturato: 0, cartoni: 0, pezzi: 0 }), [rows]);

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    const first = Math.min(now, ...(years.data ?? []).map((y) => y.anno));
    return Array.from({ length: now - first + 1 }, (_, i) => now - i);
  }, [years.data]);

  const loading = current.isLoading || (prevRange && previous.isLoading);
  const error = current.error || previous.error;
  const periodLabel = `${fmtDate(range.from)} – ${fmtDate(range.to)}`;
  const prevLabel = prevRange ? `${fmtDate(prevRange.from)} – ${fmtDate(prevRange.to)}` : null;
  const partialPrev = previousAvailable && prevCoverage.data && prevCoverage.data.valore_ordini > 0 && prevCoverage.data.valore_con_righe / prevCoverage.data.valore_ordini < 0.95;

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Statistiche prodotti"
          description="Valore ordini, cartoni e pezzi venduti per ogni referenza"
          actions={<Button variant="outline" className="h-11 gap-2" onClick={() => { setF(defaultFilters()); setSearch(""); }}><RotateCcw className="h-4 w-4" /> Azzera filtri</Button>}
        />

        {/* Filtri */}
        <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Anno</Label>
              <Select value={String(f.year)} onValueChange={(v) => set({ year: Number(v), compareYear: f.compareYear === "none" ? "none" : defaultCompareYear(Number(v)) })}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>{yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Periodo</Label>
              <Select value={f.mode} onValueChange={(v) => set({ mode: v as PeriodMode })}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ytd">Da inizio anno a oggi</SelectItem>
                  <SelectItem value="year">Anno intero</SelectItem>
                  <SelectItem value="month">Mese</SelectItem>
                  <SelectItem value="custom">Intervallo di date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {f.mode === "month" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Mese</Label>
                <Select value={String(f.month)} onValueChange={(v) => set({ month: Number(v) })}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {f.mode === "custom" && (
              <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                <div className="min-w-0 space-y-1.5"><Label className="text-xs text-muted-foreground">Dal</Label><Input type="date" className="h-11 min-w-0" value={f.from} onChange={(e) => e.target.value && set({ from: e.target.value })} /></div>
                <div className="min-w-0 space-y-1.5"><Label className="text-xs text-muted-foreground">Al</Label><Input type="date" className="h-11 min-w-0" value={f.to} min={f.from} onChange={(e) => e.target.value && set({ to: e.target.value })} /></div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Confronta con</Label>
              <Select value={String(f.compareYear)} onValueChange={(v) => set({ compareYear: v === "none" ? "none" : Number(v) })}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessun confronto</SelectItem>
                  {yearOptions.filter((y) => y !== f.year).map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Azienda</Label>
              <SearchableSelect value={f.azienda || "__all"} onValueChange={(v) => set({ azienda: v === "__all" ? "" : v, prodotto: "" })} placeholder="Tutte le aziende" searchPlaceholder="Cerca azienda…"
                options={[{ value: "__all", label: "Tutte le aziende" }, ...(aziende ?? []).map((a) => ({ value: a.id, label: a.nome }))]} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <SearchableSelect value={f.cliente || "__all"} onValueChange={(v) => set({ cliente: v === "__all" ? "" : v })} placeholder="Tutti i clienti" searchPlaceholder="Cerca cliente…"
                options={[{ value: "__all", label: "Tutti i clienti" }, ...(clienti ?? []).map((c) => ({ value: c.id, label: c.nome }))]} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Prodotto</Label>
              <SearchableSelect value={f.prodotto || "__all"} onValueChange={(v) => set({ prodotto: v === "__all" ? "" : v })} placeholder="Tutti i prodotti" searchPlaceholder="Cerca prodotto…"
                options={[{ value: "__all", label: "Tutti i prodotti" }, ...(catalogo ?? []).map((p) => ({ value: p.id, label: p.nome, searchTerms: [p.codice ?? ""] }))]} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Ordina per</Label>
              <Select value={`${f.sort}:${f.dir}`} onValueChange={(v) => { const [s, d] = v.split(":"); set({ sort: s as SortKey, dir: d as "asc" | "desc" }); }}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fatturato:desc">Valore ordini (dal più alto)</SelectItem>
                  <SelectItem value="fatturato:asc">Valore ordini (dal più basso)</SelectItem>
                  <SelectItem value="cartoni:desc">Cartoni venduti</SelectItem>
                  <SelectItem value="pezzi:desc">Pezzi venduti</SelectItem>
                  <SelectItem value="nome:asc">Nome A–Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative sm:max-w-sm sm:flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => { setSearch(e.target.value); setVisible(PAGE); }} placeholder="Cerca per nome o codice" className="h-11 pl-9 text-base sm:text-sm" />
            </div>
            <label className="flex min-h-[44px] items-center gap-3 text-sm">
              <Switch checked={f.includeUnsold} onCheckedChange={(v) => set({ includeUnsold: v })} />
              Includi prodotti senza vendite
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Periodo: <span className="font-medium text-foreground">{periodLabel}</span>
            {prevLabel && <> · confronto con <span className="font-medium text-foreground">{prevLabel}</span></>}
          </p>
        </section>

        {/* Riepilogo */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Valore ordini", value: eur(sum.fatturato), v: variation(sum.fatturato, prevSum.fatturato, previousAvailable), money: true },
            { label: "Cartoni venduti", value: num(sum.cartoni), v: variation(sum.cartoni, prevSum.cartoni, previousAvailable) },
            { label: "Pezzi venduti", value: num(sum.pezzi), v: variation(sum.pezzi, prevSum.pezzi, previousAvailable) },
            { label: "Prodotti venduti", value: num(sum.venduti), v: null },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              {loading ? <Skeleton className="mt-2 h-8 w-24" /> : <p className="mt-1 font-display text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">{k.value}</p>}
              {k.v && prevRange && !loading && <div className="mt-1"><VarBadge v={k.v} money={k.money} /></div>}
            </div>
          ))}
        </section>

        {/* Avvisi sulla completezza dei dati */}
        {coverage.data && coverage.data.ordini_senza_righe > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>{coverage.data.ordini_senza_righe} ordini del periodo ({eur(coverage.data.valore_senza_righe)}) non hanno il dettaglio prodotto: il loro valore non è attribuibile alle referenze. Valore ordini del periodo: {eur(coverage.data.valore_ordini)}.</span>
          </div>
        )}
        {prevRange && !prevCoverage.isLoading && !previousAvailable && (
          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
            <span>Per il periodo di confronto non esistono righe prodotto{prevCoverage.data?.ordini_inclusi ? ` (${prevCoverage.data.ordini_inclusi} ordini registrati solo come totale)` : ""}: le variazioni sono indicate come “Dati non disponibili”, non come assenza di vendite.</span>
          </div>
        )}
        {partialPrev && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>Storico di confronto parziale: solo il {Math.round((prevCoverage.data!.valore_con_righe / prevCoverage.data!.valore_ordini) * 100)}% del valore ordini ha il dettaglio prodotto.</span>
          </div>
        )}
        {sum.incompleti > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span>{sum.incompleti} prodotti hanno righe senza pezzi per cartone: i loro pezzi venduti sono incompleti (segnati con “Pezzi incompleti”).</span>
          </div>
        )}

        {/* Elenco */}
        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="font-semibold">Non riesco a caricare le statistiche.</p>
            <p className="mt-1 text-sm text-muted-foreground">Controlla la connessione e riprova.</p>
            <Button className="mt-4 h-11" onClick={() => { current.refetch(); previous.refetch(); }}>Riprova</Button>
          </div>
        ) : loading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <PackageSearch className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 font-semibold">Nessun prodotto venduto nel periodo</p>
            <p className="mt-1 text-sm text-muted-foreground">Allarga il periodo, togli un filtro o includi i prodotti senza vendite.</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Prodotto</th>
                    <th className="px-3 py-3 text-left font-medium">Codice</th>
                    <th className="px-3 py-3 text-left font-medium">Azienda</th>
                    <th className="px-3 py-3 text-right font-medium">Valore ordini</th>
                    <th className="px-3 py-3 text-right font-medium">Cartoni venduti</th>
                    <th className="px-3 py-3 text-right font-medium">Pezzi venduti</th>
                    <th className="px-4 py-3 text-right font-medium">Omaggi (pz)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, visible).map((r) => <DesktopRow key={r.prodotto_id} r={r} previousAvailable={previousAvailable} />)}
                </tbody>
                <tfoot className="border-t border-border bg-muted/30 font-semibold">
                  <tr>
                    <td className="px-4 py-3" colSpan={3}>Totale selezione ({num(rows.length)} prodotti)</td>
                    <td className="px-3 py-3 text-right tabular-nums">{eur(sum.fatturato)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{num(sum.cartoni)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{num(sum.pezzi)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{num(sum.omaggio_pezzi)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {/* Mobile */}
            <div className="space-y-2 lg:hidden">
              {rows.slice(0, visible).map((r) => <MobileRow key={r.prodotto_id} r={r} previousAvailable={previousAvailable} />)}
              <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm font-semibold">
                <p>Totale selezione · {num(rows.length)} prodotti</p>
                <p className="mt-1 tabular-nums">{eur(sum.fatturato)} · {num(sum.cartoni)} cartoni · {num(sum.pezzi)} pezzi</p>
              </div>
            </div>
            {visible < rows.length && (
              <Button variant="outline" className="h-11 w-full" onClick={() => setVisible((v) => v + PAGE)}>
                Mostra altri {Math.min(PAGE, rows.length - visible)} di {num(rows.length - visible)} rimanenti
              </Button>
            )}
          </>
        )}

        <Collapsible className="rounded-xl border border-border bg-card p-4 text-sm">
          <CollapsibleTrigger className="flex min-h-[44px] w-full items-center gap-2 text-left font-semibold"><Info className="h-4 w-4 text-info" /> Come sono calcolati questi numeri</CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2 text-muted-foreground">
            <p><strong className="text-foreground">Valore ordini</strong>: è il valore da ordini (non da fatture), al netto dell’IVA. Il totale di ogni ordine è ripartito sulle sue righe in proporzione al valore netto della riga dopo gli sconti a cascata; così la somma per prodotto coincide con il totale degli ordini che hanno il dettaglio prodotto.</p>
            <p><strong className="text-foreground">Ordini inclusi</strong>: tutti tranne annullati e in stand-by. Un ordine in stand-by viene conteggiato quando viene reso disponibile. La data usata è la data dell’ordine.</p>
            <p><strong className="text-foreground">Cartoni e pezzi</strong>: quantità acquistate realmente salvate nell’ordine. Pezzi venduti = cartoni × pezzi per cartone registrati al momento della vendita + pezzi sfusi. Gli omaggi sono esclusi e mostrati a parte. Per le righe salvate prima del 12/11/2026 vale la confezione del catalogo a quella data.</p>
            <p><strong className="text-foreground">Limiti</strong>: resi e note di credito non sono registrati negli ordini e quindi non sono sottratti. Gli ordini registrati solo come totale (senza righe) non sono attribuibili ai prodotti.</p>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </MainLayout>
  );
}

function DesktopRow({ r, previousAvailable }: { r: MergedProductRow; previousAvailable: boolean }) {
  const cmp = !!r.prev;
  return (
    <tr className="border-t border-border align-top">
      <td className="px-4 py-3">
        <p className="font-medium">{r.nome ?? "Prodotto non più in catalogo"}</p>
        <p className="text-xs text-muted-foreground">{[r.formato, r.attivo === false ? "Non più attivo" : null, r.pezzi_sfusi > 0 ? `di cui ${num(r.pezzi_sfusi)} pz sfusi` : null].filter(Boolean).join(" · ")}</p>
        {r.righe_senza_confezione > 0 && <p className="text-xs font-medium text-warning">Pezzi incompleti: manca pezzi per cartone</p>}
      </td>
      <td className="px-3 py-3 text-muted-foreground">{r.codice ?? "—"}</td>
      <td className="px-3 py-3 text-muted-foreground">{r.azienda_nome ?? "—"}</td>
      <td className="px-3 py-3 text-right tabular-nums"><p className="font-semibold">{eur(r.fatturato)}</p>{cmp && <><p className="text-xs text-muted-foreground">prec. {previousAvailable ? eur(r.prev!.fatturato) : "N/D"}</p><VarBadge v={variation(r.fatturato, r.prev!.fatturato, previousAvailable)} money /></>}</td>
      <td className="px-3 py-3 text-right tabular-nums"><p className="font-semibold">{num(r.cartoni)}</p>{cmp && <><p className="text-xs text-muted-foreground">prec. {previousAvailable ? num(r.prev!.cartoni) : "N/D"}</p><VarBadge v={variation(r.cartoni, r.prev!.cartoni, previousAvailable)} /></>}</td>
      <td className="px-3 py-3 text-right tabular-nums"><p className="font-semibold">{num(r.pezzi)}</p>{cmp && <><p className="text-xs text-muted-foreground">prec. {previousAvailable ? num(r.prev!.pezzi) : "N/D"}</p><VarBadge v={variation(r.pezzi, r.prev!.pezzi, previousAvailable)} /></>}</td>
      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{r.omaggio_pezzi > 0 ? num(r.omaggio_pezzi) : "—"}</td>
    </tr>
  );
}

function MobileRow({ r, previousAvailable }: { r: MergedProductRow; previousAvailable: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <button type="button" onClick={() => setOpen((o) => !o)} className="w-full rounded-xl border border-border bg-card p-4 text-left shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium leading-snug">{r.nome ?? "Prodotto non più in catalogo"}</p>
          <p className="text-xs text-muted-foreground">{[r.codice, r.azienda_nome].filter(Boolean).join(" · ")}</p>
        </div>
        <p className="shrink-0 text-right font-semibold tabular-nums">{eur(r.fatturato)}</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums">
        <span><strong>{num(r.cartoni)}</strong> cartoni</span>
        <span><strong>{num(r.pezzi)}</strong> pezzi</span>
        {r.omaggio_pezzi > 0 && <span className="text-muted-foreground">{num(r.omaggio_pezzi)} pz omaggio</span>}
      </div>
      {r.righe_senza_confezione > 0 && <p className="mt-1 text-xs font-medium text-warning">Pezzi incompleti: manca pezzi per cartone</p>}
      {r.prev && <div className="mt-1"><VarBadge v={variation(r.fatturato, r.prev.fatturato, previousAvailable)} money /></div>}
      {open && r.prev && (
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
          {(["fatturato", "cartoni", "pezzi"] as const).map((k) => (
            <div key={k} className="min-w-0">
              <p className="text-muted-foreground">{k === "fatturato" ? "Valore" : k === "cartoni" ? "Cartoni" : "Pezzi"} prec.</p>
              <p className="font-semibold tabular-nums">{previousAvailable ? (k === "fatturato" ? eur(r.prev![k]) : num(r.prev![k])) : "N/D"}</p>
              <VarBadge v={variation(r[k], r.prev![k], previousAvailable)} money={k === "fatturato"} />
            </div>
          ))}
        </div>
      )}
    </button>
  );
}
