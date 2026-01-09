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
import { toast } from "sonner";

// Lookup P.IVA via OpenAPI (free service for Italian companies)
async function lookupPartitaIva(piva: string): Promise<{
  nome?: string;
  indirizzo?: string;
  citta?: string;
  telefono?: string;
  email?: string;
} | null> {
  try {
    // Use the openapi.it free service
    const response = await fetch(`https://openapi.it/api/v1/partita-iva/${piva.replace(/\s/g, '')}`, {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.success && data.data) {
      return {
        nome: data.data.denominazione || data.data.nome,
        indirizzo: data.data.indirizzo,
        citta: data.data.comune,
      };
    }
    return null;
  } catch {
    // Fallback: try a simple CORS-free approach or return null
    return null;
  }
}

const Aziende = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    settore: "",
    citta: "",
    indirizzo: "",
    telefono: "",
    email: "",
    status: "attivo" as "attivo" | "in_pausa",
    prodotti: 0,
    partita_iva: "",
  });

  const { data: aziende, isLoading } = useAziende(searchTerm);
  const createAzienda = useCreateAzienda();
  const deleteAzienda = useDeleteAzienda();

  const handlePartitaIvaBlur = async () => {
    const piva = formData.partita_iva.trim();
    if (piva.length < 11) return;
    
    setIsLookingUp(true);
    try {
      const result = await lookupPartitaIva(piva);
      if (result) {
        setFormData(prev => ({
          ...prev,
          nome: result.nome || prev.nome,
          indirizzo: result.indirizzo || prev.indirizzo,
          citta: result.citta || prev.citta,
          telefono: result.telefono || prev.telefono,
          email: result.email || prev.email,
        }));
        toast.success("Dati azienda recuperati!");
      } else {
        toast.info("Nessun dato trovato per questa P.IVA");
      }
    } catch {
      toast.error("Errore nella ricerca P.IVA");
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.nome) return;
    await createAzienda.mutateAsync(formData);
    setIsDialogOpen(false);
    setFormData({ nome: "", settore: "", citta: "", indirizzo: "", telefono: "", email: "", status: "attivo", prodotti: 0, partita_iva: "" });
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
                <DialogDescription>Inserisci la P.IVA per compilare automaticamente i dati</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Partita IVA</Label>
                  <div className="relative">
                    <Input
                      value={formData.partita_iva}
                      onChange={(e) => setFormData({ ...formData, partita_iva: e.target.value })}
                      onBlur={handlePartitaIvaBlur}
                      placeholder="12345678901"
                      maxLength={11}
                    />
                    {isLookingUp && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Inserisci e premi Tab per autocompilare</p>
                </div>
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
                <div className="space-y-2">
                  <Label>Indirizzo</Label>
                  <Input
                    value={formData.indirizzo}
                    onChange={(e) => setFormData({ ...formData, indirizzo: e.target.value })}
                    placeholder="Via Roma 1"
                  />
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