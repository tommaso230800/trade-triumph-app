import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Search, Loader2 } from "lucide-react";
import { useAziende, useCreateAzienda, useDeleteAzienda } from "@/hooks/useAziende";
import { AziendaCard } from "@/components/aziende/AziendaCard";

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

  const { data: aziende, isLoading } = useAziende(searchTerm);
  const createAzienda = useCreateAzienda();
  const deleteAzienda = useDeleteAzienda();

  const handleSubmit = async () => {
    if (!formData.nome) return;
    await createAzienda.mutateAsync(formData);
    setIsDialogOpen(false);
    setFormData({ nome: "", settore: "", citta: "", indirizzo: "", telefono: "", email: "", status: "attivo", prodotti: 0 });
  };

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
              <AziendaCard
                key={azienda.id}
                azienda={azienda}
                onDelete={(id) => deleteAzienda.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Aziende;
