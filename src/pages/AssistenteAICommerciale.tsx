import { useState, useRef, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useClienti, useCliente } from "@/hooks/useClienti";
import { useAziende } from "@/hooks/useAziende";
import { useClienteAziendaAnalysis } from "@/hooks/useClienteAziendaAnalysis";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { 
  Bot, 
  Send, 
  Loader2, 
  Sparkles,
  Brain,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Copy,
  Target,
  Clock,
  Package,
  DollarSign,
  Gift,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle
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
  const [analysisVisible, setAnalysisVisible] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: clienti } = useClienti();
  const { data: aziende } = useAziende();
  const { data: clienteDettaglio } = useCliente(selectedClienteId || undefined);
  const { data: analysisData, isLoading: isAnalysisLoading } = useClienteAziendaAnalysis(
    selectedClienteId || undefined, 
    selectedAziendaId || undefined
  );

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mostra analisi quando disponibile
  useEffect(() => {
    if (analysisData && selectedClienteId && selectedAziendaId) {
      setAnalysisVisible(true);
    } else {
      setAnalysisVisible(false);
    }
  }, [analysisData, selectedClienteId, selectedAziendaId]);

  // Costruisci contesto completo per AI
  const buildAIContext = () => {
    if (!analysisData || !clienteDettaglio) return "";

    const a = analysisData.analysis;
    
    return `
═══════════════════════════════════════════════════════════════
ANALISI COMPLETA CLIENTE-AZIENDA
═══════════════════════════════════════════════════════════════

📋 CLIENTE: ${analysisData.clienteNome}
🏢 AZIENDA: ${analysisData.aziendaNome}
📍 TIPOLOGIA: ${clienteDettaglio.tipologia_cliente || "Non specificata"}
🏛 CONSORZIO: ${clienteDettaglio.consorzio || "Indipendente"}

═══════════════════════════════════════════════════════════════
A. ANALISI CLIENTE CON QUESTA AZIENDA
═══════════════════════════════════════════════════════════════

💰 FATTURATO:
• Anno corrente: ${formatCurrency(a.fatturatoAnnoCorrente)}
• Anno precedente: ${formatCurrency(a.fatturatoAnnoPrecedente)}
• Variazione: ${a.variazionePercentuale >= 0 ? "+" : ""}${a.variazionePercentuale.toFixed(1)}%

📦 ORDINI:
• Numero ordini anno corrente: ${a.numeroOrdiniAnnoCorrente}
• Numero ordini anno precedente: ${a.numeroOrdiniAnnoPrecedente}
• Valore medio ordine: ${formatCurrency(a.valoreMedioOrdine)}

═══════════════════════════════════════════════════════════════
B. ANALISI COMMERCIALE
═══════════════════════════════════════════════════════════════

📄 CONTRATTO:
• Ha contratto fine anno: ${a.haContratto ? "SÌ" : "NO"}
${a.haContratto ? `• Target fatturato: ${formatCurrency(a.targetFatturato)}
• % Target raggiunto: ${a.percentualeTargetRaggiunto.toFixed(1)}%
• Premio contratto: ${a.premioContratto}%` : ""}

🎁 PROMO:
• Promo già fatte: ${a.promoFatte}
• Costo promo totale: ${formatCurrency(a.costoPromoTotale)}
• Budget promo (${a.budgetPromoPercentuale}% fatturato): ${formatCurrency(a.budgetPromoDisponibile)}
• Budget residuo: ${formatCurrency(Math.max(0, a.budgetPromoDisponibile - a.budgetPromoUsato))}

═══════════════════════════════════════════════════════════════
C. ANALISI COMPORTAMENTO DI ACQUISTO (FONDAMENTALE!)
═══════════════════════════════════════════════════════════════

⏱ PERIODICITÀ MEDIA ORDINI: ${a.periodicitaMediaGiorni > 0 ? `ogni ${a.periodicitaMediaGiorni} giorni` : "Non calcolabile (pochi ordini)"}
${a.intervalliOrdini.length > 2 ? `• Ultimi intervalli: ${a.intervalliOrdini.slice(-5).join(" - ")} giorni` : ""}

🔄 STIMA ROTAZIONE: Le scorte durano circa ${a.stimaRotazioneGiorni > 0 ? a.stimaRotazioneGiorni : "N/D"} giorni

📅 ULTIMO ORDINE: ${a.ultimoOrdine || "Mai"}
⏰ GIORNI DALL'ULTIMO ORDINE: ${a.giorniDalUltimoOrdine < 999 ? a.giorniDalUltimoOrdine : "N/D"}
🚨 SOGLIA ALERT: ${a.sogliaAlertGiorni} giorni (periodicità + 7)

${a.fuoriCicloRiordino ? `
🔴 ⚠️ CLIENTE FUORI CICLO DI RIORDINO!
• Fuori ciclo da: ${a.giorniFuoriCiclo} giorni
• AZIONE RICHIESTA: Riattivare immediatamente
` : `
🟢 Cliente nel ciclo di riordino normale
• Prossimo ordine atteso tra: ${Math.max(0, a.sogliaAlertGiorni - a.giorniDalUltimoOrdine)} giorni
`}

═══════════════════════════════════════════════════════════════
OBIEZIONE PRINCIPALE STORICA
═══════════════════════════════════════════════════════════════
${clienteDettaglio.obiezione_principale || "Nessuna obiezione salvata"}

═══════════════════════════════════════════════════════════════
LIVELLO DI RISCHIO: ${analysisData.riskLevel.toUpperCase()}
${analysisData.alertMessage ? `⚠️ ALERT: ${analysisData.alertMessage}` : ""}
═══════════════════════════════════════════════════════════════
`;
  };

  // System prompt dettagliato
  const buildSystemPrompt = () => {
    const context = buildAIContext();
    
    return `Sei un MOTORE DECISIONALE COMMERCIALE per un agente di commercio nel settore HO.RE.CA.

NON sei un chatbot generico. Sei un sistema di supporto alle decisioni basato su DATI REALI.

${context}

═══════════════════════════════════════════════════════════════
ISTRUZIONI RISPOSTA - SEGUI ESATTAMENTE QUESTA STRUTTURA:
═══════════════════════════════════════════════════════════════

La tua risposta DEVE essere divisa in ESATTAMENTE queste sezioni:

🧠 **LETTURA DELLA SITUAZIONE**
Analizza in 2-3 frasi lo stato del cliente: è in crescita, calo, stabile? Sta ordinando regolarmente o è fuori ciclo? Ha già ricevuto supporto?

🔄 **ANALISI ROTAZIONE**
FRASE OBBLIGATORIA: "Il cliente ordina mediamente ogni X giorni. Sono passati Y giorni dall'ultimo ordine → [cliente nel ciclo / cliente fuori ciclo di Z giorni]."
Se fuori ciclo, spiega l'urgenza di agire.

🎯 **OBIETTIVO CONSIGLIATO ORA**
Cosa deve ottenere l'agente con questo cliente ADESSO:
- Riattivare riordino (se fuori ciclo)
- Spingere volume per target (se sotto obiettivo contratto)
- Difendere margine (se già supportato con promo)
- Lavorare su esposizione (se già a buon livello)
- Consolidare rapporto (se cliente stabile)

🛠 **COME DEVI PARLARGLI**
3-4 frasi pratiche da usare nella trattativa, tipo:
- "Siamo oltre il tuo ritmo normale di riordino"
- "Se manteniamo la rotazione solita, non rischi rotture di stock"
- "Ti aiuto a vendere di più, non a spendere meno"
- "Con il target che hai, manca poco al premio"

💰 **LIVELLO CONCESSIONE CONSIGLIATO**
Indica UNO di questi:
🟢 PUOI CONCEDERE - Budget disponibile, cliente strategico, obiettivo volume
🟡 CONCESSIONI MINIME - Budget limitato o già supportato
🔴 EVITA SCONTI - Budget esaurito, cliente già molto supportato, lavorare su valore

Spiega brevemente perché (es: "Budget promo residuo €X, già fatte Y promo").

⚠️ **RISCHIO COMMERCIALE**
Identifica IL rischio principale:
- Cliente a rischio perdita (fuori ciclo da troppo)
- Cliente fuori ciclo di riordino
- Cliente già molto supportato (troppe promo)
- Cliente sotto potenziale (fatturato basso vs storico)
- Cliente in calo progressivo

═══════════════════════════════════════════════════════════════
REGOLE FONDAMENTALI:
1. Rispondi SEMPRE in italiano
2. Basa TUTTO sui dati reali forniti, non inventare
3. Sii DIRETTO e PRATICO, l'agente deve usare subito i consigli
4. Se il cliente è fuori ciclo, questo è IL problema principale
5. Considera sempre budget promo residuo prima di consigliare sconti
═══════════════════════════════════════════════════════════════`;
  };

  const handleSend = async () => {
    if (!selectedClienteId) {
      toast.error("Seleziona un cliente");
      return;
    }
    if (!selectedAziendaId) {
      toast.error("Seleziona un'azienda");
      return;
    }
    if (!analysisData) {
      toast.error("Attendi il caricamento dell'analisi");
      return;
    }

    const userMessage = situazione.trim() || "Analizza la situazione e dammi i tuoi consigli strategici";
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setSituazione("");
    setIsLoading(true);

    try {
      const systemPrompt = buildSystemPrompt();

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
        if (response.status === 429) {
          throw new Error("Rate limit superato, riprova tra poco");
        }
        if (response.status === 402) {
          throw new Error("Crediti AI esauriti");
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Errore nella risposta AI");
      }

      // Handle streaming
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let buffer = "";

      if (reader) {
        setMessages(prev => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.role === "assistant") {
                    return prev.map((m, i) => 
                      i === prev.length - 1 ? { ...m, content: assistantContent } : m
                    );
                  }
                  return [...prev, { role: "assistant", content: assistantContent }];
                });
              }
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }
      }
    } catch (error: any) {
      console.error("AI error:", error);
      toast.error(error.message || "Errore nella comunicazione con l'AI");
      setMessages(prev => prev.filter(m => m.content !== ""));
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

  const a = analysisData?.analysis;

  // Risk badge
  const getRiskBadge = () => {
    if (!analysisData) return null;
    const colors = {
      low: "bg-green-100 text-green-800 border-green-300",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
      high: "bg-orange-100 text-orange-800 border-orange-300",
      critical: "bg-red-100 text-red-800 border-red-300",
    };
    const labels = {
      low: "Basso",
      medium: "Medio",
      high: "Alto",
      critical: "Critico",
    };
    return (
      <Badge className={cn("border", colors[analysisData.riskLevel])}>
        {labels[analysisData.riskLevel]}
      </Badge>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            AI Commerciale
          </h1>
          <p className="text-muted-foreground">
            Motore decisionale basato su dati reali
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Input Panel */}
          <div className="lg:col-span-5 space-y-4">
            {/* Selezione */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Seleziona Contesto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cliente *</Label>
                    <Select value={selectedClienteId} onValueChange={(v) => {
                      setSelectedClienteId(v);
                      setMessages([]);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clienti?.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Azienda *</Label>
                    <Select value={selectedAziendaId} onValueChange={(v) => {
                      setSelectedAziendaId(v);
                      setMessages([]);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona..." />
                      </SelectTrigger>
                      <SelectContent>
                        {aziende?.map(az => (
                          <SelectItem key={az.id} value={az.id}>{az.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Analisi Automatica */}
            {isAnalysisLoading && selectedClienteId && selectedAziendaId && (
              <Card>
                <CardContent className="py-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="mt-2 text-sm text-muted-foreground">Analizzo comportamento cliente...</p>
                </CardContent>
              </Card>
            )}

            {analysisVisible && a && (
              <Card className="border-primary/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Analisi Automatica
                    </CardTitle>
                    {getRiskBadge()}
                  </div>
                  {analysisData?.alertMessage && (
                    <div className={cn(
                      "mt-2 p-2 rounded-lg text-sm font-medium",
                      analysisData.riskLevel === "critical" ? "bg-red-100 text-red-800" :
                      analysisData.riskLevel === "high" ? "bg-orange-100 text-orange-800" :
                      "bg-yellow-100 text-yellow-800"
                    )}>
                      {analysisData.alertMessage}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Fatturato */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <DollarSign className="h-3 w-3" />
                        Fatturato {new Date().getFullYear()}
                      </div>
                      <p className="font-bold">{formatCurrency(a.fatturatoAnnoCorrente)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        {a.variazionePercentuale >= 0 ? 
                          <TrendingUp className="h-3 w-3 text-green-600" /> : 
                          <TrendingDown className="h-3 w-3 text-red-600" />
                        }
                        vs Anno Prec.
                      </div>
                      <p className={cn(
                        "font-bold",
                        a.variazionePercentuale >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {a.variazionePercentuale >= 0 ? "+" : ""}{a.variazionePercentuale.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Periodicità Ordini - FONDAMENTALE */}
                  <div className={cn(
                    "p-3 rounded-lg border-2",
                    a.fuoriCicloRiordino ? "border-red-400 bg-red-50" : "border-green-400 bg-green-50"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4" />
                      <span className="font-semibold text-sm">Analisi Rotazione</span>
                      {a.fuoriCicloRiordino ? 
                        <XCircle className="h-4 w-4 text-red-600 ml-auto" /> :
                        <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />
                      }
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Periodicità media</p>
                        <p className="font-bold">
                          {a.periodicitaMediaGiorni > 0 ? `${a.periodicitaMediaGiorni} giorni` : "N/D"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Dall'ultimo ordine</p>
                        <p className={cn(
                          "font-bold",
                          a.fuoriCicloRiordino ? "text-red-600" : "text-green-600"
                        )}>
                          {a.giorniDalUltimoOrdine < 999 ? `${a.giorniDalUltimoOrdine} giorni` : "Mai"}
                        </p>
                      </div>
                    </div>
                    {a.fuoriCicloRiordino && (
                      <p className="mt-2 text-sm font-medium text-red-700">
                        ⚠️ Fuori ciclo da {a.giorniFuoriCiclo} giorni!
                      </p>
                    )}
                  </div>

                  {/* Contratto & Target */}
                  {a.haContratto && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Target className="h-3 w-3" />
                        Target Contratto
                      </div>
                      <Progress 
                        value={Math.min(100, a.percentualeTargetRaggiunto)} 
                        className="h-2 mb-1"
                      />
                      <div className="flex justify-between text-xs">
                        <span className="font-medium">{a.percentualeTargetRaggiunto.toFixed(0)}%</span>
                        <span className="text-muted-foreground">
                          {formatCurrency(a.fatturatoAnnoCorrente)} / {formatCurrency(a.targetFatturato)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Budget Promo */}
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Gift className="h-3 w-3" />
                      Budget Promo ({a.budgetPromoPercentuale}%)
                    </div>
                    <Progress 
                      value={a.budgetPromoDisponibile > 0 ? 
                        Math.min(100, (a.budgetPromoUsato / a.budgetPromoDisponibile) * 100) : 0
                      } 
                      className="h-2 mb-1"
                    />
                    <div className="flex justify-between text-xs">
                      <span>Usato: {formatCurrency(a.budgetPromoUsato)}</span>
                      <span className={cn(
                        "font-medium",
                        a.budgetPromoUsato >= a.budgetPromoDisponibile ? "text-red-600" : "text-green-600"
                      )}>
                        Residuo: {formatCurrency(Math.max(0, a.budgetPromoDisponibile - a.budgetPromoUsato))}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Promo fatte: {a.promoFatte}
                    </p>
                  </div>

                  <Separator />

                  {/* Situazione */}
                  <div className="space-y-2">
                    <Label>Situazione (opzionale)</Label>
                    <Textarea
                      placeholder="Descrivi la situazione specifica o lascia vuoto per analisi generale..."
                      value={situazione}
                      onChange={(e) => setSituazione(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSend} 
                      disabled={isLoading || !analysisData}
                      className="flex-1"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Ottieni Strategia
                    </Button>
                    {messages.length > 0 && (
                      <Button variant="outline" onClick={handleReset}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Placeholder se non selezionato */}
            {!selectedClienteId || !selectedAziendaId ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Seleziona cliente e azienda per visualizzare l'analisi
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </div>

          {/* Response Panel */}
          <div className="lg:col-span-7">
            <Card className="h-[calc(100vh-200px)] flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  Strategia Consigliata
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                <ScrollArea ref={scrollRef} className="flex-1 px-6">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center py-12">
                      <div className="text-center space-y-4">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                          <Brain className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">Pronto per analizzare</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Seleziona cliente e azienda, poi clicca "Ottieni Strategia"
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 py-4">
                      {messages.map((message, index) => (
                        <div key={index}>
                          {message.role === "user" ? (
                            <div className="flex justify-end">
                              <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%]">
                                {message.content}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-start gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <Bot className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex-1 bg-muted rounded-lg px-4 py-3 prose prose-sm max-w-none dark:prose-invert">
                                  <ReactMarkdown>{message.content}</ReactMarkdown>
                                </div>
                              </div>
                              {message.content && (
                                <div className="flex justify-end">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleCopyResponse(message.content)}
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    Copia
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      {isLoading && messages[messages.length - 1]?.content === "" && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Elaboro strategia...</span>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
