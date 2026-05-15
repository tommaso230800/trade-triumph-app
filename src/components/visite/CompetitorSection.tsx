import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Target } from "lucide-react";
import { useCompetitorProducts, useDeleteCompetitorProduct, CompetitorProduct } from "@/hooks/useCompetitorProducts";
import { CompetitorProductDialog } from "./CompetitorProductDialog";

interface Props { clienteId: string; }

const priorityColor: Record<string, string> = {
  alta: "bg-destructive/15 text-destructive border-destructive/30",
  media: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  bassa: "bg-muted text-muted-foreground",
};

export function CompetitorSection({ clienteId }: Props) {
  const { data: items = [] } = useCompetitorProducts(clienteId);
  const del = useDeleteCompetitorProduct();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CompetitorProduct | undefined>();

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /><h3 className="font-semibold">Concorrenza cliente</h3><Badge variant="outline">{items.length}</Badge></div>
          <Button size="sm" onClick={() => { setEditing(undefined); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Aggiungi</Button>
        </div>

        {items.length === 0 && <p className="text-sm text-muted-foreground">Nessun prodotto concorrente registrato.</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {items.map((c) => (
            <div key={c.id} className="border border-border rounded-lg p-3 space-y-1.5 bg-card hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.nome} {c.marca && <span className="text-muted-foreground text-sm">· {c.marca}</span>}</div>
                  {c.formato && <div className="text-xs text-muted-foreground">{c.formato}</div>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Badge variant="outline" className={priorityColor[c.priorita]}>{c.priorita}</Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                {c.prezzo_acquisto > 0 && <span>Acq: <strong>€{c.prezzo_acquisto.toFixed(2)}</strong></span>}
                {c.prezzo_vendita > 0 && <span>Vend: <strong>€{c.prezzo_vendita.toFixed(2)}</strong></span>}
                {c.nostro_prezzo && <span className="text-primary">Nostro: <strong>€{Number(c.nostro_prezzo).toFixed(2)}</strong></span>}
              </div>
              {c.condizioni && <div className="text-xs text-muted-foreground line-clamp-1">{c.condizioni}</div>}
              <div className="flex items-center justify-between pt-1">
                <Badge variant="outline" className="text-xs">{c.stato.replace(/_/g, " ")}</Badge>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { if (confirm("Eliminare?")) del.mutate(c.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <CompetitorProductDialog open={open} onOpenChange={setOpen} clienteId={clienteId} initial={editing} />
      </CardContent>
    </Card>
  );
}
