import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, MapPin, Phone, Mail, MoreHorizontal, Loader2, Package, Trash2, Edit } from "lucide-react";
import { useAziende, useCreateAzienda, useDeleteAzienda } from "@/hooks/useAziende";
import { useProdotti, useCreateProdotto, useDeleteProdotto, useUpdateProdotto, Prodotto } from "@/hooks/useProdotti";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);

const Aziende = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    settore: "",
    citta: "",
    indirizzo: "",
    telefono: "",
    email: "",
    status: "attivo" as "attivo" | "in_pausa",
    prodotti: 0,
  });

  // Product management
  const [selectedAzienda, setSelectedAzienda] = useState<string | null>(null);
  const [isProdottiDialogOpen, setIsProdottiDialogOpen] = useState(false);
  const [prodottoForm, setProdottoForm] = useState({
    nome: "",
    prezzo_listino: 0,
    quantita_pezzi: 0,
    pezzi_per_cartone: 1,
  });
  const [editingProdotto, setEditingProdotto] = useState<Prodotto | null>(null);

  const { data: aziende, isLoading } = useAziende(searchTerm);
  const createAzienda = useCreateAzienda();
  const deleteAzienda = useDeleteAzienda();

  const { data: prodotti, isLoading: loadingProdotti } = useProdotti(selectedAzienda || undefined);
  const createProdotto = useCreateProdotto();
  const deleteProdotto = useDeleteProdotto();
  const updateProdotto = useUpdateProdotto();

  const handleSubmit = async () => {
    if (!formData.nome) return;
    await createAzienda.mutateAsync(formData);
    setIsDialogOpen(false);
    setFormData({ nome: "", settore: "", citta: "", indirizzo: "", telefono: "", email: "", status: "attivo", prodotti: 0 });
  };

  const openProdottiDialog = (aziendaId: string) => {
    setSelectedAzienda(aziendaId);
    setIsProdottiDialogOpen(true);
    resetProdottoForm();
  };

  const resetProdottoForm = () => {
    setProdottoForm({ nome: "", prezzo_listino: 0, quantita_pezzi: 0, pezzi_per_cartone: 1 });
    setEditingProdotto(null);
  };

  const handleAddProdotto = async () => {
    if (!selectedAzienda || !prodottoForm.nome) return;
    
    if (editingProdotto) {
      await updateProdotto.mutateAsync({
        id: editingProdotto.id,
        ...prodottoForm,
      });
    } else {
      await createProdotto.mutateAsync({
        azienda_id: selectedAzienda,
        ...prodottoForm,
      });
    }
    resetProdottoForm();
  };

  const startEditProdotto = (prodotto: Prodotto) => {
    setEditingProdotto(prodotto);
    setProdottoForm({
      nome: prodotto.nome,
      prezzo_listino: prodotto.prezzo_listino,
      quantita_pezzi: prodotto.quantita_pezzi,
      pezzi_per_cartone: prodotto.pezzi_per_cartone,
    });
  };

  const selectedAziendaNome = aziende?.find(a => a.id === selectedAzienda)?.nome || "";

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">Aziende Partner</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gestisci le aziende e i loro prodotti
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuova Azienda</span>
                <span className="sm:hidden">Aggiungi</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nuova Azienda</DialogTitle>
                <DialogDescription>Aggiungi una nuova azienda partner</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Nome azienda"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Settore</Label>
                    <Input
                      value={formData.settore}
                      onChange={(e) => setFormData({ ...formData, settore: e.target.value })}
                      placeholder="Es: Tecnologia"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Città</Label>
                    <Input
                      value={formData.citta}
                      onChange={(e) => setFormData({ ...formData, citta: e.target.value })}
                      placeholder="Es: Milano"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Telefono</Label>
                    <Input
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      placeholder="+39 ..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="info@azienda.it"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v as "attivo" | "in_pausa" })}
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annulla
                </Button>
                <Button onClick={handleSubmit} disabled={createAzienda.isPending || !formData.nome}>
                  {createAzienda.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crea
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca azienda..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !aziende?.length ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nessuna azienda trovata</p>
            <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
              Aggiungi la prima azienda
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {aziende.map((azienda) => (
              <div
                key={azienda.id}
                className="group rounded-xl bg-card p-5 shadow-card transition-all duration-300 hover:shadow-card-hover animate-fade-in"
              >
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
                      <DropdownMenuItem onClick={() => openProdottiDialog(azienda.id)}>
                        <Package className="h-4 w-4 mr-2" />
                        Gestisci Prodotti
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteAzienda.mutate(azienda.id)}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => openProdottiDialog(azienda.id)}
                  >
                    <Package className="h-4 w-4 mr-1" />
                    Prodotti
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Products Dialog */}
        <Dialog open={isProdottiDialogOpen} onOpenChange={(open) => {
          setIsProdottiDialogOpen(open);
          if (!open) {
            setSelectedAzienda(null);
            resetProdottoForm();
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Prodotti - {selectedAziendaNome}</DialogTitle>
              <DialogDescription>Gestisci i prodotti di questa azienda</DialogDescription>
            </DialogHeader>

            {/* Add/Edit Product Form */}
            <div className="space-y-4 py-4 border-b">
              <h4 className="font-medium">{editingProdotto ? "Modifica Prodotto" : "Aggiungi Prodotto"}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Prodotto *</Label>
                  <Input
                    value={prodottoForm.nome}
                    onChange={(e) => setProdottoForm({ ...prodottoForm, nome: e.target.value })}
                    placeholder="Nome prodotto"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prezzo Listino (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={prodottoForm.prezzo_listino}
                    onChange={(e) => setProdottoForm({ ...prodottoForm, prezzo_listino: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantità Pezzi</Label>
                  <Input
                    type="number"
                    value={prodottoForm.quantita_pezzi}
                    onChange={(e) => setProdottoForm({ ...prodottoForm, quantita_pezzi: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pezzi per Cartone</Label>
                  <Input
                    type="number"
                    min="1"
                    value={prodottoForm.pezzi_per_cartone}
                    onChange={(e) => setProdottoForm({ ...prodottoForm, pezzi_per_cartone: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleAddProdotto} 
                  disabled={!prodottoForm.nome || createProdotto.isPending || updateProdotto.isPending}
                >
                  {(createProdotto.isPending || updateProdotto.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingProdotto ? "Aggiorna" : "Aggiungi"}
                </Button>
                {editingProdotto && (
                  <Button variant="outline" onClick={resetProdottoForm}>
                    Annulla
                  </Button>
                )}
              </div>
            </div>

            {/* Products List */}
            <div className="py-4">
              <h4 className="font-medium mb-4">Elenco Prodotti</h4>
              {loadingProdotti ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !prodotti?.length ? (
                <p className="text-center text-muted-foreground py-8">Nessun prodotto presente</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Prezzo</TableHead>
                      <TableHead>Pezzi</TableHead>
                      <TableHead>Pz/Cartone</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prodotti.map((prodotto) => (
                      <TableRow key={prodotto.id}>
                        <TableCell className="font-medium">{prodotto.nome}</TableCell>
                        <TableCell>{formatCurrency(prodotto.prezzo_listino)}</TableCell>
                        <TableCell>{prodotto.quantita_pezzi}</TableCell>
                        <TableCell>{prodotto.pezzi_per_cartone}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEditProdotto(prodotto)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteProdotto.mutate(prodotto.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Aziende;
