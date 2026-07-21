import { MainLayout } from "@/components/layout/MainLayout";
import { useCestino, useRipristinaCestino, useEliminaDefinitivo } from "@/hooks/useCestino";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, RotateCcw, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { it as itLocale } from "date-fns/locale";
import { useState } from "react";
import { Input } from "@/components/ui/input";

const TIPO_LABEL: Record<string, string> = {
  clienti: "Cliente", ordini: "Ordine", prodotti: "Prodotto", aziende: "Azienda",
  segnalazioni: "Reclamo", documenti: "Documento", notes: "Nota", visite: "Visita",
  contratti_clienti: "Contratto", promo_clienti: "Promo",
};

export default function Cestino() {
  const { data: items = [], isLoading } = useCestino();
  const ripristina = useRipristinaCestino();
  const elimina = useEliminaDefinitivo();
  const [filter, setFilter] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("all");

  const filtered = items.filter((it) => {
    if (tipoFilter !== "all" && it.tipo !== tipoFilter) return false;
    if (filter && !it.nome.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  const tipos = Array.from(new Set(items.map((i) => i.tipo)));

  return (
    <MainLayout>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Trash2 className="h-8 w-8 text-brand-red" /> Cestino
          </h1>
          <p className="text-muted-foreground">Elementi eliminati. Purgati automaticamente dopo 30 giorni.</p>
        </header>

        <Card className="p-4 surface-noir">
          <div className="flex flex-wrap gap-3 items-center">
            <Input placeholder="Cerca…" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs" />
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant={tipoFilter === "all" ? "default" : "outline"} onClick={() => setTipoFilter("all")}>Tutti ({items.length})</Button>
              {tipos.map((t) => (
                <Button key={t} size="sm" variant={tipoFilter === t ? "default" : "outline"} onClick={() => setTipoFilter(t)}>
                  {TIPO_LABEL[t] ?? t}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="surface-noir divide-y divide-border">
          {isLoading ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Cestino vuoto</div>
          ) : filtered.map((it) => (
            <div key={`${it.tipo}-${it.id}`} className="p-4 flex items-center gap-3 hover-lift">
              <Badge variant="outline">{TIPO_LABEL[it.tipo] ?? it.tipo}</Badge>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{it.nome}</p>
                <p className="text-xs text-muted-foreground">Eliminato {format(new Date(it.deleted_at), "dd MMM yyyy HH:mm", { locale: itLocale })}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => ripristina.mutate({ tipo: it.tipo, id: it.id })} disabled={ripristina.isPending}>
                <RotateCcw className="h-4 w-4 mr-1" /> Ripristina
              </Button>
              <Button size="sm" variant="destructive" onClick={() => {
                if (confirm(`Eliminare definitivamente "${it.nome}"? Operazione irreversibile.`)) elimina.mutate({ tipo: it.tipo, id: it.id });
              }} disabled={elimina.isPending}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </Card>
      </div>
    </MainLayout>
  );
}
