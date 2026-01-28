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
import { Plus, Bell, Phone, Mail, FileText, Calendar, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  usePromemoria,
  useCreatePromemoria,
  useTogglePromemoria,
  useDeletePromemoria,
  Promemoria,
} from "@/hooks/usePromemoria";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";
import { it } from "date-fns/locale";

const tipoIcons = {
  call: Phone,
  email: Mail,
  documento: FileText,
  scadenza: Calendar,
};

const prioritaConfig = {
  alta: { label: "Alta", className: "border-l-destructive bg-destructive/5" },
  media: { label: "Media", className: "border-l-warning bg-warning/5" },
  bassa: { label: "Bassa", className: "border-l-info bg-info/5" },
};

const PromemoriaPage = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    titolo: "",
    descrizione: "",
    data: format(new Date(), "yyyy-MM-dd"),
    orario: "09:00",
    tipo: "documento" as Promemoria["tipo"],
    priorita: "media" as Promemoria["priorita"],
  });

  const { data: promemoria, isLoading } = usePromemoria();
  const createPromemoria = useCreatePromemoria();
  const togglePromemoria = useTogglePromemoria();
  const deletePromemoria = useDeletePromemoria();

  const handleSubmit = async () => {
    if (!formData.titolo) return;
    await createPromemoria.mutateAsync({
      titolo: formData.titolo,
      descrizione: formData.descrizione || null,
      data: formData.data,
      orario: formData.orario || null,
      tipo: formData.tipo,
      priorita: formData.priorita,
    });
    setIsDialogOpen(false);
    setFormData({
      titolo: "",
      descrizione: "",
      data: format(new Date(), "yyyy-MM-dd"),
      orario: "09:00",
      tipo: "documento",
      priorita: "media",
    });
  };

  const pendenti = promemoria?.filter((p) => !p.completato) || [];
  const completati = promemoria?.filter((p) => p.completato) || [];

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Oggi";
    if (isTomorrow(date)) return "Domani";
    if (isPast(date)) return "Scaduto";
    return format(date, "dd MMM", { locale: it });
  };

  const stats = {
    pendenti: pendenti.length,
    altaPriorita: pendenti.filter((p) => p.priorita === "alta").length,
    oggi: pendenti.filter((p) => isToday(parseISO(p.data))).length,
    completati: completati.length,
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
          <div className="space-y-1">
            <p className="text-sm font-medium text-primary">Promemoria</p>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
              Le tue attività
            </h1>
            <p className="text-muted-foreground">
              Gestisci le attività e scadenze
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuovo Promemoria</span>
                <span className="sm:hidden">Aggiungi</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nuovo Promemoria</DialogTitle>
                <DialogDescription>Crea un nuovo promemoria</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Titolo *</Label>
                  <Input
                    value={formData.titolo}
                    onChange={(e) => setFormData({ ...formData, titolo: e.target.value })}
                    placeholder="Es: Chiamare cliente"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrizione</Label>
                  <Input
                    value={formData.descrizione}
                    onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                    placeholder="Dettagli aggiuntivi..."
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
                    <Label>Orario</Label>
                    <Input
                      type="time"
                      value={formData.orario}
                      onChange={(e) => setFormData({ ...formData, orario: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(v) => setFormData({ ...formData, tipo: v as Promemoria["tipo"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                    <Select
                      value={formData.priorita}
                      onValueChange={(v) => setFormData({ ...formData, priorita: v as Promemoria["priorita"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                <Button onClick={handleSubmit} disabled={createPromemoria.isPending || !formData.titolo}>
                  {createPromemoria.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crea
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats - Modern Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 animate-fade-in stagger-1">
          <div className="rounded-2xl bg-card border border-border/50 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Da completare</p>
                <p className="text-xl font-bold text-card-foreground">{stats.pendenti}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-card border border-destructive/20 p-5 shadow-sm bg-gradient-to-br from-card to-destructive/5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Priorità Alta</p>
                <p className="text-xl font-bold text-destructive">{stats.altaPriorita}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-card border border-warning/20 p-5 shadow-sm bg-gradient-to-br from-card to-warning/5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Per Oggi</p>
                <p className="text-xl font-bold text-warning">{stats.oggi}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-card border border-success/20 p-5 shadow-sm bg-gradient-to-br from-card to-success/5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Completati</p>
                <p className="text-xl font-bold text-success">{stats.completati}</p>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Pending */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Da Completare</h2>
              </div>
              {pendenti.length === 0 ? (
                <div className="text-center py-8 bg-card rounded-xl shadow-card">
                  <p className="text-muted-foreground">Nessun promemoria in sospeso</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendenti.map((item) => {
                    const Icon = tipoIcons[item.tipo];
                    const isOverdue = isPast(parseISO(item.data)) && !isToday(parseISO(item.data));
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "group rounded-lg border-l-4 p-4 shadow-card transition-all duration-300 hover:shadow-card-hover animate-fade-in",
                          prioritaConfig[item.priorita].className
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={item.completato}
                            onCheckedChange={(checked) =>
                              togglePromemoria.mutate({ id: item.id, completato: !!checked })
                            }
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <div className="rounded-lg bg-muted p-2">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-medium text-card-foreground truncate">{item.titolo}</h3>
                                {item.descrizione && (
                                  <p className="text-sm text-muted-foreground truncate">{item.descrizione}</p>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 flex items-center gap-3 flex-wrap">
                              <span
                                className={cn("text-xs", isOverdue ? "text-destructive font-medium" : "text-muted-foreground")}
                              >
                                {getDateLabel(item.data)} {item.orario && `· ${item.orario.slice(0, 5)}`}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {prioritaConfig[item.priorita].label}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive flex-shrink-0"
                            onClick={() => deletePromemoria.mutate(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Completed */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Completati</h2>
              {completati.length === 0 ? (
                <div className="text-center py-8 bg-card rounded-xl shadow-card">
                  <p className="text-muted-foreground">Nessun promemoria completato</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completati.slice(0, 5).map((item) => {
                    const Icon = tipoIcons[item.tipo];
                    return (
                      <div key={item.id} className="rounded-lg bg-muted/30 p-4 opacity-60 animate-fade-in">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={item.completato}
                            onCheckedChange={(checked) =>
                              togglePromemoria.mutate({ id: item.id, completato: !!checked })
                            }
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <div className="rounded-lg bg-muted p-2">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-medium text-muted-foreground line-through truncate">
                                  {item.titolo}
                                </h3>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default PromemoriaPage;
