import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pin, Pencil, Trash2, Calendar, CheckCircle2, RotateCcw } from "lucide-react";
import { Note, NOTE_CATEGORIES, useDeleteNote, useUpsertNote } from "@/hooks/useNotes";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";

const prioritaStyle: Record<string, string> = {
  alta: "border-l-4 border-l-destructive",
  media: "border-l-4 border-l-warning",
  bassa: "border-l-4 border-l-info",
};

export function NoteCard({ note, onEdit, compact }: { note: Note; onEdit: (n: Note) => void; compact?: boolean }) {
  const del = useDeleteNote();
  const upsert = useUpsertNote();

  const toggleItem = (itemId: string) => {
    const checklist = (note.checklist || []).map((i) =>
      i.id === itemId ? { ...i, done: !i.done } : i
    );
    upsert.mutate({ id: note.id, checklist });
  };

  const togglePin = () => upsert.mutate({ id: note.id, pinned: !note.pinned });
  const toggleComplete = () => upsert.mutate({ id: note.id, completata: !note.completata, pinned: false });

  const cat = NOTE_CATEGORIES.find((c) => c.value === note.categoria)?.label || note.categoria;
  const totalTasks = note.checklist?.length || 0;
  const doneTasks = note.checklist?.filter((i) => i.done).length || 0;

  return (
    <Card className={cn("p-4 space-y-2 hover:shadow-lg transition-all", prioritaStyle[note.priorita], note.completata && "opacity-70")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {note.pinned && !note.completata && <Pin className="h-3.5 w-3.5 text-primary fill-primary" />}
            {note.completata && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
            <h3 className={cn("font-semibold text-foreground truncate", note.completata && "line-through")}>{note.titolo}</h3>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="secondary" className="text-xs">{cat}</Badge>
            <span className="text-xs text-muted-foreground">
              {format(parseISO(note.updated_at), "dd MMM HH:mm", { locale: it })}
            </span>
            {note.data_promemoria && (
              <span className="text-xs flex items-center gap-1 text-warning">
                <Calendar className="h-3 w-3" />
                {format(parseISO(note.data_promemoria), "dd MMM", { locale: it })}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {note.completata ? (
            <Button variant="ghost" size="icon" onClick={toggleComplete} className="h-8 w-8 text-info" title="Ripristina">
              <RotateCcw className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="icon" onClick={toggleComplete} className="h-8 w-8 text-success" title="Completa e archivia">
                <CheckCircle2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={togglePin} className="h-8 w-8">
                <Pin className={cn("h-4 w-4", note.pinned && "fill-primary text-primary")} />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={() => onEdit(note)} className="h-8 w-8">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm("Eliminare definitivamente questa nota?")) del.mutate(note.id);
            }}
            className="h-8 w-8 text-destructive"
            title="Elimina definitivamente"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {note.contenuto && (
        <p className={cn("text-sm text-foreground/80 whitespace-pre-wrap", compact && "line-clamp-3")}>
          {note.contenuto}
        </p>
      )}

      {totalTasks > 0 && (
        <div className="space-y-1 pt-1">
          {(compact ? note.checklist.slice(0, 3) : note.checklist).map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={item.done} onCheckedChange={() => toggleItem(item.id)} />
              <span className={cn("flex-1", item.done && "line-through text-muted-foreground")}>
                {item.text}
              </span>
            </div>
          ))}
          {compact && totalTasks > 3 && (
            <p className="text-xs text-muted-foreground">+{totalTasks - 3} altri</p>
          )}
          <p className="text-xs text-muted-foreground pt-1">{doneTasks}/{totalTasks} completati</p>
        </div>
      )}
    </Card>
  );
}
