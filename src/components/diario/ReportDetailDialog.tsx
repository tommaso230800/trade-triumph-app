import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarDays, User, Building2, FileText, Package, CheckCircle, AlertCircle, Banknote, Gift, Megaphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { DailyReport, TIPO_ATTIVITA_OPTIONS, ESITO_OPTIONS } from "@/hooks/useDailyReports";

interface ReportDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: DailyReport | null;
}

export function ReportDetailDialog({ open, onOpenChange, report }: ReportDetailDialogProps) {
  if (!report) return null;

  const getTipoLabel = (value: string) =>
    TIPO_ATTIVITA_OPTIONS.find((o) => o.value === value)?.label || value;

  const getEsitoLabel = (value: string) =>
    ESITO_OPTIONS.find((o) => o.value === value)?.label || value;

  const flags = [
    { key: "ordini_fatti", label: "Ordini", icon: Package, active: report.ordini_fatti },
    { key: "campioni_consegnati", label: "Campioni", icon: Gift, active: report.campioni_consegnati },
    { key: "promo_proposte", label: "Promo", icon: Megaphone, active: report.promo_proposte },
    { key: "problemi", label: "Problemi", icon: AlertCircle, active: report.problemi },
    { key: "incassi", label: "Incassi", icon: Banknote, active: report.incassi },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            {report.titolo}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {format(new Date(report.data_report), "EEEE d MMMM yyyy", { locale: it })}
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Flags */}
            <div className="flex flex-wrap gap-2">
              {flags.map((flag) => (
                <Badge
                  key={flag.key}
                  variant={flag.active ? "default" : "outline"}
                  className={flag.active ? "" : "opacity-50"}
                >
                  <flag.icon className="h-3 w-3 mr-1" />
                  {flag.label}
                </Badge>
              ))}
            </div>

            {/* Testo report */}
            {report.testo_report && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Descrizione
                </h4>
                <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                  {report.testo_report}
                </p>
              </div>
            )}

            <Separator />

            {/* Attività */}
            {report.activities && report.activities.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Attivita ({report.activities.length})</h4>
                <div className="space-y-2">
                  {report.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="border rounded-lg p-3 space-y-2 bg-card"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{getTipoLabel(activity.tipo_attivita)}</Badge>
                        {activity.esito && (
                          <Badge variant="outline">{getEsitoLabel(activity.esito)}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {activity.cliente && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {activity.cliente.nome}
                          </span>
                        )}
                        {activity.azienda && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {activity.azienda.nome}
                          </span>
                        )}
                      </div>
                      {activity.descrizione && (
                        <p className="text-sm">{activity.descrizione}</p>
                      )}
                      {activity.prossimo_step && (
                        <p className="text-xs text-primary">
                          Prossimo step: {activity.prossimo_step}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clienti coinvolti */}
            {report.linked_clients && report.linked_clients.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Clienti coinvolti
                </h4>
                <div className="flex flex-wrap gap-2">
                  {report.linked_clients.map((lc) => (
                    <Badge key={lc.id} variant="outline">
                      {lc.cliente?.nome || "Cliente"}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Ordini collegati */}
            {report.linked_orders && report.linked_orders.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Ordini collegati
                </h4>
                <div className="space-y-1">
                  {report.linked_orders.map((lo) => (
                    <div
                      key={lo.id}
                      className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded"
                    >
                      <span className="font-mono">{lo.ordine?.codice || lo.ordine_id}</span>
                      <span className="text-muted-foreground">
                        {lo.ordine?.totale?.toLocaleString("it-IT", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
