import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Plus, Search, Mail, Phone, TrendingUp, MoreHorizontal, Loader2, Filter, Wand2 } from "lucide-react";
import { useClienti, useCreateCliente, useDeleteCliente, Cliente } from "@/hooks/useClienti";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const statusConfig = {
  premium: { label: "Premium", className: "bg-primary/10 text-primary hover:bg-primary/20" },
  standard: { label: "Standard", className: "bg-muted text-muted-foreground hover:bg-muted/80" },
  nuovo: { label: "Nuovo", className: "bg-success/10 text-success hover:bg-success/20" },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

const Clienti = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<Cliente["status"] | "tutti">("tutti");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    azienda: "",
    email: "",
    telefono: "",
    fatturato: 0,
    ordini_count: 0,
    status: "nuovo" as Cliente["status"],
    partita_iva: "",
  });

  const { data: clienti, isLoading } = useClienti(searchTerm, statusFilter);
  const createCliente = useCreateCliente();
  const deleteCliente = useDeleteCliente();

  const handleLookupPiva = async () => {
    const piva = formData.partita_iva.trim();
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
        setFormData(prev => ({
          ...prev,
          nome: data.data.nome || prev.nome,
          azienda: data.data.nome || prev.azienda,
        }));
        toast.success("Dati cliente recuperati!");
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

  const handleSubmit = async () => {
    if (!formData.nome) return;
    await createCliente.mutateAsync(formData);
    setIsDialogOpen(false);
    setFormData({ nome: "", azienda: "", email: "", telefono: "", fatturato: 0, ordini_count: 0, status: "nuovo", partita_iva: "" });
  };

  const stats = {
    totale: clienti?.length || 0,
    premium: clienti?.filter((c) => c.status === "premium").length || 0,
    nuovi: clienti?.filter((c) => c.status === "nuovo").length || 0,
    fatturatoMedio: clienti?.length
      ? clienti.reduce((sum, c) => sum + Number(c.fatturato), 0) / clienti.length
      : 0,
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">Portfolio Clienti</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gestisci i tuoi clienti e monitora le performance
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuovo Cliente</span>
                <span className="sm:hidden">Aggiungi</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nuovo Cliente</DialogTitle>
                <DialogDescription>Inserisci la P.IVA per compilare automaticamente i dati</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Partita IVA</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.partita_iva}
                      onChange={(e) => setFormData({ ...formData, partita_iva: e.target.value })}
                      placeholder="12345678901"
                      maxLength={11}
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={handleLookupPiva}
                      disabled={isLookingUp || formData.partita_iva.length < 11}
                    >
                      {isLookingUp ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Azienda</Label>
                    <Input
                      value={formData.azienda}
                      onChange={(e) => setFormData({ ...formData, azienda: e.target.value })}
                      placeholder="Nome azienda"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@esempio.it"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefono</Label>
                    <Input
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      placeholder="+39 ..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v as Cliente["status"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nuovo">Nuovo</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annulla
                </Button>
                <Button onClick={handleSubmit} disabled={createCliente.isPending || !formData.nome}>
                  {createCliente.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crea
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-card p-4 shadow-card">
            <p className="text-xs lg:text-sm text-muted-foreground">Totale Clienti</p>
            <p className="text-xl lg:text-2xl font-bold text-card-foreground">{stats.totale}</p>
          </div>
          <div className="rounded-lg bg-card p-4 shadow-card">
            <p className="text-xs lg:text-sm text-muted-foreground">Clienti Premium</p>
            <p className="text-xl lg:text-2xl font-bold text-primary">{stats.premium}</p>
          </div>
          <div className="rounded-lg bg-card p-4 shadow-card">
            <p className="text-xs lg:text-sm text-muted-foreground">Nuovi</p>
            <p className="text-xl lg:text-2xl font-bold text-success">{stats.nuovi}</p>
          </div>
          <div className="rounded-lg bg-card p-4 shadow-card">
            <p className="text-xs lg:text-sm text-muted-foreground">Fatturato Medio</p>
            <p className="text-xl lg:text-2xl font-bold text-card-foreground">{formatCurrency(stats.fatturatoMedio)}</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cerca cliente..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti</SelectItem>
              <SelectItem value="nuovo">Nuovo</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !clienti?.length ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nessun cliente trovato</p>
            <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
              Aggiungi il primo cliente
            </Button>
          </div>
        ) : (
          <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Contatti</TableHead>
                    <TableHead>Fatturato</TableHead>
                    <TableHead className="hidden sm:table-cell">Ordini</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clienti.map((cliente) => (
                    <TableRow key={cliente.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 hidden sm:flex">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                              {cliente.nome
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-card-foreground truncate">{cliente.nome}</p>
                            <p className="text-xs text-muted-foreground truncate">{cliente.azienda || "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-1">
                          {cliente.email && (
                            <div className="flex items-center gap-2 text-xs">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground truncate max-w-[150px]">{cliente.email}</span>
                            </div>
                          )}
                          {cliente.telefono && (
                            <div className="flex items-center gap-2 text-xs">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">{cliente.telefono}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-card-foreground text-sm">
                            {formatCurrency(Number(cliente.fatturato))}
                          </span>
                          {Number(cliente.fatturato) > 0 && (
                            <TrendingUp className="h-3 w-3 text-success hidden sm:block" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="font-medium text-card-foreground">{cliente.ordini_count}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[cliente.status].className}>
                          {statusConfig[cliente.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteCliente.mutate(cliente.id)}
                            >
                              Elimina
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Clienti;