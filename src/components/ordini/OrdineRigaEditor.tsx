import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift, Trash2, Boxes } from "lucide-react";
import { formatCurrency } from "./ordiniShared";

interface OrdineRigaEditorProps {
  prodottoNome: string;
  formato?: string | null;
  pezziPerCartone: number;
  strati?: number;
  cartoniPerStrato?: number;
  isOmaggio?: boolean;
  prezzoUnitario: string;
  quantitaPezzi: number;
  quantitaCartoni: number;
  sc1: string;
  sc2: string;
  sc3: string;
  subtotale: number;
  onChangePrezzo: (value: string) => void;
  onChangeQuantitaPezzi: (value: number) => void;
  onChangeQuantitaCartoni: (value: number) => void;
  onChangeSc1: (value: string) => void;
  onChangeSc2: (value: string) => void;
  onChangeSc3: (value: string) => void;
  onRemove?: () => void;
  onAddOmaggio?: () => void;
}

export function OrdineRigaEditor({
  prodottoNome,
  formato,
  pezziPerCartone,
  strati,
  cartoniPerStrato,
  isOmaggio,
  prezzoUnitario,
  quantitaPezzi,
  quantitaCartoni,
  sc1,
  sc2,
  sc3,
  subtotale,
  onChangePrezzo,
  onChangeQuantitaPezzi,
  onChangeQuantitaCartoni,
  onChangeSc1,
  onChangeSc2,
  onChangeSc3,
  onRemove,
  onAddOmaggio,
}: OrdineRigaEditorProps) {
  return (
    <div className={`space-y-3 rounded-xl p-3 ${isOmaggio ? "border border-success/40 bg-success/10" : "bg-muted/50"}`}>
      {/* Intestazione prodotto */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="break-words text-sm font-medium">{prodottoNome}</p>
            {isOmaggio && (
              <span className="inline-flex items-center gap-1 rounded bg-success/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-success">
                <Gift className="h-3 w-3" /> Omaggio
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {formato && <span className="mr-2">{formato}</span>}
            {pezziPerCartone} pz/cart
          </p>
          {strati !== undefined && cartoniPerStrato !== undefined && (
            <p className="mt-1 flex items-center gap-1 text-xs text-primary/80">
              <Boxes className="h-3.5 w-3.5" />
              {strati} strati × {cartoniPerStrato} cart/strato = {strati * cartoniPerStrato} cart/pallet
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isOmaggio ? (
            <span className="inline-flex h-8 items-center gap-1 rounded-md bg-success/20 px-2 text-xs font-semibold text-success">
              <Gift className="h-3.5 w-3.5" /> Omaggio
            </span>
          ) : (
            onAddOmaggio && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                onClick={onAddOmaggio}
                title="Aggiungi una riga omaggio per questo prodotto"
              >
                <Gift className="h-3.5 w-3.5" />
                <span className="text-xs">+ Omaggio</span>
              </Button>
            )
          )}
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Prezzo / Pezzi / Cartoni */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Prezzo</Label>
          <Input
            type="text"
            inputMode="decimal"
            className="h-10 px-2 text-sm"
            value={isOmaggio ? "0" : prezzoUnitario}
            disabled={isOmaggio}
            onChange={(e) => onChangePrezzo(e.target.value)}
            placeholder="1,85"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Pezzi</Label>
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            className="h-10 px-2 text-sm"
            value={quantitaPezzi}
            onChange={(e) => onChangeQuantitaPezzi(parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Cartoni</Label>
          <Input
            type="number"
            inputMode="numeric"
            min="0"
            className="h-10 px-2 text-sm"
            value={quantitaCartoni}
            onChange={(e) => onChangeQuantitaCartoni(parseInt(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* Sconti (nascosti per omaggio) */}
      {!isOmaggio && (
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sc1 %</Label>
            <Input
              type="text"
              inputMode="decimal"
              className="h-10 px-2 text-sm"
              value={sc1}
              onChange={(e) => onChangeSc1(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sc2 %</Label>
            <Input
              type="text"
              inputMode="decimal"
              className="h-10 px-2 text-sm"
              value={sc2}
              onChange={(e) => onChangeSc2(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sc3 %</Label>
            <Input
              type="text"
              inputMode="decimal"
              className="h-10 px-2 text-sm"
              value={sc3}
              onChange={(e) => onChangeSc3(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
      )}

      {/* Subtotale */}
      <div className="flex justify-end border-t border-border/50 pt-1">
        <p className="text-sm font-semibold tabular-nums">
          {isOmaggio ? <span className="text-success">Omaggio (0,00 €)</span> : formatCurrency(subtotale)}
        </p>
      </div>
    </div>
  );
}
