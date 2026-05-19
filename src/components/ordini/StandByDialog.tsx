import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useSetOrdineStandBy } from "@/hooks/useOrdini";
import { PauseCircle } from "lucide-react";

const MOTIVI = [
  "Prodotto non disponibile",
  "Prodotto bloccato",
  "In attesa conferma cliente",
  "In attesa conferma azienda",
  "Pagamento da verificare",
  "Ordine sospeso temporaneamente",
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ordineId: string | null;
  ordineCodice?: string;
}

export function StandByDialog({ open, onOpenChange, ordineId, ordineCodice }: Props) {
  const [motivo, setMotivo] = useState(MOTIVI[0]);
  const [prodotto, setProdotto] = useState("");
  const [dataPrevista, setDataPrevista] = useState("");
  const [note, setNote] = useState("");
  const setStandBy = useSetOrdineStandBy();

  const reset = () => {
    setMotivo(MOTIVI[0]); setProdotto(""); setDataPrevista(""); setNote("");
  };

  const handleSubmit = async () => {
    if (!ordineId) return;
    await setStandBy.mutateAsync({
      id: ordineId,
      motivo,
      prodotto_bloccato: prodotto || null,
      data_prevista: dataPrevista || null,
      note: note || null,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PauseCircle className="h-5 w-5 text-warning" />
            Metti in Stand-by
          </DialogTitle>
          <DialogDescription>
            {ordineCodice ? `Ordine ${ordineCodice}` : "L'ordine non sarà conteggiato nei KPI finché non lo confermi."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Motivo *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MOTIVI.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Prodotto bloccato (opzionale)</Label>
            <Input value={prodotto} onChange={e => setProdotto(e.target.value)} placeholder="Es: Bitter 1814" />
          </div>
          <div>
            <Label>Data prevista di disponibilità</Label>
            <Input type="date" value={dataPrevista} onChange={e => setDataPrevista(e.target.value)} />
          </div>
          <div>
            <Label>Note interne</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Attendere conferma azienda..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button variant="warning" onClick={handleSubmit} disabled={setStandBy.isPending}>
            Metti in Stand-by
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
