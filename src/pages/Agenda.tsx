import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, User, Loader2, Trash2, CalendarDays, History, CalendarCheck } from "lucide-react";
import { useEventi, useCreateEvento, useDeleteEvento, useUpcomingEventi, usePastEventi, Evento } from "@/hooks/useEventi";
import { useClienti } from "@/hooks/useClienti";
import { format, addDays, subDays, parseISO, isToday, isTomorrow } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";

const tipoConfig = {
  meeting: { label: "Riunione", className: "bg-primary/10 text-primary border-primary/20" },
  presentazione: { label: "Presentazione", className: "bg-info/10 text-info border-info/20" },
  visita: { label: "Visita", className: "bg-success/10 text-success border-success/20" },
  altro: { label: "Altro", className: "bg-muted text-muted-foreground border-muted" },
};

const getDateLabel = (dateStr: string) => {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Oggi";
  if (isTomorrow(date)) return "Domani";
  return format(date, "EEE d MMM", { locale: it });
};

// Componente per mostrare un singolo evento
const EventoCard = ({ evento, onDelete, showDate = false, isPast = false }: { 
  evento: Evento; 
  onDelete: (id: string) => void;
  showDate?: boolean;
  isPast?: boolean;
}) => (
  <div
    className={cn(
      "group rounded-xl bg-card border p-4 lg:p-5 transition-all duration-300 hover:shadow-card animate-fade-in",
      isPast ? "opacity-70 border-muted" : "border-border hover:border-primary/20"
    )}
  >
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
      <div className="space-y-3 flex-1">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge className={cn(tipoConfig[evento.tipo].className, "border")}>
            {tipoConfig[evento.tipo].label}
          </Badge>
          {showDate && (
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
              {getDateLabel(evento.data)}
            </span>
          )}
          <h3 className="font-semibold text-card-foreground">{evento.titolo}</h3>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
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
              <span className="truncate max-w-[200px]">{evento.luogo}</span>
            </div>
          )}
          {evento.clienti?.nome && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4 flex-shrink-0" />
              {evento.clienti.nome}
            </div>
          )}
        </div>
        {evento.descrizione && (
          <p className="text-sm text-muted-foreground">{evento.descrizione}</p>
        )}
      </div>
      {!isPast && (
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive self-start"
          onClick={() => onDelete(evento.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  </div>
);

const Agenda = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("calendario");
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
  const { data: upcomingEventi, isLoading: upcomingLoading } = useUpcomingEventi();
  const { data: pastEventi, isLoading: pastLoading } = usePastEventi();
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
      <div className="space-y-6 lg:space-y-8 animate-fade-in">
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
                <div className="space-y-2">
                  <Label>Descrizione</Label>
                  <Input
                    value={formData.descrizione}
                    onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                    placeholder="Aggiungi una descrizione (opzionale)"
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
            <TabsTrigger value="calendario" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Calendario</span>
            </TabsTrigger>
            <TabsTrigger value="prossimi" className="gap-2">
              <CalendarCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Prossimi</span>
              {upcomingEventi && upcomingEventi.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {upcomingEventi.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="passati" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Passati</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Calendario */}
          <TabsContent value="calendario" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Calendar */}
              <div className="rounded-xl bg-card p-4 lg:p-6 shadow-card">
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
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-info" />
                    <span className="text-xs text-muted-foreground">Presentazioni</span>
                  </div>
                </div>
              </div>

              {/* Events for selected day */}
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
                    <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground font-medium">Nessun evento per questa data</p>
                    <p className="text-sm text-muted-foreground mt-1">Clicca per aggiungere un appuntamento</p>
                    <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Aggiungi evento
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {eventi.map((evento) => (
                      <EventoCard 
                        key={evento.id} 
                        evento={evento} 
                        onDelete={(id) => deleteEvento.mutate(id)} 
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab Prossimi Appuntamenti */}
          <TabsContent value="prossimi" className="space-y-6">
            <div className="rounded-xl bg-card p-4 lg:p-6 shadow-card">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CalendarCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-card-foreground">Prossimi Appuntamenti</h2>
                  <p className="text-sm text-muted-foreground">
                    Tutti gli appuntamenti futuri in ordine cronologico
                  </p>
                </div>
              </div>

              {upcomingLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !upcomingEventi?.length ? (
                <div className="text-center py-12">
                  <CalendarCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground font-medium">Nessun appuntamento in programma</p>
                  <p className="text-sm text-muted-foreground mt-1">Aggiungi il tuo primo appuntamento</p>
                  <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuovo appuntamento
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEventi.map((evento) => (
                    <EventoCard 
                      key={evento.id} 
                      evento={evento} 
                      onDelete={(id) => deleteEvento.mutate(id)}
                      showDate 
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab Appuntamenti Passati */}
          <TabsContent value="passati" className="space-y-6">
            <div className="rounded-xl bg-card p-4 lg:p-6 shadow-card">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-muted rounded-lg">
                  <History className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="font-semibold text-card-foreground">Appuntamenti Passati</h2>
                  <p className="text-sm text-muted-foreground">
                    Storico degli appuntamenti già svolti
                  </p>
                </div>
              </div>

              {pastLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !pastEventi?.length ? (
                <div className="text-center py-12">
                  <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground font-medium">Nessun appuntamento passato</p>
                  <p className="text-sm text-muted-foreground mt-1">Gli appuntamenti passati appariranno qui</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pastEventi.map((evento) => (
                    <EventoCard 
                      key={evento.id} 
                      evento={evento} 
                      onDelete={(id) => deleteEvento.mutate(id)}
                      showDate
                      isPast 
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Agenda;