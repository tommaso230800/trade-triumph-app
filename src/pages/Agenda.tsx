import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, User, Loader2, Trash2 } from "lucide-react";
import { useEventi, useCreateEvento, useDeleteEvento, Evento } from "@/hooks/useEventi";
import { useClienti } from "@/hooks/useClienti";
import { format, addDays, subDays } from "date-fns";
import { it } from "date-fns/locale";

const tipoConfig = {
  meeting: { label: "Riunione", className: "bg-primary/10 text-primary" },
  presentazione: { label: "Presentazione", className: "bg-info/10 text-info" },
  visita: { label: "Visita", className: "bg-success/10 text-success" },
  altro: { label: "Altro", className: "bg-muted text-muted-foreground" },
};

const Agenda = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    titolo: "",
    descrizione: "",
    data: format(new Date(), "yyyy-MM-dd"),
    orario_inizio: "09:00",
    orario_fine: "10:00",
    luogo: "",
    cliente_id: "",
    tipo: "meeting" as Evento["tipo"],
  });

  const { data: eventi, isLoading } = useEventi(date);
  const { data: clienti } = useClienti();
  const createEvento = useCreateEvento();
  const deleteEvento = useDeleteEvento();

  const handleSubmit = async () => {
    if (!formData.titolo) return;
    await createEvento.mutateAsync({
      titolo: formData.titolo,
      descrizione: formData.descrizione || null,
      data: formData.data,
      orario_inizio: formData.orario_inizio || null,
      orario_fine: formData.orario_fine || null,
      luogo: formData.luogo || null,
      cliente_id: formData.cliente_id || null,
      tipo: formData.tipo,
    });
    setIsDialogOpen(false);
    setFormData({
      titolo: "",
      descrizione: "",
      data: format(date, "yyyy-MM-dd"),
      orario_inizio: "09:00",
      orario_fine: "10:00",
      luogo: "",
      cliente_id: "",
      tipo: "meeting",
    });
  };

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="page-title">Agenda</h1>
            <p className="text-body-md text-muted-foreground">
              Gestisci i tuoi appuntamenti e visite
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuovo Evento</span>
                <span className="sm:hidden">Aggiungi</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nuovo Evento</DialogTitle>
                <DialogDescription>Aggiungi un nuovo evento all'agenda</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Titolo *</Label>
                  <Input
                    value={formData.titolo}
                    onChange={(e) => setFormData({ ...formData, titolo: e.target.value })}
                    placeholder="Es: Riunione con cliente"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input
                      type="date"
                      value={formData.data}
                      onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(v) => setFormData({ ...formData, tipo: v as Evento["tipo"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meeting">Riunione</SelectItem>
                        <SelectItem value="presentazione">Presentazione</SelectItem>
                        <SelectItem value="visita">Visita</SelectItem>
                        <SelectItem value="altro">Altro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ora Inizio</Label>
                    <Input
                      type="time"
                      value={formData.orario_inizio}
                      onChange={(e) => setFormData({ ...formData, orario_inizio: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ora Fine</Label>
                    <Input
                      type="time"
                      value={formData.orario_fine}
                      onChange={(e) => setFormData({ ...formData, orario_fine: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Luogo</Label>
                  <Input
                    value={formData.luogo}
                    onChange={(e) => setFormData({ ...formData, luogo: e.target.value })}
                    placeholder="Es: Via Roma 15, Milano"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select
                    value={formData.cliente_id}
                    onValueChange={(v) => setFormData({ ...formData, cliente_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona cliente (opzionale)" />
                    </SelectTrigger>
                    <SelectContent>
                      {clienti?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annulla
                </Button>
                <Button onClick={handleSubmit} disabled={createEvento.isPending || !formData.titolo}>
                  {createEvento.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crea
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar */}
          <div className="rounded-xl bg-card p-4 lg:p-6 shadow-card animate-fade-in">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              className="rounded-md"
              locale={it}
            />
            <div className="mt-4 flex items-center gap-4 border-t border-border pt-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground">Riunioni</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-success" />
                <span className="text-xs text-muted-foreground">Visite</span>
              </div>
            </div>
          </div>

          {/* Events */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-card p-4 shadow-card">
              <Button variant="ghost" size="icon" onClick={() => setDate(subDays(date, 1))}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-base lg:text-lg font-semibold text-card-foreground text-center">
                {format(date, "EEEE d MMMM yyyy", { locale: it })}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setDate(addDays(date, 1))}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !eventi?.length ? (
              <div className="text-center py-12 bg-card rounded-xl shadow-card">
                <p className="text-muted-foreground">Nessun evento per questa data</p>
                <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                  Aggiungi evento
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {eventi.map((evento) => (
                  <div
                    key={evento.id}
                    className="group rounded-xl bg-card p-4 lg:p-5 shadow-card transition-all duration-300 hover:shadow-card-hover animate-fade-in"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge className={tipoConfig[evento.tipo].className}>
                            {tipoConfig[evento.tipo].label}
                          </Badge>
                          <h3 className="font-semibold text-card-foreground">{evento.titolo}</h3>
                        </div>
                        <div className="space-y-1.5 text-sm">
                          {(evento.orario_inizio || evento.orario_fine) && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4 flex-shrink-0" />
                              {evento.orario_inizio?.slice(0, 5)}
                              {evento.orario_fine && ` - ${evento.orario_fine.slice(0, 5)}`}
                            </div>
                          )}
                          {evento.luogo && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{evento.luogo}</span>
                            </div>
                          )}
                          {evento.clienti?.nome && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="h-4 w-4 flex-shrink-0" />
                              {evento.clienti.nome}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive self-start"
                        onClick={() => deleteEvento.mutate(evento.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Agenda;
