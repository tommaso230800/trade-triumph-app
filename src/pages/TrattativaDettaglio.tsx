import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDeal, useUpdateDeal, useDealMessages, useCreateDealMessage } from "@/hooks/useDeals";
import { useClientKPI } from "@/hooks/useClientKPI";
import { useClientNotes } from "@/hooks/useClientNotes";
import {
  ArrowLeft,
  User,
  Building2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Lightbulb,
  MessageSquare,
  Phone,
  Mail,
  Copy,
  Check,
  AlertCircle,
  Package,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
};

const OBIEZIONI = [
  { id: "costo", label: "Costa troppo" },
  { id: "rotazione", label: "Non ruota" },
  { id: "fornitore", label: "Ho gia un fornitore" },
  { id: "spazio", label: "Non ho spazio" },
  { id: "liquidita", label: "Non ho liquidita / pagamento" },
  { id: "momento", label: "Non e il momento" },
];

export default function TrattativaDettaglio() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: deal, isLoading } = useDeal(id);
  const updateDeal = useUpdateDeal();
  const { data: kpi } = useClientKPI(deal?.client_id);
  const { data: notes = [] } = useClientNotes(deal?.client_id);
  const { data: messages = [] } = useDealMessages(id);
  const createMessage = useCreateDealMessage();

  const [selectedObiezione, setSelectedObiezione] = useState("");
  const [messageType, setMessageType] = useState<"whatsapp" | "email" | "call_script">("whatsapp");
  const [generatedContent, setGeneratedContent] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<"open" | "won" | "lost">("open");

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!deal) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Trattativa non trovata</h2>
          <Button variant="link" onClick={() => navigate("/trattative")}>
            Torna alle trattative
          </Button>
        </div>
      </MainLayout>
    );
  }

  const cliente = deal.cliente as any;
  const azienda = deal.azienda as any;

  // Generate strategy based on real data
  const generateStrategy = () => {
    if (!kpi) {
      setGeneratedContent(
        "Non ho abbastanza dati del cliente per una strategia precisa: mancano ordini o fatturato. Inserisci almeno alcuni ordini per questo cliente."
      );
      return;
    }

    const trend = kpi.trend3M;
    const fatturato = kpi.fatturato12M;
    const topProdotti = kpi.topProdotti.slice(0, 3).map((p) => p.nome).join(", ");

    let strategia = "";
    let proposta = "";
    let sconto = "";

    if (trend < -10) {
      strategia = "Cliente in CALO significativo. Serve azione aggressiva per recuperare volumi.";
      proposta = "Proponi promo 10+1 sui prodotti piu venduti o sconto extra per ordine minimo.";
      sconto = "Sconto consigliato: 15-20% o omaggio generoso (es. 25+3)";
    } else if (trend < 0) {
      strategia = "Cliente in leggero calo. Mantieni la relazione e stimola acquisti.";
      proposta = "Proponi bundle o promo limitata nel tempo per creare urgenza.";
      sconto = "Sconto consigliato: 10-12%";
    } else if (trend < 15) {
      strategia = "Cliente stabile. Obiettivo: consolidare e fare upsell.";
      proposta = "Proponi nuovi prodotti o formati alternativi. Cross-sell su categorie non coperte.";
      sconto = "Sconto consigliato: 5-8% solo su volumi incrementali";
    } else {
      strategia = "Cliente in CRESCITA. Obiettivo: massimizzare il potenziale.";
      proposta = "Proponi upgrade a pallet o ordine programmato. Offri condizioni premium.";
      sconto = "Sconto consigliato: 3-5% solo su contratto annuale";
    }

    const content = `STRATEGIA TRATTATIVA

CONTESTO CLIENTE:
- Fatturato 12 mesi: ${formatCurrency(fatturato)}
- Trend 3 mesi: ${trend >= 0 ? "+" : ""}${trend.toFixed(1)}%
- Top prodotti: ${topProdotti || "N/D"}
- Ultimo ordine: ${kpi.ultimoOrdine ? format(parseISO(kpi.ultimoOrdine), "d MMM yyyy", { locale: it }) : "N/D"}
- Frequenza ordini: ogni ${kpi.frequenzaOrdini} giorni

ANALISI:
${strategia}

COSA PROPORRE OGGI:
${proposta}

${sconto}

PRIORITA: ${trend < -10 ? "ALTA - Recupero cliente" : trend < 0 ? "MEDIA - Stimolare acquisti" : "STANDARD - Crescita"}

OBIETTIVO TRATTATIVA: ${deal.goal || "Non definito"}`;

    setGeneratedContent(content);
  };

  // Generate objection response
  const generateObiezioneResponse = () => {
    if (!selectedObiezione) {
      toast.error("Seleziona un'obiezione");
      return;
    }

    const clienteNome = cliente?.nome || "il cliente";
    const fatturato = kpi?.fatturato12M || 0;
    const trend = kpi?.trend3M || 0;

    const responses: Record<string, string> = {
      costo: `OBIEZIONE: "Costa troppo"

RISPOSTA PERSONALIZZATA per ${clienteNome}:

"Capisco la sua preoccupazione sul prezzo. Pero guardi, ${fatturato > 5000 ? "con il volume che fate" : "anche partendo da volumi contenuti"}, possiamo trovare una formula vantaggiosa.

${trend < 0 ? "Vedo che ultimamente gli ordini sono calati - proprio per questo ho pensato a una proposta speciale per lei: " : "Dato il buon andamento, le propongo: "}

Opzione 1: Promo 10+1 sui prodotti che gia prende
Opzione 2: Sconto extra del 5% su un ordine minimo di [X] cartoni
Opzione 3: Pagamento dilazionato a 60 giorni senza interessi

Quale preferisce valutare?"`,

      rotazione: `OBIEZIONE: "Non ruota"

RISPOSTA PERSONALIZZATA per ${clienteNome}:

"Mi fa piacere che sia attento alla rotazione. E proprio per questo che le propongo di provare con un quantitativo ridotto.

${kpi?.topProdotti?.[0] ? `Il ${kpi.topProdotti[0].nome} ad esempio lo prende gia e funziona - ` : ""}possiamo affiancare un nuovo prodotto con garanzia di reso se non vende.

Le propongo:
- Campionatura gratuita per test
- Ordine minimo con reso garantito dopo 30 giorni
- Materiale POP per aumentare la visibilita

Cosa ne pensa di un test su 1 cartone?"`,

      fornitore: `OBIEZIONE: "Ho gia un fornitore"

RISPOSTA PERSONALIZZATA per ${clienteNome}:

"Benissimo, significa che conosce bene il prodotto. Non le chiedo di cambiare, ma di affiancare.

${trend < 0 ? "Ho notato che il trend e in calo - forse e il momento di diversificare?" : "Con la sua esperienza, avere un'alternativa le da potere negoziale."}

Le propongo di fare un test comparativo:
- Stesso prodotto, prezzo migliore
- Condizioni di pagamento piu flessibili
- Servizio e consegne garantite

Proviamo con un primo ordine di prova? Se non e soddisfatto, nessun impegno."`,

      spazio: `OBIEZIONE: "Non ho spazio"

RISPOSTA PERSONALIZZATA per ${clienteNome}:

"Capisco perfettamente il problema dello spazio. Per questo le propongo:

- Consegne piu frequenti con quantitativi ridotti
- Ordini programmati settimanali
- Formati piu compatti se disponibili

${kpi?.frequenzaOrdini ? `Attualmente ordina ogni ${kpi.frequenzaOrdini} giorni circa - possiamo aumentare la frequenza dimezzando le quantita.` : ""}

In questo modo:
- Zero problemi di magazzino
- Prodotto sempre fresco
- Stesse condizioni economiche

Le interessa esplorare questa opzione?"`,

      liquidita: `OBIEZIONE: "Non ho liquidita / problemi di pagamento"

RISPOSTA PERSONALIZZATA per ${clienteNome}:

"Apprezzo la sua sincerita. In questo momento posso offrirle condizioni di pagamento flessibili:

- Pagamento a 60 giorni
- Rateizzazione su 2-3 consegne
- Ordine ridotto per iniziare

${fatturato > 3000 ? "Considerando lo storico positivo con noi, " : ""}posso proporle una soluzione su misura.

Partiamo con un ordine minimo pagabile a [X] giorni?"`,

      momento: `OBIEZIONE: "Non e il momento"

RISPOSTA PERSONALIZZATA per ${clienteNome}:

"Capisco. Mi dica: quando sarebbe il momento giusto?

${trend < 0 ? "Vedo che il trend e in calo - forse e proprio ora il momento di agire con una promo per rilanciare le vendite?" : ""}

Nel frattempo le lascio questa proposta valida per i prossimi 15 giorni:
- [Promo speciale]
- [Condizioni riservate]

Posso risentirla la prossima settimana per confermare?"`,
    };

    setGeneratedContent(responses[selectedObiezione] || "Obiezione non riconosciuta");
  };

  // Generate message
  const generateMessage = () => {
    const clienteNome = cliente?.nome || "Cliente";
    const aziendaNome = azienda?.nome || "";

    let content = "";

    if (messageType === "whatsapp") {
      content = `Buongiorno ${clienteNome}!

${aziendaNome ? `Volevo parlarle di ${aziendaNome}.` : "Volevo aggiornarla sulle nostre proposte."}

${deal.goal ? `Ho pensato a una proposta per: ${deal.goal}` : "Ho alcune novita interessanti per lei."}

${kpi?.topProdotti?.[0] ? `So che apprezza il ${kpi.topProdotti[0].nome} - ` : ""}abbiamo una promozione speciale attiva.

Quando posso passare per mostrarle i dettagli?

Grazie e buona giornata!`;
    } else if (messageType === "email") {
      content = `Oggetto: Proposta commerciale ${aziendaNome || ""}

Gentile ${clienteNome},

${aziendaNome ? `Le scrivo in merito ai prodotti ${aziendaNome}.` : "Le scrivo per aggiornarla sulle nostre proposte commerciali."}

${deal.goal ? `\nObiettivo: ${deal.goal}\n` : ""}

${kpi ? `Dallo storico dei vostri ordini, ho notato che i prodotti piu apprezzati sono: ${kpi.topProdotti.slice(0, 3).map((p) => p.nome).join(", ") || "i nostri bestseller"}.` : ""}

Abbiamo attualmente delle condizioni vantaggiose che vorrei presentarle:
- [Dettaglio promo 1]
- [Dettaglio promo 2]

Resto a disposizione per un incontro o una chiamata per illustrarle i dettagli.

Cordiali saluti`;
    } else {
      content = `SCRIPT CHIAMATA - ${clienteNome}

APERTURA:
"Buongiorno ${clienteNome}, sono [Nome] di [Azienda]. Come sta?"

MOTIVO CHIAMATA:
"La chiamo perche ${aziendaNome ? `abbiamo novita interessanti su ${aziendaNome}` : "ho una proposta che potrebbe interessarle"}."

PROPOSTA:
"${deal.goal || "Vorrei proporle delle condizioni speciali"}"

${kpi ? `LEVE DA USARE:
- Fatturato storico: ${formatCurrency(kpi.fatturato12M)}
- Top prodotti: ${kpi.topProdotti.slice(0, 2).map((p) => p.nome).join(", ") || "N/D"}
- Trend: ${kpi.trend3M >= 0 ? "positivo" : "in calo"} - ${kpi.trend3M >= 0 ? "ottimo momento per crescere" : "buon momento per una promo di rilancio"}` : ""}

CHIUSURA:
"Quando posso passare a mostrarle i dettagli? Questa settimana o la prossima?"

OBIEZIONI COMUNI:
- Se dice "non ho tempo" -> "Capisco, bastano 10 minuti. Preferisce mattina o pomeriggio?"
- Se dice "ci devo pensare" -> "Certo, quando la richiamo?"`;
    }

    setGeneratedContent(content);
  };

  // Save generated content
  const saveMessage = () => {
    if (!generatedContent || !id) return;

    createMessage.mutate({
      deal_id: id,
      type: messageType,
      content: generatedContent,
    });
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, msgId?: string) => {
    navigator.clipboard.writeText(text);
    if (msgId) {
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    }
    toast.success("Copiato negli appunti");
  };

  // Update status
  const handleStatusChange = (status: "open" | "won" | "lost") => {
    updateDeal.mutate({ id: deal.id, status });
    setEditingStatus(false);
  };

  const statusConfig = {
    open: { label: "Aperta", variant: "default" as const, color: "bg-blue-500" },
    won: { label: "Vinta", variant: "secondary" as const, color: "bg-green-500" },
    lost: { label: "Persa", variant: "destructive" as const, color: "bg-red-500" },
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/trattative")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{deal.title}</h1>
            <p className="text-muted-foreground">
              {deal.goal || "Nessun obiettivo definito"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {editingStatus ? (
              <Select value={deal.status} onValueChange={(v) => handleStatusChange(v as any)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Aperta</SelectItem>
                  <SelectItem value="won">Vinta</SelectItem>
                  <SelectItem value="lost">Persa</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge
                variant={statusConfig[deal.status].variant}
                className="cursor-pointer"
                onClick={() => setEditingStatus(true)}
              >
                {statusConfig[deal.status].label}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Context */}
          <div className="space-y-6">
            {/* Cliente Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  to={`/clienti/${deal.client_id}`}
                  className="text-lg font-semibold hover:text-primary transition-colors"
                >
                  {cliente?.nome}
                </Link>
                {cliente?.azienda && (
                  <p className="text-sm text-muted-foreground">{cliente.azienda}</p>
                )}
                {cliente?.tipologia_cliente && (
                  <Badge variant="outline" className="mt-2">
                    {cliente.tipologia_cliente}
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Azienda Card */}
            {azienda && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Azienda / Fornitore
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link
                    to={`/aziende/${deal.company_id}`}
                    className="text-lg font-semibold hover:text-primary transition-colors"
                  >
                    {azienda.nome}
                  </Link>
                  {azienda.settore && (
                    <p className="text-sm text-muted-foreground">{azienda.settore}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* KPI Card */}
            {kpi && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    KPI Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Fatturato 12M</span>
                    <span className="font-semibold">{formatCurrency(kpi.fatturato12M)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Trend 3M</span>
                    <span
                      className={`font-semibold flex items-center gap-1 ${
                        kpi.trend3M >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {kpi.trend3M >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      {kpi.trend3M >= 0 ? "+" : ""}
                      {kpi.trend3M.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Ordini 12M</span>
                    <span className="font-semibold">{kpi.numeroOrdini}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Frequenza</span>
                    <span className="font-semibold">Ogni {kpi.frequenzaOrdini || "N/D"} giorni</span>
                  </div>
                  {kpi.ultimoOrdine && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Ultimo ordine</span>
                      <span className="font-semibold">
                        {format(parseISO(kpi.ultimoOrdine), "d MMM yyyy", { locale: it })}
                      </span>
                    </div>
                  )}
                  {kpi.topProdotti.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground mb-2">Top Prodotti:</p>
                      {kpi.topProdotti.slice(0, 3).map((p, i) => (
                        <div key={p.prodotto_id} className="flex justify-between text-sm">
                          <span className="truncate flex-1">
                            {i + 1}. {p.nome}
                          </span>
                          <span className="text-muted-foreground ml-2">{formatCurrency(p.valore)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Deal Info Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Dettagli Trattativa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Valore Stimato</span>
                  <span className="font-semibold">{formatCurrency(deal.estimated_value)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Probabilita</span>
                  <span className="font-semibold">{deal.probability}%</span>
                </div>
                {deal.next_action_date && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Prossima Azione</span>
                    <span className="font-semibold">
                      {format(parseISO(deal.next_action_date), "d MMM yyyy", { locale: it })}
                    </span>
                  </div>
                )}
                {deal.next_action_note && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">Da fare:</p>
                    <p className="text-sm">{deal.next_action_note}</p>
                  </div>
                )}
                {deal.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">Note:</p>
                    <p className="text-sm">{deal.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Assistant */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Assistente Trattativa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="strategia" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="strategia">Strategia</TabsTrigger>
                    <TabsTrigger value="obiezioni">Obiezioni</TabsTrigger>
                    <TabsTrigger value="messaggi">Messaggi</TabsTrigger>
                  </TabsList>

                  {/* Strategia Tab */}
                  <TabsContent value="strategia" className="space-y-4">
                    <Button onClick={generateStrategy} className="w-full">
                      <Target className="mr-2 h-4 w-4" />
                      Prepara Strategia Trattativa
                    </Button>
                  </TabsContent>

                  {/* Obiezioni Tab */}
                  <TabsContent value="obiezioni" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Seleziona Obiezione</Label>
                      <Select value={selectedObiezione} onValueChange={setSelectedObiezione}>
                        <SelectTrigger>
                          <SelectValue placeholder="Scegli l'obiezione del cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {OBIEZIONI.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={generateObiezioneResponse} className="w-full">
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Gestisci Obiezione
                    </Button>
                  </TabsContent>

                  {/* Messaggi Tab */}
                  <TabsContent value="messaggi" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Formato Messaggio</Label>
                      <Select
                        value={messageType}
                        onValueChange={(v) => setMessageType(v as typeof messageType)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              WhatsApp
                            </div>
                          </SelectItem>
                          <SelectItem value="email">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              Email
                            </div>
                          </SelectItem>
                          <SelectItem value="call_script">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              Script Telefonico
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={generateMessage} className="w-full">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Genera Messaggio
                    </Button>
                  </TabsContent>
                </Tabs>

                {/* Generated Content */}
                {generatedContent && (
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Risultato</Label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(generatedContent)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copia
                        </Button>
                        <Button variant="outline" size="sm" onClick={saveMessage}>
                          Salva
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      value={generatedContent}
                      onChange={(e) => setGeneratedContent(e.target.value)}
                      rows={15}
                      className="font-mono text-sm"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Saved Messages */}
            {messages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Messaggi Salvati</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div key={msg.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">
                              {msg.type === "whatsapp"
                                ? "WhatsApp"
                                : msg.type === "email"
                                ? "Email"
                                : "Chiamata"}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {format(parseISO(msg.created_at), "d MMM HH:mm", { locale: it })}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(msg.content, msg.id)}
                              >
                                {copiedId === msg.id ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm whitespace-pre-wrap line-clamp-4">{msg.content}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Client Notes */}
            {notes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Note Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {notes.slice(0, 5).map((note) => (
                      <div key={note.id} className="flex items-start gap-2 text-sm">
                        <Badge variant="outline" className="text-xs shrink-0">
                          {note.category}
                        </Badge>
                        <span>{note.note}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
