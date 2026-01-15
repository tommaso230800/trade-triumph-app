import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Plus, Trash2, CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useClienti } from "@/hooks/useClienti";
import { useAziende } from "@/hooks/useAziende";
import { useOrdini } from "@/hooks/useOrdini";
import {
  DailyReportFormData,
  ReportActivity,
  TIPO_ATTIVITA_OPTIONS,
  ESITO_OPTIONS,
  DailyReport,
} from "@/hooks/useDailyReports";
import { cn } from "@/lib/utils";

interface ReportFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DailyReportFormData) => void;
  isLoading?: boolean;
  initialData?: DailyReport | null;
}

type FormValues = {
  data_report: Date;
  titolo: string;
  testo_report: string;
  ordini_fatti: boolean;
  campioni_consegnati: boolean;
  promo_proposte: boolean;
  problemi: boolean;
  incassi: boolean;
  activities: Omit<ReportActivity, 'id' | 'report_id'>[];
  linked_client_ids: string[];
  linked_order_ids: string[];
};

export function ReportFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  initialData,
}: ReportFormDialogProps) {
  const { data: clienti = [] } = useClienti();
  const { data: aziende = [] } = useAziende();
  const { data: ordini = [] } = useOrdini();

  const { register, handleSubmit, control, watch, setValue, reset } = useForm<FormValues>({
    defaultValues: {
      data_report: new Date(),
      titolo: "",
      testo_report: "",
      ordini_fatti: false,
      campioni_consegnati: false,
      promo_proposte: false,
      problemi: false,
      incassi: false,
      activities: [],
      linked_client_ids: [],
      linked_order_ids: [],
    },
  });

  const { fields: activityFields, append: appendActivity, remove: removeActivity } = useFieldArray({
    control,
    name: "activities",
  });

  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const dataReport = watch("data_report");

  useEffect(() => {
    if (initialData) {
      reset({
        data_report: new Date(initialData.data_report),
        titolo: initialData.titolo,
        testo_report: initialData.testo_report || "",
        ordini_fatti: initialData.ordini_fatti,
        campioni_consegnati: initialData.campioni_consegnati,
        promo_proposte: initialData.promo_proposte,
        problemi: initialData.problemi,
        incassi: initialData.incassi,
        activities: initialData.activities?.map(a => ({
          cliente_id: a.cliente_id,
          azienda_id: a.azienda_id,
          tipo_attivita: a.tipo_attivita,
          descrizione: a.descrizione,
          esito: a.esito,
          prossimo_step: a.prossimo_step,
        })) || [],
        linked_client_ids: initialData.linked_clients?.map(lc => lc.cliente_id) || [],
        linked_order_ids: initialData.linked_orders?.map(lo => lo.ordine_id) || [],
      });
      setSelectedClientIds(initialData.linked_clients?.map(lc => lc.cliente_id) || []);
      setSelectedOrderIds(initialData.linked_orders?.map(lo => lo.ordine_id) || []);
    } else {
      reset({
        data_report: new Date(),
        titolo: "",
        testo_report: "",
        ordini_fatti: false,
        campioni_consegnati: false,
        promo_proposte: false,
        problemi: false,
        incassi: false,
        activities: [],
        linked_client_ids: [],
        linked_order_ids: [],
      });
      setSelectedClientIds([]);
      setSelectedOrderIds([]);
    }
  }, [initialData, reset, open]);

  const handleFormSubmit = (data: FormValues) => {
    onSubmit({
      data_report: format(data.data_report, "yyyy-MM-dd"),
      titolo: data.titolo,
      testo_report: data.testo_report,
      ordini_fatti: data.ordini_fatti,
      campioni_consegnati: data.campioni_consegnati,
      promo_proposte: data.promo_proposte,
      problemi: data.problemi,
      incassi: data.incassi,
      activities: data.activities,
      linked_client_ids: selectedClientIds,
      linked_order_ids: selectedOrderIds,
    });
  };

  const toggleClientId = (id: string) => {
    setSelectedClientIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleOrderId = (id: string) => {
    setSelectedOrderIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Modifica Report" : "Nuovo Report Giornaliero"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <form id="report-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Data e Titolo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Report</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dataReport && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataReport ? format(dataReport, "PPP", { locale: it }) : "Seleziona data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataReport}
                      onSelect={(date) => date && setValue("data_report", date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="titolo">Titolo</Label>
                <Input
                  id="titolo"
                  placeholder="Es: Giro Empoli - promo Schenk"
                  {...register("titolo", { required: true })}
                />
              </div>
            </div>

            {/* Testo Report */}
            <div className="space-y-2">
              <Label htmlFor="testo_report">Descrizione della giornata</Label>
              <Textarea
                id="testo_report"
                placeholder="Cosa hai fatto oggi? Ordini, visite, problemi..."
                rows={4}
                {...register("testo_report")}
              />
            </div>

            {/* Checkbox flags */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ordini_fatti"
                  {...register("ordini_fatti")}
                  onCheckedChange={(checked) => setValue("ordini_fatti", !!checked)}
                  checked={watch("ordini_fatti")}
                />
                <Label htmlFor="ordini_fatti" className="text-sm">Ordini fatti</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="campioni_consegnati"
                  {...register("campioni_consegnati")}
                  onCheckedChange={(checked) => setValue("campioni_consegnati", !!checked)}
                  checked={watch("campioni_consegnati")}
                />
                <Label htmlFor="campioni_consegnati" className="text-sm">Campioni</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="promo_proposte"
                  {...register("promo_proposte")}
                  onCheckedChange={(checked) => setValue("promo_proposte", !!checked)}
                  checked={watch("promo_proposte")}
                />
                <Label htmlFor="promo_proposte" className="text-sm">Promo proposte</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="problemi"
                  {...register("problemi")}
                  onCheckedChange={(checked) => setValue("problemi", !!checked)}
                  checked={watch("problemi")}
                />
                <Label htmlFor="problemi" className="text-sm">Problemi</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="incassi"
                  {...register("incassi")}
                  onCheckedChange={(checked) => setValue("incassi", !!checked)}
                  checked={watch("incassi")}
                />
                <Label htmlFor="incassi" className="text-sm">Incassi</Label>
              </div>
            </div>

            <Separator />

            {/* Attività della giornata */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Attivita della giornata</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    appendActivity({
                      cliente_id: null,
                      azienda_id: null,
                      tipo_attivita: "visita",
                      descrizione: "",
                      esito: null,
                      prossimo_step: "",
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Aggiungi
                </Button>
              </div>

              {activityFields.map((field, index) => (
                <div
                  key={field.id}
                  className="border rounded-lg p-4 space-y-3 bg-muted/30"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-muted-foreground">
                      Attivita {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeActivity(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Cliente</Label>
                      <Select
                        value={watch(`activities.${index}.cliente_id`) || "none"}
                        onValueChange={(v) =>
                          setValue(`activities.${index}.cliente_id`, v === "none" ? null : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nessuno</SelectItem>
                          {clienti.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Azienda/Fornitore</Label>
                      <Select
                        value={watch(`activities.${index}.azienda_id`) || "none"}
                        onValueChange={(v) =>
                          setValue(`activities.${index}.azienda_id`, v === "none" ? null : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona azienda" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nessuna</SelectItem>
                          {aziende.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Tipo attivita</Label>
                      <Select
                        value={watch(`activities.${index}.tipo_attivita`)}
                        onValueChange={(v) =>
                          setValue(`activities.${index}.tipo_attivita`, v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPO_ATTIVITA_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Descrizione</Label>
                      <Input
                        placeholder="Breve descrizione"
                        {...register(`activities.${index}.descrizione`)}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Esito</Label>
                      <Select
                        value={watch(`activities.${index}.esito`) || "none"}
                        onValueChange={(v) =>
                          setValue(`activities.${index}.esito`, v === "none" ? null : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona esito" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nessuno</SelectItem>
                          {ESITO_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Prossimo step</Label>
                      <Input
                        placeholder="Es: Richiamare lunedi"
                        {...register(`activities.${index}.prossimo_step`)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Collegamenti */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Clienti collegati */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Clienti coinvolti</Label>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
                  {clienti.slice(0, 20).map((c) => (
                    <div key={c.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`client-${c.id}`}
                        checked={selectedClientIds.includes(c.id)}
                        onCheckedChange={() => toggleClientId(c.id)}
                      />
                      <Label htmlFor={`client-${c.id}`} className="text-sm font-normal cursor-pointer">
                        {c.nome}
                      </Label>
                    </div>
                  ))}
                  {clienti.length > 20 && (
                    <p className="text-xs text-muted-foreground">
                      +{clienti.length - 20} altri clienti
                    </p>
                  )}
                </div>
              </div>

              {/* Ordini collegati */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Ordini collegati</Label>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
                  {ordini.slice(0, 15).map((o) => (
                    <div key={o.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`order-${o.id}`}
                        checked={selectedOrderIds.includes(o.id)}
                        onCheckedChange={() => toggleOrderId(o.id)}
                      />
                      <Label htmlFor={`order-${o.id}`} className="text-sm font-normal cursor-pointer">
                        {o.codice} - {o.totale?.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
                      </Label>
                    </div>
                  ))}
                  {ordini.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nessun ordine disponibile</p>
                  )}
                </div>
              </div>
            </div>
          </form>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button type="submit" form="report-form" disabled={isLoading}>
            {isLoading ? "Salvataggio..." : initialData ? "Salva modifiche" : "Crea Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
