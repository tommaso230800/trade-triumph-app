import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Bell, Calendar, Phone, Mail, FileText, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const promemoria = [
  {
    id: 1,
    titolo: "Chiamare Rossi S.r.l.",
    descrizione: "Follow-up ordine mensile",
    data: "Oggi",
    orario: "10:00",
    tipo: "call",
    priorita: "alta",
    completato: false,
  },
  {
    id: 2,
    titolo: "Inviare preventivo Verde Dist.",
    descrizione: "Catalogo 2024 con prezzi aggiornati",
    data: "Oggi",
    orario: "14:00",
    tipo: "email",
    priorita: "alta",
    completato: false,
  },
  {
    id: 3,
    titolo: "Preparare presentazione",
    descrizione: "Nuovi prodotti per Bianchi & Co.",
    data: "Domani",
    orario: "09:00",
    tipo: "documento",
    priorita: "media",
    completato: false,
  },
  {
    id: 4,
    titolo: "Scadenza contratto Tech Solutions",
    descrizione: "Rinnovare entro fine mese",
    data: "12 Gen",
    orario: "--:--",
    tipo: "scadenza",
    priorita: "alta",
    completato: false,
  },
  {
    id: 5,
    titolo: "Report settimanale",
    descrizione: "Inviare al direttore vendite",
    data: "Ieri",
    orario: "18:00",
    tipo: "documento",
    priorita: "bassa",
    completato: true,
  },
];

const tipoIcons = {
  call: Phone,
  email: Mail,
  documento: FileText,
  scadenza: Calendar,
};

const prioritaConfig = {
  alta: { label: "Alta", className: "border-l-destructive bg-destructive/5" },
  media: { label: "Media", className: "border-l-warning bg-warning/5" },
  bassa: { label: "Bassa", className: "border-l-muted bg-muted/30" },
};

const Promemoria = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [items, setItems] = useState(promemoria);

  const toggleComplete = (id: number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, completato: !item.completato } : item
    ));
  };

  const pendenti = items.filter(item => !item.completato);
  const completati = items.filter(item => item.completato);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Promemoria</h1>
            <p className="mt-1 text-muted-foreground">
              Gestisci le tue attività e scadenze
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nuovo Promemoria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuovo Promemoria</DialogTitle>
                <DialogDescription>
                  Crea un nuovo promemoria per le tue attività
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="titolo">Titolo</Label>
                  <Input id="titolo" placeholder="Es: Chiamare cliente" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descrizione">Descrizione</Label>
                  <Input id="descrizione" placeholder="Dettagli aggiuntivi..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label>Orario</Label>
                    <Input type="time" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="call">Chiamata</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="documento">Documento</SelectItem>
                        <SelectItem value="scadenza">Scadenza</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priorità</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="media">Media</SelectItem>
                        <SelectItem value="bassa">Bassa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annulla
                </Button>
                <Button onClick={() => setIsDialogOpen(false)}>Crea</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Da completare</p>
            <p className="text-2xl font-bold text-card-foreground">{pendenti.length}</p>
          </div>
          <div className="rounded-lg bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Priorità Alta</p>
            <p className="text-2xl font-bold text-destructive">
              {pendenti.filter(p => p.priorita === "alta").length}
            </p>
          </div>
          <div className="rounded-lg bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Per Oggi</p>
            <p className="text-2xl font-bold text-warning">
              {pendenti.filter(p => p.data === "Oggi").length}
            </p>
          </div>
          <div className="rounded-lg bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Completati</p>
            <p className="text-2xl font-bold text-success">{completati.length}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pending */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Da Completare</h2>
            </div>
            <div className="space-y-3">
              {pendenti.map((item) => {
                const Icon = tipoIcons[item.tipo as keyof typeof tipoIcons];
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "group rounded-lg border-l-4 p-4 shadow-card transition-all duration-300 hover:shadow-card-hover animate-fade-in",
                      prioritaConfig[item.priorita as keyof typeof prioritaConfig].className
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={item.completato}
                        onCheckedChange={() => toggleComplete(item.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-muted p-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="font-medium text-card-foreground">{item.titolo}</h3>
                            <p className="text-sm text-muted-foreground">{item.descrizione}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-4">
                          <span className="text-xs text-muted-foreground">
                            {item.data} {item.orario !== "--:--" && `· ${item.orario}`}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {prioritaConfig[item.priorita as keyof typeof prioritaConfig].label}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Completed */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Completati</h2>
            <div className="space-y-3">
              {completati.map((item) => {
                const Icon = tipoIcons[item.tipo as keyof typeof tipoIcons];
                return (
                  <div
                    key={item.id}
                    className="rounded-lg bg-muted/30 p-4 opacity-60 animate-fade-in"
                  >
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={item.completato}
                        onCheckedChange={() => toggleComplete(item.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-muted p-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="font-medium text-muted-foreground line-through">
                              {item.titolo}
                            </h3>
                            <p className="text-sm text-muted-foreground">{item.descrizione}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Promemoria;
