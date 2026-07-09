import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScadenziarioFattura, StatoProvvigione, useScadenziario } from "@/hooks/useScadenziario";
import { format } from "date-fns";
import { CheckCircle2, Clock, AlertCircle, HalfCircleIcon } from "lucide-react";

interface Props {
  fattura: ScadenziarioFattura | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statoOptions: { value: StatoProvvigione; label: string; desc: string }[] = [
  { value: "da_pagare", label: "Da pagare", desc: "In attesa di pagamento" },
  { value: "pagata", label: "Pagata", desc: "Interamente incassata" },
  { value: "parziale", label: "Parzialmente pagata", desc: "Solo una parte incassata" },
  { value: "contestazione", label: "In contestazione", desc: "Bloccata in disputa" },
];

export const PagamentoProvvigioneDialog = ({ fattura, open, onOpenChange }: Props) => {
  const { aggiornaStatoProvvigione } = useScadenziario();
  const [stato, setStato] = useState<StatoProvvigione>("pagata");
  const [dataPagamento, setDataPagamento] = useState(format(new Date(), "yyyy-MM-dd"));
  const [importo, setImporto] = useState<string>("");
  const [metodo, setMetodo] = useState<string>("bonifico");
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    if (!fattura) return;
    setStato((fattura.stato_provvigione as StatoProvvigione) || "pagata");
    setDataPagamento(fattura.data_incasso_provvigione || format(new Date(), "yyyy-MM-dd"));
    setImporto(String(fattura.importo_provvigione_pagata || fattura.provvigione_calcolata || 0));
    setMetodo(fattura.metodo_pagamento_provvigione || "bonifico");
    setNote(fattura.note_provvigione || "");
  }, [fattura, open]);

  if (!fattura) return null;

  const handleConfirm = async () => {
    await aggiornaStatoProvvigione.mutateAsync({
      id: fattura.id,
      stato,
      importo_pagato: Number(importo) || 0,
      data_pagamento: stato === "pagata" || stato === "parziale" ? dataPagamento : null,
      metodo: stato === "pagata" || stato === "parziale" ? metodo : null,
      note: note.trim() || null,
    });
    onOpenChange(false);
  };

  const showPayFields = stato === "pagata" || stato === "parziale";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestisci pagamento provvigione</DialogTitle>
          <DialogDescription>
            Fattura {fattura.numero_fattura} — {fattura.azienda_nome}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted rounded-lg text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Cliente</p>
              <p className="font-medium truncate">{fattura.cliente_nome}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Provvigione maturata</p>
              <p className="font-semibold text-primary">€{Number(fattura.provvigione_calcolata).toFixed(2)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Stato provvigione</Label>
            <RadioGroup value={stato} onValueChange={(v) => setStato(v as StatoProvvigione)} className="grid grid-cols-1 gap-2">
              {statoOptions.map((o) => (
                <label
                  key={o.value}
                  htmlFor={`stato-${o.value}`}
                  className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition"
                >
                  <RadioGroupItem value={o.value} id={`stato-${o.value}`} className="mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{o.label}</p>
                    <p className="text-xs text-muted-foreground">{o.desc}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {showPayFields && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="data_pag">Data pagamento</Label>
                  <Input
                    id="data_pag"
                    type="date"
                    value={dataPagamento}
                    onChange={(e) => setDataPagamento(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="importo">Importo pagato (€)</Label>
                  <Input
                    id="importo"
                    type="number"
                    step="0.01"
                    value={importo}
                    onChange={(e) => setImporto(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Metodo di pagamento</Label>
                <Select value={metodo} onValueChange={setMetodo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bonifico">Bonifico</SelectItem>
                    <SelectItem value="contanti">Contanti</SelectItem>
                    <SelectItem value="assegno">Assegno</SelectItem>
                    <SelectItem value="compensazione">Compensazione</SelectItem>
                    <SelectItem value="altro">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="note_prov">Note</Label>
            <Textarea
              id="note_prov"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note interne, ragione contestazione, ecc."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleConfirm} disabled={aggiornaStatoProvvigione.isPending}>
            {aggiornaStatoProvvigione.isPending ? "Salvataggio..." : "Conferma"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
