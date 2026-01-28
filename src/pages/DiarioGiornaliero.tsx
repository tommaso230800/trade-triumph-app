import { useState } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  Plus,
  Search,
  CalendarDays,
  Package,
  Users,
  Gift,
  FileText,
  Pencil,
  Trash2,
  ChevronRight,
  Phone,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
  X,
  RotateCcw,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { useClienti } from "@/hooks/useClienti";
import {
  useDailyReports,
  useTodayReportStats,
  useCreateDailyReport,
  useUpdateDailyReport,
  useDeleteDailyReport,
  DailyReport,
  DailyReportFormData,
  TIPO_ATTIVITA_OPTIONS,
} from "@/hooks/useDailyReports";
import { ReportFormDialog } from "@/components/diario/ReportFormDialog";
import { ReportDetailDialog } from "@/components/diario/ReportDetailDialog";
import { cn } from "@/lib/utils";
import { SearchableSelect } from "@/components/ui/searchable-select";

const getActivityIcon = (tipo: string) => {
  switch (tipo) {
    case "visita": return Users;
    case "telefonata": return Phone;
    case "whatsapp": return MessageSquare;
    case "ordine": return Package;
    case "campioni": return Gift;
    case "problema": return AlertCircle;
    default: return FileText;
  }
};

const getEsitoConfig = (esito: string | null) => {
  switch (esito) {
    case "ok": return { icon: CheckCircle2, color: "text-success", bg: "bg-success/10" };
    case "da_richiamare": return { icon: Clock, color: "text-warning", bg: "bg-warning/10" };
    case "interessato": return { icon: CheckCircle2, color: "text-info", bg: "bg-info/10" };
    case "non_interessato": return { icon: X, color: "text-muted-foreground", bg: "bg-muted" };
    default: return { icon: Clock, color: "text-muted-foreground", bg: "bg-muted" };
  }
};

export default function DiarioGiornaliero() {
  const { toast } = useToast();
  const { data: clienti = [] } = useClienti();

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [clienteFilter, setClienteFilter] = useState<string>("");
  const [tipoAttivitaFilter, setTipoAttivitaFilter] = useState<string>("");

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);

  // Data
  const { data: stats } = useTodayReportStats();
  const { data: reports = [], isLoading } = useDailyReports({
    searchTerm: searchTerm || undefined,
    dateFrom: dateFrom ? format(dateFrom, "yyyy-MM-dd") : undefined,
    dateTo: dateTo ? format(dateTo, "yyyy-MM-dd") : undefined,
    clienteId: clienteFilter || undefined,
    tipoAttivita: tipoAttivitaFilter || undefined,
  });

  const createMutation = useCreateDailyReport();
  const updateMutation = useUpdateDailyReport();
  const deleteMutation = useDeleteDailyReport();

  const handleCreate = async (data: DailyReportFormData) => {
    try {
      await createMutation.mutateAsync(data);
      toast({ title: "Report creato con successo" });
      setFormOpen(false);
    } catch (error) {
      toast({ title: "Errore nella creazione", variant: "destructive" });
    }
  };

  const handleUpdate = async (data: DailyReportFormData) => {
    if (!selectedReport) return;
    try {
      await updateMutation.mutateAsync({ id: selectedReport.id, formData: data });
      toast({ title: "Report aggiornato" });
      setFormOpen(false);
      setSelectedReport(null);
    } catch (error) {
      toast({ title: "Errore nell'aggiornamento", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!selectedReport) return;
    try {
      await deleteMutation.mutateAsync(selectedReport.id);
      toast({ title: "Report eliminato" });
      setDeleteOpen(false);
      setSelectedReport(null);
    } catch (error) {
      toast({ title: "Errore nell'eliminazione", variant: "destructive" });
    }
  };

  const openEdit = (report: DailyReport) => {
    setSelectedReport(report);
    setFormOpen(true);
  };

  const openDetail = (report: DailyReport) => {
    setSelectedReport(report);
    setDetailOpen(true);
  };

  const openDelete = (report: DailyReport) => {
    setSelectedReport(report);
    setDeleteOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDateFrom(undefined);
    setDateTo(undefined);
    setClienteFilter("");
    setTipoAttivitaFilter("");
  };

  const hasFilters = searchTerm || dateFrom || dateTo || clienteFilter || tipoAttivitaFilter;

  const clientiOptions = clienti.map(c => ({ value: c.id, label: c.nome }));

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header - Simplified */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Diario Giornaliero</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Registra le attività della giornata
            </p>
          </div>
          <Button onClick={() => { setSelectedReport(null); setFormOpen(true); }} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Nuovo Report
          </Button>
        </div>

        {/* KPI Cards - Simplified & More Visual */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.reportCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Report oggi</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/20">
                  <Package className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.ordersCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Ordini</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-info/10 to-info/5 border-info/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/20">
                  <Users className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.clientiCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Clienti</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/20">
                  <Gift className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.campioniCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Campioni</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters - Simplified into one row */}
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-card border shadow-sm">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca nei report..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn(dateFrom && "border-primary text-primary")}>
                <CalendarDays className="h-4 w-4 mr-2" />
                {dateFrom ? format(dateFrom, "dd/MM") : "Da"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn(dateTo && "border-primary text-primary")}>
                <CalendarDays className="h-4 w-4 mr-2" />
                {dateTo ? format(dateTo, "dd/MM") : "A"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
            </PopoverContent>
          </Popover>

          <div className="w-[180px]">
            <SearchableSelect
              options={clientiOptions}
              value={clienteFilter}
              onValueChange={setClienteFilter}
              placeholder="Cliente"
            />
          </div>

          <Select value={tipoAttivitaFilter} onValueChange={setTipoAttivitaFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i tipi</SelectItem>
              {TIPO_ATTIVITA_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          )}
        </div>

        {/* Reports List - Simplified Cards */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
              Caricamento...
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16 rounded-xl border-2 border-dashed bg-muted/30">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium text-muted-foreground">Nessun report trovato</p>
              <p className="text-sm text-muted-foreground/70 mb-4">Inizia creando il tuo primo report giornaliero</p>
              <Button onClick={() => { setSelectedReport(null); setFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Crea Report
              </Button>
            </div>
          ) : (
            reports.map((report) => (
              <Card
                key={report.id}
                className="group cursor-pointer hover:border-primary/30 hover:shadow-md transition-all duration-200"
                onClick={() => openDetail(report)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Date Badge */}
                    <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-primary/10 shrink-0">
                      <span className="text-xs font-medium text-primary uppercase">
                        {format(new Date(report.data_report), "MMM", { locale: it })}
                      </span>
                      <span className="text-xl font-bold text-primary">
                        {format(new Date(report.data_report), "dd")}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                        {report.titolo}
                      </h3>
                      
                      {report.testo_report && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                          {report.testo_report}
                        </p>
                      )}

                      {/* Activity Pills */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {report.activities?.slice(0, 3).map((activity, idx) => {
                          const Icon = getActivityIcon(activity.tipo_attivita);
                          const esitoConfig = getEsitoConfig(activity.esito);
                          return (
                            <Badge 
                              key={idx} 
                              variant="secondary" 
                              className={cn("text-xs gap-1 font-normal", esitoConfig.bg)}
                            >
                              <Icon className={cn("h-3 w-3", esitoConfig.color)} />
                              {activity.cliente?.nome?.split(" ")[0] || TIPO_ATTIVITA_OPTIONS.find(o => o.value === activity.tipo_attivita)?.label}
                            </Badge>
                          );
                        })}
                        {(report.activities?.length || 0) > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{(report.activities?.length || 0) - 3}
                          </Badge>
                        )}
                        {report.linked_orders && report.linked_orders.length > 0 && (
                          <Badge variant="secondary" className="text-xs gap-1 bg-success/10 text-success">
                            <Package className="h-3 w-3" />
                            {report.linked_orders.length} ordini
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(report);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDelete(report);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Form Dialog */}
      <ReportFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={selectedReport ? handleUpdate : handleCreate}
        isLoading={createMutation.isPending || updateMutation.isPending}
        initialData={selectedReport}
      />

      {/* Detail Dialog */}
      <ReportDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        report={selectedReport}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo report?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
