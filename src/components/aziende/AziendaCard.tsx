import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MapPin, Phone, Mail, MoreHorizontal, Loader2, Package, Trash2, Check, X, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Azienda } from "@/hooks/useAziende";
import { useProdotti, useCreateProdotto, useDeleteProdotto, useUpdateProdotto, Prodotto } from "@/hooks/useProdotti";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);

interface AziendaCardProps {
  azienda: Azienda;
  onDelete: (id: string) => void;
}

export function AziendaCard({ azienda, onDelete }: AziendaCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", prezzo_listino: 0, quantita_pezzi: 0, pezzi_per_cartone: 1 });
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState({ nome: "", prezzo_listino: 0, quantita_pezzi: 0, pezzi_per_cartone: 1 });

  const { data: prodotti, isLoading } = useProdotti(isExpanded ? azienda.id : undefined);
  const createProdotto = useCreateProdotto();
  const updateProdotto = useUpdateProdotto();
  const deleteProdotto = useDeleteProdotto();

  const startEdit = (prodotto: Prodotto) => {
    setEditingId(prodotto.id);
    setEditForm({
      nome: prodotto.nome,
      prezzo_listino: prodotto.prezzo_listino,
      quantita_pezzi: prodotto.quantita_pezzi,
      pezzi_per_cartone: prodotto.pezzi_per_cartone,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ nome: "", prezzo_listino: 0, quantita_pezzi: 0, pezzi_per_cartone: 1 });
  };

  const saveEdit = async () => {
    if (!editingId || !editForm.nome) return;
    await updateProdotto.mutateAsync({ id: editingId, ...editForm });
    cancelEdit();
  };

  const handleAddProduct = async () => {
    if (!newProduct.nome) return;
    await createProdotto.mutateAsync({ azienda_id: azienda.id, ...newProduct });
    setNewProduct({ nome: "", prezzo_listino: 0, quantita_pezzi: 0, pezzi_per_cartone: 1 });
    setIsAdding(false);
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="group rounded-xl bg-card shadow-card transition-all duration-300 hover:shadow-card-hover animate-fade-in overflow-hidden">
        {/* Card Header */}
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-primary text-primary-foreground font-bold text-lg">
                {azienda.nome.charAt(0)}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-card-foreground truncate">{azienda.nome}</h3>
                <p className="text-sm text-muted-foreground">{azienda.settore || "—"}</p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(azienda.id)}
                >
                  Elimina
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            {azienda.citta && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{azienda.citta}</span>
              </div>
            )}
            {azienda.telefono && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{azienda.telefono}</span>
              </div>
            )}
            {azienda.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{azienda.email}</span>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <Badge
              className={
                azienda.status === "attivo"
                  ? "bg-success/10 text-success hover:bg-success/20"
                  : "bg-warning/10 text-warning hover:bg-warning/20"
              }
            >
              {azienda.status === "attivo" ? "Attivo" : "In Pausa"}
            </Badge>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <Package className="h-4 w-4 mr-1" />
                Prodotti
                {isExpanded ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        {/* Inline Products */}
        <CollapsibleContent>
          <div className="border-t border-border bg-muted/30 p-4 space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Product List */}
                {prodotti?.map((prodotto) => (
                  <div key={prodotto.id} className="bg-card rounded-lg p-3 shadow-sm">
                    {editingId === prodotto.id ? (
                      /* Edit Mode */
                      <div className="space-y-2">
                        <Input
                          value={editForm.nome}
                          onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                          placeholder="Nome"
                          className="h-8 text-sm"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={editForm.prezzo_listino}
                            onChange={(e) => setEditForm({ ...editForm, prezzo_listino: parseFloat(e.target.value) || 0 })}
                            placeholder="Prezzo"
                            className="h-8 text-sm"
                          />
                          <Input
                            type="number"
                            value={editForm.quantita_pezzi}
                            onChange={(e) => setEditForm({ ...editForm, quantita_pezzi: parseInt(e.target.value) || 0 })}
                            placeholder="Pezzi"
                            className="h-8 text-sm"
                          />
                          <Input
                            type="number"
                            min="1"
                            value={editForm.pezzi_per_cartone}
                            onChange={(e) => setEditForm({ ...editForm, pezzi_per_cartone: parseInt(e.target.value) || 1 })}
                            placeholder="Pz/Cart"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelEdit}
                            disabled={updateProdotto.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={saveEdit}
                            disabled={updateProdotto.isPending || !editForm.nome}
                          >
                            {updateProdotto.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <div className="flex items-center justify-between">
                        <div
                          className="flex-1 cursor-pointer hover:bg-muted/50 -m-1 p-1 rounded transition-colors"
                          onClick={() => startEdit(prodotto)}
                        >
                          <p className="font-medium text-sm">{prodotto.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(prodotto.prezzo_listino)} · {prodotto.quantita_pezzi} pz · {prodotto.pezzi_per_cartone} pz/cart
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteProdotto.mutate(prodotto.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Empty State */}
                {!prodotti?.length && !isAdding && (
                  <p className="text-center text-sm text-muted-foreground py-2">Nessun prodotto</p>
                )}

                {/* Add New Product Form */}
                {isAdding ? (
                  <div className="bg-card rounded-lg p-3 shadow-sm space-y-2">
                    <Input
                      value={newProduct.nome}
                      onChange={(e) => setNewProduct({ ...newProduct, nome: e.target.value })}
                      placeholder="Nome prodotto"
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={newProduct.prezzo_listino}
                        onChange={(e) => setNewProduct({ ...newProduct, prezzo_listino: parseFloat(e.target.value) || 0 })}
                        placeholder="Prezzo €"
                        className="h-8 text-sm"
                      />
                      <Input
                        type="number"
                        value={newProduct.quantita_pezzi}
                        onChange={(e) => setNewProduct({ ...newProduct, quantita_pezzi: parseInt(e.target.value) || 0 })}
                        placeholder="Pezzi"
                        className="h-8 text-sm"
                      />
                      <Input
                        type="number"
                        min="1"
                        value={newProduct.pezzi_per_cartone}
                        onChange={(e) => setNewProduct({ ...newProduct, pezzi_per_cartone: parseInt(e.target.value) || 1 })}
                        placeholder="Pz/Cart"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsAdding(false);
                          setNewProduct({ nome: "", prezzo_listino: 0, quantita_pezzi: 0, pezzi_per_cartone: 1 });
                        }}
                        disabled={createProdotto.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleAddProduct}
                        disabled={createProdotto.isPending || !newProduct.nome}
                      >
                        {createProdotto.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setIsAdding(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Aggiungi Prodotto
                  </Button>
                )}
              </>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
