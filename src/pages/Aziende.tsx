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
import { Plus, Search, MapPin, Phone, Mail, MoreHorizontal, Loader2 } from "lucide-react";
import { useAziende, useCreateAzienda, useDeleteAzienda } from "@/hooks/useAziende";

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
    setFormData({ nome: "", settore: "", citta: "", telefono: "", email: "", status: "attivo", prodotti: 0 });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">Aziende Partner</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gestisci le aziende con cui collabori
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
                  <span className="text-sm text-muted-foreground">{azienda.prodotti} prodotti</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Aziende;
