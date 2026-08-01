import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Merge } from "lucide-react";
import type { Prodotto } from "@/hooks/useProdotti";
import { useMergeProdotti } from "@/hooks/useProdottiMerge";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);

interface MergeProdottiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prodotti: Prodotto[];
  initialSelectedIds?: string[];
}

type Step = "selezione" | "principale" | "riepilogo";

export function MergeProdottiDialog({ open, onOpenChange, prodotti, initialSelectedIds }: MergeProdottiDialogProps) {
  const [step, setStep] = useState<Step>("selezione");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedIds ?? []));
  const [primaryId, setPrimaryId] = useState<string>("");
  const [note, setNote] = useState("");
  const mergeProdotti = useMergeProdotti();

  const selectedProdotti = useMemo(
    () => prodotti.filter((p) => selectedIds.has(p.id)),
    [prodotti, selectedIds]
  );
  const primaryProdotto = selectedProdotti.find((p) => p.id === primaryId);
  const duplicateProdotti = selectedProdotti.filter((p) => p.id !== primaryId);

  const reset = () => {
    setStep("selezione");
    setSelectedIds(new Set(initialSelectedIds ?? []));
    setPrimaryId("");
    setNote("");
  };

  const handleOpenChange = (v: boolean) => {
    onOpenChange(v);
    if (!v) reset();
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!primaryId || duplicateProdotti.length === 0) return;
    await mergeProdotti.mutateAsync({
      primaryId,
      duplicateIds: duplicateProdotti.map((p) => p.id),
      note: note.trim() || undefined,
    });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-4 py-4 sm:px-6">
          <DialogTitle>Unifica prodotti</DialogTitle>
          <DialogDescription>
            {step === "selezione" && "Seleziona due o più prodotti duplicati della stessa azienda"}
            {step === "principale" && "Scegli quale diventerà il prodotto principale"}
            {step === "riepilogo" && "Rivedi prima di confermare: l'operazione non è reversibile dall'app"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
          {step === "selezione" && (
            <div className="space-y-2">
              {prodotti.length === 0 && (
                <p className="text-sm text-muted-foreground">Nessun prodotto disponibile per questa azienda.</p>
              )}
              {prodotti.map((p) => (
                <label
                  key={p.id}
                  className="flex touch-target items-center gap-3 rounded-lg border border-border p-3 text-sm"
                >
                  <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggleSelected(p.id)} />
                  <span className="min-w-0 flex-1 truncate">{p.nome}</span>
                  {p.codice && <span className="flex-shrink-0 text-xs text-muted-foreground">{p.codice}</span>}
                  <span className="flex-shrink-0 tabular-nums text-muted-foreground">
                    {formatCurrency(p.prezzo_listino)}
                  </span>
                </label>
              ))}
            </div>
          )}

          {step === "principale" && (
            <RadioGroup value={primaryId} onValueChange={setPrimaryId} className="space-y-2">
              {selectedProdotti.map((p) => (
                <label
                  key={p.id}
                  className="flex touch-target items-center gap-3 rounded-lg border border-border p-3 text-sm"
                >
                  <RadioGroupItem value={p.id} />
                  <span className="min-w-0 flex-1 truncate">{p.nome}</span>
                  {p.codice && <span className="flex-shrink-0 text-xs text-muted-foreground">{p.codice}</span>}
                </label>
              ))}
            </RadioGroup>
          )}

          {step === "riepilogo" && primaryProdotto && (
            <div className="space-y-4">
              <div className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
                <p className="font-semibold text-success">Prodotto principale</p>
                <p>{primaryProdotto.nome}</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-sm">
                <p className="mb-2 font-semibold text-muted-foreground">
                  Verranno spostati in "{primaryProdotto.nome}" tutti gli ordini storici, le condizioni
                  provvigionali, gli alias fornitore, gli omaggi erogati e i prezzi personalizzati cliente relativi a:
                </p>
                <ul className="list-inside list-disc space-y-1">
                  {duplicateProdotti.map((p) => (
                    <li key={p.id}>{p.nome}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  I prodotti duplicati verranno spostati nel Cestino (recuperabili da lì per 30 giorni).
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Nota (opzionale)</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motivo dell'unificazione..." />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border px-4 py-3 sm:px-6">
          {step === "selezione" && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Annulla
              </Button>
              <Button disabled={selectedIds.size < 2} onClick={() => setStep("principale")}>
                Continua
              </Button>
            </>
          )}
          {step === "principale" && (
            <>
              <Button variant="outline" onClick={() => setStep("selezione")}>
                Indietro
              </Button>
              <Button disabled={!primaryId} onClick={() => setStep("riepilogo")}>
                Continua
              </Button>
            </>
          )}
          {step === "riepilogo" && (
            <>
              <Button variant="outline" onClick={() => setStep("principale")}>
                Indietro
              </Button>
              <Button onClick={handleConfirm} disabled={mergeProdotti.isPending} className="gap-2">
                {mergeProdotti.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Merge className="h-4 w-4" />}
                Conferma unificazione
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
