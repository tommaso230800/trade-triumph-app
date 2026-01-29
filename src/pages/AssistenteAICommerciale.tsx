import { useState, useRef, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ClientStatusBadge } from "@/components/commercial/ClientStatusBadge";
import { useClienti, useCliente } from "@/hooks/useClienti";
import { useAziende } from "@/hooks/useAziende";
import { useClientiCommercialiPrioritari } from "@/hooks/useClientCommercialData";
import { useClientKPI } from "@/hooks/useClientKPI";
import { usePromoCliente } from "@/hooks/usePromoClienti";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { 
  Bot, 
  Send, 
  User, 
  Loader2, 
  Sparkles,
  Target,
  Brain,
  MessageSquare,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Gift,
  RefreshCw,
  Copy
} from "lucide-react";
import { cn } from "@/lib/utils";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function AssistenteAICommerciale() {
  const [selectedClienteId, setSelectedClienteId] = useState<string>("");
  const [selectedAziendaId, setSelectedAziendaId] = useState<string>("");
  const [situazione, setSituazione] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: clienti } = useClienti();
  const { data: aziende } = useAziende();
  const { data: clientiCommerciali } = useClientiCommercialiPrioritari();
  const { data: clienteDettaglio } = useCliente(selectedClienteId || undefined);
  const { data: kpi } = useClientKPI(selectedClienteId || undefined);
  const { data: promoClienti } = usePromoCliente(selectedClienteId || undefined);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Trova dati commerciali del cliente selezionato
  const clienteCommerciale = clientiCommerciali?.find(c => c.id === selectedClienteId);

  // Costruisci contesto per AI
  const buildContext = () => {
    if (!clienteDettaglio || !clienteCommerciale) return "";

    const context = `
DATI CLIENTE: ${clienteDettaglio.nome}
═══════════════════════════════════════

📊 STATO CLIENTE:
- Semaforo: ${clienteCommerciale.statoCliente.semaforo.toUpperCase()} (${clienteCommerciale.statoCliente.label})
- ${clienteCommerciale.statoCliente.descrizione}
${clienteCommerciale.statoCliente.allarmeRischio ? `⚠️ ALLARME: ${clienteCommerciale.statoCliente.motiviRischio.join(", ")}` : ""}

💰 FATTURATO:
- 2026: ${formatCurrency(clienteCommerciale.fatturato)}
- 2025: ${clienteCommerciale.fatturato_2025 ? formatCurrency(clienteCommerciale.fatturato_2025) : "N/D"}
- Variazione: ${clienteCommerciale.statoCliente.crescitaPercentuale >= 0 ? "+" : ""}${clienteCommerciale.statoCliente.crescitaPercentuale.toFixed(1)}%
${clienteCommerciale.fatturato_target ? `- Target: ${formatCurrency(clienteCommerciale.fatturato_target)} (${((clienteCommerciale.fatturato / clienteCommerciale.fatturato_target) * 100).toFixed(0)}% raggiunto)` : ""}

📦 ORDINI:
- Numero ordini 12 mesi: ${kpi?.numeroOrdini || 0}
- Frequenza media: ogni ${clienteCommerciale.frequenzaOrdini < 999 ? clienteCommerciale.frequenzaOrdini + " giorni" : "N/D"}
- Ultimo ordine: ${clienteCommerciale.giorniSenzaOrdine < 999 ? clienteCommerciale.giorniSenzaOrdine + " giorni fa" : "Mai"}
${kpi?.topProdotti?.length ? `- Top prodotti: ${kpi.topProdotti.slice(0, 3).map(p => p.nome).join(", ")}` : ""}

🎁 PROMO:
- Promo fatte quest'anno: ${clienteCommerciale.n_promo_concesse || 0}
- Budget promo: ${clienteCommerciale.budget_promo_percentuale || 3}% del fatturato
- Costo promo già speso: ${formatCurrency(clienteCommerciale.costo_promo_totale || 0)}

💬 OBIEZIONE PRINCIPALE:
${clienteDettaglio.obiezione_principale || "Nessuna obiezione salvata"}

🏢 TIPOLOGIA: ${clienteDettaglio.tipologia_cliente || "Non specificata"}
📍 CONSORZIO: ${clienteDettaglio.consorzio || "Indipendente"}
`;

    return context;
  };

  // Invia messaggio all'AI
  const handleSend = async () => {
    if (!situazione.trim() && messages.length === 0) {
      toast.error("Descrivi la situazione commerciale");
      return;
    }

    if (!selectedClienteId) {
      toast.error("Seleziona un cliente");
      return;
    }

    const userMessage = situazione.trim() || "Analizza la situazione e dammi consigli";
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setSituazione("");
    setIsLoading(true);

    try {
      const context = buildContext();
      const systemPrompt = `Sei un assistente commerciale AI esperto per un agente di commercio nel settore HO.RE.CA (bar, ristoranti, alimentari).

Il tuo compito è analizzare la situazione del cliente e fornire consigli strategici pratici e azionabili.

CONTESTO CLIENTE:
${context}

${selectedAziendaId ? `AZIENDA SELEZIONATA: L'agente sta lavorando con un'azienda specifica per questo cliente.` : ""}

ISTRUZIONI:
1. Analizza i dati del cliente forniti
2. Rispondi SEMPRE in italiano
3. Struttura la risposta in queste sezioni:

🧠 **LETTURA SITUAZIONE**
Che tipo di cliente è e in che fase si trova.

🎯 **OBIETTIVO CONSIGLIATO**
Cosa deve ottenere l'agente ORA con questo cliente.

🛠 **COME PARLARNE**
Frasi pratiche da usare nella trattativa.

💰 **LIVELLO DI CONCESSIONE**
🟢 PUOI CONCEDERE - 🟡 LIMITATO - 🔴 EVITA SCONTI
Spiega perché.

⚠️ **RISCHIO COMMERCIALE**
Eventuali rischi o cose a cui fare attenzione.

Sii conciso, pratico e diretto. L'agente deve poter usare subito i tuoi consigli.`;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-commercial-assistant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: userMessage }
          ],
          systemPrompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Errore nella risposta AI");
      }

      // Handle streaming
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      if (reader) {
        setMessages(prev => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") continue;

              try {
                const parsed = JSON.parse(jsonStr);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  assistantContent += content;
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { role: "assistant", content: assistantContent };
                    return newMessages;
                  });
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error("AI error:", error);
      toast.error(error.message || "Errore nella comunicazione con l'AI");
      setMessages(prev => prev.slice(0, -1)); // Rimuovi messaggio vuoto
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyResponse = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Risposta copiata!");
  };

  const handleReset = () => {
    setMessages([]);
    setSituazione("");
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bot className="h-7 w-7 text-primary" />
            Assistente AI Commerciale
          </h1>
          <p className="text-muted-foreground">
            Supporto decisionale intelligente per le tue trattative
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Input Panel */}
          <div className="lg:col-span-4">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Contesto Trattativa
                </CardTitle>
                <CardDescription>
                  Seleziona cliente e descrivi la situazione
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selezione Cliente */}
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={selectedClienteId} onValueChange={setSelectedClienteId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clienti?.map(cliente => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Selezione Azienda (opzionale) */}
                <div className="space-y-2">
                  <Label>Azienda (opzionale)</Label>
                  <Select value={selectedAziendaId} onValueChange={setSelectedAziendaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tutte le aziende" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tutte le aziende</SelectItem>
                      {aziende?.map(azienda => (
                        <SelectItem key={azienda.id} value={azienda.id}>
                          {azienda.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Mostra stato cliente se selezionato */}
                {clienteCommerciale && (
                  <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Stato Cliente</span>
                      <ClientStatusBadge 
                        semaforo={clienteCommerciale.statoCliente.semaforo}
                        size="sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Fatturato</p>
                        <p className="font-semibold">{formatCurrency(clienteCommerciale.fatturato)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Trend</p>
                        <p className={cn(
                          "font-semibold",
                          clienteCommerciale.statoCliente.crescitaPercentuale >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {clienteCommerciale.statoCliente.crescitaPercentuale >= 0 ? "+" : ""}
                          {clienteCommerciale.statoCliente.crescitaPercentuale.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Descrizione Situazione */}
                <div className="space-y-2">
                  <Label>Descrivi la situazione</Label>
                  <Textarea
                    placeholder="Es: 'Il cliente dice che il prodotto costa troppo rispetto al competitor X. Come posso gestire questa obiezione?'"
                    value={situazione}
                    onChange={(e) => setSituazione(e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleSend} 
                    disabled={isLoading || !selectedClienteId}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Chiedi Consiglio
                  </Button>
                  {messages.length > 0 && (
                    <Button variant="outline" onClick={handleReset}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Panel */}
          <div className="lg:col-span-8">
            <Card className="h-[calc(100vh-200px)] flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Conversazione AI
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea ref={scrollRef} className="flex-1 px-6">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center py-12">
                      <div className="text-center space-y-4">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                          <Sparkles className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">Come posso aiutarti?</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Seleziona un cliente e descrivi la situazione commerciale
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center">
                          <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setSituazione("Come gestisco un cliente che dice che il prodotto costa troppo?")}>
                            💰 Obiezione prezzo
                          </Badge>
                          <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setSituazione("Il cliente non ordina da tempo, come lo riattivo?")}>
                            🔄 Riattivazione
                          </Badge>
                          <Badge variant="outline" className="cursor-pointer hover:bg-muted" onClick={() => setSituazione("Voglio proporre un nuovo prodotto, come faccio?")}>
                            📦 Nuovo prodotto
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 py-4">
                      {messages.map((message, index) => (
                        <div
                          key={index}
                          className={cn(
                            "flex gap-3",
                            message.role === "user" ? "justify-end" : "justify-start"
                          )}
                        >
                          {message.role === "assistant" && (
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <Bot className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div
                            className={cn(
                              "rounded-lg px-4 py-3 max-w-[85%]",
                              message.role === "user" 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-muted"
                            )}
                          >
                            {message.role === "assistant" ? (
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                                {message.content && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="mt-2 h-7 text-xs"
                                    onClick={() => handleCopyResponse(message.content)}
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copia
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm">{message.content}</p>
                            )}
                          </div>
                          {message.role === "user" && (
                            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                              <User className="h-4 w-4 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      ))}
                      {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                        <div className="flex gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                          <div className="rounded-lg bg-muted px-4 py-3">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>

                {/* Quick input at bottom */}
                {messages.length > 0 && (
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Scrivi una domanda di follow-up..."
                        value={situazione}
                        onChange={(e) => setSituazione(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                      />
                      <Button onClick={handleSend} disabled={isLoading}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
