import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, Loader2, FileText, Pencil, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Ordine } from "@/hooks/useOrdini";

const euro = (n: number | null | undefined) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(n ?? 0));
const dt = (iso: string | null) => iso ? new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" }) : "—";
const d = (iso: string | null) => iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—";
const STATUS: Record<string, string> = { in_attesa: "In attesa", spedito: "Spedito", completato: "Confermato", annullato: "Annullato", stand_by: "Stand-by" };

/** Order summary opened from a notification: read through the user's own permissions. */
export function OrdineDettaglioNotifica({ ordineId, onClose, onShowProforma, onEdit }: {
  ordineId: string | null; onClose: () => void; onShowProforma: (o: Ordine) => void; onEdit: (o: Ordine) => void;
}) {
  const q = useQuery({
    queryKey: ["ordine_dettaglio_notifica", ordineId],
    enabled: !!ordineId,
    queryFn: async () => {
      const [ordine, invii] = await Promise.all([
        supabase.from("ordini").select("*, clienti(nome), aziende(nome)").eq("id", ordineId!).is("deleted_at", null).maybeSingle(),
        supabase.from("order_email_sends").select("id,status,created_at,sent_at,to_addresses,error_message,provider_message_id").eq("ordine_id", ordineId!).order("created_at", { ascending: false }),
      ]);
      if (ordine.error) throw ordine.error;
      return { ordine: ordine.data, invii: invii.data ?? [] };
    },
  });
  const o = q.data?.ordine as (Ordine & { clienti?: { nome: string } | null; aziende?: { nome: string } | null }) | null | undefined;

  return (
    <Dialog open={!!ordineId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{o ? `Ordine ${o.codice ?? ""}` : "Dettaglio ordine"}</DialogTitle>
          <DialogDescription>{o ? `${o.clienti?.nome ?? "Cliente N/D"} · ${o.aziende?.nome ?? "Azienda N/D"}` : "Apertura dalla notifica"}</DialogDescription>
        </DialogHeader>
        {q.isLoading ? (
          <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-24 w-full" /></div>
        ) : q.isError ? (
          <div role="alert" className="space-y-3 text-sm"><p>Ordine non caricato. Controlla la connessione.</p><Button variant="outline" onClick={() => q.refetch()}>Riprova</Button></div>
        ) : !o ? (
          <p className="text-sm text-muted-foreground">Ordine non disponibile: potrebbe essere stato eliminato oppure il tuo profilo non ha accesso.</p>
        ) : (
          <div className="space-y-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Totale ordine</p>
                <p className="text-3xl font-bold tracking-tight tabular-nums">{euro(o.totale)}</p>
              </div>
              <Badge variant="outline">{STATUS[o.status] ?? o.status}</Badge>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-muted-foreground">Data ordine</dt><dd className="tabular-nums">{d(o.data_ordine)}</dd></div>
              <div className="text-right"><dt className="text-xs text-muted-foreground">Registrato</dt><dd className="tabular-nums">{dt(o.created_at)}</dd></div>
            </dl>
            <section className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold"><Mail className="h-4 w-4" />Invio all’azienda</h3>
              {q.data!.invii.length === 0 ? (
                <p className="text-sm text-muted-foreground">Non ancora inviato.</p>
              ) : (
                <ul className="space-y-2">
                  {q.data!.invii.map((s) => (
                    <li key={s.id} className="space-y-1 rounded-lg border p-3 text-sm">
                      {s.status === "sent" ? (
                        <p className="flex items-center gap-2 font-medium text-success"><CheckCircle2 className="h-4 w-4" />Inviato il {dt(s.sent_at)}</p>
                      ) : s.status === "sending" ? (
                        <p className="flex items-center gap-2 font-medium text-warning"><Loader2 className="h-4 w-4" />Esito in verifica</p>
                      ) : (
                        <p className="flex items-center gap-2 font-medium text-destructive"><AlertTriangle className="h-4 w-4" />Invio non riuscito</p>
                      )}
                      <p className="break-words text-xs text-muted-foreground">A: {s.to_addresses.join(", ")}</p>
                      {s.status === "sent" && <p className="text-xs text-muted-foreground">Accettato dal servizio email; la consegna al destinatario non è verificabile.</p>}
                      {s.status === "error" && s.error_message && <p className="break-words text-xs text-muted-foreground">{s.error_message}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-11" onClick={() => { onShowProforma(o); onClose(); }}><FileText className="mr-2 h-4 w-4" />Proforma</Button>
              <Button variant="outline" className="h-11" onClick={() => { onEdit(o); onClose(); }}><Pencil className="mr-2 h-4 w-4" />Modifica</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
