import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Plus,
  CalendarDays,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  UserX,
  Loader2,
  GripVertical,
  Euro,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Trash2,
  Navigation,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { 
  useGiriVisita, 
  useCreateGiroVisita, 
  useDeleteGiroVisita,
  useUpdateVisita,
  type Visita,
  type GiroVisita as GiroVisitaType
} from "@/hooks/useGiriVisita";
import { useClienti } from "@/hooks/useClienti";
import { useCanvassAttive } from "@/hooks/useCanvass";
import { Checkbox } from "@/components/ui/checkbox";

const esitoConfig = {
  completata: { label: "Completata", icon: CheckCircle2, className: "bg-success/10 text-success" },
  ordine: { label: "Ordine", icon: ShoppingCart, className: "bg-primary/10 text-primary" },
  no_interesse: { label: "No interesse", icon: XCircle, className: "bg-destructive/10 text-destructive" },
  ripassare: { label: "Ripassare", icon: RotateCcw, className: "bg-warning/10 text-warning" },
  assente: { label: "Assente", icon: UserX, className: "bg-muted text-muted-foreground" },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);

const GiroVisita = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedGiro, setExpandedGiro] = useState<string | null>(null);
  
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: giri, isLoading } = useGiriVisita(dateStr);
  const { data: allGiri } = useGiriVisita();

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="page-title">Giro Visite</h1>
            <p className="text-body-md text-muted-foreground">
              Pianifica e gestisci le visite ai clienti
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarDays className="h-4 w-4" />
                  {format(selectedDate, "dd MMMM yyyy", { locale: it })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={it}
                />
              </PopoverContent>
            </Popover>
            
            <NuovoGiroDialog 
              date={selectedDate} 
              open={dialogOpen} 
              onOpenChange={setDialogOpen}
            />
          </div>
        </div>

        {/* Giri del giorno */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !giri?.length ? (
          <div className="rounded-xl bg-card p-12 shadow-card text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nessun giro programmato</h3>
            <p className="text-muted-foreground mb-4">
              Non hai visite programmate per il {format(selectedDate, "dd MMMM yyyy", { locale: it })}
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crea Giro
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {giri.map((giro) => (
              <GiroCard 
                key={giro.id} 
                giro={giro} 
                expanded={expandedGiro === giro.id}
                onToggle={() => setExpandedGiro(expandedGiro === giro.id ? null : giro.id)}
              />
            ))}
          </div>
        )}

        {/* Storico giri recenti */}
        {allGiri && allGiri.length > 0 && (
          <div className="rounded-xl bg-card p-6 shadow-card">
            <h3 className="font-semibold text-lg mb-4">Giri recenti</h3>
            <div className="space-y-2">
              {allGiri.slice(0, 5).map((giro) => (
                <button
                  key={giro.id}
                  onClick={() => {
                    setSelectedDate(new Date(giro.data));
                    setExpandedGiro(giro.id);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {format(new Date(giro.data), "EEEE dd MMMM", { locale: it })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {giro.visite?.length || 0} visite
                        {giro.nome && ` • ${giro.nome}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {giro.visite?.filter(v => v.esito).length}/{giro.visite?.length || 0}
                    <Badge variant="outline" className="text-xs">
                      completate
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

// Dialog per creare nuovo giro
function NuovoGiroDialog({ 
  date, 
  open, 
  onOpenChange 
}: { 
  date: Date; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const [nome, setNome] = useState("");
  const [selectedClienti, setSelectedClienti] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  
  const { data: clienti } = useClienti();
  const createGiro = useCreateGiroVisita();

  const filteredClienti = clienti?.filter(c => 
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.azienda?.toLowerCase().includes(search.toLowerCase()) ||
    c.citta?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = () => {
    if (selectedClienti.length === 0) return;
    
    createGiro.mutate({
      giro: {
        data: format(date, "yyyy-MM-dd"),
        nome: nome || undefined,
      },
      clienti_ids: selectedClienti,
    }, {
      onSuccess: () => {
        setNome("");
        setSelectedClienti([]);
        onOpenChange(false);
      }
    });
  };

  const toggleCliente = (id: string) => {
    setSelectedClienti(prev => 
      prev.includes(id) 
        ? prev.filter(c => c !== id)
        : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Giro
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Nuovo Giro - {format(date, "dd MMMM yyyy", { locale: it })}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <Input
            placeholder="Nome giro (opzionale)"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          
          <Input
            placeholder="Cerca clienti..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          
          <div className="flex-1 overflow-y-auto border rounded-lg">
            {filteredClienti?.map((cliente) => (
              <div
                key={cliente.id}
                className={cn(
                  "flex items-center gap-3 p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors",
                  selectedClienti.includes(cliente.id) && "bg-primary/5"
                )}
                onClick={() => toggleCliente(cliente.id)}
              >
                <Checkbox 
                  checked={selectedClienti.includes(cliente.id)}
                  onCheckedChange={() => toggleCliente(cliente.id)}
                />
                <div className="flex-1">
                  <p className="font-medium">{cliente.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {cliente.azienda && `${cliente.azienda} • `}
                    {cliente.citta || "—"}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">{formatCurrency(cliente.fatturato)}</p>
                  <Badge variant="outline" className="text-xs">
                    {cliente.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              {selectedClienti.length} clienti selezionati
            </p>
            <Button 
              onClick={handleSubmit} 
              disabled={selectedClienti.length === 0 || createGiro.isPending}
            >
              {createGiro.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Crea Giro
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Card singolo giro
function GiroCard({ 
  giro, 
  expanded, 
  onToggle 
}: { 
  giro: GiroVisitaType; 
  expanded: boolean;
  onToggle: () => void;
}) {
  const deleteGiro = useDeleteGiroVisita();
  const completate = giro.visite?.filter(v => v.esito).length || 0;
  const totale = giro.visite?.length || 0;

  return (
    <div className="rounded-xl bg-card shadow-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-lg">
              {giro.nome || `Giro del ${format(new Date(giro.data), "dd/MM", { locale: it })}`}
            </h3>
            <p className="text-sm text-muted-foreground">
              {totale} visite • {completate} completate
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="flex items-center gap-2">
              <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-success transition-all" 
                  style={{ width: `${totale ? (completate / totale) * 100 : 0}%` }}
                />
              </div>
              <span className="text-sm font-medium">{Math.round(totale ? (completate / totale) * 100 : 0)}%</span>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border">
          <div className="p-4 space-y-2">
            {giro.visite?.map((visita, index) => (
              <VisitaRow key={visita.id} visita={visita} index={index} />
            ))}
          </div>
          
          <div className="border-t border-border p-4 flex justify-between items-center bg-muted/30">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm("Sei sicuro di voler eliminare questo giro?")) {
                  deleteGiro.mutate(giro.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina Giro
            </Button>
            
            {giro.visite && giro.visite.length > 0 && giro.visite[0].clienti?.indirizzo && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const addresses = giro.visite
                    ?.filter(v => !v.esito && v.clienti?.indirizzo)
                    .map(v => `${v.clienti?.indirizzo}, ${v.clienti?.citta}`)
                    .join('/');
                  if (addresses) {
                    window.open(`https://www.google.com/maps/dir/${addresses}`, '_blank');
                  }
                }}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Apri in Maps
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Riga singola visita
function VisitaRow({ visita, index }: { visita: Visita; index: number }) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(visita.note || "");
  const updateVisita = useUpdateVisita();
  const { data: promozioniAttive } = useCanvassAttive();

  // Promozioni attive per questo cliente
  const promoCliente = promozioniAttive?.filter(promo => 
    promo.tutti_clienti || 
    promo.canvass_clienti?.some(cc => cc.cliente_id === visita.cliente_id)
  );

  const handleEsito = (esito: Visita["esito"]) => {
    updateVisita.mutate({
      id: visita.id,
      esito,
      orario_effettivo: format(new Date(), "HH:mm"),
    });
  };

  const handleSaveNote = () => {
    updateVisita.mutate({
      id: visita.id,
      note,
    });
    setNoteOpen(false);
  };

  const EsitoIcon = visita.esito ? esitoConfig[visita.esito].icon : AlertCircle;

  return (
    <div className={cn(
      "rounded-lg border p-4 transition-all",
      visita.esito ? "bg-muted/30 border-border" : "bg-card border-primary/20"
    )}>
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-muted-foreground text-sm font-medium">
          {index + 1}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium">{visita.clienti?.nome}</h4>
              <p className="text-sm text-muted-foreground">
                {visita.clienti?.azienda}
              </p>
            </div>
            
            {visita.esito ? (
              <Badge className={esitoConfig[visita.esito].className}>
                <EsitoIcon className="h-3 w-3 mr-1" />
                {esitoConfig[visita.esito].label}
              </Badge>
            ) : null}
          </div>
          
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {visita.clienti?.indirizzo && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {visita.clienti.indirizzo}, {visita.clienti.citta}
              </span>
            )}
            {visita.clienti?.telefono && (
              <a 
                href={`tel:${visita.clienti.telefono}`}
                className="flex items-center gap-1 hover:text-primary"
              >
                <Phone className="h-3 w-3" />
                {visita.clienti.telefono}
              </a>
            )}
            {visita.orario_effettivo && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {visita.orario_effettivo}
              </span>
            )}
          </div>

          {/* Info aggiuntive */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Euro className="h-3 w-3 mr-1" />
              {formatCurrency(visita.clienti?.fatturato || 0)}
            </Badge>
            {promoCliente && promoCliente.length > 0 && (
              <Badge className="bg-success/10 text-success text-xs">
                {promoCliente.length} promo attive
              </Badge>
            )}
          </div>

          {/* Note */}
          {visita.note && (
            <p className="mt-2 text-sm bg-muted/50 rounded p-2">
              📝 {visita.note}
            </p>
          )}

          {/* Azioni */}
          {!visita.esito && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(esitoConfig).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    className={cn("text-xs", config.className)}
                    onClick={() => handleEsito(key as Visita["esito"])}
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {config.label}
                  </Button>
                );
              })}
            </div>
          )}

          {/* Note dialog */}
          <Popover open={noteOpen} onOpenChange={setNoteOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="mt-2">
                {visita.note ? "Modifica nota" : "Aggiungi nota"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <Textarea
                  placeholder="Scrivi una nota..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
                <Button size="sm" onClick={handleSaveNote}>
                  Salva
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}

export default GiroVisita;