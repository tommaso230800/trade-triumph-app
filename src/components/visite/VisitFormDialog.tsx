import { useState, useEffect } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useClienti } from "@/hooks/useClienti";
import { useCreateClientVisit, useUpdateClientVisit, ClientVisit } from "@/hooks/useClientVisits";

const ESITO_OPTIONS = [
  { value: "ordine_fatto", label: "Ordine fatto" },
  { value: "preventivo", label: "Preventivo" },
  { value: "problematiche", label: "Problematiche" },
  { value: "da_ricontattare", label: "Da ricontattare" },
  { value: "visita_conoscitiva", label: "Visita conoscitiva" },
  { value: "altro", label: "Altro" },
];

interface VisitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit?: ClientVisit | null;
  preselectedClientId?: string;
}

export function VisitFormDialog({ open, onOpenChange, visit, preselectedClientId }: VisitFormDialogProps) {
  const { data: clienti = [] } = useClienti();
  const createVisit = useCreateClientVisit();
  const updateVisit = useUpdateClientVisit();

  const [formData, setFormData] = useState({
    client_id: "",
    data_visita: new Date(),
    titolo: "",
    esito: "",
    note_visita: "",
    azioni_future: "",
  });

  const [clientSearch, setClientSearch] = useState("");

  useEffect(() => {
    if (visit) {
      setFormData({
        client_id: visit.client_id,
        data_visita: new Date(visit.data_visita),
        titolo: visit.titolo || "",
        esito: visit.esito || "",
        note_visita: visit.note_visita || "",
        azioni_future: visit.azioni_future || "",
      });
    } else {
      setFormData({
        client_id: preselectedClientId || "",
        data_visita: new Date(),
        titolo: "",
        esito: "",
        note_visita: "",
        azioni_future: "",
      });
    }
  }, [visit, preselectedClientId, open]);

  const filteredClienti = clienti.filter((c) =>
    c.nome.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.client_id) {
      return;
    }

    const payload = {
      client_id: formData.client_id,
      data_visita: format(formData.data_visita, "yyyy-MM-dd"),
      titolo: formData.titolo || null,
      esito: formData.esito || null,
      note_visita: formData.note_visita || null,
      azioni_future: formData.azioni_future || null,
    };

    if (visit) {
      await updateVisit.mutateAsync({ id: visit.id, ...payload });
    } else {
      await createVisit.mutateAsync(payload);
    }

    onOpenChange(false);
  };

  const isLoading = createVisit.isPending || updateVisit.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{visit ? "Modifica Visita" : "Nuova Visita"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Data */}
          <div className="space-y-2">
            <Label>Data Visita</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.data_visita && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(formData.data_visita, "PPP", { locale: it })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.data_visita}
                  onSelect={(date) => date && setFormData({ ...formData, data_visita: date })}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Cliente */}
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) => setFormData({ ...formData, client_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona cliente" />
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
                {filteredClienti.slice(0, 50).map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nome} {cliente.citta && `- ${cliente.citta}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Titolo */}
          <div className="space-y-2">
            <Label>Titolo / Oggetto Visita</Label>
            <Input
              value={formData.titolo}
              onChange={(e) => setFormData({ ...formData, titolo: e.target.value })}
              placeholder="Es: Presentazione nuovi prodotti"
            />
          </div>

          {/* Esito */}
          <div className="space-y-2">
            <Label>Esito</Label>
            <Select
              value={formData.esito}
              onValueChange={(value) => setFormData({ ...formData, esito: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona esito" />
              </SelectTrigger>
              <SelectContent>
                {ESITO_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Note Visita */}
          <div className="space-y-2">
            <Label>Note Visita</Label>
            <Textarea
              value={formData.note_visita}
              onChange={(e) => setFormData({ ...formData, note_visita: e.target.value })}
              placeholder="Cosa è accaduto durante la visita..."
              rows={4}
            />
          </div>

          {/* Azioni Future */}
          <div className="space-y-2">
            <Label>Azioni Future / To-do</Label>
            <Textarea
              value={formData.azioni_future}
              onChange={(e) => setFormData({ ...formData, azioni_future: e.target.value })}
              placeholder="Cosa devo fare in futuro..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Annulla
            </Button>
            <Button type="submit" disabled={isLoading || !formData.client_id} className="flex-1">
              {isLoading ? "Salvataggio..." : visit ? "Aggiorna" : "Salva Visita"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
