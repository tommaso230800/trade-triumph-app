import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompetitorProduct, useUpsertCompetitorProduct } from "@/hooks/useCompetitorProducts";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clienteId: string;
  initial?: Partial<CompetitorProduct>;
}

export function CompetitorProductDialog({ open, onOpenChange, clienteId, initial }: Props) {
  const upsert = useUpsertCompetitorProduct();
  const [form, setForm] = useState<any>(initial || {});

  const submit = async () => {
    if (!form.nome) return;
    await upsert.mutateAsync({ ...form, cliente_id: clienteId });
    onOpenChange(false);
    setForm({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{initial?.id ? "Modifica concorrente" : "Nuovo prodotto concorrente"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label>Nome prodotto*</Label><Input value={form.nome || ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div><Label>Marca</Label><Input value={form.marca || ""} onChange={(e) => setForm({ ...form, marca: e.target.value })} /></div>
          <div><Label>Categoria</Label><Input value={form.categoria || ""} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></div>
          <div><Label>Formato</Label><Input value={form.formato || ""} onChange={(e) => setForm({ ...form, formato: e.target.value })} /></div>
          <div><Label>Prezzo acquisto cliente €</Label><Input type="number" step="0.01" value={form.prezzo_acquisto || ""} onChange={(e) => setForm({ ...form, prezzo_acquisto: parseFloat(e.target.value) || 0 })} /></div>
          <div><Label>Prezzo vendita pubblico €</Label><Input type="number" step="0.01" value={form.prezzo_vendita || ""} onChange={(e) => setForm({ ...form, prezzo_vendita: parseFloat(e.target.value) || 0 })} /></div>
          <div><Label>Sconto %</Label><Input type="number" step="0.01" value={form.sconto || ""} onChange={(e) => setForm({ ...form, sconto: parseFloat(e.target.value) || 0 })} /></div>
          <div><Label>Omaggi</Label><Input value={form.omaggi || ""} onChange={(e) => setForm({ ...form, omaggi: e.target.value })} placeholder="es. 1 ogni 10 cartoni" /></div>
          <div className="sm:col-span-2"><Label>Condizioni commerciali</Label><Input value={form.condizioni || ""} onChange={(e) => setForm({ ...form, condizioni: e.target.value })} /></div>
          <div><Label>Pagamento</Label><Input value={form.pagamento || ""} onChange={(e) => setForm({ ...form, pagamento: e.target.value })} /></div>
          <div><Label>Frequenza</Label><Input value={form.frequenza || ""} onChange={(e) => setForm({ ...form, frequenza: e.target.value })} /></div>
          <div><Label>Quantità abituale</Label><Input value={form.quantita_abituale || ""} onChange={(e) => setForm({ ...form, quantita_abituale: e.target.value })} /></div>
          <div><Label>Agente / azienda concorrente</Label><Input value={form.agente_concorrente || ""} onChange={(e) => setForm({ ...form, agente_concorrente: e.target.value })} /></div>
          <div><Label>Soddisfazione cliente (1-5)</Label><Input type="number" min={1} max={5} value={form.soddisfazione || ""} onChange={(e) => setForm({ ...form, soddisfazione: parseInt(e.target.value) || null })} /></div>
          <div><Label>Priorità</Label>
            <Select value={form.priorita || "media"} onValueChange={(v) => setForm({ ...form, priorita: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="alta">Alta</SelectItem><SelectItem value="media">Media</SelectItem><SelectItem value="bassa">Bassa</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Stato</Label>
            <Select value={form.stato || "da_monitorare"} onValueChange={(v) => setForm({ ...form, stato: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="da_attaccare">Da attaccare</SelectItem>
                <SelectItem value="da_monitorare">Da monitorare</SelectItem>
                <SelectItem value="difficile">Difficile da sostituire</SelectItem>
                <SelectItem value="sostituito">Già sostituito</SelectItem>
                <SelectItem value="perso">Perso contro concorrente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2"><Label>Punti forti del concorrente</Label><Textarea value={form.punti_forti || ""} onChange={(e) => setForm({ ...form, punti_forti: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Punti deboli del concorrente</Label><Textarea value={form.punti_deboli || ""} onChange={(e) => setForm({ ...form, punti_deboli: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Nostro vantaggio / proposta</Label><Textarea value={form.vantaggio || ""} onChange={(e) => setForm({ ...form, vantaggio: e.target.value })} /></div>
          <div><Label>Nostro prezzo consigliato €</Label><Input type="number" step="0.01" value={form.nostro_prezzo || ""} onChange={(e) => setForm({ ...form, nostro_prezzo: parseFloat(e.target.value) || null })} /></div>
          <div className="sm:col-span-2"><Label>Note</Label><Textarea value={form.note || ""} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={submit} disabled={!form.nome || upsert.isPending}>Salva</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
