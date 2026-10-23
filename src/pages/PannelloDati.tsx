import { useMemo, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PeriodFilter } from "@/components/filters/PeriodFilter";
import { OrderAudit } from "@/components/metrics/OrderAudit";
import { usePeriodoFiltro, usePrimoAnnoOrdini } from "@/hooks/usePeriodoFiltro";
import { useDataPanelOrders } from "@/hooks/useDataPanelOrders";
import { dataPanelMetrics, inPeriodo, parseDocumentNumber } from "@/lib/dataPanelMetrics";
import { periodoLabel } from "@/lib/periodFilter";

const eur = (n: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
export default function PannelloDati() {
  const { periodo, setPeriodo } = usePeriodoFiltro();
  const { data: firstYear } = usePrimoAnnoOrdini();
  const orders = useDataPanelOrders();
  const filtered = useMemo(() => (orders.data ?? []).filter(o => inPeriodo(o, periodo)), [orders.data, periodo]);
  const metrics = useMemo(() => dataPanelMetrics(filtered), [filtered]);
  const [document, setDocument] = useState<{ name: string; text: string; url: string } | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");
  const [values, setValues] = useState({ count: "", revenue: "", margin: "" });
  const [documentPeriod, setDocumentPeriod] = useState("");
  const importPdf = async (file?: File) => {
    if (!file) return;
    setReading(true); setError(""); setValues({ count: "", revenue: "", margin: "" }); setDocumentPeriod("");
    try {
      const { readPdfText } = await import("@/lib/pdfDocumentText");
      const text = await readPdfText(file);
      if (document) URL.revokeObjectURL(document.url);
      setDocument({ name: file.name, text, url: URL.createObjectURL(file) });
    } catch { setError("Non riesco a leggere questo PDF. Verifica che non sia protetto e che non superi 20 MB."); }
    finally { setReading(false); }
  };
  const rows = [
    { key: "count" as const, label: "Totale ordini", crm: metrics.count, money: false },
    { key: "revenue" as const, label: "Fatturato", crm: metrics.fatturato, money: true },
    { key: "margin" as const, label: "Margine (€)", crm: metrics.margin, money: true },
  ];
  const samePeriod = documentPeriod === periodoLabel(periodo);
  return <MainLayout><div className="space-y-6">
    <PageHeader title="Pannello dati" actions={<PeriodFilter value={periodo} onChange={setPeriodo} minYear={firstYear ?? periodo.year} className="h-11 w-full sm:w-60" />} />
    <p className="text-sm font-semibold">{periodoLabel(periodo)}</p>
    {orders.isError ? <div className="space-y-3 text-sm">Dati non disponibili.<Button variant="outline" onClick={() => orders.refetch()}>Riprova</Button></div> : orders.isLoading ? <div className="grid gap-4 sm:grid-cols-3">{[1,2,3].map(i => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}</div> : <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">{rows.map(r => <div key={r.key} className="min-w-0 rounded-xl border border-border bg-card p-4 lg:p-6"><p className="text-xs text-muted-foreground">{r.label}</p><p className="mt-2 break-words text-right text-3xl font-bold tabular-nums">{r.crm === null ? "N/D" : r.money ? eur(r.crm) : r.crm.toLocaleString("it-IT")}</p>{r.key === "margin" && <p className="mt-2 text-xs text-muted-foreground">{metrics.marginPercent === null ? `${metrics.missingCostOrders} ordini con righe o costi non disponibili` : `${metrics.marginPercent.toLocaleString("it-IT", {maximumFractionDigits: 2})}%`}</p>}</div>)}</div>
      {metrics.count === 0 && <p className="text-sm text-muted-foreground">Nessun ordine conteggiato nel periodo selezionato.</p>}
      <section className="space-y-4 border-t border-border pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-semibold">Confronto con PDF</h2><Button variant="outline" asChild disabled={reading}><Label className="cursor-pointer gap-2"><Upload className="h-4 w-4" />{reading ? "Lettura PDF…" : "Importa PDF"}<input type="file" accept="application/pdf,.pdf" className="sr-only" disabled={reading} onChange={e => { void importPdf(e.target.files?.[0]); e.target.value = ""; }} /></Label></Button></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {!document && !reading && <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground"><FileText className="h-6 w-6 shrink-0" />Nessun documento importato</div>}
        {document && <>
          <div className="flex flex-wrap items-center gap-2"><p className="min-w-0 flex-1 break-words text-sm font-semibold">{document.name}</p><Button variant="outline" asChild><a href={document.url} target="_blank" rel="noreferrer">Apri PDF</a></Button><Button variant="ghost" size="icon" aria-label="Rimuovi PDF" onClick={() => { URL.revokeObjectURL(document.url); setDocument(null); }}><X className="h-4 w-4" /></Button></div>
          <details className="text-sm"><summary className="min-h-11 cursor-pointer font-medium">Testo del documento</summary><pre className="max-h-80 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-4 font-sans text-xs">{document.text.trim() || "PDF senza testo selezionabile. Consulta il documento originale."}</pre></details>
          <div className="space-y-2"><Label htmlFor="document-period">Periodo riportato nel PDF</Label><Input id="document-period" value={documentPeriod} onChange={e => setDocumentPeriod(e.target.value)} placeholder={periodoLabel(periodo)} /><p className="text-xs text-muted-foreground">{samePeriod ? "Periodo corrispondente" : "Confronto sospeso: il periodo del documento deve corrispondere a quello selezionato."}</p></div>
          <div className="grid gap-4 md:grid-cols-3">{rows.map(r => {
            const pdf = parseDocumentNumber(values[r.key]);
            const valid = pdf !== null && (r.key !== "count" || (Number.isInteger(pdf) && pdf >= 0));
            const diff = samePeriod && valid && r.crm !== null ? r.crm - Number(pdf) : null;
            return <div key={r.key} className="space-y-3 rounded-xl border border-border bg-card p-4"><Label htmlFor={`pdf-${r.key}`}>{r.label} nel PDF</Label><Input id={`pdf-${r.key}`} inputMode="decimal" value={values[r.key]} onChange={e => setValues(v => ({...v, [r.key]: e.target.value}))} placeholder="N/D" /><dl className="space-y-2 text-sm"><div className="flex flex-wrap justify-between gap-2"><dt>CRM</dt><dd className="tabular-nums">{r.crm === null ? "N/D" : r.money ? eur(r.crm) : r.crm}</dd></div><div className="flex flex-wrap justify-between gap-2"><dt>Differenza CRM − PDF</dt><dd className={`tabular-nums ${diff === null ? "text-muted-foreground" : Math.abs(diff) < 0.01 ? "text-success" : "text-warning"}`}>{diff === null ? "N/D" : r.money ? eur(diff) : diff}</dd></div></dl>{values[r.key] && !valid && <p className="text-xs text-destructive">Valore non valido</p>}</div>;
          })}</div>
        </>}
      </section>
      <OrderAudit ids={filtered.map(o => o.id)} />
    </>}
  </div></MainLayout>;
}