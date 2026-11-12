import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BellRing, CheckCircle2, Loader2, Smartphone, Trash2, AlertTriangle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDispositivi, useSendTest, type Dispositivo } from "@/hooks/useNotifiche";
import { useQueryClient } from "@tanstack/react-query";
import {
  PUSH_STATE_HELP, PUSH_STATE_LABEL, disablePushOnThisDevice, enablePushOnThisDevice, getPushState, type PushState,
} from "@/lib/webPush";

const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

const stateTone: Record<PushState, string> = {
  attive: "border-success/30 bg-success/10 text-success",
  da_attivare: "border-info/30 bg-info/10 text-info",
  da_concedere: "border-warning/30 bg-warning/10 text-warning",
  bloccate: "border-destructive/30 bg-destructive/10 text-destructive",
  installazione_necessaria: "border-warning/30 bg-warning/10 text-warning",
  apri_nuova_scheda: "border-warning/30 bg-warning/10 text-warning",
  non_supportata: "border-border bg-muted text-muted-foreground",
};

export function DeviceSection() {
  const { data: devices = [], isLoading, isError, refetch } = useDispositivi();
  const test = useSendTest();
  const qc = useQueryClient();
  const [state, setState] = useState<PushState | null>(null);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = async () => { const s = await getPushState(); setState(s.state); setEndpoint(s.endpoint); };
  useEffect(() => { reload(); }, []);

  const thisDevice = devices.find((d) => endpoint && d.endpoint === endpoint) ?? null;
  const effective: PushState | null = state === "attive" && thisDevice && !thisDevice.enabled ? "da_attivare" : state;

  const activate = async () => {
    setBusy(true);
    try {
      const result = await enablePushOnThisDevice();
      await reload();
      await qc.invalidateQueries({ queryKey: ["notifiche", "devices"] });
      if (result === "attive") toast.success("Notifiche attive su questo dispositivo");
      else toast.message(PUSH_STATE_LABEL[result], { description: PUSH_STATE_HELP[result] });
    } catch (e) {
      toast.error("Attivazione non riuscita", { description: e instanceof Error ? e.message : "Riprova tra poco." });
    } finally { setBusy(false); }
  };

  const sendTest = async (d: Dispositivo) => {
    try {
      const res = await test.mutateAsync(d.id);
      const outcome = res.deliveries[0];
      if (outcome?.status === "accettata") toast.success("Prova accettata dal servizio push", { description: "Se compare sul dispositivo, la ricezione viene registrata qui." });
      else if (outcome?.status === "scaduta") toast.error("Iscrizione scaduta", { description: "Riattiva le notifiche su quel dispositivo." });
      else toast.error("Prova non consegnata al servizio push", { description: outcome?.error ?? "Riproveremo automaticamente." });
      setTimeout(() => refetch(), 4000);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Prova non inviata"); }
  };

  const remove = async (d: Dispositivo) => {
    if (thisDevice?.id === d.id) await disablePushOnThisDevice(d.id);
    else await disablePushOnThisDevice(d.id).catch(() => undefined);
    await reload();
    await qc.invalidateQueries({ queryKey: ["notifiche", "devices"] });
    toast.success("Dispositivo rimosso");
  };

  return (
    <section className="space-y-4" aria-labelledby="dispositivi-title">
      <div>
        <h2 id="dispositivi-title" className="text-base font-semibold">I miei dispositivi</h2>
        <p className="text-xs text-muted-foreground">Ogni avviso arriva a tutti i dispositivi attivi del tuo profilo, anche ad app chiusa.</p>
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Smartphone className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold">Questo dispositivo</p>
            {effective ? (
              <Badge variant="outline" className={`whitespace-normal text-left ${stateTone[effective]}`}>{PUSH_STATE_LABEL[effective]}</Badge>
            ) : <Skeleton className="h-5 w-40" />}
            {effective && <p className="text-xs text-muted-foreground">{PUSH_STATE_HELP[effective]}</p>}
          </div>
        </div>
        {effective && effective !== "attive" && effective !== "non_supportata" && effective !== "bloccate" && effective !== "installazione_necessaria" && (
          <Button className="h-11 w-full" onClick={activate} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellRing className="mr-2 h-4 w-4" />}
            Attiva notifiche su questo dispositivo
          </Button>
        )}
        {effective === "bloccate" && (
          <Button variant="outline" className="h-11 w-full" onClick={reload}>Ho riattivato, controlla di nuovo</Button>
        )}
      </div>

      {isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border p-4 text-sm">Dispositivi non disponibili. <Button variant="outline" onClick={() => refetch()}>Riprova</Button></div>
      ) : isLoading ? (
        <Skeleton className="h-24 w-full rounded-xl" />
      ) : devices.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Nessun dispositivo attivato. La cronologia resta comunque disponibile qui.</p>
      ) : (
        <ul className="space-y-3">
          {devices.map((d) => (
            <li key={d.id} className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold">{d.nome || "Dispositivo"}{thisDevice?.id === d.id && <span className="ml-2 text-xs font-normal text-muted-foreground">(questo)</span>}</p>
                  <p className="text-xs text-muted-foreground">Attivato il {fmt(d.created_at)}</p>
                </div>
                {d.enabled
                  ? <Badge variant="outline" className="shrink-0 border-success/30 bg-success/10 text-success"><CheckCircle2 className="mr-1 h-3 w-3" />Attivo</Badge>
                  : <Badge variant="outline" className="shrink-0 border-destructive/30 bg-destructive/10 text-destructive">Disattivato</Badge>}
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div><dt className="text-muted-foreground">Ultimo invio accettato</dt><dd className="tabular-nums">{fmt(d.last_accepted_at)}</dd></div>
                <div className="text-right"><dt className="text-muted-foreground">Ricezione verificata</dt><dd className="tabular-nums">{fmt(d.last_received_at)}</dd></div>
              </dl>
              {(d.disabled_reason || d.last_error) && (
                <p className="flex items-start gap-2 text-xs text-warning"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="break-words">{d.disabled_reason || `Ultimo errore: ${d.last_error}`}</span></p>
              )}
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Button variant="outline" className="h-11" onClick={() => sendTest(d)} disabled={!d.enabled || test.isPending}>
                  {test.isPending && test.variables === d.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Invia notifica di prova
                </Button>
                <Button variant="ghost" className="h-11 w-11 p-0 text-muted-foreground" aria-label={`Rimuovi ${d.nome || "dispositivo"}`} onClick={() => remove(d)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
