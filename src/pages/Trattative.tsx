import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDeals, useCreateDeal, useUpdateDeal, useDeleteDeal, Deal } from "@/hooks/useDeals";
import { useClienti } from "@/hooks/useClienti";
import { useAziende } from "@/hooks/useAziende";
import { Plus, Search, Target, Calendar, TrendingUp, AlertCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { format, isToday, isBefore, addDays, parseISO } from "date-fns";
import { it } from "date-fns/locale";

const statusConfig = {
  open: { label: "Aperta", variant: "default" as const },
  won: { label: "Vinta", variant: "secondary" as const },
  lost: { label: "Persa", variant: "destructive" as const },
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
};

export default function Trattative() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<Deal["status"] | "tutti">("tutti");
  const [searchTerm, setSearchTerm] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("tutti");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [deletingDealId, setDeletingDealId] = useState<string | null>(null);
  
  const { data: deals = [], isLoading } = useDeals(statusFilter);
  const { data: clienti = [] } = useClienti();
  const { data: aziende = [] } = useAziende();
  const createDeal = useCreateDeal();
  const updateDeal = useUpdateDeal();
  const deleteDeal = useDeleteDeal();

  const [formData, setFormData] = useState({
    client_id: "",
    company_id: "",
    title: "",
    goal: "",
    estimated_value: 0,
    probability: 50,
    next_action_date: "",
    next_action_note: "",
    notes: "",
    status: "open" as Deal["status"],
  });

  const resetForm = () => {
    setFormData({
      client_id: "",
      company_id: "",
      title: "",
      goal: "",
      estimated_value: 0,
      probability: 50,
      next_action_date: "",
      next_action_note: "",
      notes: "",
      status: "open",
    });
    setEditingDeal(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (deal: Deal, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDeal(deal);
    setFormData({
      client_id: deal.client_id,
      company_id: deal.company_id || "",
      title: deal.title,
      goal: deal.goal || "",
      estimated_value: deal.estimated_value,
      probability: deal.probability,
      next_action_date: deal.next_action_date || "",
      next_action_note: deal.next_action_note || "",
      notes: deal.notes || "",
      status: deal.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingDealId(id);
  };

  const confirmDelete = () => {
    if (deletingDealId) {
      deleteDeal.mutate(deletingDealId, {
        onSuccess: () => setDeletingDealId(null),
      });
    }
  };

  // Filter deals
  const filteredDeals = deals.filter((deal) => {
    const matchesSearch =
      deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.cliente?.nome?.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesUrgency = true;
    if (urgencyFilter !== "tutti" && deal.next_action_date) {
      const actionDate = parseISO(deal.next_action_date);
      const today = new Date();
      
      if (urgencyFilter === "scadute") {
        matchesUrgency = isBefore(actionDate, today) && !isToday(actionDate);
      } else if (urgencyFilter === "oggi") {
        matchesUrgency = isToday(actionDate);
      } else if (urgencyFilter === "settimana") {
        matchesUrgency = actionDate <= addDays(today, 7) && actionDate >= today;
      }
    } else if (urgencyFilter !== "tutti") {
      matchesUrgency = false;
    }

    return matchesSearch && matchesUrgency;
  });

  const handleSubmit = () => {
    if (!formData.client_id || !formData.title) return;

    if (editingDeal) {
      updateDeal.mutate(
        {
          id: editingDeal.id,
          client_id: formData.client_id,
          company_id: formData.company_id || null,
          title: formData.title,
          status: formData.status,
          goal: formData.goal || null,
          estimated_value: formData.estimated_value,
          probability: formData.probability,
          next_action_date: formData.next_action_date || null,
          next_action_note: formData.next_action_note || null,
          notes: formData.notes || null,
        },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            resetForm();
          },
        }
      );
    } else {
      createDeal.mutate(
        {
          client_id: formData.client_id,
          company_id: formData.company_id || null,
          title: formData.title,
          status: "open",
          goal: formData.goal || null,
          estimated_value: formData.estimated_value,
          probability: formData.probability,
          next_action_date: formData.next_action_date || null,
          next_action_note: formData.next_action_note || null,
          notes: formData.notes || null,
        },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            resetForm();
          },
        }
      );
    }
  };

  // Calculate summary stats
  const openDeals = deals.filter((d) => d.status === "open");
  const totalValue = openDeals.reduce((sum, d) => sum + (d.estimated_value || 0), 0);
  const urgentDeals = openDeals.filter((d) => {
    if (!d.next_action_date) return false;
    const actionDate = parseISO(d.next_action_date);
    return isBefore(actionDate, addDays(new Date(), 7));
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-primary">Trattative</p>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
              Gestione Trattative
            </h1>
            <p className="text-muted-foreground">Gestisci le tue trattative commerciali</p>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuova Trattativa
          </Button>
        </div>

        {/* Summary Cards - Modern */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 animate-fade-in stagger-1">
          <div className="rounded-2xl bg-card border border-primary/20 p-5 shadow-sm bg-gradient-to-br from-card to-primary/5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Trattative Aperte</p>
                <p className="text-2xl font-bold">{openDeals.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-card border border-success/20 p-5 shadow-sm bg-gradient-to-br from-card to-success/5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valore Potenziale</p>
                <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-card border border-warning/20 p-5 shadow-sm bg-gradient-to-br from-card to-warning/5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-warning/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Urgenti (7g)</p>
                <p className="text-2xl font-bold">{urgentDeals.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-card border border-info/20 p-5 shadow-sm bg-gradient-to-br from-card to-info/5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-info/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Prob. Media</p>
                <p className="text-2xl font-bold">
                  {openDeals.length > 0
                    ? Math.round(openDeals.reduce((s, d) => s + d.probability, 0) / openDeals.length)
                    : 0}
                  %
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters - Modern */}
        <div className="rounded-2xl bg-card border border-border/50 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca trattativa o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 h-11 rounded-xl bg-muted/30"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Deal["status"] | "tutti")}>
              <SelectTrigger className="w-[140px] h-11 rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutti</SelectItem>
                <SelectItem value="open">Aperte</SelectItem>
                <SelectItem value="won">Vinte</SelectItem>
                <SelectItem value="lost">Perse</SelectItem>
              </SelectContent>
            </Select>
            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger className="w-[160px] h-11 rounded-xl">
                <SelectValue placeholder="Urgenza" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutte</SelectItem>
                <SelectItem value="scadute">Scadute</SelectItem>
                <SelectItem value="oggi">Oggi</SelectItem>
                <SelectItem value="settimana">Prossimi 7g</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Deals Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Azienda</TableHead>
                  <TableHead>Titolo</TableHead>
                  <TableHead className="text-right">Valore</TableHead>
                  <TableHead className="text-center">Prob.</TableHead>
                  <TableHead>Prossima Azione</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nessuna trattativa trovata
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDeals.map((deal) => {
                    const isOverdue =
                      deal.next_action_date &&
                      isBefore(parseISO(deal.next_action_date), new Date()) &&
                      !isToday(parseISO(deal.next_action_date));

                    return (
                      <TableRow
                        key={deal.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/trattative/${deal.id}`)}
                      >
                        <TableCell>
                          <Badge variant={statusConfig[deal.status].variant}>
                            {statusConfig[deal.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{deal.cliente?.nome}</TableCell>
                        <TableCell>{deal.azienda?.nome || "-"}</TableCell>
                        <TableCell>{deal.title}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(deal.estimated_value)}
                        </TableCell>
                        <TableCell className="text-center">{deal.probability}%</TableCell>
                        <TableCell>
                          {deal.next_action_date ? (
                            <div className={isOverdue ? "text-destructive" : ""}>
                              <div className="text-sm">
                                {format(parseISO(deal.next_action_date), "d MMM", { locale: it })}
                              </div>
                              {deal.next_action_note && (
                                <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                  {deal.next_action_note}
                                </div>
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => openEditDialog(deal, e)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Modifica
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => handleDelete(deal.id, e)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Elimina
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Deal Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDeal ? "Modifica Trattativa" : "Nuova Trattativa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cliente *</Label>
              <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clienti.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Azienda / Fornitore</Label>
              <Select value={formData.company_id} onValueChange={(v) => setFormData({ ...formData, company_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona azienda" />
                </SelectTrigger>
                <SelectContent>
                  {aziende.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Titolo *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Es: Promo Borgofulvia gennaio"
              />
            </div>
            {editingDeal && (
              <div>
                <Label>Stato</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as Deal["status"] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Aperta</SelectItem>
                    <SelectItem value="won">Vinta</SelectItem>
                    <SelectItem value="lost">Persa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Obiettivo</Label>
              <Input
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                placeholder="Es: Aumentare di 2 pallet"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valore Stimato (EUR)</Label>
                <Input
                  type="number"
                  value={formData.estimated_value}
                  onChange={(e) => setFormData({ ...formData, estimated_value: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Probabilita (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data Prossima Azione</Label>
                <Input
                  type="date"
                  value={formData.next_action_date}
                  onChange={(e) => setFormData({ ...formData, next_action_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Azione</Label>
                <Input
                  value={formData.next_action_note}
                  onChange={(e) => setFormData({ ...formData, next_action_note: e.target.value })}
                  placeholder="Es: Chiamare"
                />
              </div>
            </div>
            <div>
              <Label>Note</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
              Annulla
            </Button>
            <Button onClick={handleSubmit} disabled={createDeal.isPending || updateDeal.isPending}>
              {editingDeal ? "Salva Modifiche" : "Crea Trattativa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDealId} onOpenChange={(open) => !open && setDeletingDealId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questa trattativa?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. La trattativa verrà eliminata definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
