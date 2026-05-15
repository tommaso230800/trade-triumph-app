import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Search, StickyNote, Archive } from "lucide-react";
import { useNotes, NOTE_CATEGORIES, Note } from "@/hooks/useNotes";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { NoteCard } from "@/components/notes/NoteCard";

export default function NotePage() {
  const { data: notes = [], isLoading } = useNotes();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [view, setView] = useState<"attive" | "archivio">("attive");

  const baseList = notes.filter((n) => (view === "attive" ? !n.completata : n.completata));

  const filtered = useMemo(() => {
    return baseList.filter((n) => {
      if (cat !== "all" && n.categoria !== cat) return false;
      if (q) {
        const hay = `${n.titolo} ${n.contenuto || ""} ${(n.checklist || []).map(i => i.text).join(" ")}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [baseList, q, cat]);

  const pinned = filtered.filter((n) => n.pinned);
  const others = filtered.filter((n) => !n.pinned);
  const archivedCount = notes.filter((n) => n.completata).length;
  const activeCount = notes.filter((n) => !n.completata).length;

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (n: Note) => { setEditing(n); setOpen(true); };

  return (
    <MainLayout>
      <div className="space-y-6 animate-rise-in">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Note</p>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <StickyNote className="h-7 w-7 text-primary" /> Le mie note
            </h1>
            <p className="text-muted-foreground">Tutto quello che succede e che devi ricordare.</p>
          </div>
          <Button onClick={openNew} size="lg">
            <Plus className="h-4 w-4 mr-2" /> Nuova nota
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca in titolo, testo, checklist..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={cat} onValueChange={setCat}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all">Tutte ({baseList.length})</TabsTrigger>
              {NOTE_CATEGORIES.map((c) => {
                const count = baseList.filter((n) => n.categoria === c.value).length;
                if (count === 0) return null;
                return (
                  <TabsTrigger key={c.value} value={c.value}>
                    {c.label} ({count})
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        <Tabs value={view} onValueChange={(v) => { setView(v as any); setCat("all"); }}>
          <TabsList>
            <TabsTrigger value="attive">
              <StickyNote className="h-4 w-4 mr-1" /> Attive ({activeCount})
            </TabsTrigger>
            <TabsTrigger value="archivio">
              <Archive className="h-4 w-4 mr-1" /> Archivio ({archivedCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <p className="text-muted-foreground">Caricamento...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
            <StickyNote className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nessuna nota. Crea la tua prima!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pinned.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Fissate in alto</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {pinned.map((n) => <NoteCard key={n.id} note={n} onEdit={openEdit} />)}
                </div>
              </div>
            )}
            {others.length > 0 && (
              <div className="space-y-3">
                {pinned.length > 0 && (
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Altre note</h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {others.map((n) => <NoteCard key={n.id} note={n} onEdit={openEdit} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <NoteEditor open={open} onOpenChange={setOpen} note={editing} />
    </MainLayout>
  );
}
