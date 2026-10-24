import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, PackageSearch, Plus, Search, X } from "lucide-react";
import { formatCurrency } from "./ordiniShared";

export interface ProductPickerItem {
  id: string;
  nome: string;
  codice?: string | null;
  formato?: string | null;
  pezzi_per_cartone: number;
  prezzo_listino: number;
  brand?: string;
}

interface ProductPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: ProductPickerItem[];
  inOrder: Set<string>;
  onPick: (id: string) => void;
}

/** Selettore prodotti: a tutto schermo su iPhone, finestra centrata su iPad/Mac.
 *  Ricerca in alto, elenco scorrevole, descrizioni su più righe, prezzo separato. */
export function ProductPicker({ open, onOpenChange, products, inOrder, onPick }: ProductPickerProps) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return products;
    return products.filter((p) =>
      [p.nome, p.codice, p.formato, p.brand].some((v) => v?.toLowerCase().includes(t)),
    );
  }, [q, products]);

  const close = (v: boolean) => {
    onOpenChange(v);
    if (!v) setQ("");
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="inset-0 left-0 top-0 flex h-[100dvh] max-h-none w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-order-paper p-0 text-order-ink sm:left-1/2 sm:top-1/2 sm:h-[80dvh] sm:w-[calc(100vw-2rem)] sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border sm:border-order-line [&>button:last-child]:hidden">
        <DialogHeader className="shrink-0 space-y-3 border-b border-order-line px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] text-left sm:px-6 sm:pt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold">Aggiungi prodotti</DialogTitle>
              <DialogDescription className="text-xs text-order-muted">
                {products.length} prodotti del fornitore · tocca per aggiungere
              </DialogDescription>
            </div>
            <Button type="button" className="h-11 shrink-0 rounded-lg bg-order-ink px-4 text-primary-foreground hover:bg-order-ink/90" onClick={() => close(false)}>
              Fatto
            </Button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-order-muted" />
            <Input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome, codice, formato o marchio"
              className="h-11 rounded-lg border-order-line bg-order-surface pl-10 pr-10 text-base"
              enterKeyHint="search"
            />
            {q && (
              <button type="button" aria-label="Svuota ricerca" onClick={() => setQ("")} className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-order-muted">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-3" style={{ WebkitOverflowScrolling: "touch" }}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <PackageSearch className="h-6 w-6 text-order-muted" />
              <p className="text-sm font-semibold">Nessun prodotto trovato</p>
              <p className="text-xs text-order-muted">Prova con il codice o una parte del nome.</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {filtered.map((p) => {
                const added = inOrder.has(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onPick(p.id)}
                      className={`flex min-h-14 w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors duration-150 hover:bg-order-surface active:bg-order-surface ${added ? "bg-order-blue/5" : ""}`}
                    >
                      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${added ? "border-order-blue bg-order-blue text-primary-foreground" : "border-order-line bg-order-surface text-order-muted"}`}>
                        {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-sm font-medium leading-snug">{p.nome}</span>
                        <span className="mt-0.5 block break-words text-xs text-order-muted">
                          {[p.codice, p.formato, `${p.pezzi_per_cartone} pz/cart`, p.brand].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="shrink-0 pt-0.5 text-right text-sm font-semibold tabular-nums">{formatCurrency(p.prezzo_listino)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
