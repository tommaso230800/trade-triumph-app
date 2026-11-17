import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BellOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  PUSH_STATE_HELP,
  PUSH_STATE_LABEL,
  enablePushOnThisDevice,
  getPushState,
  type PushState,
} from "@/lib/webPush";

/**
 * Avviso compatto: compare solo se questo dispositivo NON riceve le notifiche
 * push, con l'attivazione a un tocco quando è possibile.
 */
export function PushActivationHint({ motivo }: { motivo: string }) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    let alive = true;
    getPushState().then((s) => alive && setState(s.state)).catch(() => alive && setState("non_supportata"));
    return () => { alive = false; };
  }, []);

  if (!state || state === "attive") return null;
  const attivabile = state === "da_attivare" || state === "da_concedere";

  const attiva = async () => {
    setBusy(true);
    try {
      const result = await enablePushOnThisDevice();
      setState(result);
      await qc.invalidateQueries({ queryKey: ["notifiche", "devices"] });
      if (result === "attive") toast.success("Notifiche attive su questo telefono");
      else toast.message(PUSH_STATE_LABEL[result], { description: PUSH_STATE_HELP[result] });
    } catch (e) {
      toast.error("Attivazione non riuscita", { description: e instanceof Error ? e.message : "Riprova tra poco." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
      <BellOff className="h-5 w-5 shrink-0 text-warning" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium">Notifiche non attive su questo telefono</p>
        <p className="text-xs text-muted-foreground">{motivo} {PUSH_STATE_HELP[state]}</p>
      </div>
      {attivabile && (
        <Button size="sm" onClick={attiva} disabled={busy}>
          {busy ? "Attivazione…" : "Attiva notifiche"}
        </Button>
      )}
    </div>
  );
}
