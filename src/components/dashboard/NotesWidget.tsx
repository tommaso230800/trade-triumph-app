import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, StickyNote, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useNotes, Note } from "@/hooks/useNotes";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { NoteCard } from "@/components/notes/NoteCard";

export function NotesWidget() {
  const { data: allNotes = [], isLoading } = useNotes();
  const notes = allNotes.filter((n) => !n.completata);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (n: Note) => { setEditing(n); setOpen(true); };

  return (
    <Card className="p-5 space-y-4 border-l-4 border-l-primary">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Note</h2>
          <span className="text-xs text-muted-foreground">({notes.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Nuova
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/note">Tutte <ArrowRight className="h-3 w-3 ml-1" /></Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Caricamento...</p>
      ) : notes.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-border rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">Nessuna nota ancora.</p>
          <Button size="sm" variant="outline" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> Crea la prima
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[520px] overflow-y-auto pr-1">
          {notes.map((n) => (
            <NoteCard key={n.id} note={n} onEdit={openEdit} compact />
          ))}
        </div>
      )}

      <NoteEditor open={open} onOpenChange={setOpen} note={editing} />
    </Card>
  );
}
