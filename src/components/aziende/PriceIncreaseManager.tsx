import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, TrendingUp, Percent, Euro } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAziende } from "@/hooks/useAziende";
import { useProdotti } from "@/hooks/useProdotti";
import {
  usePriceIncreases,
  useCreatePriceIncrease,
  useDeletePriceIncrease,
} from "@/hooks/usePriceIncreases";
import { cn } from "@/lib/utils";
import { it } from "date-fns/locale";

export function PriceIncreaseManager() {
  const { data: aziende = [] } = useAziende();
  const { data: allIncreases = [], isLoading } = usePriceIncreases();
  const createIncrease = useCreatePriceIncrease();
  const deleteIncrease = useDeletePriceIncrease();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedAzienda, setSelectedAzienda] = useState<string>("");
  const [effectiveDate, setEffectiveDate] = useState<Date>(new Date());
  const [increaseType, setIncreaseType] = useState<"percent" | "fixed">("percent");
  const [increaseValue, setIncreaseValue] = useState("");
  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const { data: prodotti = [] } = useProdotti(selectedAzienda || undefined);
  const [selectedProduct, setSelectedProduct] = useState<string>("");

  const resetForm = () => {
    setSelectedAzienda("");
    setEffectiveDate(new Date());
    setIncreaseType("percent");
    setIncreaseValue("");
    setCategory("");
    setReason("");
    setNotes("");
    setSelectedProduct("");
  };

  const handleSubmit = async () => {
    if (!selectedAzienda || !increaseValue) return;

    await createIncrease.mutateAsync({
      company_id: selectedAzienda,
      product_id: selectedProduct || null,
      effective_date: format(effectiveDate, "yyyy-MM-dd"),
      increase_type: increaseType,
      increase_value: parseFloat(increaseValue),
      category: category || null,
      reason: reason || null,
      notes: notes || null,
    });

    resetForm();
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteIncrease.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const today = new Date();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Aumenti di Prezzo
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Nuovo Aumento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Registra Aumento Prezzo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Azienda *</Label>
                  <Select value={selectedAzienda} onValueChange={setSelectedAzienda}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona azienda" />
                    </SelectTrigger>
                    <SelectContent>
                      {aziende.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Prodotto (opzionale)</Label>
                  <Select
                    value={selectedProduct}
                    onValueChange={setSelectedProduct}
                    disabled={!selectedAzienda}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tutti i prodotti" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti i prodotti</SelectItem>
                      {prodotti.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data decorrenza *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(effectiveDate, "dd/MM/yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={effectiveDate}
                          onSelect={(date) => date && setEffectiveDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Es: Vini rossi"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo aumento *</Label>
                    <Select
                      value={increaseType}
                      onValueChange={(v) => setIncreaseType(v as "percent" | "fixed")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">Percentuale (%)</SelectItem>
                        <SelectItem value="fixed">Fisso (EUR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Valore *</Label>
                    <div className="relative">
                      <Input
                        value={increaseValue}
                        onChange={(e) => setIncreaseValue(e.target.value)}
                        placeholder={increaseType === "percent" ? "5" : "0.50"}
                        type="number"
                        step="0.01"
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {increaseType === "percent" ? "%" : "EUR"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Motivazione</Label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Es: Aumento materie prime"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Note</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Note aggiuntive..."
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annulla
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createIncrease.isPending || !selectedAzienda || !increaseValue}
                >
                  {createIncrease.isPending ? "Salvataggio..." : "Salva"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Caricamento...
          </div>
        ) : allIncreases.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nessun aumento registrato</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {allIncreases.map((inc) => {
              const isActive = new Date(inc.effective_date) <= today;
              const isFuture = new Date(inc.effective_date) > today;

              return (
                <div
                  key={inc.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">
                        {inc.azienda?.nome}
                      </span>
                      {inc.prodotto && (
                        <Badge variant="outline" className="text-xs">
                          {inc.prodotto.nome}
                        </Badge>
                      )}
                      {inc.category && (
                        <Badge variant="secondary" className="text-xs">
                          {inc.category}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {inc.increase_type === "percent" ? (
                          <Percent className="h-3 w-3" />
                        ) : (
                          <Euro className="h-3 w-3" />
                        )}
                        +{inc.increase_value}
                        {inc.increase_type === "percent" ? "%" : " EUR"}
                      </span>
                      <span>
                        {format(new Date(inc.effective_date), "dd MMM yyyy", { locale: it })}
                      </span>
                      {inc.reason && <span className="truncate">{inc.reason}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isFuture ? (
                      <Badge className="bg-blue-100 text-blue-800">Futuro</Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800">Attivo</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(inc.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo aumento?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non puo essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
