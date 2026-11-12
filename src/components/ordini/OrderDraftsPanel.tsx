import { useState } from "react";
import { FileClock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useOrderDrafts, useDeleteOrderDraft, type OrderDraftRow } from "@/hooks/useOrderDrafts";
import { useAgencyMembers, memberName } from "@/hooks/useAgency";
import { formatCurrency } from "./ordiniShared";

const when = (iso: string) => new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", dateStyle: "short", timeStyle: "short" }).format(new Date(iso));

/** Bozze d'ordine: escluse da KPI, statistiche, riordino e provvigioni. */
export function OrderDraftsPanel({ clientNames, companyNames, onResume }: { clientNames: Map<string, string>; companyNames: Map<string, string>; onResume: (d: OrderDraftRow) => void }) {
  const drafts = useOrderDrafts();
  const remove = useDeleteOrderDraft();
  const members = useAgencyMembers();
  const [deleting, setDeleting] = useState<OrderDraftRow | null>(null);
  if (drafts.isLoading || drafts.isError || !drafts.data?.length) return null;
  return (
    <section className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold"><FileClock className="h-4 w-4 text-warning" /> Bozze <span className="text-sm font-normal tabular-nums text-muted-foreground">{drafts.data.length}</span></h2>
        <span className="text-xs text-muted-foreground">Non conteggiate nei totali</span>
      </div>
      <ul className="divide-y divide-border">
        {drafts.data.map((d) => {
          const autore = memberName(members.data ?? [], d.updated_by ?? d.created_by);
          return (
            <li key={d.id} className="flex items-center gap-2 py-2">
              <button type="button" onClick={() => onResume(d)} className="flex min-h-11 min-w-0 flex-1 flex-col items-start rounded-lg px-1 text-left hover:bg-muted/50">
                <span className="w-full truncate text-sm font-medium">{(d.cliente_id && clientNames.get(d.cliente_id)) || "Cliente da scegliere"}</span>
                <span className="w-full truncate text-xs text-muted-foreground tabular-nums">
                  {(d.azienda_id && companyNames.get(d.azienda_id)) || "Azienda da scegliere"} · {d.righe_count} righe · {when(d.updated_at)}{autore ? ` · ${autore}` : ""}
                </span>
              </button>
              <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(Number(d.totale) || 0)}</span>
              <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 text-muted-foreground hover:text-destructive" aria-label="Elimina bozza" onClick={() => setDeleting(d)}><Trash2 className="h-4 w-4" /></Button>
            </li>
          );
        })}
      </ul>
      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare la bozza?</AlertDialogTitle>
            <AlertDialogDescription>La bozza e le sue righe non saranno più recuperabili. Nessun ordine salvato viene toccato.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Annulla</AlertDialogCancel>
            <AlertDialogAction className="h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => {
              if (!deleting) return;
              try { await remove.mutateAsync(deleting.id); toast.success("Bozza eliminata"); } catch { toast.error("Eliminazione non riuscita. Riprova."); }
              setDeleting(null);
            }}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
