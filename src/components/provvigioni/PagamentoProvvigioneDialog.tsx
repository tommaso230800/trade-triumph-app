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
import { AlertTriangle, Ban, CheckCircle2, CircleDot, Clock, type LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";


interface Props {
  fattura: ProvvigioneDialogItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStato?: StatoProvvigione;
}

export type ProvvigioneDialogItem = Pick<
  ScadenziarioFattura,
  | "id"
  | "numero_fattura"
  | "azienda_nome"
  | "cliente_nome"
  | "provvigione_calcolata"
  | "stato_provvigione"
  | "data_incasso_provvigione"
  | "importo_provvigione_pagata"
  | "metodo_pagamento_provvigione"
  | "note_provvigione"
> & { source?: "fattura" | "ordine" };

const statoOptions: {
  value: StatoProvvigione;
  label: string;
  desc: string;
  className: string;
  icon: LucideIcon;
}[] = [
  { value: "pagata", label: "Pagata", desc: "Interamente incassata", className: "status-prov-paid", icon: CheckCircle2 },
  { value: "da_pagare", label: "Non pagata", desc: "In attesa di pagamento", className: "status-prov-unpaid", icon: Clock },
  { value: "scaduta", label: "Scaduta", desc: "Scaduta e non pagata", className: "status-prov-overdue", icon: AlertTriangle },
  { value: "parziale", label: "Parzialmente pagata", desc: "Solo una parte incassata", className: "status-prov-partial", icon: CircleDot },
  { value: "contestazione", label: "In contestazione", desc: "Bloccata in disputa", className: "status-prov-contested", icon: Ban },
];

export const PagamentoProvvigioneDialog = ({ fattura, open, onOpenChange, initialStato }: Props) => {
  const { aggiornaStatoProvvigione } = useScadenziario();
  const [stato, setStato] = useState<StatoProvvigione>("pagata");
  const [dataPagamento, setDataPagamento] = useState(format(new Date(), "yyyy-MM-dd"));
  const [importo, setImporto] = useState<string>("");
  const [metodo, setMetodo] = useState<string>("bonifico");
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    if (!fattura) return;
    const currentStato = initialStato || (fattura.stato_provvigione as StatoProvvigione) || "pagata";
    setStato(currentStato);
    setDataPagamento(fattura.data_incasso_provvigione || format(new Date(), "yyyy-MM-dd"));
    const preset = currentStato === "pagata"
      ? (fattura.provvigione_calcolata || 0)
      : currentStato === "parziale"
      ? (fattura.importo_provvigione_pagata || 0)
      : (fattura.importo_provvigione_pagata || 0);
    setImporto(String(preset));
    setMetodo(fattura.metodo_pagamento_provvigione || "bonifico");
    setNote(fattura.note_provvigione || "");
  }, [fattura, open, initialStato]);

  if (!fattura) return null;

  const provvigioneMaturata = Number(fattura.provvigione_calcolata) || 0;
  const importoPagato = Number(importo) || 0;
  const importoResiduo = Math.max(0, provvigioneMaturata - importoPagato);
  const selectedOption = statoOptions.find((o) => o.value === stato) || statoOptions[0];
  const SelectedIcon = selectedOption.icon;

  const handleConfirm = async () => {
    await aggiornaStatoProvvigione.mutateAsync({
      id: fattura.id,
      source: fattura.source || "fattura",
      stato,
      importo_pagato: stato === "pagata" ? (importoPagato || provvigioneMaturata) : importoPagato,
      data_pagamento: stato === "pagata" || stato === "parziale" ? dataPagamento : null,
      metodo: stato === "pagata" || stato === "parziale" ? metodo : null,
      note: note.trim() || null,
    });
    onOpenChange(false);
  };

  const showPayFields = stato === "pagata" || stato === "parziale";
  const showResidual = stato === "parziale";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aggiorna stato provvigione</DialogTitle>
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
              <p className="font-semibold text-primary">€{provvigioneMaturata.toFixed(2)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Stato provvigione</Label>
            <RadioGroup value={stato} onValueChange={(v) => setStato(v as StatoProvvigione)} className="grid grid-cols-1 gap-2">
              {statoOptions.map((o) => (
                <label
                  key={o.value}
                  htmlFor={`stato-${o.value}`}
                  className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 transition ${stato === o.value ? o.className : ""}`}
                >
                  <RadioGroupItem value={o.value} id={`stato-${o.value}`} className="mt-1" />
                  <o.icon className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{o.label}</p>
                    <p className="text-xs text-muted-foreground">{o.desc}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className={`rounded-md border p-3 text-sm ${selectedOption.className}`}>
            <div className="flex items-center gap-2 font-medium">
              <SelectedIcon className="h-4 w-4" />
              {selectedOption.label}
            </div>
            {stato === "scaduta" && (
              <p className="mt-1 text-xs">
                La riga verrà evidenziata in rosso e mostrerà automaticamente i giorni di ritardo dalla scadenza.
              </p>
            )}
          </div>

          {showPayFields && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="data_pag">{stato === "parziale" ? "Data pagamento parziale" : "Data pagamento"}</Label>
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

              {showResidual && (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm flex items-center justify-between">
                  <span className="text-muted-foreground">Importo residuo</span>
                  <span className="font-semibold text-primary">
                    €{importoResiduo.toFixed(2)}
                  </span>
                </div>
              )}

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
