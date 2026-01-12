import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Zap, 
  Target,
  RefreshCw,
  Save,
  History,
  Copy,
  MessageSquare,
  TrendingUp,
  Package,
  AlertTriangle,
  Check,
  Star,
  Bookmark,
  Calculator,
  ArrowRightLeft,
  Scale,
  Handshake,
  Shield,
  Percent,
  DollarSign,
  Building2,
  Users,
  ChevronDown
} from "lucide-react";
import { useClienti, useCliente } from "@/hooks/useClienti";
import { useAziende } from "@/hooks/useAziende";
import { useProdotti, type Prodotto } from "@/hooks/useProdotti";
import { 
  useTemplateTrattativa, 
  useCreateTemplate,
  useStoricoTrattative, 
  useSaveTrattativa,
  useUpdateTrattativaEsito 
} from "@/hooks/useTrattativa";
import { toast } from "sonner";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { BudgetPromoCalculator } from "@/components/trattativa/BudgetPromoCalculator";
import { ScontoOmaggioConverter } from "@/components/trattativa/ScontoOmaggioConverter";
import { BreakEvenCalculator } from "@/components/trattativa/BreakEvenCalculator";
import { PromoContropartitaGenerator } from "@/components/trattativa/PromoContropartitaGenerator";
import { AntiCompetitorTool } from "@/components/trattativa/AntiCompetitorTool";
import { ClienteScoringCard } from "@/components/trattativa/ClienteScoringCard";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Types
interface CartaOutput {
  tipo: "A" | "B" | "C";
  nome: string;
  descrizione: string;
  prezzoFinale: number;
  totaleOrdine: number;
  quantitaCartoni: number;
  quantitaPezzi: number;
  omaggio: string;
  marginePercentuale: number;
  margineEuro: number;
  badge: "MIGLIORE PER ME" | "EQUILIBRATA" | "SOLO SE NECESSARIO";
  badgeColor: string;
  percheFunziona: string;
  script: string;
}

interface InputTrattativa {
  clienteId: string | null;
  clienteNome: string;
  tipologiaCliente: "bar" | "alimentari" | "ingrosso";
  aziendaId: string | null;
  prodottoId: string | null;
  prodottoNome: string;
  prezzoListino: number;
  costoAcquisto: number;
  margineTarget: number;
  pezziPerCartone: number;
  quantitaCartoni: number;
  scontoRichiesto: number;
  obiettivo: string;
  usaCosto: boolean;
}

// Template precaricati per brand
const BRAND_TEMPLATES = [
  {
    brand: "Casoni",
    schemi: [
      { nome: "10+1 Standard", tipo: "omaggio", valore: "10+1", descrizione: "10 cartoni + 1 omaggio" },
      { nome: "25+3 Volume", tipo: "omaggio", valore: "25+3", descrizione: "25 cartoni + 3 omaggio" },
      { nome: "Pallet 60+8", tipo: "omaggio", valore: "60+8", descrizione: "Pallet completo con 8 omaggi" },
      { nome: "Sconto 5%", tipo: "sconto", valore: 5, descrizione: "Sconto standard" },
    ]
  },
  {
    brand: "Polara",
    schemi: [
      { nome: "10+1 Bibite", tipo: "omaggio", valore: "10+1", descrizione: "10 cartoni + 1 omaggio" },
      { nome: "20+2 Volume", tipo: "omaggio", valore: "20+2", descrizione: "20 cartoni + 2 omaggio" },
      { nome: "38+5 Mezzo Pallet", tipo: "omaggio", valore: "38+5", descrizione: "Mezzo pallet con 5 omaggi" },
      { nome: "Sconto 3%", tipo: "sconto", valore: 3, descrizione: "Sconto bibite" },
    ]
  },
  {
    brand: "Zuegg",
    schemi: [
      { nome: "12+1 Succhi", tipo: "omaggio", valore: "12+1", descrizione: "12 cartoni + 1 omaggio" },
      { nome: "24+2 Volume", tipo: "omaggio", valore: "24+2", descrizione: "24 cartoni + 2 omaggio" },
      { nome: "Pallet 48+6", tipo: "omaggio", valore: "48+6", descrizione: "Pallet con 6 omaggi" },
      { nome: "Sconto 4%", tipo: "sconto", valore: 4, descrizione: "Sconto standard Zuegg" },
    ]
  },
];

// Obiettivi disponibili
const OBIETTIVI = [
  { value: "aumentare_quantita", label: "Aumentare quantità" },
  { value: "aumentare_margine", label: "Aumentare margine" },
  { value: "ottenere_esposizione", label: "Ottenere esposizione" },
  { value: "riassortimento_fisso", label: "Riassortimento fisso" },
  { value: "chiudere_subito", label: "Chiudere subito" },
];

// Script pronti
const SCRIPTS = [
  "Ti posso venire incontro in 3 modi, dimmi quale preferisci...",
  "Se vuoi spendere meno ok, ma dobbiamo cambiare quantità o condizioni...",
  "Io voglio farti guadagnare, non solo farti pagare meno...",
  "Fammi capire cosa ti serve davvero, così trovo la soluzione giusta...",
  "Il prezzo è quello, ma posso giocare su altri aspetti...",
];

export default function AssistenteTrattativa() {
  const { data: clienti } = useClienti();
  const { data: aziende } = useAziende();
  const { data: templates } = useTemplateTrattativa();
  const { data: storico } = useStoricoTrattative();
  const createTemplate = useCreateTemplate();
  const saveTrattativa = useSaveTrattativa();
  const updateEsito = useUpdateTrattativaEsito();

  const [activeTab, setActiveTab] = useState("input");
  const [modalitaVeloce, setModalitaVeloce] = useState(false);
  const [showEmergenza, setShowEmergenza] = useState(false);
  const [brandTemplatesOpen, setBrandTemplatesOpen] = useState(false);

  // Form state
  const [input, setInput] = useState<InputTrattativa>({
    clienteId: null,
    clienteNome: "",
    tipologiaCliente: "bar",
    aziendaId: null,
    prodottoId: null,
    prodottoNome: "",
    prezzoListino: 0,
    costoAcquisto: 0,
    margineTarget: 30,
    pezziPerCartone: 6,
    quantitaCartoni: 1,
    scontoRichiesto: 0,
    obiettivo: "aumentare_quantita",
    usaCosto: true,
  });

  // Calcolatore margine/ricarico state
  const [costoAcquisto, setCostoAcquisto] = useState<string>("");
  const [prezzoVendita, setPrezzoVendita] = useState<string>("");
  const [marginePercentuale, setMarginePercentuale] = useState<string>("");
  const [ricaricoPercentuale, setRicaricoPercentuale] = useState<string>("");

  // Emergenza prezzo
  const [prezzoCompetitor, setPrezzoCompetitor] = useState<number>(0);
  const [prezzoMio, setPrezzoMio] = useState<number>(0);

  // Get prodotti for selected azienda
  const { data: prodotti } = useProdotti(input.aziendaId || undefined);

  // Get cliente data if selected
  const { data: selectedCliente } = useCliente(input.clienteId || undefined);

  // Calcoli margine/ricarico
  const calcolaDaCostoPrezzo = () => {
    const costo = parseFloat(costoAcquisto) || 0;
    const prezzo = parseFloat(prezzoVendita) || 0;
    
    if (costo > 0 && prezzo > 0) {
      const margine = ((prezzo - costo) / prezzo) * 100;
      const ricarico = ((prezzo - costo) / costo) * 100;
      return { margine: margine.toFixed(2), ricarico: ricarico.toFixed(2), utile: (prezzo - costo).toFixed(2) };
    }
    return { margine: "0.00", ricarico: "0.00", utile: "0.00" };
  };

  const calcolaDaMargine = () => {
    const costo = parseFloat(costoAcquisto) || 0;
    const margine = parseFloat(marginePercentuale) || 0;
    
    if (costo > 0 && margine > 0 && margine < 100) {
      const prezzoCalcolato = costo / (1 - margine / 100);
      const ricarico = ((prezzoCalcolato - costo) / costo) * 100;
      return { 
        prezzo: prezzoCalcolato.toFixed(2), 
        ricarico: ricarico.toFixed(2),
        utile: (prezzoCalcolato - costo).toFixed(2)
      };
    }
    return { prezzo: "0.00", ricarico: "0.00", utile: "0.00" };
  };

  const calcolaDaRicarico = () => {
    const costo = parseFloat(costoAcquisto) || 0;
    const ricarico = parseFloat(ricaricoPercentuale) || 0;
    
    if (costo > 0 && ricarico > 0) {
      const prezzoCalcolato = costo * (1 + ricarico / 100);
      const margine = ((prezzoCalcolato - costo) / prezzoCalcolato) * 100;
      return { 
        prezzo: prezzoCalcolato.toFixed(2), 
        margine: margine.toFixed(2),
        utile: (prezzoCalcolato - costo).toFixed(2)
      };
    }
    return { prezzo: "0.00", margine: "0.00", utile: "0.00" };
  };

  const risultatiCostoPrezzo = calcolaDaCostoPrezzo();
  const risultatiMargine = calcolaDaMargine();
  const risultatiRicarico = calcolaDaRicarico();

  // Handle cliente selection
  const handleClienteSelect = (clienteId: string) => {
    const cliente = clienti?.find(c => c.id === clienteId);
    if (cliente) {
      setInput(prev => ({
        ...prev,
        clienteId,
        clienteNome: cliente.nome,
        tipologiaCliente: (cliente.tipologia_cliente as any) || "bar",
      }));
    }
  };

  // Handle azienda selection
  const handleAziendaSelect = (aziendaId: string) => {
    setInput(prev => ({
      ...prev,
      aziendaId,
      prodottoId: null,
      prodottoNome: "",
    }));
  };

  // Handle prodotto selection
  const handleProdottoSelect = (prodottoId: string) => {
    const prodotto = prodotti?.find(p => p.id === prodottoId);
    if (prodotto) {
      setInput(prev => ({
        ...prev,
        prodottoId,
        prodottoNome: prodotto.nome,
        prezzoListino: prodotto.prezzo_listino,
        pezziPerCartone: prodotto.pezzi_per_cartone,
      }));
    }
  };

  // Genera le 3 carte
  const carte = useMemo((): CartaOutput[] => {
    if (input.prezzoListino <= 0 || input.quantitaCartoni <= 0) return [];

    const pezziTotali = input.quantitaCartoni * input.pezziPerCartone;
    const costo = input.usaCosto ? input.costoAcquisto : input.prezzoListino * (1 - input.margineTarget / 100);
    
    // CARTA A - Sconto immediato (la peggiore per me)
    const scontoA = Math.min(input.scontoRichiesto > 0 ? input.scontoRichiesto : 5, 15);
    const prezzoA = input.prezzoListino * (1 - scontoA / 100);
    const margineA = costo > 0 ? ((prezzoA - costo) / prezzoA) * 100 : input.margineTarget - scontoA;
    
    // CARTA B - Volume/omaggio (la migliore per me)
    const cartoniExtraB = input.tipologiaCliente === "ingrosso" ? Math.ceil(input.quantitaCartoni * 0.1) : 1;
    const pezziOmaggioB = cartoniExtraB * input.pezziPerCartone;
    const quantitaEffettivaB = input.quantitaCartoni + (input.obiettivo === "aumentare_quantita" ? 2 : 0);
    const prezzoB = input.prezzoListino * 0.98;
    const margineB = costo > 0 ? ((prezzoB - costo) / prezzoB) * 100 : input.margineTarget - 2;
    
    // CARTA C - Extra/servizio (prezzo quasi invariato)
    const prezzoC = input.prezzoListino * 0.99;
    const margineC = costo > 0 ? ((prezzoC - costo) / prezzoC) * 100 : input.margineTarget - 1;
    const extraC = input.tipologiaCliente === "bar" 
      ? "esposizione + materiale POP" 
      : input.tipologiaCliente === "ingrosso" 
        ? "pagamento 60gg + consegna gratuita"
        : "riassortimento garantito + promo scaffale";

    return [
      {
        tipo: "A",
        nome: "Sconto Immediato",
        descrizione: `Sconto del ${scontoA}% sul listino`,
        prezzoFinale: prezzoA,
        totaleOrdine: prezzoA * pezziTotali,
        quantitaCartoni: input.quantitaCartoni,
        quantitaPezzi: pezziTotali,
        omaggio: "Nessuno",
        marginePercentuale: margineA,
        margineEuro: (prezzoA - costo) * pezziTotali,
        badge: "SOLO SE NECESSARIO",
        badgeColor: "bg-amber-500/20 text-amber-600 border-amber-500/30",
        percheFunziona: "Il cliente vede subito il risparmio, ma tu sacrifichi margine",
        script: `"Ti faccio un ${scontoA}% secco, prezzo finale ${prezzoA.toFixed(2)}€ al pezzo."`,
      },
      {
        tipo: "B",
        nome: "Volume + Omaggio",
        descrizione: input.obiettivo === "aumentare_quantita" 
          ? `Quantità maggiorata + ${cartoniExtraB} cartone omaggio`
          : `${input.quantitaCartoni}+${cartoniExtraB} (${pezziOmaggioB} pz omaggio)`,
        prezzoFinale: prezzoB,
        totaleOrdine: prezzoB * (quantitaEffettivaB * input.pezziPerCartone),
        quantitaCartoni: quantitaEffettivaB,
        quantitaPezzi: quantitaEffettivaB * input.pezziPerCartone,
        omaggio: `+${cartoniExtraB} cartone (${pezziOmaggioB} pz)`,
        marginePercentuale: margineB,
        margineEuro: (prezzoB - costo) * (quantitaEffettivaB * input.pezziPerCartone),
        badge: "MIGLIORE PER ME",
        badgeColor: "bg-green-500/20 text-green-600 border-green-500/30",
        percheFunziona: "Alzi la quantità, migliori la rotazione, guadagni di più in assoluto",
        script: `"Se me ne prendi ${quantitaEffettivaB} cartoni, te ne regalo ${cartoniExtraB}. Fai i conti, conviene."`,
      },
      {
        tipo: "C",
        nome: "Extra Servizi",
        descrizione: `Prezzo quasi pieno + ${extraC}`,
        prezzoFinale: prezzoC,
        totaleOrdine: prezzoC * pezziTotali,
        quantitaCartoni: input.quantitaCartoni,
        quantitaPezzi: pezziTotali,
        omaggio: extraC,
        marginePercentuale: margineC,
        margineEuro: (prezzoC - costo) * pezziTotali,
        badge: "EQUILIBRATA",
        badgeColor: "bg-blue-500/20 text-blue-600 border-blue-500/30",
        percheFunziona: "Non tocchi il prezzo, lui percepisce valore aggiunto",
        script: `"Il prezzo resta quello, ma ti do ${extraC}. Valore in più per te senza abbassare."`,
      },
    ];
  }, [input]);

  // Calcoli emergenza prezzo
  const emergenzaOutput = useMemo(() => {
    if (prezzoCompetitor <= 0 || prezzoMio <= 0) return null;
    
    const differenza = prezzoMio - prezzoCompetitor;
    const percentualeDiff = (differenza / prezzoMio) * 100;
    
    return {
      differenza,
      percentualeDiff,
      mosse: [
        {
          nome: "Volume per compensare",
          descrizione: `Offri ${Math.ceil(percentualeDiff / 5)} cartoni omaggio su ordine minimo`,
          script: `"Il mio prodotto costa ${differenza.toFixed(2)}€ in più, ma se ne prendi di più te lo compenso con omaggi."`,
        },
        {
          nome: "Valore aggiunto",
          descrizione: "Esposizione + materiale + supporto vendita",
          script: `"Sì, costa un po' di più, ma ti do anche visibilità, materiale e assistenza che l'altro non ti dà."`,
        },
        {
          nome: "Rotazione garantita",
          descrizione: "Impegno su riassortimento e promo future",
          script: `"Ti garantisco che questo gira. Se non gira, ti aiuto io a farlo girare con promo mirate."`,
        },
      ],
    };
  }, [prezzoCompetitor, prezzoMio]);

  const handleGenera = () => {
    if (carte.length > 0) {
      setActiveTab("output");
      toast.success("3 carte generate!");
    } else {
      toast.error("Compila almeno prezzo listino e quantità");
    }
  };

  const handleModalitaVeloce = () => {
    setModalitaVeloce(true);
    setInput(prev => ({
      ...prev,
      pezziPerCartone: 6,
      margineTarget: 30,
      usaCosto: false,
    }));
  };

  const handleSalvaStorico = () => {
    if (!input.clienteNome || !input.prodottoNome) {
      toast.error("Inserisci almeno cliente e prodotto");
      return;
    }
    
    saveTrattativa.mutate({
      cliente_id: input.clienteId,
      cliente_nome: input.clienteNome,
      tipologia_cliente: input.tipologiaCliente,
      prodotto_nome: input.prodottoNome,
      prezzo_listino: input.prezzoListino,
      costo_acquisto: input.usaCosto ? input.costoAcquisto : null,
      margine_target: !input.usaCosto ? input.margineTarget : null,
      pezzi_per_cartone: input.pezziPerCartone,
      quantita_cartoni: input.quantitaCartoni,
      quantita_pezzi: input.quantitaCartoni * input.pezziPerCartone,
      sconto_richiesto: input.scontoRichiesto || null,
      obiettivo: input.obiettivo,
      carta_scelta: null,
      esito: "in_corso",
      note: null,
      dati_carte: carte,
    });
  };

  const handleCopiaScript = (script: string) => {
    navigator.clipboard.writeText(script);
    toast.success("Script copiato!");
  };

  const handleSalvaTemplate = () => {
    const nome = prompt("Nome del template:");
    if (!nome) return;
    
    createTemplate.mutate({
      nome,
      tipologia_cliente: input.tipologiaCliente,
      obiettivo_default: input.obiettivo,
      sconto_max_percentuale: 15,
      omaggio_default: null,
      extra_default: null,
      note: null,
    });
  };

  const handleApplyBrandTemplate = (brand: string, schema: any) => {
    toast.success(`Template "${schema.nome}" di ${brand} applicato!`);
    if (schema.tipo === "omaggio") {
      // Parse omaggio (es: "10+1" -> quantitaCartoni: 10)
      const parts = schema.valore.split("+");
      const cartoni = parseInt(parts[0]) || 10;
      setInput(prev => ({
        ...prev,
        quantitaCartoni: cartoni,
        obiettivo: "aumentare_quantita",
      }));
    } else if (schema.tipo === "sconto") {
      setInput(prev => ({
        ...prev,
        scontoRichiesto: schema.valore,
      }));
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Header compatto mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Target className="h-5 w-5 sm:h-6 sm:w-6" />
              Assistente Trattativa
            </h1>
            <p className="text-sm text-muted-foreground">Strumenti avanzati per trattativa e calcoli</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={showEmergenza ? "default" : "outline"}
              size="sm"
              onClick={() => setShowEmergenza(!showEmergenza)}
              className="gap-1"
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Emergenza</span> Prezzo
            </Button>
          </div>
        </div>

        {/* Emergenza Prezzo */}
        {showEmergenza && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Emergenza Prezzo - Difendi il tuo prezzo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Prezzo Competitor (€/pz)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={prezzoCompetitor || ""}
                    onChange={(e) => setPrezzoCompetitor(parseFloat(e.target.value) || 0)}
                    className="h-10"
                  />
                </div>
                <div>
                  <Label className="text-xs">Prezzo Mio (€/pz)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={prezzoMio || ""}
                    onChange={(e) => setPrezzoMio(parseFloat(e.target.value) || 0)}
                    className="h-10"
                  />
                </div>
              </div>

              {emergenzaOutput && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                      Differenza: +€{emergenzaOutput.differenza.toFixed(2)} ({emergenzaOutput.percentualeDiff.toFixed(1)}%)
                    </Badge>
                  </div>
                  
                  <div className="grid gap-2">
                    {emergenzaOutput.mosse.map((mossa, i) => (
                      <div key={i} className="p-3 bg-background rounded-lg border">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm">{mossa.nome}</p>
                            <p className="text-xs text-muted-foreground">{mossa.descrizione}</p>
                            <p className="text-xs mt-1 italic">"{mossa.script}"</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => handleCopiaScript(mossa.script)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabs principali */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 text-xs">
            <TabsTrigger value="input">3 Carte</TabsTrigger>
            <TabsTrigger value="output" disabled={carte.length === 0}>Output</TabsTrigger>
            <TabsTrigger value="calcolatore">Calcoli</TabsTrigger>
            <TabsTrigger value="tools">Strumenti</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="storico">Storico</TabsTrigger>
          </TabsList>

          {/* TAB INPUT */}
          <TabsContent value="input" className="mt-4 space-y-4">
            {/* Pulsante Modalità 20 secondi */}
            <Button
              onClick={handleModalitaVeloce}
              className="w-full h-12 text-base gap-2"
              variant={modalitaVeloce ? "default" : "outline"}
            >
              <Zap className="h-5 w-5" />
              Modalità 20 Secondi
            </Button>

            {/* Template Brand Precaricati */}
            <Collapsible open={brandTemplatesOpen} onOpenChange={setBrandTemplatesOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-10">
                  <span className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Template Brand (Casoni, Polara, Zuegg)
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${brandTemplatesOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="grid gap-3">
                  {BRAND_TEMPLATES.map((bt) => (
                    <Card key={bt.brand} className="bg-muted/30">
                      <CardHeader className="py-2 px-3">
                        <CardTitle className="text-sm font-medium">{bt.brand}</CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 pb-3 pt-0">
                        <div className="grid grid-cols-2 gap-2">
                          {bt.schemi.map((schema) => (
                            <Button
                              key={schema.nome}
                              variant="outline"
                              size="sm"
                              className="h-auto py-2 px-2 text-xs flex flex-col items-start"
                              onClick={() => handleApplyBrandTemplate(bt.brand, schema)}
                            >
                              <span className="font-medium">{schema.nome}</span>
                              <span className="text-muted-foreground text-[10px]">{schema.descrizione}</span>
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Form Input */}
            <Card>
              <CardContent className="pt-4 space-y-4">
                {/* Cliente - Selezione da database */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Cliente
                    </Label>
                    <Select
                      value={input.clienteId || "manual"}
                      onValueChange={(v) => {
                        if (v === "manual") {
                          setInput(prev => ({ ...prev, clienteId: null, clienteNome: "" }));
                        } else {
                          handleClienteSelect(v);
                        }
                      }}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Seleziona cliente..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">✏️ Inserisci manualmente</SelectItem>
                        {clienti?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome} {c.azienda ? `(${c.azienda})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {input.clienteId === null && (
                      <Input
                        placeholder="Nome cliente"
                        value={input.clienteNome}
                        onChange={(e) => setInput(prev => ({ ...prev, clienteNome: e.target.value }))}
                        className="h-10 mt-2"
                      />
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Tipologia</Label>
                    <Select
                      value={input.tipologiaCliente}
                      onValueChange={(v) => setInput(prev => ({ ...prev, tipologiaCliente: v as any }))}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bar">Bar</SelectItem>
                        <SelectItem value="alimentari">Alimentari</SelectItem>
                        <SelectItem value="ingrosso">Ingrosso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Azienda - Selezione da database */}
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Azienda
                  </Label>
                  <Select
                    value={input.aziendaId || "none"}
                    onValueChange={(v) => {
                      if (v === "none") {
                        setInput(prev => ({ ...prev, aziendaId: null, prodottoId: null }));
                      } else {
                        handleAziendaSelect(v);
                      }
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Seleziona azienda..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Nessuna --</SelectItem>
                      {aziende?.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Prodotto - Selezione da database o manuale */}
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    Prodotto
                  </Label>
                  {input.aziendaId && prodotti && prodotti.length > 0 ? (
                    <Select
                      value={input.prodottoId || "manual"}
                      onValueChange={(v) => {
                        if (v === "manual") {
                          setInput(prev => ({ 
                            ...prev, 
                            prodottoId: null, 
                            prodottoNome: "",
                            prezzoListino: 0,
                            pezziPerCartone: 6
                          }));
                        } else {
                          handleProdottoSelect(v);
                        }
                      }}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Seleziona prodotto..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">✏️ Inserisci manualmente</SelectItem>
                        {prodotti.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nome} - €{p.prezzo_listino.toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="Nome prodotto"
                      value={input.prodottoNome}
                      onChange={(e) => setInput(prev => ({ ...prev, prodottoNome: e.target.value }))}
                      className="h-10"
                    />
                  )}
                  {input.aziendaId && input.prodottoId === null && (
                    <Input
                      placeholder="Nome prodotto manuale"
                      value={input.prodottoNome}
                      onChange={(e) => setInput(prev => ({ ...prev, prodottoNome: e.target.value }))}
                      className="h-10 mt-2"
                    />
                  )}
                </div>

                {/* Prezzi */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Prezzo Listino (€/pz)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={input.prezzoListino || ""}
                      onChange={(e) => setInput(prev => ({ ...prev, prezzoListino: parseFloat(e.target.value) || 0 }))}
                      className="h-10"
                    />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1">
                      {input.usaCosto ? "Costo (€/pz)" : "Margine Target (%)"}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1 text-xs"
                        onClick={() => setInput(prev => ({ ...prev, usaCosto: !prev.usaCosto }))}
                      >
                        Cambia
                      </Button>
                    </Label>
                    <Input
                      type="number"
                      step={input.usaCosto ? "0.01" : "1"}
                      value={input.usaCosto ? (input.costoAcquisto || "") : (input.margineTarget || "")}
                      onChange={(e) => setInput(prev => ({
                        ...prev,
                        ...(input.usaCosto 
                          ? { costoAcquisto: parseFloat(e.target.value) || 0 }
                          : { margineTarget: parseFloat(e.target.value) || 0 })
                      }))}
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Quantità */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Pezzi/Cartone</Label>
                    <Input
                      type="number"
                      value={input.pezziPerCartone || ""}
                      onChange={(e) => setInput(prev => ({ ...prev, pezziPerCartone: parseInt(e.target.value) || 6 }))}
                      className="h-10"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Cartoni</Label>
                    <Input
                      type="number"
                      value={input.quantitaCartoni || ""}
                      onChange={(e) => setInput(prev => ({ ...prev, quantitaCartoni: parseInt(e.target.value) || 1 }))}
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Sconto richiesto */}
                {!modalitaVeloce && (
                  <div>
                    <Label className="text-xs">Sconto richiesto dal cliente (%)</Label>
                    <Input
                      type="number"
                      step="1"
                      placeholder="Es: 10"
                      value={input.scontoRichiesto || ""}
                      onChange={(e) => setInput(prev => ({ ...prev, scontoRichiesto: parseFloat(e.target.value) || 0 }))}
                      className="h-10"
                    />
                  </div>
                )}

                {/* Obiettivo */}
                <div>
                  <Label className="text-xs">Obiettivo della visita</Label>
                  <Select
                    value={input.obiettivo}
                    onValueChange={(v) => setInput(prev => ({ ...prev, obiettivo: v }))}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OBIETTIVI.map((ob) => (
                        <SelectItem key={ob.value} value={ob.value}>
                          {ob.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Riepilogo veloce */}
                {input.prezzoListino > 0 && input.quantitaCartoni > 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg text-sm">
                    <p><strong>{input.quantitaCartoni * input.pezziPerCartone}</strong> pezzi totali</p>
                    <p>Valore ordine: <strong>€{(input.prezzoListino * input.quantitaCartoni * input.pezziPerCartone).toFixed(2)}</strong></p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pulsanti azione */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-12"
                onClick={handleSalvaTemplate}
              >
                <Bookmark className="h-4 w-4 mr-2" />
                Salva Template
              </Button>
              <Button
                className="h-12 text-base"
                onClick={handleGenera}
              >
                <Target className="h-5 w-5 mr-2" />
                Genera 3 Carte
              </Button>
            </div>

            {/* Templates salvati */}
            {templates && templates.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Template Salvati
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-32">
                    <div className="space-y-2">
                      {templates.map((t) => (
                        <button
                          key={t.id}
                          className="w-full text-left p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                          onClick={() => setInput(prev => ({
                            ...prev,
                            tipologiaCliente: t.tipologia_cliente as any,
                            obiettivo: t.obiettivo_default,
                          }))}
                        >
                          <p className="font-medium text-sm">{t.nome}</p>
                          <p className="text-xs text-muted-foreground">{t.tipologia_cliente}</p>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB OUTPUT - LE 3 CARTE */}
          <TabsContent value="output" className="mt-4 space-y-4">
            {/* Script pronti */}
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Script Pronti - Da dire al cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {SCRIPTS.slice(0, 3).map((script, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 p-2 bg-background rounded border">
                      <p className="text-sm italic">"{script}"</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => handleCopiaScript(script)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Le 3 carte */}
            <div className="space-y-3">
              {carte.map((carta) => (
                <Card 
                  key={carta.tipo} 
                  className={`border-2 ${
                    carta.badge === "MIGLIORE PER ME" 
                      ? "border-green-500/50 bg-green-500/5" 
                      : carta.badge === "EQUILIBRATA"
                        ? "border-blue-500/50 bg-blue-500/5"
                        : "border-amber-500/50 bg-amber-500/5"
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge className={carta.badgeColor}>
                          {carta.badge}
                        </Badge>
                        <CardTitle className="text-lg mt-1">
                          Carta {carta.tipo} - {carta.nome}
                        </CardTitle>
                        <CardDescription>{carta.descrizione}</CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">€{carta.prezzoFinale.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">/pezzo</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Dettagli ordine */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-background rounded border">
                        <p className="text-xs text-muted-foreground">Cartoni</p>
                        <p className="font-bold">{carta.quantitaCartoni}</p>
                      </div>
                      <div className="p-2 bg-background rounded border">
                        <p className="text-xs text-muted-foreground">Pezzi</p>
                        <p className="font-bold">{carta.quantitaPezzi}</p>
                      </div>
                      <div className="p-2 bg-background rounded border">
                        <p className="text-xs text-muted-foreground">Totale</p>
                        <p className="font-bold">€{carta.totaleOrdine.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Omaggio */}
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Omaggio/Extra: <strong>{carta.omaggio}</strong></span>
                    </div>

                    {/* Margine */}
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Margine: <strong>{carta.marginePercentuale.toFixed(1)}%</strong>
                        {" "}(€{carta.margineEuro.toFixed(2)} totale)
                      </span>
                    </div>

                    {/* Perché funziona */}
                    <p className="text-xs text-muted-foreground italic">
                      💡 {carta.percheFunziona}
                    </p>

                    <Separator />

                    {/* Script specifico */}
                    <div className="flex items-start justify-between gap-2 p-2 bg-muted/50 rounded">
                      <p className="text-sm italic flex-1">{carta.script}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => handleCopiaScript(carta.script)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Azioni */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-12"
                onClick={() => setActiveTab("input")}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Rigenera
              </Button>
              <Button
                className="h-12"
                onClick={handleSalvaStorico}
              >
                <Save className="h-4 w-4 mr-2" />
                Salva Trattativa
              </Button>
            </div>
          </TabsContent>

          {/* TAB CALCOLATORE - Margine/Ricarico */}
          <TabsContent value="calcolatore" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Calcolatore Margine e Ricarico
                </CardTitle>
                <CardDescription>
                  Calcola margine, ricarico e prezzo di vendita in tempo reale
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="da-prezzo" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="da-prezzo">Da Prezzo</TabsTrigger>
                    <TabsTrigger value="da-margine">Da Margine</TabsTrigger>
                    <TabsTrigger value="da-ricarico">Da Ricarico</TabsTrigger>
                  </TabsList>

                  {/* Tab: Calcolo da Prezzo */}
                  <TabsContent value="da-prezzo" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Costo Acquisto (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Es: 5.00"
                          value={costoAcquisto}
                          onChange={(e) => setCostoAcquisto(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Prezzo Vendita (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Es: 8.00"
                          value={prezzoVendita}
                          onChange={(e) => setPrezzoVendita(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Percent className="h-4 w-4" />
                            Margine
                          </div>
                          <p className="text-2xl font-bold text-primary">{risultatiCostoPrezzo.margine}%</p>
                          <p className="text-xs text-muted-foreground">sul prezzo</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-secondary/50 border-secondary">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <TrendingUp className="h-4 w-4" />
                            Ricarico
                          </div>
                          <p className="text-2xl font-bold text-secondary-foreground">{risultatiCostoPrezzo.ricarico}%</p>
                          <p className="text-xs text-muted-foreground">sul costo</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-green-500/10 border-green-500/20">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <DollarSign className="h-4 w-4" />
                            Utile
                          </div>
                          <p className="text-2xl font-bold text-green-600">€{risultatiCostoPrezzo.utile}</p>
                          <p className="text-xs text-muted-foreground">per unità</p>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* Tab: Calcolo da Margine */}
                  <TabsContent value="da-margine" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Costo Acquisto (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Es: 5.00"
                          value={costoAcquisto}
                          onChange={(e) => setCostoAcquisto(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Margine Desiderato (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="Es: 30"
                          value={marginePercentuale}
                          onChange={(e) => setMarginePercentuale(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <DollarSign className="h-4 w-4" />
                            Prezzo Vendita
                          </div>
                          <p className="text-2xl font-bold text-primary">€{risultatiMargine.prezzo}</p>
                          <p className="text-xs text-muted-foreground">da applicare</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-secondary/50 border-secondary">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <TrendingUp className="h-4 w-4" />
                            Ricarico
                          </div>
                          <p className="text-2xl font-bold text-secondary-foreground">{risultatiMargine.ricarico}%</p>
                          <p className="text-xs text-muted-foreground">sul costo</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-green-500/10 border-green-500/20">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <DollarSign className="h-4 w-4" />
                            Utile
                          </div>
                          <p className="text-2xl font-bold text-green-600">€{risultatiMargine.utile}</p>
                          <p className="text-xs text-muted-foreground">per unità</p>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* Tab: Calcolo da Ricarico */}
                  <TabsContent value="da-ricarico" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Costo Acquisto (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Es: 5.00"
                          value={costoAcquisto}
                          onChange={(e) => setCostoAcquisto(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Ricarico Desiderato (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="Es: 50"
                          value={ricaricoPercentuale}
                          onChange={(e) => setRicaricoPercentuale(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <DollarSign className="h-4 w-4" />
                            Prezzo Vendita
                          </div>
                          <p className="text-2xl font-bold text-primary">€{risultatiRicarico.prezzo}</p>
                          <p className="text-xs text-muted-foreground">da applicare</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-secondary/50 border-secondary">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <Percent className="h-4 w-4" />
                            Margine
                          </div>
                          <p className="text-2xl font-bold text-secondary-foreground">{risultatiRicarico.margine}%</p>
                          <p className="text-xs text-muted-foreground">sul prezzo</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-green-500/10 border-green-500/20">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <DollarSign className="h-4 w-4" />
                            Utile
                          </div>
                          <p className="text-2xl font-bold text-green-600">€{risultatiRicarico.utile}</p>
                          <p className="text-xs text-muted-foreground">per unità</p>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Formule */}
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">📐 Formule:</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Margine</strong> = (Prezzo - Costo) / Prezzo × 100</p>
                    </div>
                    <div>
                      <p><strong>Ricarico</strong> = (Prezzo - Costo) / Costo × 100</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB STRUMENTI */}
          <TabsContent value="tools" className="mt-4 space-y-4">
            <div className="grid gap-4">
              <ScontoOmaggioConverter />
              <BreakEvenCalculator />
              <PromoContropartitaGenerator />
              <AntiCompetitorTool />
            </div>
          </TabsContent>

          {/* TAB BUDGET */}
          <TabsContent value="budget" className="mt-4 space-y-4">
            {/* Select cliente per budget */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Seleziona Cliente per Analisi</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={input.clienteId || "example"}
                  onValueChange={(v) => {
                    if (v !== "example") {
                      handleClienteSelect(v);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="example">-- Esempio --</SelectItem>
                    {clienti?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <ClienteScoringCard
              fatturato={selectedCliente?.fatturato || 10000}
              fatturatoTarget={selectedCliente?.fatturato_target || 15000}
              nPromo={selectedCliente?.n_promo_concesse || 3}
              crescitaPercentuale={5}
              nomeCliente={selectedCliente?.nome || "Cliente esempio"}
            />
            <BudgetPromoCalculator
              clienteFatturato={selectedCliente?.fatturato || 10000}
              clienteBudgetPercentuale={selectedCliente?.budget_promo_percentuale || 5}
              clienteCostoPromoGiaConcesse={selectedCliente?.costo_promo_totale || 200}
              clienteScontoMaxPolicy={selectedCliente?.sconto_max_policy || 15}
            />
          </TabsContent>

          {/* TAB STORICO */}
          <TabsContent value="storico" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Ultime Trattative
                </CardTitle>
              </CardHeader>
              <CardContent>
                {storico && storico.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {storico.map((t) => (
                        <div key={t.id} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{t.cliente_nome}</p>
                              <p className="text-sm text-muted-foreground">{t.prodotto_nome}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(t.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge 
                                variant="outline"
                                className={
                                  t.esito === "accettata" 
                                    ? "bg-green-500/10 text-green-600 border-green-500/30"
                                    : t.esito === "rifiutata"
                                      ? "bg-red-500/10 text-red-600 border-red-500/30"
                                      : "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                                }
                              >
                                {t.esito || "In corso"}
                              </Badge>
                              {t.carta_scelta && (
                                <p className="text-xs mt-1">Carta {t.carta_scelta}</p>
                              )}
                            </div>
                          </div>
                          
                          {t.esito !== "accettata" && t.esito !== "rifiutata" && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-8 text-xs"
                                onClick={() => updateEsito.mutate({ 
                                  id: t.id, 
                                  esito: "accettata",
                                  carta_scelta: prompt("Quale carta ha scelto? (A, B, C)") || undefined
                                })}
                              >
                                <Check className="h-3 w-3 mr-1" /> Accettata
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-8 text-xs"
                                onClick={() => updateEsito.mutate({ id: t.id, esito: "rifiutata" })}
                              >
                                Rifiutata
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nessuna trattativa salvata
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
