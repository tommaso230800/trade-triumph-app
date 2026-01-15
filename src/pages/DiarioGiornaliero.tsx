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
  Filter,
  X,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Diario Giornaliero</h1>
            <p className="text-muted-foreground">
              Traccia le tue attivita quotidiane
            </p>
          </div>
          <Button onClick={() => { setSelectedReport(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Report
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Report oggi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{stats?.reportCount || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ordini oggi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold">{stats?.ordersCount || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Clienti contattati
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold">{stats?.clientiCount || 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Campioni consegnati
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-orange-600" />
                <span className="text-2xl font-bold">{stats?.campioniCount || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca report..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[130px]">
                    <CalendarDays className="h-4 w-4 mr-2" />
                    {dateFrom ? format(dateFrom, "dd/MM/yy") : "Da"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[130px]">
                    <CalendarDays className="h-4 w-4 mr-2" />
                    {dateTo ? format(dateTo, "dd/MM/yy") : "A"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Select value={clienteFilter} onValueChange={setClienteFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tutti i clienti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i clienti</SelectItem>
                  {clienti.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={tipoAttivitaFilter} onValueChange={setTipoAttivitaFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo attivita" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le attivita</SelectItem>
                  {TIPO_ATTIVITA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Pulisci
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Caricamento...
            </div>
          ) : reports.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nessun report trovato</p>
                <p className="text-sm">Crea il tuo primo report giornaliero</p>
              </CardContent>
            </Card>
          ) : (
            reports.map((report) => (
              <Card
                key={report.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => openDetail(report)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className="shrink-0">
                          {format(new Date(report.data_report), "dd MMM", { locale: it })}
                        </Badge>
                        <h3 className="font-medium truncate">{report.titolo}</h3>
                      </div>

                      {report.testo_report && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {report.testo_report}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {report.ordini_fatti && (
                          <Badge variant="secondary" className="text-xs">
                            <Package className="h-3 w-3 mr-1" />
                            Ordini
                          </Badge>
                        )}
                        {report.campioni_consegnati && (
                          <Badge variant="secondary" className="text-xs">
                            <Gift className="h-3 w-3 mr-1" />
                            Campioni
                          </Badge>
                        )}
                        {report.activities && report.activities.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {report.activities.length} attivita
                          </Badge>
                        )}
                        {report.linked_orders && report.linked_orders.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {report.linked_orders.length} ordini
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
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
                        onClick={(e) => {
                          e.stopPropagation();
                          openDelete(report);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
              Questa azione non puo essere annullata. Il report e tutte le attivita
              collegate verranno eliminati definitivamente.
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
