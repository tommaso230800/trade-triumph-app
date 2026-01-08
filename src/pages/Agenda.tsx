import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";

const eventi = [
  {
    id: 1,
    titolo: "Riunione con Rossi S.r.l.",
    tipo: "meeting",
    orario: "09:00 - 10:30",
    luogo: "Milano, Via Roma 15",
    cliente: "Mario Rossi",
  },
  {
    id: 2,
    titolo: "Presentazione prodotti",
    tipo: "presentazione",
    orario: "11:00 - 12:00",
    luogo: "Online - Zoom",
    cliente: "Laura Bianchi",
  },
  {
    id: 3,
    titolo: "Pranzo di lavoro",
    tipo: "altro",
    orario: "13:00 - 14:30",
    luogo: "Ristorante Da Mario",
    cliente: "Giuseppe Verde",
  },
  {
    id: 4,
    titolo: "Visita cliente",
    tipo: "visita",
    orario: "15:00 - 17:00",
    luogo: "Torino, Via Garibaldi 42",
    cliente: "Anna Neri",
  },
];

const tipoConfig = {
  meeting: { label: "Riunione", className: "bg-primary/10 text-primary" },
  presentazione: { label: "Presentazione", className: "bg-info/10 text-info" },
  visita: { label: "Visita", className: "bg-success/10 text-success" },
  altro: { label: "Altro", className: "bg-muted text-muted-foreground" },
};

const Agenda = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Agenda</h1>
            <p className="mt-1 text-muted-foreground">
              Gestisci i tuoi appuntamenti e visite
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuovo Evento
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar */}
          <div className="rounded-xl bg-card p-6 shadow-card animate-fade-in">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md"
            />
            <div className="mt-4 flex items-center gap-4 border-t border-border pt-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary" />
                <span className="text-sm text-muted-foreground">Riunioni</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-success" />
                <span className="text-sm text-muted-foreground">Visite</span>
              </div>
            </div>
          </div>

          {/* Events */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-card p-4 shadow-card">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-lg font-semibold text-card-foreground">
                {date?.toLocaleDateString("it-IT", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h2>
              <Button variant="ghost" size="icon">
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              {eventi.map((evento) => (
                <div
                  key={evento.id}
                  className="group rounded-xl bg-card p-5 shadow-card transition-all duration-300 hover:shadow-card-hover animate-fade-in"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Badge className={tipoConfig[evento.tipo as keyof typeof tipoConfig].className}>
                          {tipoConfig[evento.tipo as keyof typeof tipoConfig].label}
                        </Badge>
                        <h3 className="font-semibold text-card-foreground">{evento.titolo}</h3>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {evento.orario}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {evento.luogo}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          {evento.cliente}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="outline" size="sm">Modifica</Button>
                      <Button variant="ghost" size="sm" className="text-destructive">Elimina</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Agenda;
