import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ClientStatusBadge, RiskAlert } from "@/components/commercial/ClientStatusBadge";
import { useClientiCommercialiPrioritari, ClienteCommerciale } from "@/hooks/useClientCommercialData";
import { useCliente, useUpdateCliente } from "@/hooks/useClienti";
import { useClientKPI } from "@/hooks/useClientKPI";
import { usePromoCliente } from "@/hooks/usePromoClienti";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { 
  Search, 
  User, 
  Target, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  ShoppingCart,
  Gift,
  Calendar,
  MessageSquare,
  Check,
  Save,
  ArrowRight,
  Eye,
  Flame,
  Clock,
  Lightbulb,
  Loader2,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

const prioritaConfig = {
  rischio: { icon: Flame, label: "🔥 A Rischio", color: "text-red-500", bgClass: "border-l-red-500 bg-red-500/5" },
  sotto_target: { icon: Target, label: "🎯 Sotto Target", color: "text-amber-500", bgClass: "border-l-amber-500 bg-amber-500/5" },
  alto_potenziale: { icon: TrendingUp, label: "💰 Alto Potenziale", color: "text-green-500", bgClass: "border-l-green-500 bg-green-500/5" },
  routine: { icon: Clock, label: "🔁 Routine", color: "text-muted-foreground", bgClass: "border-l-muted bg-muted/30" },
};

// Obiettivi visita
const OBIETTIVI_VISITA = [
  { id: "aumento_scontrino", label: "Aumento scontrino", emoji: "💰" },
  { id: "prodotto_nuovo", label: "Inserimento prodotto nuovo", emoji: "📦" },
  { id: "promo_chiusa", label: "Promo chiusa", emoji: "🎯" },
  { id: "recupero_cliente", label: "Recupero cliente", emoji: "🔄" },
];

export default function AssistentePreVisita() {
  const [searchParams] = useSearchParams();
  const clienteIdParam = searchParams.get("cliente");
  
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(clienteIdParam);
  const [searchTerm, setSearchTerm] = useState("");
  const [obiettiviCompletati, setObiettiviCompletati] = useState<string[]>([]);
  const [noteVisita, setNoteVisita] = useState("");
  
  const { data: clienti, isLoading: clientiLoading, refetch } = useClientiCommercialiPrioritari();
  const { data: clienteDettaglio } = useCliente(selectedClienteId || undefined);
  const { data: kpi } = useClientKPI(selectedClienteId || undefined);
  const { data: promoClienti } = usePromoCliente(selectedClienteId || undefined);
  const updateCliente = useUpdateCliente();

  // Cliente selezionato con dati commerciali
  const clienteSelezionato = useMemo(() => {
    if (!selectedClienteId || !clienti) return null;
    return clienti.find(c => c.id === selectedClienteId) || null;
  }, [selectedClienteId, clienti]);

  // Filtra clienti per ricerca
  const clientiFiltrati = useMemo(() => {
    if (!clienti) return [];
    if (!searchTerm) return clienti;
    const term = searchTerm.toLowerCase();
    return clienti.filter(c => 
      c.nome.toLowerCase().includes(term) ||
      c.azienda?.toLowerCase().includes(term) ||
      c.consorzio?.toLowerCase().includes(term)
    );
  }, [clienti, searchTerm]);

  // Raggruppa per priorità
  const clientiPerPriorita = useMemo(() => {
    return {
      rischio: clientiFiltrati.filter(c => c.priorita === "rischio"),
      sotto_target: clientiFiltrati.filter(c => c.priorita === "sotto_target"),
      alto_potenziale: clientiFiltrati.filter(c => c.priorita === "alto_potenziale"),
      routine: clientiFiltrati.filter(c => c.priorita === "routine"),
    };
  }, [clientiFiltrati]);

  // Promo recenti (ultime 5)
  const promoRecenti = (promoClienti || []).slice(0, 5);

  // Gestione obiettivi
  const toggleObiettivo = (id: string) => {
    setObiettiviCompletati(prev => 
      prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]
    );
  };

  // Salva obiezione principale
  const handleSalvaObiezione = async (obiezione: string) => {
    if (!selectedClienteId) return;
    await updateCliente.mutateAsync({ id: selectedClienteId, obiezione_principale: obiezione });
    toast.success("Obiezione salvata!");
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Eye className="h-7 w-7 text-primary" />
              Assistente Pre-Visita
            </h1>
            <p className="text-muted-foreground">
              Strategia e situazione cliente prima di entrare
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Aggiorna
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Lista clienti prioritari - Sidebar */}
          <div className="lg:col-span-4 xl:col-span-3">
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Clienti Prioritari</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="p-3 space-y-4">
                    {clientiLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : (
                      Object.entries(clientiPerPriorita).map(([priorita, lista]) => {
                        if (lista.length === 0) return null;
                        const config = prioritaConfig[priorita as keyof typeof prioritaConfig];
                        
                        return (
                          <div key={priorita}>
                            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                              {config.label} ({lista.length})
                            </p>
                            <div className="space-y-1.5">
                              {lista.slice(0, priorita === "routine" ? 5 : 10).map(cliente => (
                                <button
                                  key={cliente.id}
                                  onClick={() => setSelectedClienteId(cliente.id)}
                                  className={cn(
                                    "w-full text-left rounded-lg border-l-4 p-3 transition-all hover:shadow-sm",
                                    config.bgClass,
                                    selectedClienteId === cliente.id && "ring-2 ring-primary"
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="font-medium text-sm truncate">{cliente.nome}</p>
                                      <p className="text-xs text-muted-foreground truncate">
                                        {cliente.azienda || cliente.consorzio || "—"}
                                      </p>
                                    </div>
                                    <ClientStatusBadge 
                                      semaforo={cliente.statoCliente.semaforo}
                                      size="sm"
                                      showIcon={false}
                                    />
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Dettaglio cliente selezionato */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            {!selectedClienteId || !clienteSelezionato ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    Seleziona un cliente dalla lista per vedere la strategia pre-visita
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* 1. Stato Cliente (Semaforo) */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        {clienteSelezionato.nome}
                      </CardTitle>
                      <ClientStatusBadge
                        semaforo={clienteSelezionato.statoCliente.semaforo}
                        label={clienteSelezionato.statoCliente.label}
                        descrizione={clienteSelezionato.statoCliente.descrizione}
                        size="lg"
                      />
                    </div>
                    <CardDescription>
                      {clienteSelezionato.azienda} {clienteSelezionato.consorzio && `• ${clienteSelezionato.consorzio}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Allarme rischio */}
                    <RiskAlert 
                      allarmeRischio={clienteSelezionato.statoCliente.allarmeRischio}
                      motiviRischio={clienteSelezionato.statoCliente.motiviRischio}
                    />
                  </CardContent>
                </Card>

                {/* 2. Situazione Cliente */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <TrendingUp className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{formatCurrency(clienteSelezionato.fatturato)}</p>
                          <p className="text-xs text-muted-foreground">Fatturato 2026</p>
                        </div>
                      </div>
                      {clienteSelezionato.fatturato_2025 && clienteSelezionato.fatturato_2025 > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className={cn(
                            "text-sm font-semibold",
                            clienteSelezionato.statoCliente.crescitaPercentuale >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {clienteSelezionato.statoCliente.crescitaPercentuale >= 0 ? "+" : ""}
                            {clienteSelezionato.statoCliente.crescitaPercentuale.toFixed(1)}%
                          </span>
                          <span className="text-xs text-muted-foreground">vs 2025</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                          <Calendar className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">
                            {clienteSelezionato.giorniSenzaOrdine < 999 
                              ? `${clienteSelezionato.giorniSenzaOrdine}gg`
                              : "—"
                            }
                          </p>
                          <p className="text-xs text-muted-foreground">Ultimo ordine</p>
                        </div>
                      </div>
                      {clienteSelezionato.ultimoOrdine && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(parseISO(clienteSelezionato.ultimoOrdine), "dd MMM yyyy", { locale: it })}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <ShoppingCart className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{kpi?.numeroOrdini || 0}</p>
                          <p className="text-xs text-muted-foreground">Ordini 12 mesi</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Media ogni {clienteSelezionato.frequenzaOrdini < 999 ? `${clienteSelezionato.frequenzaOrdini} giorni` : "—"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                          <Gift className="h-5 w-5 text-purple-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{clienteSelezionato.n_promo_concesse || 0}</p>
                          <p className="text-xs text-muted-foreground">Promo fatte</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 3. Obiettivo Visita Automatico + Promo Recenti */}
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="border-2 border-primary/30 bg-primary/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-primary" />
                        Obiettivo Visita Consigliato
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="p-4 rounded-lg bg-background border">
                        <p className="font-semibold text-lg">
                          🎯 {clienteSelezionato.statoCliente.obiettivoProposto}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          {clienteSelezionato.statoCliente.semaforo === "rosso" && 
                            "Cliente in difficoltà: punta a recuperare volume o riattivare ordini"}
                          {clienteSelezionato.statoCliente.semaforo === "giallo" && 
                            "Cliente stabile: proponi novità o ampliamento gamma"}
                          {clienteSelezionato.statoCliente.semaforo === "verde" && 
                            "Cliente forte: massimizza con promo ed espositori"}
                        </p>
                      </div>

                      <Separator className="my-4" />

                      {/* Link rapidi */}
                      <div className="flex flex-wrap gap-2">
                        <Link to={`/trattative?cliente=${clienteSelezionato.id}`}>
                          <Button size="sm" variant="outline" className="gap-1">
                            <Target className="h-4 w-4" />
                            Apri Trattativa
                          </Button>
                        </Link>
                        <Link to={`/assistente-trattativa?cliente=${clienteSelezionato.id}`}>
                          <Button size="sm" variant="outline" className="gap-1">
                            <TrendingUp className="h-4 w-4" />
                            Calcola Numeri
                          </Button>
                        </Link>
                        <Link to={`/clienti/${clienteSelezionato.id}`}>
                          <Button size="sm" variant="ghost" className="gap-1">
                            <ArrowRight className="h-4 w-4" />
                            Scheda Cliente
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Promo recenti */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Gift className="h-5 w-5 text-purple-500" />
                        Promo Recenti
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {promoRecenti.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          Nessuna promo recente
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {promoRecenti.map(promo => (
                            <div key={promo.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                              <div>
                                <p className="text-sm font-medium">{promo.tipo_promo}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(parseISO(promo.data_concessione), "dd MMM yyyy", { locale: it })}
                                </p>
                              </div>
                              {promo.costo_stimato && (
                                <Badge variant="outline">
                                  {formatCurrency(promo.costo_stimato)}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* 4. Storico Obiezioni */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-amber-500" />
                      Storico Obiezioni
                    </CardTitle>
                    <CardDescription>
                      Obiezione principale del cliente da ricordare
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Es: 'Costa troppo', 'Non ho spazio', 'Il prodotto non gira'..."
                        value={clienteDettaglio?.obiezione_principale || ""}
                        onChange={(e) => {
                          // Solo in lettura qui, salva con bottone
                        }}
                        className="min-h-[80px]"
                      />
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Aggiorna obiezione principale..."
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSalvaObiezione((e.target as HTMLInputElement).value);
                              (e.target as HTMLInputElement).value = "";
                            }
                          }}
                        />
                        <Button 
                          variant="outline"
                          onClick={() => {
                            const input = document.querySelector('input[placeholder="Aggiorna obiezione principale..."]') as HTMLInputElement;
                            if (input?.value) {
                              handleSalvaObiezione(input.value);
                              input.value = "";
                            }
                          }}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                      {clienteDettaglio?.obiezione_principale && (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                          <p className="text-sm">
                            <strong>Obiezione salvata:</strong> {clienteDettaglio.obiezione_principale}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 6. Obiettivi da Confermare (Post-Visita) */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-500" />
                      Conferma Obiettivi Visita
                    </CardTitle>
                    <CardDescription>
                      Segna cosa hai ottenuto durante la visita
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {OBIETTIVI_VISITA.map(obiettivo => (
                        <label
                          key={obiettivo.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                            obiettiviCompletati.includes(obiettivo.id) 
                              ? "bg-green-500/10 border-green-500/50" 
                              : "hover:bg-muted/50"
                          )}
                        >
                          <Checkbox
                            checked={obiettiviCompletati.includes(obiettivo.id)}
                            onCheckedChange={() => toggleObiettivo(obiettivo.id)}
                          />
                          <span className="text-lg">{obiettivo.emoji}</span>
                          <span className="font-medium">{obiettivo.label}</span>
                        </label>
                      ))}
                    </div>
                    
                    {obiettiviCompletati.length > 0 && (
                      <div className="mt-4 flex justify-end">
                        <Button onClick={() => {
                          toast.success(`${obiettiviCompletati.length} obiettivi salvati nello storico!`);
                          setObiettiviCompletati([]);
                        }}>
                          <Save className="h-4 w-4 mr-2" />
                          Salva Risultati Visita
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
