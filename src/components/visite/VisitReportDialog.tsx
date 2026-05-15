import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { useCreateVisitReport } from "@/hooks/useVisitReports";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clienteId: string;
  visitPreparationId?: string;
}

const CHIPS = (current: string | null, opts: string[], onChange: (v: string) => void) => (
  <div className="flex flex-wrap gap-1.5">
    {opts.map((o) => (
      <button key={o} type="button" onClick={() => onChange(o)} className={`px-3 py-1 rounded-full text-xs border transition-colors ${current === o ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/40"}`}>{o}</button>
    ))}
  </div>
);

export function VisitReportDialog({ open, onOpenChange, clienteId, visitPreparationId }: Props) {
  const create = useCreateVisitReport();
  const [form, setForm] = useState<any>({
    data_visita: new Date().toISOString().slice(0, 10),
    ordine_preso: false,
    valore_ordine: 0,
    interesse_cliente: null,
    umore_cliente: null,
  });
  const [conc, setConc] = useState<Array<{ nome: string; marca?: string; prezzo_acquisto?: number; condizioni?: string }>>([]);
  const [newConc, setNewConc] = useState({ nome: "", marca: "", prezzo_acquisto: "", condizioni: "" });

  const addConc = () => {
    if (!newConc.nome) return;
    setConc([...conc, { nome: newConc.nome, marca: newConc.marca || undefined, prezzo_acquisto: parseFloat(newConc.prezzo_acquisto) || undefined, condizioni: newConc.condizioni || undefined }]);
    setNewConc({ nome: "", marca: "", prezzo_acquisto: "", condizioni: "" });
  };

  const submit = async () => {
    await create.mutateAsync({
      ...form,
      cliente_id: clienteId,
      visit_preparation_id: visitPreparationId,
      concorrenza_rilevata: conc,
    });
    onOpenChange(false);
    setForm({ data_visita: new Date().toISOString().slice(0, 10), ordine_preso: false, valore_ordine: 0 });
    setConc([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Report visita</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Data visita</Label><Input type="date" value={form.data_visita} onChange={(e) => setForm({ ...form, data_visita: e.target.value })} /></div>
            <div><Label>Esito</Label><Input value={form.esito || ""} onChange={(e) => setForm({ ...form, esito: e.target.value })} placeholder="es. positivo" /></div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <Label>Ordine preso</Label>
            <Switch checked={form.ordine_preso} onCheckedChange={(v) => setForm({ ...form, ordine_preso: v })} />
          </div>

          {form.ordine_preso && (
            <div><Label>Valore ordine €</Label><Input type="number" step="0.01" value={form.valore_ordine || ""} onChange={(e) => setForm({ ...form, valore_ordine: parseFloat(e.target.value) || 0 })} /></div>
          )}

          <div>
            <Label className="mb-1 block">Interesse cliente</Label>
            {CHIPS(form.interesse_cliente, ["basso", "medio", "alto"], (v) => setForm({ ...form, interesse_cliente: v }))}
          </div>

          <div>
            <Label className="mb-1 block">Umore cliente</Label>
            {CHIPS(form.umore_cliente, ["freddo", "normale", "positivo", "molto interessato"], (v) => setForm({ ...form, umore_cliente: v }))}
          </div>

          <div><Label>Obiezioni ricevute</Label><Textarea rows={2} value={form.obiezioni || ""} onChange={(e) => setForm({ ...form, obiezioni: e.target.value })} /></div>
          <div><Label>Risposte date</Label><Textarea rows={2} value={form.risposte_date || ""} onChange={(e) => setForm({ ...form, risposte_date: e.target.value })} /></div>
          <div><Label>Promozioni discusse</Label><Input value={form.promozioni_discusse || ""} onChange={(e) => setForm({ ...form, promozioni_discusse: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Campioni lasciati</Label><Input value={form.campioni_lasciati || ""} onChange={(e) => setForm({ ...form, campioni_lasciati: e.target.value })} /></div>
            <div><Label>Espositori richiesti</Label><Input value={form.espositori_richiesti || ""} onChange={(e) => setForm({ ...form, espositori_richiesti: e.target.value })} /></div>
          </div>
          <div><Label>Materiale promozionale</Label><Input value={form.materiale_promozionale || ""} onChange={(e) => setForm({ ...form, materiale_promozionale: e.target.value })} /></div>

          {/* Concorrenza rilevata */}
          <div className="border border-border rounded-lg p-3 space-y-2">
            <Label className="font-semibold">Concorrenza rilevata in visita</Label>
            <p className="text-xs text-muted-foreground">Verrà salvata automaticamente nella scheda concorrenza del cliente.</p>
            {conc.map((c, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/40">
                <Badge variant="outline">{c.nome}{c.marca && ` · ${c.marca}`}</Badge>
                {c.prezzo_acquisto && <span className="text-xs">€{c.prezzo_acquisto.toFixed(2)}</span>}
                <Button size="icon" variant="ghost" className="h-6 w-6 ml-auto" onClick={() => setConc(conc.filter((_, j) => j !== i))}><X className="h-3 w-3" /></Button>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Nome prodotto" value={newConc.nome} onChange={(e) => setNewConc({ ...newConc, nome: e.target.value })} />
              <Input placeholder="Marca" value={newConc.marca} onChange={(e) => setNewConc({ ...newConc, marca: e.target.value })} />
              <Input placeholder="Prezzo acq. €" type="number" step="0.01" value={newConc.prezzo_acquisto} onChange={(e) => setNewConc({ ...newConc, prezzo_acquisto: e.target.value })} />
              <Input placeholder="Condizioni" value={newConc.condizioni} onChange={(e) => setNewConc({ ...newConc, condizioni: e.target.value })} />
            </div>
            <Button size="sm" variant="outline" onClick={addConc} disabled={!newConc.nome}><Plus className="h-3 w-3 mr-1" />Aggiungi rilevazione</Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Prossima azione</Label><Input value={form.prossima_azione || ""} onChange={(e) => setForm({ ...form, prossima_azione: e.target.value })} /></div>
            <div><Label>Data follow-up</Label><Input type="date" value={form.data_follow_up || ""} onChange={(e) => setForm({ ...form, data_follow_up: e.target.value })} /></div>
          </div>
          <div><Label>Note libere</Label><Textarea rows={3} value={form.note || ""} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button onClick={submit} disabled={create.isPending}>Salva report</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
