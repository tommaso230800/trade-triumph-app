import { useEffect, useState } from "react";
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
import { Loader2 } from "lucide-react";
import { useClienti } from "@/hooks/useClienti";
import { useAziende } from "@/hooks/useAziende";
import { useOrdiniRighe, useUpdateOrdineRiga, useUpdateOrdineTotale } from "@/hooks/useOrdiniRighe";
import { useUpdateOrdine, type Ordine } from "@/hooks/useOrdini";
import { OrdineRigaEditor } from "./OrdineRigaEditor";
import { formatCurrency, parseDecimalInput, TIPI_PAGAMENTO } from "./ordiniShared";

type EditRiga = {
  id: string;
  prodotto_nome: string;
  quantita_pezzi: number;
  quantita_cartoni: number;
  prezzo_unitario: string;
  pezzi_per_cartone: number;
  sc1: string;
  sc2: string;
  sc3: string;
};

interface ModificaOrdineDialogProps {
  ordine: Ordine | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModificaOrdineDialog({ ordine, open, onOpenChange }: ModificaOrdineDialogProps) {
  const [editFormData, setEditFormData] = useState({
    cliente_id: "",
    azienda_id: "",
    note: "",
    sconto: "0",
    sconto_merce: "0",
    tipo_pagamento: "Contanti",
    data_ordine: "",
  });
  const [editRighe, setEditRighe] = useState<EditRiga[]>([]);

  const { data: clienti } = useClienti();
  const { data: aziende } = useAziende();
  const { data: righeForEdit } = useOrdiniRighe(ordine?.id);
  const updateRigaMutation = useUpdateOrdineRiga();
  const updateOrdineTotale = useUpdateOrdineTotale();
  const updateOrdine = useUpdateOrdine();

  // Precompila il form quando si apre il dialog per un ordine specifico
  useEffect(() => {
    if (ordine && open) {
      setEditFormData({
        cliente_id: ordine.cliente_id || "",
        azienda_id: ordine.azienda_id || "",
        note: ordine.note || "",
        sconto: String(ordine.sconto || 0).replace(".", ","),
        sconto_merce: String(ordine.sconto_merce || 0).replace(".", ","),
        tipo_pagamento: ordine.tipo_pagamento || "Contanti",
        data_ordine: ordine.data_ordine || "",
      });
    }
  }, [ordine, open]);

  useEffect(() => {
    if (righeForEdit && open) {
      setEditRighe(
        righeForEdit.map((r) => ({
          id: r.id,
          prodotto_nome: r.prodotti?.nome || "Prodotto",
          quantita_pezzi: r.quantita_pezzi,
          quantita_cartoni: r.quantita_cartoni,
          prezzo_unitario: String(r.prezzo_unitario).replace(".", ","),
          pezzi_per_cartone: r.prodotti?.pezzi_per_cartone || 1,
          sc1: String(r.sc1 || 0).replace(".", ","),
          sc2: String(r.sc2 || 0).replace(".", ","),
          sc3: String(r.sc3 || 0).replace(".", ","),
        }))
      );
    }
  }, [righeForEdit, open]);

  const updateEditRiga = (index: number, field: keyof EditRiga, value: number | string) => {
    const updated = [...editRighe];
    updated[index] = { ...updated[index], [field]: value } as EditRiga;
    setEditRighe(updated);
  };

  const rigaSubtotale = (riga: EditRiga): number => {
    const pezziTotali = riga.quantita_pezzi + riga.quantita_cartoni * riga.pezzi_per_cartone;
    const prezzoBase = pezziTotali * parseDecimalInput(riga.prezzo_unitario);
    const sc1 = parseDecimalInput(riga.sc1);
    const sc2 = parseDecimalInput(riga.sc2);
    const sc3 = parseDecimalInput(riga.sc3);
    const scontoTotale = 1 - (1 - sc1 / 100) * (1 - sc2 / 100) * (1 - sc3 / 100);
    return prezzoBase * (1 - scontoTotale);
  };

  const calcolaEditTotale = () => {
    const subtotale = editRighe.reduce((sum, riga) => sum + rigaSubtotale(riga), 0);
    const sconto = parseDecimalInput(editFormData.sconto);
    const scontoMerce = parseDecimalInput(editFormData.sconto_merce);
    const afterSconto = subtotale * (1 - sconto / 100);
    return Math.max(0, afterSconto - scontoMerce);
  };

  const calcolaEditProdottiTotali = () =>
    editRighe.reduce((sum, riga) => sum + riga.quantita_pezzi + riga.quantita_cartoni * riga.pezzi_per_cartone, 0);

  const handleSaveEdit = async () => {
    if (!ordine) return;

    try {
      for (const riga of editRighe) {
        await updateRigaMutation.mutateAsync({
          id: riga.id,
          quantita_pezzi: riga.quantita_pezzi,
          quantita_cartoni: riga.quantita_cartoni,
          prezzo_unitario: parseDecimalInput(riga.prezzo_unitario),
          sc1: parseDecimalInput(riga.sc1),
          sc2: parseDecimalInput(riga.sc2),
          sc3: parseDecimalInput(riga.sc3),
        });
      }

      await updateOrdine.mutateAsync({
        id: ordine.id,
        cliente_id: editFormData.cliente_id || null,
        azienda_id: editFormData.azienda_id || null,
        sconto: parseDecimalInput(editFormData.sconto),
        sconto_merce: parseDecimalInput(editFormData.sconto_merce),
        tipo_pagamento: editFormData.tipo_pagamento,
        note: editFormData.note || null,
        data_ordine: editFormData.data_ordine || null,
        totale: calcolaEditTotale(),
        prodotti: calcolaEditProdottiTotali(),
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving order:", error);
    }
  };

  const isSubmitting = updateRigaMutation.isPending || updateOrdine.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-4 py-4 sm:px-6">
          <DialogTitle>Modifica Ordine {ordine?.codice}</DialogTitle>
          <DialogDescription>Modifica tutti i dettagli dell'ordine</DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4 sm:px-6">
          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Cliente e azienda</h4>
            <div className="space-y-1.5">
              <Label className="text-sm">Data Ordine</Label>
              <Input
                type="date"
                value={editFormData.data_ordine}
                onChange={(e) => setEditFormData({ ...editFormData, data_ordine: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm">Cliente</Label>
                <Select
                  value={editFormData.cliente_id}
                  onValueChange={(v) => setEditFormData({ ...editFormData, cliente_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clienti?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Azienda Fornitrice</Label>
                <Select
                  value={editFormData.azienda_id}
                  onValueChange={(v) => setEditFormData({ ...editFormData, azienda_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona azienda" />
                  </SelectTrigger>
                  <SelectContent>
                    {aziende?.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-3 border-t border-border pt-4">
            <h4 className="text-sm font-semibold">Prodotti</h4>
            {editRighe.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {editRighe.map((riga, index) => (
                  <OrdineRigaEditor
                    key={riga.id}
                    prodottoNome={riga.prodotto_nome}
                    pezziPerCartone={riga.pezzi_per_cartone}
                    prezzoUnitario={riga.prezzo_unitario}
                    quantitaPezzi={riga.quantita_pezzi}
                    quantitaCartoni={riga.quantita_cartoni}
                    sc1={riga.sc1}
                    sc2={riga.sc2}
                    sc3={riga.sc3}
                    subtotale={rigaSubtotale(riga)}
                    onChangePrezzo={(v) => updateEditRiga(index, "prezzo_unitario", v)}
                    onChangeQuantitaPezzi={(v) => updateEditRiga(index, "quantita_pezzi", v)}
                    onChangeQuantitaCartoni={(v) => updateEditRiga(index, "quantita_cartoni", v)}
                    onChangeSc1={(v) => updateEditRiga(index, "sc1", v)}
                    onChangeSc2={(v) => updateEditRiga(index, "sc2", v)}
                    onChangeSc3={(v) => updateEditRiga(index, "sc3", v)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3 border-t border-border pt-4">
            <h4 className="text-sm font-semibold">Pagamento e sconti</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Tipo Pagamento</Label>
                <Select
                  value={editFormData.tipo_pagamento}
                  onValueChange={(v) => setEditFormData({ ...editFormData, tipo_pagamento: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPI_PAGAMENTO.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Sconto (%)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={editFormData.sconto}
                  onChange={(e) => setEditFormData({ ...editFormData, sconto: e.target.value })}
                  placeholder="es. 10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Sconto Merce (€)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={editFormData.sconto_merce}
                  onChange={(e) => setEditFormData({ ...editFormData, sconto_merce: e.target.value })}
                  placeholder="es. 50"
                />
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <Label>Note</Label>
            <Textarea
              value={editFormData.note}
              onChange={(e) => setEditFormData({ ...editFormData, note: e.target.value })}
              placeholder="Note aggiuntive..."
            />
          </section>
        </div>

        <div className="border-t border-border bg-card px-4 py-3 sm:px-6">
          <div className="mb-3 flex items-end justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              <p>{calcolaEditProdottiTotali()} pezzi</p>
              {(parseDecimalInput(editFormData.sconto) > 0 || parseDecimalInput(editFormData.sconto_merce) > 0) && (
                <p>
                  Sconto: {editFormData.sconto}% + {formatCurrency(parseDecimalInput(editFormData.sconto_merce))}
                </p>
              )}
            </div>
            <p className="text-xl font-bold tabular-nums">{formatCurrency(calcolaEditTotale())}</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salva Modifiche
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
