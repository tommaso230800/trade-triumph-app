import { useState } from "react";
import { Loader2, Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useDeleteEmailContact, useEmailContacts, useSaveEmailContact } from "@/hooks/useEmailContacts";
import type { EmailContact } from "@/lib/recipients";

type Draft = { id?: string; nome: string; email: string; ruolo: string; ruoloInvio: "to" | "cc" | "none" };
const empty: Draft = { nome: "", email: "", ruolo: "", ruoloInvio: "none" };

/** Address book of a company, shared by the whole agency; used when sending orders. */
export function CompanyEmailContacts({ aziendaId }: { aziendaId: string }) {
  const contacts = useEmailContacts();
  const save = useSaveEmailContact();
  const remove = useDeleteEmailContact();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<EmailContact | null>(null);
  const list = (contacts.data ?? []).filter((c) => c.azienda_id === aziendaId);

  const open = (c?: EmailContact) => {
    setError(null);
    setDraft(c ? { id: c.id, nome: c.nome, email: c.email, ruolo: c.ruolo ?? "", ruoloInvio: c.default_to ? "to" : c.default_cc ? "cc" : "none" } : empty);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setError(null);
    try {
      await save.mutateAsync({ id: draft.id, azienda_id: aziendaId, nome: draft.nome, email: draft.email, ruolo: draft.ruolo, default_to: draft.ruoloInvio === "to", default_cc: draft.ruoloInvio === "cc" });
      toast.success(draft.id ? "Contatto aggiornato" : "Contatto aggiunto");
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Salvataggio non riuscito");
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold"><Mail className="h-4 w-4 text-primary" /> Contatti email</h2>
          <p className="text-xs text-muted-foreground">Destinatari per l’invio degli ordini, condivisi con tutto il team</p>
        </div>
        <Button className="h-11 shrink-0 gap-2" onClick={() => open()}><Plus className="h-4 w-4" /> Aggiungi</Button>
      </div>
      {contacts.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : contacts.isError ? (
        <div className="flex items-center justify-between gap-2 text-sm"><span className="text-destructive">Rubrica non disponibile.</span><Button variant="outline" className="h-11" onClick={() => contacts.refetch()}>Riprova</Button></div>
      ) : list.length === 0 ? (
        <p className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">Nessun contatto salvato. Aggiungi chi riceve gli ordini (A) e chi va in copia (CC).</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {list.map((c) => (
            <li key={c.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {c.nome}
                  {c.default_to && <Badge variant="secondary">A predefinito</Badge>}
                  {c.default_cc && <Badge variant="outline">CC predefinito</Badge>}
                </p>
                <p className="break-all text-xs text-muted-foreground">{c.email}{c.ruolo ? ` · ${c.ruolo}` : ""}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label={`Modifica ${c.nome}`} onClick={() => open(c)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 text-destructive" aria-label={`Elimina ${c.nome}`} onClick={() => setConfirmDelete(c)}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Modifica contatto" : "Nuovo contatto email"}</DialogTitle>
            <DialogDescription>Salvato nella rubrica di questa azienda.</DialogDescription>
          </DialogHeader>
          {draft && (
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5"><Label htmlFor="ct-nome">Nome o descrizione</Label><Input id="ct-nome" className="h-12 text-base" value={draft.nome} onChange={(e) => setDraft({ ...draft, nome: e.target.value })} placeholder="Es. Ufficio ordini" /></div>
              <div className="space-y-1.5"><Label htmlFor="ct-email">Indirizzo email</Label><Input id="ct-email" type="email" inputMode="email" autoCapitalize="none" className="h-12 text-base" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="ordini@azienda.it" /></div>
              <div className="space-y-1.5"><Label htmlFor="ct-ruolo">Ruolo o ufficio (facoltativo)</Label><Input id="ct-ruolo" className="h-12 text-base" value={draft.ruolo} onChange={(e) => setDraft({ ...draft, ruolo: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label>Negli ordini</Label>
                <RadioGroup value={draft.ruoloInvio} onValueChange={(v) => setDraft({ ...draft, ruoloInvio: v as Draft["ruoloInvio"] })} className="grid gap-1">
                  {([["to", "Destinatario predefinito A"], ["cc", "Destinatario predefinito CC"], ["none", "Solo suggerimento"]] as const).map(([v, l]) => (
                    <label key={v} className="flex min-h-11 items-center gap-3 rounded-lg border border-border px-3 text-sm"><RadioGroupItem value={v} /> {l}</label>
                  ))}
                </RadioGroup>
              </div>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <DialogFooter><Button type="submit" className="h-12 w-full" disabled={save.isPending}>{save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salva contatto</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare {confirmDelete?.nome}?</AlertDialogTitle>
            <AlertDialogDescription>L’indirizzo {confirmDelete?.email} non sarà più proposto negli ordini. Gli invii già fatti restano nello storico.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Annulla</AlertDialogCancel>
            <AlertDialogAction className="h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => {
              if (!confirmDelete) return;
              try { await remove.mutateAsync(confirmDelete.id); toast.success("Contatto eliminato"); } catch (err) { toast.error(err instanceof Error ? err.message : "Eliminazione non riuscita"); }
              setConfirmDelete(null);
            }}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
