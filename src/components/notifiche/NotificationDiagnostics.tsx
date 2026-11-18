import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, Loader2, Play, RefreshCw } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Diag {
  consegne_7gg: Record<string, number>; ricevute_7gg: number; notifiche_7gg: number;
  dispositivi: Array<{ utente: string; attivi: number; disattivati: number }>;
  errori_recenti: Array<{ at: string; fonte: string; messaggio: string }>;
}
const dt = (iso?: string | null) => iso ? new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" }) : "—";

export function NotificationDiagnostics() {
  const [running, setRunning] = useState(false);
  const diag = useQuery({
    queryKey: ["notifiche_diagnostica"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [summary, runs, pmRuns] = await Promise.all([
        supabase.rpc("notifiche_diagnostica"),
        supabase.from("notifiche_sistema_log").select("*").eq("job", "controllo_riordini").order("started_at", { ascending: false }).limit(1),
        supabase.from("notifiche_sistema_log").select("*").eq("job", "controllo_promemoria").order("started_at", { ascending: false }).limit(1),
      ]);
      if (summary.error) throw summary.error;
      return { summary: summary.data as unknown as Diag, lastRun: runs.data?.[0] ?? null, lastPmRun: pmRuns.data?.[0] ?? null };
    },
  });
  const runNow = async () => {
    setRunning(true);
    const { error } = await supabase.functions.invoke("reorder-alerts", { body: { source: "diagnostica" } });
    setRunning(false);
    if (error) toast.error("Controllo riordini non riuscito"); else toast.success("Controllo riordini completato");
    diag.refetch();
  };
  const c = diag.data?.summary.consegne_7gg ?? {};
  const run = diag.data?.lastRun;
  const det = (run?.details ?? {}) as Record<string, unknown>;

  return (
    <Card className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold"><Bell className="h-4 w-4" />Sistema notifiche</h2>
        <Button variant="outline" className="h-11" onClick={() => diag.refetch()} disabled={diag.isFetching}><RefreshCw className="mr-2 h-4 w-4" />Aggiorna</Button>
      </div>
      {diag.isError ? (
        <div role="alert" className="text-sm">Stato notifiche non disponibile. <Button variant="outline" onClick={() => diag.refetch()}>Riprova</Button></div>
      ) : diag.isLoading ? <Skeleton className="h-32 w-full" /> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Accettate dal servizio push</p><p className="text-2xl font-bold tabular-nums">{c.accettata ?? 0}</p></div>
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Ricezione verificata sul dispositivo</p><p className="text-2xl font-bold tabular-nums">{diag.data!.summary.ricevute_7gg}</p></div>
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">In coda o in invio</p><p className="text-2xl font-bold tabular-nums">{(c.in_coda ?? 0) + (c.invio ?? 0)}</p></div>
            <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Non riuscite / scadute</p><p className="text-2xl font-bold tabular-nums">{(c.fallita ?? 0) + (c.scaduta ?? 0)}</p></div>
          </div>
          <p className="text-xs text-muted-foreground">Ultimi 7 giorni · {diag.data!.summary.notifiche_7gg} avvisi registrati. “Accettata” significa presa in carico dal servizio push; la ricezione è verificata solo quando il dispositivo la conferma.</p>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Dispositivi attivi</h3>
            {diag.data!.summary.dispositivi.length === 0 ? <p className="text-sm text-muted-foreground">Nessun dispositivo attivato.</p> : (
              <ul className="divide-y rounded-lg border">{diag.data!.summary.dispositivi.map((d) => (
                <li key={d.utente} className="flex items-center justify-between gap-3 p-3 text-sm"><span>{d.utente}</span><span className="tabular-nums text-muted-foreground">{d.attivi} attivi{d.disattivati ? ` · ${d.disattivati} disattivati` : ""}</span></li>
              ))}</ul>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Ultimo controllo riordini</h3>
              <Button variant="outline" className="h-11" onClick={runNow} disabled={running}>{running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}Esegui ora</Button>
            </div>
            {!run ? <p className="text-sm text-muted-foreground">Mai eseguito.</p> : (
              <div className="space-y-1 rounded-lg border p-3 text-sm">
                <p className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={run.status === "ok" ? "border-success/30 bg-success/10 text-success" : run.status === "errore" ? "border-destructive/30 bg-destructive/10 text-destructive" : ""}>{run.status === "ok" ? "Completato" : run.status === "errore" ? "Errore" : "In corso"}</Badge>
                  <span className="tabular-nums">{dt(run.started_at)}</span>
                  <span className="text-xs text-muted-foreground">{det.avvio === "manuale" ? "manuale" : "programmato, ogni ora"}</span>
                </p>
                {run.status === "ok" && <p className="text-xs text-muted-foreground tabular-nums">{String(det.coppie ?? 0)} coppie · {String(det.in_ritardo ?? 0)} in ritardo · {String(det.dati_insufficienti ?? 0)} con dati insufficienti · {String(det.nuove_notifiche ?? 0)} nuovi avvisi{det.riepiloghi_giornalieri ? ` · ${String(det.riepiloghi_giornalieri)} riepilogo del mattino` : ""}</p>}
                {run.error && <p className="break-words text-xs text-destructive">{run.error}</p>}
              </div>
            )}
          </section>

          <PromemoriaJob run={diag.data!.lastPmRun} onDone={() => diag.refetch()} />

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Errori recenti</h3>
            {diag.data!.summary.errori_recenti.length === 0 ? <p className="text-sm text-muted-foreground">Nessun errore negli ultimi 7 giorni.</p> : (
              <ul className="divide-y rounded-lg border">{diag.data!.summary.errori_recenti.map((e, i) => (
                <li key={i} className="space-y-1 p-3 text-sm"><p className="flex justify-between gap-2"><span className="font-medium">{e.fonte}</span><span className="text-xs text-muted-foreground tabular-nums">{dt(e.at)}</span></p><p className="break-words text-xs text-muted-foreground">{e.messaggio}</p></li>
              ))}</ul>
            )}
          </section>
        </>
      )}
    </Card>
  );
}

type JobRun = { status: string; started_at: string; error: string | null; details: unknown } | null;

/** Errore leggibile da una chiamata a funzione edge (non pubblicata, rifiutata, fallita). */
async function describeInvokeError(error: unknown): Promise<string> {
  const e = error as { name?: string; message?: string; context?: Response };
  if (e?.name === "FunctionsHttpError" && e.context) {
    const status = e.context.status;
    if (status === 404) return "Funzione promemoria-alerts non pubblicata: va pubblicata in Lovable.";
    try {
      const body = await e.context.json();
      return `${body?.error ?? "Errore"}${body?.details ? ` — ${body.details}` : ""} (HTTP ${status})`;
    } catch {
      return `Errore HTTP ${status}`;
    }
  }
  if (e?.name === "FunctionsFetchError" || e?.name === "FunctionsRelayError") {
    return "Funzione promemoria-alerts non raggiungibile: probabilmente non è ancora pubblicata in Lovable.";
  }
  return e?.message ?? "Errore sconosciuto";
}

function PromemoriaJob({ run, onDone }: { run: JobRun; onDone: () => void }) {
  const [running, setRunning] = useState(false);
  const [esito, setEsito] = useState<string | null>(null);
  const det = (run?.details ?? {}) as Record<string, unknown>;
  const minutiFa = run ? Math.round((Date.now() - new Date(run.started_at).getTime()) / 60_000) : null;
  const fermo = minutiFa != null && minutiFa > 15;

  const runNow = async () => {
    setRunning(true);
    setEsito(null);
    const { data, error } = await supabase.functions.invoke("promemoria-alerts", { body: { source: "diagnostica" } });
    setRunning(false);
    if (error) {
      const msg = await describeInvokeError(error);
      setEsito(msg);
      toast.error("Controllo promemoria non riuscito", { description: msg });
    } else {
      const d = (data ?? {}) as Record<string, unknown>;
      setEsito(`Completato: ${String(d.in_scadenza ?? 0)} promemoria arrivati all'ora, ${String(d.nuove_notifiche ?? 0)} nuove notifiche.`);
      toast.success("Controllo promemoria completato");
    }
    onDone();
  };

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Ultimo controllo promemoria</h3>
        <Button variant="outline" className="h-11" onClick={runNow} disabled={running}>
          {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}Esegui ora
        </Button>
      </div>
      {!run ? (
        <p className="text-sm text-muted-foreground">
          Mai eseguito: il controllo automatico ogni 5 minuti non è ancora programmato in Lovable.
        </p>
      ) : (
        <div className="space-y-1 rounded-lg border p-3 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={run.status === "ok" ? "border-success/30 bg-success/10 text-success" : run.status === "errore" ? "border-destructive/30 bg-destructive/10 text-destructive" : ""}>{run.status === "ok" ? "Completato" : run.status === "errore" ? "Errore" : "In corso"}</Badge>
            <span className="tabular-nums">{dt(run.started_at)}</span>
            <span className="text-xs text-muted-foreground">{det.avvio === "manuale" ? "manuale" : "programmato, ogni 5 minuti"}</span>
          </p>
          {run.status === "ok" && <p className="text-xs text-muted-foreground tabular-nums">{String(det.in_scadenza ?? 0)} arrivati all'ora · {String(det.nuove_notifiche ?? 0)} nuove notifiche</p>}
          {run.error && <p className="break-words text-xs text-destructive">{run.error}</p>}
          {fermo && <p className="text-xs text-warning">Nessun controllo negli ultimi 15 minuti: la programmazione automatica sembra ferma o assente.</p>}
        </div>
      )}
      {esito && <p className="break-words rounded-lg bg-muted p-3 text-xs">{esito}</p>}
    </section>
  );
}
