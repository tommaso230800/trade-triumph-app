import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
import { Plus, Search, Mail, Phone, MoreHorizontal, Loader2, Filter, Wand2, X, Eye, Pencil, Users, MessageCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { telHref, whatsappHref } from "@/lib/contactLinks";
import { useClienti, useCreateCliente, useDeleteCliente, useUpdateCliente, Cliente } from "@/hooks/useClienti";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatEuroInt } from "@/lib/format";
import { usePersistentState, oneOf } from "@/hooks/usePersistentState";

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
  formatEuroInt(value);

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
  const [statusFilter, setStatusFilter] = usePersistentState<Cliente["status"] | "tutti">(
    "clienti:stato",
    "tutti",
    oneOf("tutti", "nuovo", "standard", "premium"),
  );
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

  const { data: clienti, isLoading, isError, refetch } = useClienti(searchTerm, statusFilter);
  const filtersActive = searchTerm.trim() !== "" || statusFilter !== "tutti";
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

        {/* Elenco */}
        {isLoading ? (
          <div className="rounded-xl border bg-card shadow-card divide-y" aria-busy="true" aria-label="Caricamento clienti">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-xl border bg-card p-6 text-center shadow-card space-y-3">
            <p className="text-sm font-semibold">Non riesco a caricare i clienti</p>
            <p className="text-sm text-muted-foreground">Controlla la connessione e riprova.</p>
            <Button variant="outline" onClick={() => refetch()}>Riprova</Button>
          </div>
        ) : !clienti?.length ? (
          filtersActive ? (
            <div className="rounded-xl border bg-card p-6 text-center shadow-card space-y-3">
              <Search className="h-6 w-6 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nessun cliente corrisponde alla ricerca</p>
              <Button variant="outline" onClick={() => { setSearchTerm(""); setStatusFilter("tutti"); }}>
                Azzera filtri
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-6 text-center shadow-card space-y-3">
              <Users className="h-6 w-6 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nessun cliente ancora</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi cliente
              </Button>
            </div>
          )
        ) : (
          <>
            {/* Mobile: card compatte, niente scorrimento orizzontale */}
            <ul className="md:hidden rounded-xl border bg-card shadow-card divide-y">
              {clienti.map((cliente) => {
                const tel = telHref(cliente.telefono);
                const wa = whatsappHref(cliente.telefono);
                return (
                  <li key={cliente.id} className="flex items-center gap-2 py-2 pl-4 pr-2">
                    <Link to={`/clienti/${cliente.id}`} className="min-w-0 flex-1 py-1">
                      <p className="line-clamp-2 break-words text-sm font-semibold text-card-foreground">{cliente.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[cliente.citta, cliente.consorzio].filter(Boolean).join(" · ") || cliente.azienda || "—"}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums text-card-foreground">
                          {formatCurrency(Number(cliente.fatturato))}
                        </span>
                        <Badge className={statusConfig[cliente.status].className}>
                          {statusConfig[cliente.status].label}
                        </Badge>
                      </div>
                    </Link>
                    {tel && (
                      <Button asChild variant="ghost" size="icon" aria-label={`Chiama ${cliente.nome}`}>
                        <a href={tel}><Phone className="h-4 w-4" /></a>
                      </Button>
                    )}
                    {wa && (
                      <Button asChild variant="ghost" size="icon" aria-label={`WhatsApp a ${cliente.nome}`}>
                        <a href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" /></a>
                      </Button>
                    )}
                    <ClienteActions cliente={cliente} onEdit={openEditDialog} onDelete={(id) => deleteCliente.mutate(id)} />
                  </li>
                );
              })}
            </ul>

            {/* Desktop: tabella */}
            <div className="hidden md:block rounded-xl border bg-card shadow-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contatti</TableHead>
                    <TableHead className="hidden lg:table-cell">Consorzio</TableHead>
                    <TableHead className="text-right">Fatturato</TableHead>
                    <TableHead className="text-right">Ordini</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="w-12"><span className="sr-only">Azioni</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clienti.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell>
                        <Link to={`/clienti/${cliente.id}`} className="block min-w-0 hover:underline">
                          <p className="truncate font-medium text-card-foreground">{cliente.nome}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {[cliente.azienda, cliente.citta].filter(Boolean).join(" · ") || "—"}
                          </p>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {cliente.telefono && (
                            <a href={telHref(cliente.telefono) ?? undefined} className="flex items-center gap-2 hover:text-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{cliente.telefono}</span>
                            </a>
                          )}
                          {cliente.email && (
                            <a href={`mailto:${cliente.email}`} className="flex min-w-0 items-center gap-2 hover:text-foreground">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate">{cliente.email}</span>
                            </a>
                          )}
                          {!cliente.telefono && !cliente.email && <span>—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {cliente.consorzio ? (
                          <Badge variant="outline">{cliente.consorzio}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-semibold tabular-nums text-card-foreground">
                          {formatCurrency(Number(cliente.fatturato))}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{cliente.ordini_count}</TableCell>
                      <TableCell>
                        <Badge className={statusConfig[cliente.status].className}>
                          {statusConfig[cliente.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ClienteActions cliente={cliente} onEdit={openEditDialog} onDelete={(id) => deleteCliente.mutate(id)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

function ClienteActions({
  cliente,
  onEdit,
  onDelete,
}: {
  cliente: Cliente;
  onEdit: (c: Cliente) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Azioni per ${cliente.nome}`}>
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
        {cliente.email && (
          <DropdownMenuItem asChild>
            <a href={`mailto:${cliente.email}`} className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onEdit(cliente)}>
          <Pencil className="h-4 w-4 mr-2" />
          Modifica
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(cliente.id)}>
          Elimina
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default Clienti;
