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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDeals, useCreateDeal, Deal } from "@/hooks/useDeals";
import { useClienti } from "@/hooks/useClienti";
import { useAziende } from "@/hooks/useAziende";
import { Plus, Search, Target, Calendar, TrendingUp, AlertCircle } from "lucide-react";
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
  
  const { data: deals = [], isLoading } = useDeals(statusFilter);
  const { data: clienti = [] } = useClienti();
  const { data: aziende = [] } = useAziende();
  const createDeal = useCreateDeal();

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
  });

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
          });
        },
      }
    );
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Trattative</h1>
            <p className="text-muted-foreground">Gestisci le tue trattative commerciali</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuova Trattativa
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Trattative Aperte</p>
                  <p className="text-2xl font-bold">{openDeals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valore Potenziale</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Urgenti (7 giorni)</p>
                  <p className="text-2xl font-bold">{urgentDeals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Prob. Media</p>
                  <p className="text-2xl font-bold">
                    {openDeals.length > 0
                      ? Math.round(openDeals.reduce((s, d) => s + d.probability, 0) / openDeals.length)
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca trattativa o cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Deal["status"] | "tutti")}>
                <SelectTrigger className="w-[150px]">
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
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Urgenza" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutti">Tutte</SelectItem>
                  <SelectItem value="scadute">Scadute</SelectItem>
                  <SelectItem value="oggi">Oggi</SelectItem>
                  <SelectItem value="settimana">Prossimi 7 giorni</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Deals Table */}
        <Card>
          <CardContent className="p-0">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* New Deal Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuova Trattativa</DialogTitle>
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
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSubmit} disabled={createDeal.isPending}>
              Crea Trattativa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
