import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Check, Loader2, PackagePlus, X } from "lucide-react";
import { useCreateProdotto, type Prodotto } from "@/hooks/useProdotti";
import { findProductDuplicate } from "@/lib/productDuplicate";
import { parseDecimalInput } from "./ordiniShared";

interface NuovoProdottoRapidoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aziendaId: string;
  aziendaNome?: string;
  existingProducts: Prodotto[];
  /** Chiamato con il prodotto salvato (o quello esistente scelto): va aggiunto all'ordine. */
  onSaved: (prodotto: Prodotto) => void;
}

const emptyForm = () => ({
  nome: "",
  codice: "",
  prezzo_listino: "",
  formato: "",
  costo_acquisto: "",
  pezzi_per_cartone: 1,
  strati: 1,
  cartoni_per_strato: 1,
  sc1_default: "",
  sc2_default: "",
  sc3_default: "",
});

/** Creazione rapida prodotto durante un ordine: stessi campi e regole della
 *  scheda prodotto, salvataggio reale nel catalogo azienda, controllo
 *  duplicati su codice oppure nome+formato. I dati inseriti non si perdono
 *  in caso di errore e il doppio tocco è bloccato dal pending. */
export function NuovoProdottoRapidoDialog({ open, onOpenChange, aziendaId, aziendaNome, existingProducts, onSaved }: NuovoProdottoRapidoDialogProps) {
  const [form, setForm] = useState(emptyForm());
  const [duplicateOverride, setDuplicateOverride] = useState(false);
  const createProdotto = useCreateProdotto();

  useEffect(() => {
    if (open) {
      setForm(emptyForm());
      setDuplicateOverride(false);
    }
  }, [open]);

  const duplicate = useMemo(
    () => (duplicateOverride ? null : findProductDuplicate(existingProducts, form, aziendaId)),
    [existingProducts, form, aziendaId, duplicateOverride],
  );

  const prezzo = parseDecimalInput(form.prezzo_listino);
  const valid = form.nome.trim().length > 0 && prezzo > 0 && form.pezzi_per_cartone >= 1;
  const saving = createProdotto.isPending;

  const handleSave = async () => {
    if (!valid || saving) return;
    try {
      const created = await createProdotto.mutateAsync({
        azienda_id: aziendaId,
        nome: form.nome.trim(),
        codice: form.codice.trim() || null,
        prezzo_listino: prezzo,
        costo_acquisto: parseDecimalInput(form.costo_acquisto),
        quantita_pezzi: 0,
        pezzi_per_cartone: form.pezzi_per_cartone,
        strati: form.strati,
        cartoni_per_strato: form.cartoni_per_strato,
        formato: form.formato.trim() || null,
        sc1_default: parseDecimalInput(form.sc1_default),
        sc2_default: parseDecimalInput(form.sc2_default),
        sc3_default: parseDecimalInput(form.sc3_default),
      });
      onSaved(created as Prodotto);
    } catch {
      // Toast d'errore già mostrato dall'hook; i dati del modulo restano.
    }
  };

  const useExisting = () => {
    if (duplicate) onSaved(duplicate);
  };

  const fieldCls = "h-11 w-full min-w-0 rounded-lg border-order-line bg-order-surface text-base sm:text-sm";

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="inset-0 left-0 top-0 flex h-[100dvh] max-h-none w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-order-paper p-0 text-order-ink sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[88dvh] sm:w-[calc(100vw-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border sm:border-order-line [&>button:last-child]:hidden">
        <DialogHeader className="shrink-0 border-b border-order-line px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] text-left sm:px-6 sm:pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                <PackagePlus className="h-4 w-4 shrink-0 text-order-blue" /> Nuovo prodotto
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs text-order-muted">
                Sarà salvato nel catalogo{aziendaNome ? ` di ${aziendaNome}` : " dell'azienda"} e resterà disponibile anche per i prossimi ordini.
              </DialogDescription>
            </div>
            <button type="button" aria-label="Chiudi" onClick={() => onOpenChange(false)} disabled={saving} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-order-muted">
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6" style={{ WebkitOverflowScrolling: "touch" }}>
          {duplicate && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Forse esiste già</p>
                  <p className="mt-0.5 break-words text-xs text-order-muted">
                    {duplicate.nome}
                    {[duplicate.codice, duplicate.formato].filter(Boolean).length > 0 && ` · ${[duplicate.codice, duplicate.formato].filter(Boolean).join(" · ")}`}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button type="button" size="sm" className="h-9 gap-1.5 rounded-lg bg-order-blue text-primary-foreground hover:bg-order-blue/90" onClick={useExisting}>
                      <Check className="h-4 w-4" /> Usa questo
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-9 rounded-lg border-order-line" onClick={() => setDuplicateOverride(true)}>
                      Crea comunque
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="np-nome">Nome prodotto *</Label>
            <Input id="np-nome" autoFocus value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome prodotto" className={fieldCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="np-codice">Codice articolo</Label>
              <Input id="np-codice" value={form.codice} onChange={(e) => setForm({ ...form, codice: e.target.value })} placeholder="ABC123" className={fieldCls} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="np-formato">Formato</Label>
              <Input id="np-formato" value={form.formato} onChange={(e) => setForm({ ...form, formato: e.target.value })} placeholder="es. 1L, 700ml" className={fieldCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="np-prezzo">Prezzo listino (€) *</Label>
              <Input id="np-prezzo" type="text" inputMode="decimal" value={form.prezzo_listino} onChange={(e) => setForm({ ...form, prezzo_listino: e.target.value })} placeholder="es. 1,85" className={fieldCls} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="np-costo">Costo acquisto (€)</Label>
              <Input id="np-costo" type="text" inputMode="decimal" value={form.costo_acquisto} onChange={(e) => setForm({ ...form, costo_acquisto: e.target.value })} placeholder="es. 0,95" className={fieldCls} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="np-pzc">Pezzi per cartone *</Label>
            <Input id="np-pzc" type="number" min={1} inputMode="numeric" value={form.pezzi_per_cartone} onChange={(e) => setForm({ ...form, pezzi_per_cartone: Math.max(1, parseInt(e.target.value) || 1) })} className={fieldCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="np-strati">Strati pallet</Label>
              <Input id="np-strati" type="number" min={1} inputMode="numeric" value={form.strati} onChange={(e) => setForm({ ...form, strati: Math.max(1, parseInt(e.target.value) || 1) })} className={fieldCls} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="np-cps">Cartoni per strato</Label>
              <Input id="np-cps" type="number" min={1} inputMode="numeric" value={form.cartoni_per_strato} onChange={(e) => setForm({ ...form, cartoni_per_strato: Math.max(1, parseInt(e.target.value) || 1) })} className={fieldCls} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-order-muted">Sconti default %</Label>
            <div className="grid grid-cols-3 gap-3">
              {(["sc1_default", "sc2_default", "sc3_default"] as const).map((k, i) => (
                <div key={k} className="space-y-1">
                  <Label htmlFor={`np-${k}`} className="text-xs">Sc.{i + 1}</Label>
                  <Input id={`np-${k}`} type="text" inputMode="decimal" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder="0" className={fieldCls} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-order-line bg-order-paper px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          <Button type="button" className="h-12 w-full gap-2 rounded-lg bg-order-blue font-semibold text-primary-foreground hover:bg-order-blue/90" onClick={handleSave} disabled={!valid || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Salva e aggiungi all'ordine
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
