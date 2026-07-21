import { MainLayout } from "@/components/layout/MainLayout";
import { usePianificazione, useSavePianificazione, useDeletePianificazione } from "@/hooks/usePianificazione";
import { useClienti } from "@/hooks/useClienti";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { format, startOfWeek, addWeeks, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const GIORNI = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];

export default function Pianificazione() {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const settimana = format(weekStart, "yyyy-MM-dd");

  const { data: items = [] } = usePianificazione(settimana);
  const { data: clienti = [] } = useClienti();
  const save = useSavePianificazione();
  const del = useDeletePianificazione();

  const [addOpen, setAddOpen] = useState<{ giorno: number } | null>(null);
  const [addCliente, setAddCliente] = useState("");
  const [addOra, setAddOra] = useState("");
  const [addNote, setAddNote] = useState("");

  const submit = () => {
    if (!addOpen || !addCliente) return;
    save.mutate({
      settimana,
      giorno: addOpen.giorno,
      cliente_id: addCliente,
      ora_prevista: addOra || null,
      note: addNote || null,
    } as any);
    setAddOpen(null); setAddCliente(""); setAddOra(""); setAddNote("");
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        <header className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-3">
              <Calendar className="h-8 w-8 text-brand-blue" /> Pianificazione Settimanale
            </h1>
            <p className="text-muted-foreground">Settimana del {format(weekStart, "d MMMM yyyy", { locale: it })}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" onClick={() => setWeekOffset(0)}>Oggi</Button>
            <Button variant="outline" size="icon" onClick={() => setWeekOffset(weekOffset + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </header>

        <div className="grid gap-3 md:grid-cols-7">
          {GIORNI.map((g, idx) => {
            const giorno = idx + 1;
            const dayItems = items.filter((i) => i.giorno === giorno);
            const dayDate = addDays(weekStart, idx);
            return (
              <Card key={g} className="p-3 surface-noir min-h-[200px] flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-semibold">{g}</div>
                    <div className="text-xs text-muted-foreground">{format(dayDate, "d/M")}</div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setAddOpen({ giorno })}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2 flex-1">
                  {dayItems.map((it) => {
                    const cl = clienti.find((c: any) => c.id === it.cliente_id);
                    return (
                      <div key={it.id} className="rounded-lg p-2 bg-surface-glass border border-border text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {it.ora_prevista && <div className="text-xs font-mono text-brand-blue">{it.ora_prevista.slice(0,5)}</div>}
                            <div className="font-medium truncate">{cl?.nome ?? "Cliente"}</div>
                            {it.note && <div className="text-xs text-muted-foreground truncate">{it.note}</div>}
                          </div>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => del.mutate(it.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>

        <Dialog open={!!addOpen} onOpenChange={(o) => !o && setAddOpen(null)}>
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nuova visita — {addOpen && GIORNI[addOpen.giorno - 1]}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={addCliente} onValueChange={setAddCliente}>
                <SelectTrigger><SelectValue placeholder="Seleziona cliente" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {clienti.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="time" value={addOra} onChange={(e) => setAddOra(e.target.value)} placeholder="Ora prevista" />
              <Input value={addNote} onChange={(e) => setAddNote(e.target.value)} placeholder="Note" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(null)}>Annulla</Button>
              <Button onClick={submit} disabled={!addCliente}>Salva</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
