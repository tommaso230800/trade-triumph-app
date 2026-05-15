import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Pin, Plus, Trash2, X } from "lucide-react";
import { Note, NOTE_CATEGORIES, ChecklistItem, useUpsertNote } from "@/hooks/useNotes";
import { useClienti } from "@/hooks/useClienti";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  note?: Note | null;
}

const empty = (): Partial<Note> => ({
  titolo: "",
  contenuto: "",
  categoria: "generale",
  priorita: "media",
  pinned: false,
  checklist: [],
  cliente_id: null,
  data_promemoria: null,
});

export function NoteEditor({ open, onOpenChange, note }: Props) {
  const [draft, setDraft] = useState<Partial<Note>>(empty());
  const upsert = useUpsertNote();
  const { data: clienti = [] } = useClienti();

  useEffect(() => {
    if (open) setDraft(note ? { ...note, checklist: note.checklist || [] } : empty());
  }, [open, note]);

  const set = (k: keyof Note, v: any) => setDraft((d) => ({ ...d, [k]: v }));

  const addItem = () =>
    set("checklist", [...(draft.checklist || []), { id: crypto.randomUUID(), text: "", done: false }]);
  const updateItem = (id: string, patch: Partial<ChecklistItem>) =>
    set("checklist", (draft.checklist || []).map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const removeItem = (id: string) =>
    set("checklist", (draft.checklist || []).filter((i) => i.id !== id));

  const save = async () => {
    if (!draft.titolo?.trim() && !draft.contenuto?.trim() && !(draft.checklist?.length)) return;
    await upsert.mutateAsync({ ...draft, titolo: draft.titolo || "Senza titolo" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{note ? "Modifica nota" : "Nuova nota"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Titolo"
              value={draft.titolo || ""}
              onChange={(e) => set("titolo", e.target.value)}
              className="text-base font-semibold"
            />
            <Button
              type="button"
              variant={draft.pinned ? "default" : "outline"}
              size="icon"
              onClick={() => set("pinned", !draft.pinned)}
              title="Fissa in alto"
            >
              <Pin className="h-4 w-4" />
            </Button>
          </div>

          <Textarea
            placeholder="Scrivi qui... cose successe, da ricordare, dettagli cliente..."
            value={draft.contenuto || ""}
            onChange={(e) => set("contenuto", e.target.value)}
            rows={6}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Categoria</Label>
              <Select value={draft.categoria} onValueChange={(v) => set("categoria", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NOTE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Priorità</Label>
              <Select value={draft.priorita} onValueChange={(v) => set("priorita", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="bassa">Bassa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Cliente (opz.)</Label>
              <Select
                value={draft.cliente_id || "none"}
                onValueChange={(v) => set("cliente_id", v === "none" ? null : v)}
              >
                <SelectTrigger><SelectValue placeholder="Nessuno" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuno</SelectItem>
                  {clienti.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Checklist</Label>
              <Button type="button" size="sm" variant="outline" onClick={addItem}>
                <Plus className="h-3 w-3 mr-1" /> Aggiungi
              </Button>
            </div>
            <div className="space-y-2">
              {(draft.checklist || []).map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={item.done}
                    onCheckedChange={(c) => updateItem(item.id, { done: !!c })}
                  />
                  <Input
                    value={item.text}
                    onChange={(e) => updateItem(item.id, { text: e.target.value })}
                    placeholder="Cosa devi fare..."
                    className={item.done ? "line-through text-muted-foreground" : ""}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {(draft.checklist || []).length === 0 && (
                <p className="text-xs text-muted-foreground">Nessun task. Aggiungi spunte se serve.</p>
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs">Promemoria (opz.)</Label>
            <Input
              type="date"
              value={draft.data_promemoria || ""}
              onChange={(e) => set("data_promemoria", e.target.value || null)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={save} disabled={upsert.isPending}>Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
