import { useState, useMemo } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { it } from "date-fns/locale";
import { Plus, Search, Calendar, Users, Filter, MapPin } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientVisits, useDeleteClientVisit, ClientVisit } from "@/hooks/useClientVisits";
import { useClienti } from "@/hooks/useClienti";
import { VisitFormDialog } from "@/components/visite/VisitFormDialog";
import { VisitCard } from "@/components/visite/VisitCard";
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

const DATE_FILTER_OPTIONS = [
  { value: "today", label: "Oggi" },
  { value: "week", label: "Questa settimana" },
  { value: "month", label: "Questo mese" },
  { value: "last30", label: "Ultimi 30 giorni" },
  { value: "all", label: "Tutte" },
];

export default function VisiteClienti() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<ClientVisit | null>(null);
  const [deleteVisit, setDeleteVisit] = useState<ClientVisit | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("week");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [clientSearch, setClientSearch] = useState("");

  const { data: clienti = [] } = useClienti();
  const deleteVisitMutation = useDeleteClientVisit();

  // Calculate date range based on filter
  const dateRange = useMemo(() => {
    const today = new Date();
    switch (dateFilter) {
      case "today":
        return { start: format(today, "yyyy-MM-dd"), end: format(today, "yyyy-MM-dd") };
      case "week":
        return {
          start: format(startOfWeek(today, { locale: it }), "yyyy-MM-dd"),
          end: format(endOfWeek(today, { locale: it }), "yyyy-MM-dd"),
        };
      case "month":
        return {
          start: format(startOfMonth(today), "yyyy-MM-dd"),
          end: format(endOfMonth(today), "yyyy-MM-dd"),
        };
      case "last30":
        return {
          start: format(subDays(today, 30), "yyyy-MM-dd"),
          end: format(today, "yyyy-MM-dd"),
        };
      default:
        return { start: undefined, end: undefined };
    }
  }, [dateFilter]);

  const { data: visits = [], isLoading } = useClientVisits({
    clientId: clientFilter !== "all" ? clientFilter : undefined,
    startDate: dateRange.start,
    endDate: dateRange.end,
    searchQuery: searchQuery || undefined,
  });

  const filteredClienti = clienti.filter((c) =>
    c.nome.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const handleEdit = (visit: ClientVisit) => {
    setEditingVisit(visit);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteVisit) {
      await deleteVisitMutation.mutateAsync(deleteVisit.id);
      setDeleteVisit(null);
    }
  };

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingVisit(null);
    }
  };

  // Stats
  const todayVisits = visits.filter(
    (v) => v.data_visita === format(new Date(), "yyyy-MM-dd")
  ).length;
  const ordiniCount = visits.filter((v) => v.esito === "ordine_fatto").length;
  const uniqueClients = new Set(visits.map((v) => v.client_id)).size;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Visite Clienti</h1>
            <p className="text-muted-foreground mt-1">Registra e consulta le visite ai clienti</p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuova Visita
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{visits.length}</p>
                  <p className="text-xs text-muted-foreground">Visite nel periodo</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <MapPin className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{todayVisits}</p>
                  <p className="text-xs text-muted-foreground">Visite oggi</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{uniqueClients}</p>
                  <p className="text-xs text-muted-foreground">Clienti visitati</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Filter className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{ordiniCount}</p>
                  <p className="text-xs text-muted-foreground">Con ordine</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca nelle note..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Periodo" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="Tutti i clienti" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input
                      placeholder="Cerca cliente..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="mb-2"
                    />
                  </div>
                  <SelectItem value="all">Tutti i clienti</SelectItem>
                  {filteredClienti.slice(0, 50).map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Visits List */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-4">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
          ) : visits.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium text-lg mb-1">Nessuna visita trovata</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {searchQuery || clientFilter !== "all"
                    ? "Prova a modificare i filtri di ricerca"
                    : "Inizia registrando la tua prima visita"}
                </p>
                <Button onClick={() => setIsFormOpen(true)} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Registra Visita
                </Button>
              </CardContent>
            </Card>
          ) : (
            visits.map((visit) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                onEdit={handleEdit}
                onDelete={setDeleteVisit}
              />
            ))
          )}
        </div>
      </div>

      {/* Form Dialog */}
      <VisitFormDialog
        open={isFormOpen}
        onOpenChange={handleFormClose}
        visit={editingVisit}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteVisit} onOpenChange={() => setDeleteVisit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questa visita?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. La visita verrà eliminata permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
