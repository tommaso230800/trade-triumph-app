import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { AlertTriangle, TrendingDown, CalendarClock, Activity, Package, ShoppingCart } from "lucide-react";
import type { EnrichedPair } from "@/hooks/useReorderIntelligence";
import { FrequencyChart } from "./FrequencyChart";
import { VolumeChart } from "./VolumeChart";

const fmtD = (iso: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const AFFIDABILITA_LABEL: Record<string, string> = {
  alta: "Alta affidabilità",
  media: "Media affidabilità",
  bassa: "Bassa affidabilità",
  insufficiente: "Storico insufficiente",
};

interface Props {
  pair: EnrichedPair | null;
  onClose: () => void;
  onOrdina: (pair: EnrichedPair) => void;
  prodottiNomi: Map<string, string>;
}

export function PairDetailDialog({ pair, onClose, onOrdina, prodottiNomi }: Props) {
  if (!pair) return null;
  const sospetto = pair.rallentamento === "anomalo" || pair.rallentamento === "persistente" || pair.rallentamento === "in_recupero";

  return (
    <Dialog open={!!pair} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="flex h-[94dvh] max-h-[94dvh] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4 pr-12 sm:px-6">
          <DialogTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
            {pair.cliente_nome}
            <span className="text-sm font-normal text-muted-foreground">· {pair.azienda_nome}</span>
          </DialogTitle>
          <DialogDescription>
            {pair.numero_ordini} ordini · {pair.numero_date} date dal {fmtD(pair.primo_ordine)} · {AFFIDABILITA_LABEL[pair.affidabilita]}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6" style={{ WebkitOverflowScrolling: "touch" }}>
          {/* 4 KPI sopra il grafico */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Kpi label="Frequenza abituale" value={pair.frequenza_abituale !== null ? `${Math.round(pair.frequenza_abituale)} gg` : "N/D"} />
            <Kpi
              label="Frequenza recente"
              value={pair.frequenza_recente !== null ? `${Math.round(pair.frequenza_recente)} gg` : "N/D"}
              tone={sospetto ? "warning" : undefined}
            />
            <Kpi
              label="Frequenza operativa"
              value={pair.frequenza_operativa !== null ? `${pair.frequenza_operativa} gg` : "N/D"}
              tone={pair.variazione_recente_pct !== null && pair.variazione_recente_pct > 30 ? "destructive" : undefined}
            />
            <Kpi
              label="Prossimo riordino"
              value={pair.prossimo_riordino_previsto ? fmtD(pair.prossimo_riordino_previsto) : "Previsione non affidabile"}
              sub={pair.giorni_ritardo > 0 ? `${pair.giorni_ritardo} gg di ritardo` : undefined}
              tone={pair.giorni_ritardo > 0 ? "destructive" : undefined}
            />
          </div>

          {sospetto && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p>
                Il cliente ha aumentato l'intervallo tra gli ordini rispetto alle proprie abitudini
                {pair.rallentamento === "persistente" ? " per due o più cicli consecutivi" : ""}.
                Si consiglia una verifica commerciale.
              </p>
            </div>
          )}
          {pair.calo_volumi && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p>Cliente sospetto — calo dei volumi del {Math.abs(pair.calo_volumi_pct || 0)}% negli ultimi ordini, a frequenza invariata.</p>
            </div>
          )}

          <Tabs defaultValue="frequenza" className="mt-4">
            <TabsList className="grid h-auto w-full grid-cols-3 gap-1">
              <TabsTrigger value="frequenza" className="text-xs sm:text-sm"><Activity className="mr-1 h-3.5 w-3.5" />Frequenza</TabsTrigger>
              <TabsTrigger value="consumi" className="text-xs sm:text-sm"><TrendingDown className="mr-1 h-3.5 w-3.5" />Consumi</TabsTrigger>
              <TabsTrigger value="prodotti" className="text-xs sm:text-sm"><Package className="mr-1 h-3.5 w-3.5" />Prodotti</TabsTrigger>
            </TabsList>

            <TabsContent value="frequenza" className="mt-4 space-y-4">
              <FrequencyChart pair={pair} />
              {/* Previsione prossimo riordino */}
              {pair.prossimo_riordino_previsto && (
                <div className="rounded-lg border border-dashed border-primary/50 bg-primary/5 p-3">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    Previsione prossimo riordino
                  </p>
                  <p className="mt-1 text-sm">
                    Stimato il <span className="font-semibold">{fmtD(pair.prossimo_riordino_previsto)}</span>
                    {" "}con finestra di tolleranza fino al {fmtD(pair.finestra_fine)}.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {pair.affidabilita === "alta"
                      ? "Previsione basata su uno storico regolare e ampio."
                      : pair.affidabilita === "media"
                        ? "Previsione con affidabilità media: lo storico presenta una certa variabilità."
                        : "Previsione incerta: lo storico è limitato o molto variabile, considerala un'indicazione di massima."}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="consumi" className="mt-4">
              <VolumeChart pair={pair} />
            </TabsContent>

            <TabsContent value="prodotti" className="mt-4">
              {pair.prodotti_non_riordinati.length === 0 ? (
                <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                  Nessun prodotto abituale risulta in ritardo di riordino per questa coppia.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Prodotti acquistati regolarmente in passato che ora risultano in ritardo, mentre il cliente continua a ordinare altro.
                  </p>
                  {pair.prodotti_non_riordinati.map((pr) => (
                    <div key={pr.prodotto_id} className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 break-words text-sm font-medium">
                          {prodottiNomi.get(pr.prodotto_id) || "Prodotto"}
                        </p>
                        <Badge variant="outline" className="shrink-0 border-destructive/30 bg-destructive/10 text-destructive">
                          {pr.giorni_ritardo} gg di ritardo
                        </Badge>
                      </div>
                      <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground sm:grid-cols-4">
                        <span>Ultimo acquisto: {fmtD(pr.ultimo_acquisto)}</span>
                        <span>Frequenza: ogni {Math.round(pr.frequenza_giorni)} gg</span>
                        <span>Previsto: {fmtD(pr.prossima_data_prevista)}</span>
                        <span>Quantità abituale: {pr.quantita_media_cartoni} ct</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <details className="mt-4 rounded-lg border border-border p-3">
            <summary className="min-h-11 cursor-pointer text-sm font-semibold">Come è stata calcolata questa frequenza?</summary>
            <div className="space-y-3 text-xs">
              <p>{pair.numero_ordini} ordini validi, {pair.numero_date} giornate · {fmtD(pair.primo_ordine)} → {fmtD(pair.ultimo_ordine)}</p>
              <p>Media osservata: {pair.media_giorni ?? 'N/D'} gg · Mediana completa: {pair.mediana_giorni ?? 'N/D'} gg · Variabilità baseline: {pair.deviazione_giorni} gg</p>
              <p>Storica: {pair.frequenza_abituale ?? 'N/D'} gg · Recente (ultimi due intervalli): {pair.frequenza_recente ?? 'N/D'} gg · Operativa: {pair.frequenza_operativa ?? 'N/D'} gg · Tolleranza: {pair.tolleranza} gg</p>
              <p>{AFFIDABILITA_LABEL[pair.affidabilita]} · {pair.previsione_affidabile ? 'Previsione = ultima data + frequenza operativa arrotondata; ritardo oltre la tolleranza.' : 'Previsione non affidabile; nessun ritardo certo.'}</p>
              <ol className="space-y-2">
                {pair.ordini_analizzati.map(o => <li key={o.id} className="break-words"><Link className="text-primary underline" to={`/ordini?cliente=${pair.cliente_id}&azienda=${pair.azienda_id}&storico=1&ordine=${o.id}`}>{fmtD(o.data_ordine)} · {o.id}</Link></li>)}
              </ol>
              <ol className="space-y-2">
                {pair.intervalli.map(iv => <li key={`${iv.from_data}-${iv.to_data}`}>{fmtD(iv.from_data)} → {fmtD(iv.to_data)}: <strong className="tabular-nums">{iv.giorni} giorni</strong> · {iv.stato}</li>)}
              </ol>
              <p className="font-semibold">Ordini esclusi: {pair.ordini_esclusi.length}</p>
              {pair.ordini_esclusi.map(o => <p key={o.id} className="break-words">{o.codice || o.id} · {fmtD(o.data_ordine)} · {o.motivo}</p>)}
              {!pair.intervalli.length && <p>Nessun intervallo completato.</p>}
            </div>
          </details>

          {/* Priorità e motivi */}
          <div className="mt-4 rounded-lg border border-border p-3">
            <p className="text-sm font-semibold">
              Priorità commerciale:{" "}
              <Badge variant="outline" className={
                pair.priorita === "alta" ? "border-destructive/30 bg-destructive/10 text-destructive"
                : pair.priorita === "media" ? "border-warning/30 bg-warning/10 text-warning"
                : "border-border bg-muted text-muted-foreground"
              }>
                {pair.priorita}
              </Badge>
            </p>
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
              {pair.priorita_motivi.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 border-t border-border px-4 py-3 sm:px-6">
          <Button size="sm" className="gap-1.5" onClick={() => onOrdina(pair)}>
            <ShoppingCart className="h-3.5 w-3.5" /> Crea ordine
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to={`/ordini?cliente=${pair.cliente_id}&azienda=${pair.azienda_id}&storico=1`}>Visualizza ordini</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to={`/clienti/${pair.cliente_id}`}>Apri cliente</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "warning" | "destructive" }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-lg font-bold tabular-nums ${tone === "destructive" ? "text-destructive" : tone === "warning" ? "text-warning" : ""}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-destructive">{sub}</p>}
    </div>
  );
}
