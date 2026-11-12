import { Link, useSearchParams } from "react-router-dom";
import { X, AlertTriangle, CheckCircle2, ArrowUpRight } from "lucide-react";
import { useReorderPairs } from "@/hooks/useReorderPairs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { euro } from "@/lib/commercialProposal";

const d = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");

/** Client–company card opened from a reorder notification (/riordino?cliente=…&azienda=…). */
export function ReorderPairFocus() {
  const [params, setParams] = useSearchParams();
  const clienteId = params.get("cliente");
  const aziendaId = params.get("azienda");
  const { data = [], isLoading } = useReorderPairs();
  if (!clienteId || !aziendaId) return null;
  const pair = data.find((p) => p.cliente_id === clienteId && p.azienda_id === aziendaId);
  const close = () => { const next = new URLSearchParams(params); next.delete("cliente"); next.delete("azienda"); setParams(next, { replace: true }); };

  return (
    <section aria-label="Scheda riordino" className="space-y-4 rounded-xl border border-primary/30 bg-card p-4 shadow-sm lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Scheda riordino</p>
          {pair ? <h2 className="break-words text-base font-semibold">{pair.cliente_nome} · {pair.azienda_nome}</h2> : <h2 className="text-base font-semibold">Coppia cliente–azienda</h2>}
        </div>
        <Button variant="ghost" className="h-11 w-11 shrink-0 p-0" aria-label="Chiudi scheda" onClick={close}><X className="h-4 w-4" /></Button>
      </div>
      {isLoading ? <Skeleton className="h-24 w-full" /> : !pair ? (
        <p className="text-sm text-muted-foreground">Nessun ordine valido dal 1° gennaio 2026 per questa coppia, oppure il tuo profilo non ha accesso.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {pair.storico_insufficiente ? (
              <Badge variant="outline">Dati insufficienti</Badge>
            ) : pair.da_ricontattare ? (
              <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive"><AlertTriangle className="mr-1 h-3 w-3" />In ritardo di {Math.max(1, pair.giorni_ritardo)} giorni</Badge>
            ) : (
              <Badge variant="outline" className="border-success/30 bg-success/10 text-success"><CheckCircle2 className="mr-1 h-3 w-3" />Nessun ritardo</Badge>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
            <div><dt className="text-xs text-muted-foreground">Ultimo ordine</dt><dd className="tabular-nums">{d(pair.ultimo_ordine_data)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Frequenza dallo storico</dt><dd className="tabular-nums">{pair.media_giorni_riordino === null ? "Dati insufficienti" : `${Math.round(pair.media_giorni_riordino)} giorni`}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Riordino previsto</dt><dd className="tabular-nums">{pair.prossimo_riordino_previsto ? d(pair.prossimo_riordino_previsto) : "N/D"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Tolleranza</dt><dd className="tabular-nums">{pair.tolleranza} giorni</dd></div>
            <div><dt className="text-xs text-muted-foreground">Giorni dall’ultimo ordine</dt><dd className="tabular-nums">{pair.giorni_trascorsi}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Ordini considerati</dt><dd className="tabular-nums">{pair.numero_ordini}</dd></div>
            <div className="col-span-2 lg:text-right"><dt className="text-xs text-muted-foreground">Importo ultimo ordine</dt><dd className="tabular-nums">{euro(pair.ultimo_importo)}</dd></div>
          </dl>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button asChild variant="outline" className="h-11"><Link to={`/clienti/${pair.cliente_id}`}>Scheda cliente<ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild className="h-11"><Link to={`/ordini?cliente=${pair.cliente_id}&azienda=${pair.azienda_id}&storico=1`}>Ordini di questa coppia<ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>
          </div>
        </>
      )}
    </section>
  );
}
