import { useState } from "react";
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
import { format } from "date-fns";
import { ScadenziarioFattura, useScadenziario } from "@/hooks/useScadenziario";

interface Props {
  fattura: ScadenziarioFattura | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SegnaIncassataDialog = ({ fattura, open, onOpenChange }: Props) => {
  const [dataIncasso, setDataIncasso] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { segnaIncassata } = useScadenziario();

  const handleConfirm = async () => {
    if (!fattura) return;
    await segnaIncassata.mutateAsync({
      id: fattura.id,
      data_incasso: dataIncasso,
    });
    onOpenChange(false);
  };

  if (!fattura) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Segna come Incassata</DialogTitle>
          <DialogDescription>
            Conferma l'incasso della fattura {fattura.numero_fattura} di {fattura.cliente_nome}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg text-sm">
            <div>
              <p className="text-muted-foreground">Cliente</p>
              <p className="font-medium">{fattura.cliente_nome}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Azienda</p>
              <p className="font-medium">{fattura.azienda_nome}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Importo</p>
              <p className="font-medium text-lg">€{Number(fattura.importo).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Provvigione</p>
              <p className="font-medium text-lg text-green-600">
                €{Number(fattura.provvigione_calcolata).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_incasso">Data Incasso</Label>
            <Input
              id="data_incasso"
              type="date"
              value={dataIncasso}
              onChange={(e) => setDataIncasso(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleConfirm} disabled={segnaIncassata.isPending}>
            {segnaIncassata.isPending ? 'Salvataggio...' : 'Conferma Incasso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
