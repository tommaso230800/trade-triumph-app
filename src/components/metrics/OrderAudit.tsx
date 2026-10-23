import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useDataPanelOrders } from "@/hooks/useDataPanelOrders";
import { dataPanelMetrics, type DataPanelOrder } from "@/lib/dataPanelMetrics";
import { runDataAudit, saveDataIssues } from "@/lib/dataAudit";

const eur = (n: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
export function OrderAudit({ ids }: { ids: string[] }) {
  const orders = useDataPanelOrders();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const selected = useMemo(() => { const set = new Set(ids); return (orders.data ?? []).filter(o => set.has(o.id)); }, [orders.data, ids]);
  const metrics = useMemo(() => dataPanelMetrics(selected), [selected]);
  const byId = new Map(selected.map(o => [o.id, o]));
  const anomalies = metrics.report.rows.filter(r => r.ha_righe && Math.abs(r.delta) > 0.01);
  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const set = new Set(ids);
      const found = (await runDataAudit()).filter(i => i.ordine_id && set.has(i.ordine_id));
      await saveDataIssues(user.id, found);
      await qc.invalidateQueries({ queryKey: ["data_issues"] });
      await orders.refetch();
      toast.success(`${found.length} segnalazioni aggiornate in Problematiche`);
    } catch { toast.error("Controllo non riuscito. Riprova."); }
    finally { setSaving(false); }
  };
  return <section className="min-w-0 space-y-4 border-y border-border py-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> Controllo ordini</h2>
      <Button variant="outline" onClick={save} disabled={saving || orders.isLoading || !user} className="gap-2"><RefreshCw className={`h-4 w-4 ${saving ? "animate-spin" : ""}`} />Controlla e segnala</Button>
    </div>
    {orders.isError ? <div className="text-sm">Dati non disponibili. <Button variant="outline" onClick={() => orders.refetch()}>Riprova</Button></div> : orders.isLoading ? <div className="h-24 animate-pulse rounded-lg bg-muted" /> : <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[['Ordini conteggiati', String(metrics.count)], ['Fatturato ordini', eur(metrics.fatturato)], ['Somma righe nette', eur(metrics.report.total_righe)]].map(([label, value]) => <div key={label} className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="break-words text-right text-base font-semibold tabular-nums">{value}</p></div>)}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
        <span>{anomalies.length} differenze · {metrics.report.orders_without_lines} ordini senza righe, non confrontabili</span>
        <Button variant="ghost" onClick={() => setExpanded(v => !v)}>{expanded ? "Chiudi dettagli" : "Dettagli"}</Button>
        <Button variant="link" asChild><Link to="/impostazioni/problematiche">Problematiche</Link></Button>
      </div>
      {expanded && <div className="space-y-3">
        {anomalies.length === 0 && <p className="text-sm text-muted-foreground">Nessuna differenza negli ordini con righe disponibili.</p>}
        {anomalies.map(r => <AuditOrderRow key={r.id} order={byId.get(r.id)} total={r.totale} lines={r.somma_righe} delta={r.delta} />)}
        {metrics.report.orders_without_lines > 0 && <p className="text-xs text-muted-foreground">Gli ordini senza righe mantengono il fatturato salvato; il confronto non è disponibile e non prova un errore d’importazione.</p>}
      </div>}
    </>}
  </section>;
}
function AuditOrderRow({ order, total, lines, delta }: { order?: DataPanelOrder; total: number; lines: number; delta: number }) {
  return <div className="space-y-2 rounded-xl border border-warning/30 bg-card p-4">
    <p className="break-words text-sm font-semibold">{order?.codice ?? "N/D"} · {order?.clienti?.nome ?? "N/D"}</p>
    <dl className="space-y-2 text-sm">{[["Ordine", total], ["Righe", lines], ["Differenza", delta]].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">{label}</dt><dd className="text-right tabular-nums">{eur(Number(value))}</dd></div>)}</dl>
    {(order?.sconto || order?.sconto_merce) ? <p className="text-xs text-muted-foreground">Presenti sconti aggiuntivi sull’ordine: verificare anche questi nel documento.</p> : null}
  </div>;
}