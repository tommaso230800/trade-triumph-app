import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
import { Plus, Search, Mail, Phone, TrendingUp, MoreHorizontal, Loader2, Filter, Wand2, X, Eye, Pencil, Users } from "lucide-react";
import { useClienti, useCreateCliente, useDeleteCliente, useUpdateCliente, Cliente } from "@/hooks/useClienti";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const statusConfig = {
  premium: { label: "Premium", className: "bg-primary/10 text-primary hover:bg-primary/20" },
  standard: { label: "Standard", className: "bg-muted text-muted-foreground hover:bg-muted/80" },
  nuovo: { label: "Nuovo", className: "bg-success/10 text-success hover:bg-success/20" },
};

const CONSORZI = [
  "ADAT",
  "CBF",
  "BEVERAGE NETWORK",
  "CONSORZIO BOTTIGLIERIE FIORENTINE",
  "RASNA",
  "CDA",
  "SAN GEMINIANO",
  "INDIPENDENTE",
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

type FormData = {
  nome: string;
  azienda: string;
  email: string;
  telefono: string;
  fatturato: number;
  ordini_count: number;
  status: Cliente["status"];
  partita_iva: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  codice_sdi: string;
  pec: string;
  email_aggiuntive: string[];
  consorzio: string;
  tipologia_cliente: string;
  fatturato_target: number;
  budget_promo_percentuale: number;
  sconto_max_policy: number;
  n_promo_concesse: number;
  costo_promo_totale: number;
  condizioni_attive: string[];
};

const defaultFormData: FormData = {
  nome: "",
  azienda: "",
  email: "",
  telefono: "",
  fatturato: 0,
  ordini_count: 0,
  status: "nuovo",
  partita_iva: "",
  indirizzo: "",
  cap: "",
  citta: "",
  provincia: "",
  codice_sdi: "",
  pec: "",
  email_aggiuntive: [],
  consorzio: "",
  tipologia_cliente: "bar",
  fatturato_target: 0,
  budget_promo_percentuale: 3,
  sconto_max_policy: 15,
  n_promo_concesse: 0,
  costo_promo_totale: 0,
  condizioni_attive: [],
};

const Clienti = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<Cliente["status"] | "tutti">("tutti");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [newEmail, setNewEmail] = useState("");

  const [searchParams, setSearchParams] = useSearchParams();

  // Apertura automatica da azione rapida globale (FAB "+" nel layout): arriva
  // come /clienti?nuovo=1, apre la scheda e ripulisce l'URL.
  useEffect(() => {
    if (searchParams.get("nuovo") === "1") {
      setIsDialogOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("nuovo");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: clienti, isLoading } = useClienti(searchTerm, statusFilter);
  const createCliente = useCreateCliente();
  const updateCliente = useUpdateCliente();
  const deleteCliente = useDeleteCliente();

  const openEditDialog = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nome: cliente.nome,
      azienda: cliente.azienda || "",
      email: cliente.email || "",
      telefono: cliente.telefono || "",
      fatturato: Number(cliente.fatturato),
      ordini_count: cliente.ordini_count,
      status: cliente.status,
      partita_iva: cliente.partita_iva || "",
      indirizzo: cliente.indirizzo || "",
      cap: cliente.cap || "",
      citta: cliente.citta || "",
      provincia: cliente.provincia || "",
      codice_sdi: cliente.codice_sdi || "",
      pec: cliente.pec || "",
      email_aggiuntive: cliente.email_aggiuntive || [],
      consorzio: cliente.consorzio || "",
      tipologia_cliente: cliente.tipologia_cliente || "bar",
      fatturato_target: Number(cliente.fatturato_target) || 0,
      budget_promo_percentuale: Number(cliente.budget_promo_percentuale) || 3,
      sconto_max_policy: Number(cliente.sconto_max_policy) || 15,
      n_promo_concesse: cliente.n_promo_concesse || 0,
      costo_promo_totale: Number(cliente.costo_promo_totale) || 0,
      condizioni_attive: cliente.condizioni_attive || [],
    });
    setIsDialogOpen(true);
  };

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
          indirizzo: data.data.indirizzo || prev.indirizzo,
          cap: data.data.cap || prev.cap,
          citta: data.data.citta || prev.citta,
          provincia: data.data.provincia || prev.provincia,
          codice_sdi: data.data.codice_sdi || prev.codice_sdi,
          pec: data.data.pec || prev.pec,
          telefono: data.data.telefono || prev.telefono,
          email: data.data.email || prev.email,
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

  const addEmail = () => {
    if (newEmail && !formData.email_aggiuntive.includes(newEmail)) {
      setFormData({
        ...formData,
        email_aggiuntive: [...formData.email_aggiuntive, newEmail],
      });
      setNewEmail("");
    }
  };

  const removeEmail = (email: string) => {
    setFormData({
      ...formData,
      email_aggiuntive: formData.email_aggiuntive.filter((e) => e !== email),
    });
  };

  const handleSubmit = async () => {
    if (!formData.nome) return;
    
    const submitData = {
      ...formData,
      email_aggiuntive: formData.email_aggiuntive.length > 0 ? formData.email_aggiuntive : null,
      consorzio: formData.consorzio || null,
      indirizzo: formData.indirizzo || null,
      cap: formData.cap || null,
      citta: formData.citta || null,
      provincia: formData.provincia || null,
      codice_sdi: formData.codice_sdi || null,
      pec: formData.pec || null,
      azienda: formData.azienda || null,
      email: formData.email || null,
      telefono: formData.telefono || null,
      partita_iva: formData.partita_iva || null,
      fatturato_2025: null,
      obiezione_principale: null,
    };

    if (editingCliente) {
      await updateCliente.mutateAsync({ id: editingCliente.id, ...submitData });
    } else {
      await createCliente.mutateAsync(submitData);
    }
    
    setIsDialogOpen(false);
    setEditingCliente(null);
    setFormData(defaultFormData);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCliente(null);
    setFormData(defaultFormData);
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in animate-fill-both">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Portfolio Clienti</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gestisci i tuoi clienti e monitora le performance
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) handleCloseDialog();
            else setIsDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuovo Cliente</span>
                <span className="sm:hidden">Aggiungi</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCliente ? "Modifica Cliente" : "Nuovo Cliente"}</DialogTitle>
                <DialogDescription>
                  {editingCliente ? "Modifica i dati del cliente" : "Inserisci la P.IVA per compilare automaticamente i dati"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* P.IVA with lookup */}
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

                {/* Nome e Azienda */}
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

                {/* Indirizzo */}
                <div className="space-y-2">
                  <Label>Indirizzo</Label>
                  <Input
                    value={formData.indirizzo}
                    onChange={(e) => setFormData({ ...formData, indirizzo: e.target.value })}
                    placeholder="Via/Piazza..."
                  />
                </div>

                {/* CAP, Città, Provincia */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>CAP</Label>
                    <Input
                      value={formData.cap}
                      onChange={(e) => setFormData({ ...formData, cap: e.target.value })}
                      placeholder="00000"
                      maxLength={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Città</Label>
                    <Input
                      value={formData.citta}
                      onChange={(e) => setFormData({ ...formData, citta: e.target.value })}
                      placeholder="Città"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Provincia</Label>
                    <Input
                      value={formData.provincia}
                      onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                      placeholder="XX"
                      maxLength={2}
                    />
                  </div>
                </div>

                {/* Codice SDI e PEC */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Codice SDI</Label>
                    <Input
                      value={formData.codice_sdi}
                      onChange={(e) => setFormData({ ...formData, codice_sdi: e.target.value.toUpperCase() })}
                      placeholder="XXXXXXX"
                      maxLength={7}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>PEC</Label>
                    <Input
                      value={formData.pec}
                      onChange={(e) => setFormData({ ...formData, pec: e.target.value })}
                      placeholder="pec@esempio.it"
                    />
                  </div>
                </div>

                {/* Email e Telefono */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email Principale</Label>
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

                {/* Email Aggiuntive */}
                <div className="space-y-2">
                  <Label>Email Aggiuntive</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="altra-email@esempio.it"
                      className="flex-1"
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())}
                    />
                    <Button type="button" variant="outline" onClick={addEmail} disabled={!newEmail}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.email_aggiuntive.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.email_aggiuntive.map((email) => (
                        <Badge key={email} variant="secondary" className="gap-1">
                          {email}
                          <button onClick={() => removeEmail(email)} className="ml-1 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Consorzio */}
                <div className="space-y-2">
                  <Label>Consorzio</Label>
                  <Select
                    value={formData.consorzio || "nessuno"}
                    onValueChange={(v) => setFormData({ ...formData, consorzio: v === "nessuno" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona consorzio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nessuno">Nessuno</SelectItem>
                      {CONSORZI.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
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
                <Button variant="outline" onClick={handleCloseDialog}>
                  Annulla
                </Button>
                <Button onClick={handleSubmit} disabled={(createCliente.isPending || updateCliente.isPending) || !formData.nome}>
                  {(createCliente.isPending || updateCliente.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingCliente ? "Salva" : "Crea"}
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

        {/* Search & Filters - Improved */}
        <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl bg-card border shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cerca cliente, azienda, città..."
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
              <SelectItem value="tutti">Tutti gli status</SelectItem>
              <SelectItem value="nuovo">Nuovo</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Caricamento clienti...</p>
            </div>
          </div>
        ) : !clienti?.length ? (
          <div className="text-center py-16 rounded-xl border-2 border-dashed bg-muted/30">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">Nessun cliente trovato</p>
            <p className="text-sm text-muted-foreground/70 mb-4">Inizia aggiungendo il tuo primo cliente</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Cliente
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
                    <TableHead className="hidden lg:table-cell">Consorzio</TableHead>
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
                            {cliente.citta && (
                              <p className="text-xs text-muted-foreground truncate">{cliente.citta}</p>
                            )}
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
                          {cliente.pec && (
                            <div className="flex items-center gap-2 text-xs">
                              <Mail className="h-3 w-3 text-primary" />
                              <span className="text-muted-foreground truncate max-w-[150px]">{cliente.pec}</span>
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
                      <TableCell className="hidden lg:table-cell">
                        {cliente.consorzio ? (
                          <Badge variant="outline">{cliente.consorzio}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
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
                            <DropdownMenuItem asChild>
                              <Link to={`/clienti/${cliente.id}`} className="flex items-center gap-2">
                                <Eye className="h-4 w-4" />
                                Dettaglio
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(cliente)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Modifica
                            </DropdownMenuItem>
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
