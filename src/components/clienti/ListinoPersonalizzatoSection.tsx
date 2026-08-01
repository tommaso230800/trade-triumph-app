import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Tag, Search, RotateCcw, Pencil } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useClienteReorderTracking } from "@/hooks/useReorderTracking";
import { useClientProductHistory } from "@/hooks/useClientProductHistory";
import {
  useCustomerProductPrices,
  useUpsertCustomerProductPrice,
  useDeleteCustomerProductPrice,
  type CustomerProductPrice,
} from "@/hooks/useCustomerProductPrices";
import { resolveProductPrice, PRICE_SOURCE_LABELS } from "@/lib/priceResolver";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);

const parseDecimalInput = (value: string): number => {
  const normalized = value.replace(",", ".");
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
};

type Filter = "all" | "custom" | "purchased";

interface ListinoPersonalizzatoSectionProps {
  clienteId: string;
}

export function ListinoPersonalizzatoSection({ clienteId }: ListinoPersonalizzatoSectionProps) {
  const [selectedAziendaId, setSelectedAziendaId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editNote, setEditNote] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CustomerProductPrice | null>(null);

  const { data: aziende = [] } = useAziende();
  const { data: reorderData = [] } = useClienteReorderTracking(clienteId);
  const { data: prodotti = [] } = useProdotti(selectedAziendaId || undefined);
  const { data: customPrices = [] } = useCustomerProductPrices(clienteId, selectedAziendaId || undefined);
  const { data: productHistory } = useClientProductHistory(clienteId, selectedAziendaId || undefined);
  const upsertPrice = useUpsertCustomerProductPrice();
  const deletePrice = useDeleteCustomerProductPrice();

  const aziendeConStorico = useMemo(
    () => new Set(reorderData.map((rt) => rt.azienda_id)),
    [reorderData]
  );

  const aziendeOrdinate = useMemo(() => {
    return [...aziende].sort((a, b) => {
      const aHa = aziendeConStorico.has(a.id) ? 0 : 1;
      const bHa = aziendeConStorico.has(b.id) ? 0 : 1;
      if (aHa !== bHa) return aHa - bHa;
      return a.nome.localeCompare(b.nome, "it");
    });
  }, [aziende, aziendeConStorico]);

  const customPriceMap = useMemo(
    () => new Map(customPrices.map((cp) => [cp.product_id, cp])),
    [customPrices]
  );
  const lastOrderMap = useMemo(
    () => new Map((productHistory?.products ?? []).map((p) => [p.prodotto_id, p])),
    [productHistory]
  );

  const rows = useMemo(() => {
    return prodotti.map((p) => {
      const custom = customPriceMap.get(p.id);
      const last = lastOrderMap.get(p.id);
      const resolved = resolveProductPrice({
        productId: p.id,
        listPrice: p.prezzo_listino,
        customPricesByProduct: customPriceMap,
        lastOrderByProduct: lastOrderMap,
      });
      return { prodotto: p, custom, last, resolved };
    });
  }, [prodotti, customPriceMap, lastOrderMap]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "custom" && !r.custom) return false;
      if (filter === "purchased" && !r.last) return false;
      if (term) {
        const matches =
          r.prodotto.nome.toLowerCase().includes(term) ||
          (r.prodotto.codice ?? "").toLowerCase().includes(term);
        if (!matches) return false;
      }
      return true;
    });
  }, [rows, search, filter]);

  const openEditDialog = (productId: string) => {
    const existing = customPriceMap.get(productId);
    setEditingProductId(productId);
    setEditPrice(existing ? String(existing.custom_price).replace(".", ",") : "");
    setEditNote(existing?.note ?? "");
  };

  const closeEditDialog = () => {
    setEditingProductId(null);
    setEditPrice("");
    setEditNote("");
  };

  const handleSavePrice = async () => {
    if (!editingProductId || !selectedAziendaId) return;
    await upsertPrice.mutateAsync({
      customer_id: clienteId,
      company_id: selectedAziendaId,
      product_id: editingProductId,
      custom_price: parseDecimalInput(editPrice),
      note: editNote.trim() || null,
    });
    closeEditDialog();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deletePrice.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const editingProdotto = prodotti.find((p) => p.id === editingProductId);

  return (
    <div className="rounded-xl bg-card p-4 shadow-card sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Tag className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Listino personalizzato</h3>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm">Azienda</Label>
        <Select value={selectedAziendaId} onValueChange={setSelectedAziendaId}>
          <SelectTrigger>
            <SelectValue placeholder="Seleziona un'azienda" />
          </SelectTrigger>
          <SelectContent>
            {aziendeOrdinate.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.nome}
                {aziendeConStorico.has(a.id) ? " · già acquistato" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedAziendaId && (
        <>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca prodotto o codice..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i prodotti</SelectItem>
                <SelectItem value="custom">Solo con prezzo personalizzato</SelectItem>
                <SelectItem value="purchased">Solo già acquistati</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 space-y-2">
            {filteredRows.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Nessun prodotto trovato</p>
            )}
            {filteredRows.map(({ prodotto, custom, last, resolved }) => (
              <div key={prodotto.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{prodotto.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {prodotto.codice && <span className="mr-2">{prodotto.codice}</span>}
                      {prodotto.formato && <span>{prodotto.formato}</span>}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="tabular-nums font-semibold">{formatCurrency(resolved.price)}</p>
                    <p className="text-[10px] text-muted-foreground">{PRICE_SOURCE_LABELS[resolved.source]}</p>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wide">Listino</span>
                    <span className="tabular-nums text-foreground">{formatCurrency(prodotto.prezzo_listino)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wide">Riservato</span>
                    <span className="tabular-nums text-foreground">
                      {custom ? formatCurrency(custom.custom_price) : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wide">Ultimo applicato</span>
                    <span className="tabular-nums text-foreground">
                      {last ? formatCurrency(last.last_prezzo_unitario) : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wide">Ultimo acquisto</span>
                    <span className="text-foreground">
                      {last
                        ? `${format(new Date(last.last_order_date), "dd/MM/yyyy")} · ${
                            last.last_quantita_cartoni > 0
                              ? `${last.last_quantita_cartoni} cart`
                              : `${last.last_quantita_pezzi} pz`
                          }`
                        : "—"}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center gap-2 border-t border-border pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => openEditDialog(prodotto.id)}
                  >
                    <Pencil className="h-3 w-3" />
                    {custom ? "Modifica prezzo" : "Imposta prezzo"}
                  </Button>
                  {custom && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1.5 text-xs text-muted-foreground"
                      onClick={() => setDeleteTarget(custom)}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Ripristina prezzo standard
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Dialog prezzo riservato */}
      <Dialog open={!!editingProductId} onOpenChange={(v) => !v && closeEditDialog()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Prezzo riservato</DialogTitle>
            <DialogDescription>{editingProdotto?.nome}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Prezzo (€)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                placeholder="es. 6,20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Nota (opzionale)</Label>
              <Textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Motivo del prezzo riservato..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              Annulla
            </Button>
            <Button onClick={handleSavePrice} disabled={upsertPrice.isPending || !editPrice.trim()}>
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conferma ripristino prezzo standard */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ripristinare il prezzo standard?</AlertDialogTitle>
            <AlertDialogDescription>
              Il prezzo riservato per questo prodotto verrà rimosso. Tornerà a essere usato l'ultimo prezzo applicato
              o, in sua assenza, il prezzo di listino.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={deletePrice.isPending}>
              Ripristina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
