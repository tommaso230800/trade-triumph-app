import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { MapPin, Phone, Mail, MoreHorizontal, Loader2, Package, Trash2, Check, X, Plus, ChevronDown, ChevronUp, Upload, ImageIcon } from "lucide-react";
import { Azienda, useUpdateAzienda } from "@/hooks/useAziende";
import { useProdotti, useCreateProdotto, useDeleteProdotto, useUpdateProdotto, Prodotto } from "@/hooks/useProdotti";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);

interface AziendaCardProps {
  azienda: Azienda;
  onDelete: (id: string) => void;
}

type ProductForm = {
  nome: string;
  prezzo_listino: number;
  quantita_pezzi: number;
  pezzi_per_cartone: number;
  strati: number;
  cartoni_per_strato: number;
};

const defaultProductForm: ProductForm = {
  nome: "",
  prezzo_listino: 0,
  quantita_pezzi: 0,
  pezzi_per_cartone: 1,
  strati: 1,
  cartoni_per_strato: 1,
};

export function AziendaCard({ azienda, onDelete }: AziendaCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ProductForm>(defaultProductForm);
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState<ProductForm>(defaultProductForm);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: prodotti, isLoading } = useProdotti(isExpanded ? azienda.id : undefined);
  const createProdotto = useCreateProdotto();
  const updateProdotto = useUpdateProdotto();
  const deleteProdotto = useDeleteProdotto();
  const updateAzienda = useUpdateAzienda();

  const startEdit = (prodotto: Prodotto) => {
    setEditingId(prodotto.id);
    setEditForm({
      nome: prodotto.nome,
      prezzo_listino: prodotto.prezzo_listino,
      quantita_pezzi: prodotto.quantita_pezzi,
      pezzi_per_cartone: prodotto.pezzi_per_cartone,
      strati: prodotto.strati,
      cartoni_per_strato: prodotto.cartoni_per_strato,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(defaultProductForm);
  };

  const saveEdit = async () => {
    if (!editingId || !editForm.nome) return;
    await updateProdotto.mutateAsync({ id: editingId, ...editForm });
    cancelEdit();
  };

  const handleAddProduct = async () => {
    if (!newProduct.nome) return;
    await createProdotto.mutateAsync({ azienda_id: azienda.id, ...newProduct });
    setNewProduct(defaultProductForm);
    setIsAdding(false);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${azienda.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('aziende-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('aziende-logos')
        .getPublicUrl(fileName);

      await updateAzienda.mutateAsync({ id: azienda.id, logo_url: publicUrl });
      toast.success("Logo caricato!");
    } catch (error: any) {
      toast.error("Errore upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const calcTotaleCartoni = (strati: number, cartoniPerStrato: number) => strati * cartoniPerStrato;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="group rounded-xl bg-card shadow-card transition-all duration-300 hover:shadow-card-hover animate-fade-in overflow-hidden">
        {/* Card Header */}
        <div className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* Logo or Initial */}
              <div 
                className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-muted overflow-hidden cursor-pointer group/logo"
                onClick={() => fileInputRef.current?.click()}
              >
                {azienda.logo_url ? (
                  <img src={azienda.logo_url} alt={azienda.nome} className="w-full h-full object-cover" />
                ) : (
                  <span className="gradient-primary w-full h-full flex items-center justify-center text-primary-foreground font-bold text-xl">
                    {azienda.nome.charAt(0)}
                  </span>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center">
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    <Upload className="h-5 w-5 text-white" />
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-card-foreground truncate">{azienda.nome}</h3>
                <p className="text-sm text-muted-foreground">{azienda.settore || "—"}</p>
                {azienda.partita_iva && (
                  <p className="text-xs text-muted-foreground">P.IVA: {azienda.partita_iva}</p>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Carica Logo
                </DropdownMenuItem>
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
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Nome Prodotto</Label>
                          <Input
                            value={editForm.nome}
                            onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                            placeholder="Nome"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Prezzo Listino (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={editForm.prezzo_listino}
                            onChange={(e) => setEditForm({ ...editForm, prezzo_listino: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="border-t pt-3">
                          <Label className="text-xs font-semibold text-muted-foreground">Pallettizzazione</Label>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Pz/Cartone</Label>
                              <Input
                                type="number"
                                min="1"
                                value={editForm.pezzi_per_cartone}
                                onChange={(e) => setEditForm({ ...editForm, pezzi_per_cartone: parseInt(e.target.value) || 1 })}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Strati</Label>
                              <Input
                                type="number"
                                min="1"
                                value={editForm.strati}
                                onChange={(e) => setEditForm({ ...editForm, strati: parseInt(e.target.value) || 1 })}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Cart/Strato</Label>
                              <Input
                                type="number"
                                min="1"
                                value={editForm.cartoni_per_strato}
                                onChange={(e) => setEditForm({ ...editForm, cartoni_per_strato: parseInt(e.target.value) || 1 })}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Tot Cartoni</Label>
                              <Input
                                type="number"
                                value={calcTotaleCartoni(editForm.strati, editForm.cartoni_per_strato)}
                                disabled
                                className="h-8 text-sm bg-muted"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end gap-1 pt-2">
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
                            {formatCurrency(prodotto.prezzo_listino)} · {prodotto.pezzi_per_cartone} pz/cart · {prodotto.strati}×{prodotto.cartoni_per_strato} = {calcTotaleCartoni(prodotto.strati, prodotto.cartoni_per_strato)} cart/pallet
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
                  <div className="bg-card rounded-lg p-3 shadow-sm space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome Prodotto</Label>
                      <Input
                        value={newProduct.nome}
                        onChange={(e) => setNewProduct({ ...newProduct, nome: e.target.value })}
                        placeholder="Nome prodotto"
                        className="h-8 text-sm"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Prezzo Listino (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newProduct.prezzo_listino}
                        onChange={(e) => setNewProduct({ ...newProduct, prezzo_listino: parseFloat(e.target.value) || 0 })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="border-t pt-3">
                      <Label className="text-xs font-semibold text-muted-foreground">Pallettizzazione</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Pz/Cartone</Label>
                          <Input
                            type="number"
                            min="1"
                            value={newProduct.pezzi_per_cartone}
                            onChange={(e) => setNewProduct({ ...newProduct, pezzi_per_cartone: parseInt(e.target.value) || 1 })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Strati</Label>
                          <Input
                            type="number"
                            min="1"
                            value={newProduct.strati}
                            onChange={(e) => setNewProduct({ ...newProduct, strati: parseInt(e.target.value) || 1 })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Cart/Strato</Label>
                          <Input
                            type="number"
                            min="1"
                            value={newProduct.cartoni_per_strato}
                            onChange={(e) => setNewProduct({ ...newProduct, cartoni_per_strato: parseInt(e.target.value) || 1 })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Tot Cartoni</Label>
                          <Input
                            type="number"
                            value={calcTotaleCartoni(newProduct.strati, newProduct.cartoni_per_strato)}
                            disabled
                            className="h-8 text-sm bg-muted"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-1 pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsAdding(false);
                          setNewProduct(defaultProductForm);
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