import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DocumentiSection } from "@/components/documenti/DocumentiSection";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  Mail, 
  Building2, 
  Loader2, 
  Package, 
  Plus, 
  Pencil, 
  Trash2, 
  Check, 
  X, 
  Upload, 
  ImageIcon,
  FileUp,
  Wand2,
  Tag
} from "lucide-react";
import { useAziende, useUpdateAzienda, Azienda } from "@/hooks/useAziende";
import { useProdotti, useCreateProdotto, useDeleteProdotto, useUpdateProdotto, Prodotto } from "@/hooks/useProdotti";
import { useBrands, useCreateBrand } from "@/hooks/useBrands";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImportProductsPDFDialog } from "@/components/aziende/ImportProductsPDFDialog";
import { SearchableSelect } from "@/components/ui/searchable-select";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);

const parseDecimalInput = (value: string): number => {
  const normalized = value.replace(",", ".");
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
};

type ProductForm = {
  nome: string;
  codice: string;
  prezzo_listino: string;
  costo_acquisto: string;
  quantita_pezzi: number;
  pezzi_per_cartone: number;
  strati: number;
  cartoni_per_strato: number;
  immagine_url?: string | null;
  formato: string;
  sc1_default: string;
  sc2_default: string;
  sc3_default: string;
  brand_id: string | null;
};

const defaultProductForm: ProductForm = {
  nome: "",
  codice: "",
  prezzo_listino: "0",
  costo_acquisto: "0",
  quantita_pezzi: 0,
  pezzi_per_cartone: 1,
  strati: 1,
  cartoni_per_strato: 1,
  immagine_url: null,
  formato: "",
  sc1_default: "0",
  sc2_default: "0",
  sc3_default: "0",
  brand_id: null,
};

type AziendaFormData = {
  nome: string;
  settore: string;
  citta: string;
  indirizzo: string;
  telefono: string;
  email: string;
  status: "attivo" | "in_pausa";
  partita_iva: string;
  provvigione_percentuale: string;
  default_sc1: string;
  default_sc2: string;
  default_sc3: string;
};

const AziendaDettaglio = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Prodotto | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(defaultProductForm);
  const [aziendaForm, setAziendaForm] = useState<AziendaFormData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { data: aziende, isLoading: isLoadingAzienda } = useAziende();
  const azienda = aziende?.find((a) => a.id === id);
  
  const { data: prodotti, isLoading: isLoadingProdotti, refetch: refetchProdotti } = useProdotti(id);
  const createProdotto = useCreateProdotto();
  const updateProdotto = useUpdateProdotto();
  const deleteProdotto = useDeleteProdotto();
  const updateAzienda = useUpdateAzienda();
  const { data: brands } = useBrands(id);
  const createBrand = useCreateBrand();

  // State for new brand creation
  const [isNewBrandDialogOpen, setIsNewBrandDialogOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");

  // Brand options for searchable select
  const brandOptions = (brands || []).map(b => ({
    value: b.id,
    label: b.name,
    searchTerms: []
  }));

  const handleCreateNewBrand = async () => {
    if (!newBrandName.trim() || !id) return;
    const newBrand = await createBrand.mutateAsync({
      name: newBrandName.trim(),
      azienda_id: id
    });
    setProductForm({ ...productForm, brand_id: newBrand.id });
    setNewBrandName("");
    setIsNewBrandDialogOpen(false);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !azienda) return;

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

  const handleProductImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('prodotti-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('prodotti-images')
        .getPublicUrl(fileName);

      setProductForm({ ...productForm, immagine_url: publicUrl });
      toast.success("Immagine caricata!");
    } catch (error: any) {
      toast.error("Errore upload: " + error.message);
    }
  };

  const openEditAziendaDialog = () => {
    if (!azienda) return;
    setAziendaForm({
      nome: azienda.nome,
      settore: azienda.settore || "",
      citta: azienda.citta || "",
      indirizzo: azienda.indirizzo || "",
      telefono: azienda.telefono || "",
      email: azienda.email || "",
      status: azienda.status,
      partita_iva: azienda.partita_iva || "",
      provvigione_percentuale: String(azienda.provvigione_percentuale || 0),
      default_sc1: String(azienda.default_sc1 || 0).replace(".", ","),
      default_sc2: String(azienda.default_sc2 || 0).replace(".", ","),
      default_sc3: String(azienda.default_sc3 || 0).replace(".", ","),
    });
    setIsEditDialogOpen(true);
  };

  const handleLookupPiva = async () => {
    if (!aziendaForm) return;
    const piva = aziendaForm.partita_iva.trim();
    if (piva.length < 11) {
      toast.error("Inserisci una P.IVA valida (11 cifre)");
      return;
    }
    
    setIsLookingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke('lookup-piva', {
        body: { partita_iva: piva }
      });
      
      if (error) throw error;
      
      if (data?.success && data?.data) {
        setAziendaForm(prev => prev ? {
          ...prev,
          nome: data.data.nome || prev.nome,
          indirizzo: data.data.indirizzo || prev.indirizzo,
          citta: data.data.citta || prev.citta,
        } : null);
        toast.success("Dati azienda recuperati!");
      } else {
        toast.info(data?.message || "Nessun dato trovato per questa P.IVA");
      }
    } catch (err: unknown) {
      const error = err as Error;
      toast.error("Errore nella ricerca: " + error.message);
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSaveAzienda = async () => {
    if (!azienda || !aziendaForm || !aziendaForm.nome) return;
    
    await updateAzienda.mutateAsync({
      id: azienda.id,
      nome: aziendaForm.nome,
      settore: aziendaForm.settore || null,
      citta: aziendaForm.citta || null,
      indirizzo: aziendaForm.indirizzo || null,
      telefono: aziendaForm.telefono || null,
      email: aziendaForm.email || null,
      partita_iva: aziendaForm.partita_iva || null,
      status: aziendaForm.status,
      provvigione_percentuale: parseDecimalInput(aziendaForm.provvigione_percentuale),
      default_sc1: parseDecimalInput(aziendaForm.default_sc1),
      default_sc2: parseDecimalInput(aziendaForm.default_sc2),
      default_sc3: parseDecimalInput(aziendaForm.default_sc3),
    });
    setIsEditDialogOpen(false);
  };

  const openProductDialog = (prodotto?: Prodotto) => {
    if (prodotto) {
      setEditingProduct(prodotto);
      setProductForm({
        nome: prodotto.nome,
        codice: prodotto.codice || "",
        prezzo_listino: String(prodotto.prezzo_listino).replace(".", ","),
        costo_acquisto: String((prodotto as any).costo_acquisto ?? 0).replace(".", ","),
        quantita_pezzi: prodotto.quantita_pezzi,
        pezzi_per_cartone: prodotto.pezzi_per_cartone,
        strati: prodotto.strati,
        cartoni_per_strato: prodotto.cartoni_per_strato,
        immagine_url: prodotto.immagine_url,
        formato: prodotto.formato || "",
        sc1_default: String(prodotto.sc1_default || 0).replace(".", ","),
        sc2_default: String(prodotto.sc2_default || 0).replace(".", ","),
        sc3_default: String(prodotto.sc3_default || 0).replace(".", ","),
        brand_id: prodotto.brand_id,
      });
    } else {
      setEditingProduct(null);
      setProductForm(defaultProductForm);
    }
    setIsProductDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.nome || !id) return;
    
    if (editingProduct) {
      await updateProdotto.mutateAsync({
        id: editingProduct.id,
        nome: productForm.nome,
        codice: productForm.codice || null,
        prezzo_listino: parseDecimalInput(productForm.prezzo_listino),
        costo_acquisto: parseDecimalInput(productForm.costo_acquisto),
        quantita_pezzi: productForm.quantita_pezzi,
        pezzi_per_cartone: productForm.pezzi_per_cartone,
        strati: productForm.strati,
        cartoni_per_strato: productForm.cartoni_per_strato,
        immagine_url: productForm.immagine_url,
        formato: productForm.formato || null,
        sc1_default: parseDecimalInput(productForm.sc1_default),
        sc2_default: parseDecimalInput(productForm.sc2_default),
        sc3_default: parseDecimalInput(productForm.sc3_default),
        brand_id: productForm.brand_id,
      });
    } else {
      await createProdotto.mutateAsync({
        azienda_id: id,
        nome: productForm.nome,
        codice: productForm.codice || null,
        prezzo_listino: parseDecimalInput(productForm.prezzo_listino),
        quantita_pezzi: productForm.quantita_pezzi,
        pezzi_per_cartone: productForm.pezzi_per_cartone,
        strati: productForm.strati,
        cartoni_per_strato: productForm.cartoni_per_strato,
        immagine_url: productForm.immagine_url,
        formato: productForm.formato || null,
        sc1_default: parseDecimalInput(productForm.sc1_default),
        sc2_default: parseDecimalInput(productForm.sc2_default),
        sc3_default: parseDecimalInput(productForm.sc3_default),
        brand_id: productForm.brand_id,
      });
    }
    setIsProductDialogOpen(false);
    setEditingProduct(null);
    setProductForm(defaultProductForm);
  };

  const handleDeleteProduct = async (productId: string) => {
    await deleteProdotto.mutateAsync(productId);
  };

  const calcTotaleCartoni = (strati: number, cartoniPerStrato: number) => strati * cartoniPerStrato;

  if (isLoadingAzienda) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!azienda) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Azienda non trovata</p>
          <Button className="mt-4" onClick={() => navigate("/aziende")}>
            Torna alle aziende
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/aziende")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">{azienda.nome}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{azienda.settore || "Nessun settore"}</p>
          </div>
          <Button variant="outline" onClick={openEditAziendaDialog}>
            <Pencil className="h-4 w-4 mr-2" />
            Modifica
          </Button>
        </div>

        {/* Company Info Card */}
        <div className="rounded-xl bg-card shadow-card p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Logo */}
            <div 
              className="relative flex h-24 w-24 items-center justify-center rounded-xl bg-muted overflow-hidden cursor-pointer group shrink-0"
              onClick={() => logoInputRef.current?.click()}
            >
              {azienda.logo_url ? (
                <img src={azienda.logo_url} alt={azienda.nome} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="h-10 w-10 text-muted-foreground" />
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <Upload className="h-5 w-5 text-white" />
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>

            {/* Details */}
            <div className="flex-1 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {azienda.partita_iva && (
                <div>
                  <p className="text-xs text-muted-foreground">Partita IVA</p>
                  <p className="font-medium">{azienda.partita_iva}</p>
                </div>
              )}
              {azienda.indirizzo && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Indirizzo</p>
                    <p className="font-medium">{azienda.indirizzo}, {azienda.citta}</p>
                  </div>
                </div>
              )}
              {azienda.telefono && (
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Telefono</p>
                    <p className="font-medium">{azienda.telefono}</p>
                  </div>
                </div>
              )}
              {azienda.email && (
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{azienda.email}</p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Provvigione</p>
                <p className="font-medium">{azienda.provvigione_percentuale || 0}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge className={azienda.status === "attivo" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>
                  {azienda.status === "attivo" ? "Attivo" : "In Pausa"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="rounded-xl bg-card shadow-card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Prodotti ({prodotti?.length || 0})</h2>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsImportDialogOpen(true)}>
                <FileUp className="h-4 w-4 mr-2" />
                Importa PDF
              </Button>
              <Button size="sm" onClick={() => openProductDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi
              </Button>
            </div>
          </div>

          {isLoadingProdotti ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !prodotti?.length ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nessun prodotto</p>
              <Button className="mt-4" onClick={() => openProductDialog()}>
                Aggiungi il primo prodotto
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Immagine</TableHead>
                    <TableHead>Codice</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Marchio</TableHead>
                    <TableHead className="text-right">Prezzo</TableHead>
                    <TableHead className="text-right">Pz/Cart</TableHead>
                    <TableHead className="text-right">Strati</TableHead>
                    <TableHead className="text-right">Cart/Strato</TableHead>
                    <TableHead className="text-right">Tot Cartoni</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prodotti.map((prodotto) => {
                    const brandName = brands?.find(b => b.id === prodotto.brand_id)?.name;
                    return (
                    <TableRow key={prodotto.id}>
                      <TableCell>
                        {prodotto.immagine_url ? (
                          <img src={prodotto.immagine_url} alt={prodotto.nome} className="w-10 h-10 object-cover rounded" />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{prodotto.codice || "—"}</TableCell>
                      <TableCell className="font-medium">{prodotto.nome}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{brandName || "—"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(prodotto.prezzo_listino)}</TableCell>
                      <TableCell className="text-right">{prodotto.pezzi_per_cartone}</TableCell>
                      <TableCell className="text-right">{prodotto.strati}</TableCell>
                      <TableCell className="text-right">{prodotto.cartoni_per_strato}</TableCell>
                      <TableCell className="text-right font-medium">{calcTotaleCartoni(prodotto.strati, prodotto.cartoni_per_strato)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openProductDialog(prodotto)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteProduct(prodotto.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Azienda Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifica Azienda</DialogTitle>
            <DialogDescription>Modifica i dati dell'azienda</DialogDescription>
          </DialogHeader>
          {aziendaForm && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Partita IVA</Label>
                <div className="flex gap-2">
                  <Input
                    value={aziendaForm.partita_iva}
                    onChange={(e) => setAziendaForm({ ...aziendaForm, partita_iva: e.target.value })}
                    placeholder="12345678901"
                    maxLength={11}
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={handleLookupPiva}
                    disabled={isLookingUp || aziendaForm.partita_iva.length < 11}
                  >
                    {isLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={aziendaForm.nome}
                  onChange={(e) => setAziendaForm({ ...aziendaForm, nome: e.target.value })}
                  placeholder="Nome azienda"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Settore</Label>
                  <Input
                    value={aziendaForm.settore}
                    onChange={(e) => setAziendaForm({ ...aziendaForm, settore: e.target.value })}
                    placeholder="Es: Tecnologia"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Città</Label>
                  <Input
                    value={aziendaForm.citta}
                    onChange={(e) => setAziendaForm({ ...aziendaForm, citta: e.target.value })}
                    placeholder="Es: Milano"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Indirizzo</Label>
                <Input
                  value={aziendaForm.indirizzo}
                  onChange={(e) => setAziendaForm({ ...aziendaForm, indirizzo: e.target.value })}
                  placeholder="Via Roma 1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefono</Label>
                  <Input
                    value={aziendaForm.telefono}
                    onChange={(e) => setAziendaForm({ ...aziendaForm, telefono: e.target.value })}
                    placeholder="+39 ..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={aziendaForm.email}
                    onChange={(e) => setAziendaForm({ ...aziendaForm, email: e.target.value })}
                    placeholder="info@azienda.it"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={aziendaForm.status}
                    onValueChange={(v) => setAziendaForm({ ...aziendaForm, status: v as "attivo" | "in_pausa" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="attivo">Attivo</SelectItem>
                      <SelectItem value="in_pausa">In Pausa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Provvigione %</Label>
                  <Input
                    value={aziendaForm.provvigione_percentuale}
                    onChange={(e) => setAziendaForm({ ...aziendaForm, provvigione_percentuale: e.target.value })}
                    placeholder="Es: 5"
                    type="text"
                  />
                </div>
              </div>
              {/* Sconti Default Azienda */}
              <div className="border-t pt-4">
                <Label className="text-sm font-semibold text-muted-foreground">Sconti Default Azienda %</Label>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div className="space-y-2">
                    <Label>Sc.1</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={aziendaForm.default_sc1}
                      onChange={(e) => setAziendaForm({ ...aziendaForm, default_sc1: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sc.2</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={aziendaForm.default_sc2}
                      onChange={(e) => setAziendaForm({ ...aziendaForm, default_sc2: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sc.3</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={aziendaForm.default_sc3}
                      onChange={(e) => setAziendaForm({ ...aziendaForm, default_sc3: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleSaveAzienda} disabled={updateAzienda.isPending || !aziendaForm?.nome}>
              {updateAzienda.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Modifica Prodotto" : "Nuovo Prodotto"}</DialogTitle>
            <DialogDescription>
              {editingProduct ? "Modifica i dati del prodotto" : "Inserisci i dati del nuovo prodotto"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Product Image */}
            <div className="space-y-2">
              <Label>Immagine Prodotto</Label>
              <div className="flex items-center gap-3">
                {productForm.immagine_url ? (
                  <img src={productForm.immagine_url} alt="Prodotto" className="w-16 h-16 object-cover rounded" />
                ) : (
                  <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <label className="cursor-pointer">
                  <Input type="file" accept="image/*" className="hidden" onChange={handleProductImageUpload} />
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span><Upload className="h-4 w-4 mr-2" /> Carica</span>
                  </Button>
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Codice</Label>
                <Input
                  value={productForm.codice}
                  onChange={(e) => setProductForm({ ...productForm, codice: e.target.value })}
                  placeholder="ABC123"
                />
              </div>
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={productForm.nome}
                  onChange={(e) => setProductForm({ ...productForm, nome: e.target.value })}
                  placeholder="Nome prodotto"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prezzo Listino (€)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={productForm.prezzo_listino}
                  onChange={(e) => setProductForm({ ...productForm, prezzo_listino: e.target.value })}
                  placeholder="es. 1,85"
                />
              </div>
              <div className="space-y-2">
                <Label>Formato</Label>
                <Input
                  value={productForm.formato}
                  onChange={(e) => setProductForm({ ...productForm, formato: e.target.value })}
                  placeholder="es. 1L, 700ml, 500ml"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Costo di Acquisto (€) <span className="text-xs text-muted-foreground">— per calcolo margine</span></Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={productForm.costo_acquisto}
                  onChange={(e) => setProductForm({ ...productForm, costo_acquisto: e.target.value })}
                  placeholder="es. 0,95"
                />
              </div>
            </div>
            {/* Brand Select */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Marchio / Brand
              </Label>
              <SearchableSelect
                options={brandOptions}
                value={productForm.brand_id || ""}
                onValueChange={(v) => setProductForm({ ...productForm, brand_id: v || null })}
                placeholder="Seleziona marchio..."
                searchPlaceholder="Cerca marchio..."
                emptyMessage="Nessun marchio trovato"
                onCreateNew={() => setIsNewBrandDialogOpen(true)}
                createNewLabel="+ Nuovo Marchio"
              />
            </div>
            <div className="border-t pt-4">
              <Label className="text-sm font-semibold text-muted-foreground">Sconti Default %</Label>
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div className="space-y-2">
                  <Label>Sc1</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={productForm.sc1_default}
                    onChange={(e) => setProductForm({ ...productForm, sc1_default: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sc2</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={productForm.sc2_default}
                    onChange={(e) => setProductForm({ ...productForm, sc2_default: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sc3</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={productForm.sc3_default}
                    onChange={(e) => setProductForm({ ...productForm, sc3_default: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <div className="border-t pt-4">
              <Label className="text-sm font-semibold text-muted-foreground">Pallettizzazione</Label>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="space-y-2">
                  <Label>Pz/Cartone</Label>
                  <Input
                    type="number"
                    min="1"
                    value={productForm.pezzi_per_cartone}
                    onChange={(e) => setProductForm({ ...productForm, pezzi_per_cartone: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Strati</Label>
                  <Input
                    type="number"
                    min="1"
                    value={productForm.strati}
                    onChange={(e) => setProductForm({ ...productForm, strati: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cart/Strato</Label>
                  <Input
                    type="number"
                    min="1"
                    value={productForm.cartoni_per_strato}
                    onChange={(e) => setProductForm({ ...productForm, cartoni_per_strato: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tot Cartoni</Label>
                  <Input
                    type="number"
                    value={calcTotaleCartoni(productForm.strati, productForm.cartoni_per_strato)}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleSaveProduct} disabled={(createProdotto.isPending || updateProdotto.isPending) || !productForm.nome}>
              {(createProdotto.isPending || updateProdotto.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingProduct ? "Salva" : "Crea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import PDF Dialog */}
      <ImportProductsPDFDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        aziendaId={id || ""}
        aziendaNome={azienda.nome}
        onImportComplete={refetchProdotti}
      />

      {/* New Brand Dialog */}
      <Dialog open={isNewBrandDialogOpen} onOpenChange={setIsNewBrandDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nuovo Marchio</DialogTitle>
            <DialogDescription>
              Crea un nuovo marchio per questa azienda
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Marchio *</Label>
              <Input
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="es. Polara, Zuegg..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewBrandDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleCreateNewBrand} disabled={!newBrandName.trim() || createBrand.isPending}>
              {createBrand.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crea Marchio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="px-4 pb-6 lg:px-0">
        <DocumentiSection entita="azienda" entita_id={id} title="Documenti azienda" />
      </div>
    </MainLayout>

  );
};

export default AziendaDettaglio;
