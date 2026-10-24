import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Gift, Trash2, Boxes, Info } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "./ordiniShared";
import type { LastOrderPriceInfo } from "@/lib/priceResolver";
import { parseLocalDate } from "@/lib/periodRange";

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
  prezzoSourceLabel?: string;
  prezzoSourceInfo?: LastOrderPriceInfo;
  onBlurPrezzo?: () => void;
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
  prezzoSourceLabel,
  prezzoSourceInfo,
  onBlurPrezzo,
  onChangePrezzo,
  onChangeQuantitaPezzi,
  onChangeQuantitaCartoni,
  onChangeSc1,
  onChangeSc2,
  onChangeSc3,
  onRemove,
  onAddOmaggio,
}: OrdineRigaEditorProps) {
  const numCls = "h-11 rounded-lg border-order-line bg-order-paper px-3 text-right text-base tabular-nums sm:text-sm";
  const pezziTot = quantitaPezzi + quantitaCartoni * pezziPerCartone;
  return (
    <div className={`min-w-0 rounded-xl border p-4 shadow-sm ${isOmaggio ? "border-success/40 bg-success/5" : "border-order-line bg-order-surface"}`}>
      {/* Prodotto */}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 break-words text-sm font-semibold leading-snug text-order-ink">{prodottoNome}</p>
            {isOmaggio && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
                <Gift className="h-3 w-3" /> Omaggio
              </span>
            )}
          </div>
          <p className="mt-1 break-words text-xs text-order-muted">
            {[formato, `${pezziPerCartone} pz/cartone`].filter(Boolean).join(" · ")}
            {strati !== undefined && cartoniPerStrato !== undefined && strati * cartoniPerStrato > 1 && (
              <span className="inline-flex items-center gap-1"> · <Boxes className="h-3 w-3" /> {strati * cartoniPerStrato} cart/pallet</span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!isOmaggio && onAddOmaggio && (
            <Button type="button" variant="ghost" size="icon" className="h-11 w-11 text-order-muted hover:text-success" onClick={onAddOmaggio} title="Aggiungi riga omaggio" aria-label="Aggiungi riga omaggio">
              <Gift className="h-4 w-4" />
            </Button>
          )}
          {onRemove && (
            <Button type="button" variant="ghost" size="icon" className="h-11 w-11 text-order-muted hover:text-destructive" onClick={onRemove} title="Elimina riga" aria-label="Elimina riga">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Quantità e prezzo */}
      <div className="mt-4 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1.3fr]">
        <div className="min-w-0 space-y-1">
          <Label className="text-xs text-order-muted">Cartoni</Label>
          <Input type="number" inputMode="numeric" min="0" className={numCls} value={quantitaCartoni} onFocus={(e) => e.target.select()}
            onChange={(e) => onChangeQuantitaCartoni(parseInt(e.target.value) || 0)} />
        </div>
        <div className="min-w-0 space-y-1">
          <Label className="text-xs text-order-muted">Pezzi sfusi</Label>
          <Input type="number" inputMode="numeric" min="0" className={numCls} value={quantitaPezzi} onFocus={(e) => e.target.select()}
            onChange={(e) => onChangeQuantitaPezzi(parseInt(e.target.value) || 0)} />
        </div>
        <div className="col-span-2 min-w-0 space-y-1 sm:col-span-1">
          <div className="flex min-w-0 items-center gap-1">
            <Label className="text-xs text-order-muted">Prezzo € / pezzo</Label>
            {!isOmaggio && prezzoSourceLabel && <span className="truncate text-[11px] text-order-muted">· {prezzoSourceLabel}</span>}
            {!isOmaggio && prezzoSourceInfo && (
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="-m-2 p-2 text-order-muted hover:text-order-ink" aria-label="Dettagli ultimo acquisto">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 text-xs" align="start">
                  <p className="font-semibold">Ultimo acquisto</p>
                  <p className="mt-1 text-muted-foreground">
                    {format(parseLocalDate(prezzoSourceInfo.date) ?? new Date(prezzoSourceInfo.date), "dd/MM/yyyy")}
                    {prezzoSourceInfo.orderCode && ` · ordine ${prezzoSourceInfo.orderCode}`}
                  </p>
                  <p className="mt-1 tabular-nums">
                    {formatCurrency(prezzoSourceInfo.price)} ×{" "}
                    {prezzoSourceInfo.quantitaCartoni > 0 && `${prezzoSourceInfo.quantitaCartoni} cartoni`}
                    {prezzoSourceInfo.quantitaCartoni > 0 && prezzoSourceInfo.quantitaPezzi > 0 && " + "}
                    {prezzoSourceInfo.quantitaPezzi > 0 && `${prezzoSourceInfo.quantitaPezzi} pz`}
                  </p>
                </PopoverContent>
              </Popover>
            )}
          </div>
          <Input type="text" inputMode="decimal" className={numCls} value={isOmaggio ? "0" : prezzoUnitario} disabled={isOmaggio}
            onChange={(e) => onChangePrezzo(e.target.value)} onBlur={onBlurPrezzo} placeholder="0,00" />
        </div>
      </div>

      {!isOmaggio && (
        <div className="mt-3 space-y-1">
          <Label className="text-xs text-order-muted">Sconti in cascata %</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { l: "1°", v: sc1, f: onChangeSc1 },
              { l: "2°", v: sc2, f: onChangeSc2 },
              { l: "3°", v: sc3, f: onChangeSc3 },
            ].map((x) => (
              <div key={x.l} className="relative min-w-0">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-order-muted">{x.l}</span>
                <Input type="text" inputMode="decimal" aria-label={`Sconto ${x.l} %`} className={`${numCls} pl-8`} value={x.v} onFocus={(e) => e.target.select()}
                  onChange={(e) => x.f(e.target.value)} placeholder="0" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-order-line pt-3">
        <span className="text-xs tabular-nums text-order-muted">{pezziTot} pezzi</span>
        <p className="text-base font-semibold tabular-nums text-order-ink">
          {isOmaggio ? <span className="text-success">Omaggio · 0,00 €</span> : formatCurrency(subtotale)}
        </p>
      </div>
    </div>
  );
}
