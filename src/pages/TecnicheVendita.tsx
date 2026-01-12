import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Calculator, 
  Target, 
  MessageSquare, 
  Lightbulb,
  TrendingUp,
  Percent,
  DollarSign,
  ArrowRight
} from "lucide-react";

export default function TecnicheVendita() {
  // Calcolatore margine/ricarico
  const [costoAcquisto, setCostoAcquisto] = useState<string>("");
  const [prezzoVendita, setPrezzoVendita] = useState<string>("");
  const [marginePercentuale, setMarginePercentuale] = useState<string>("");
  const [ricaricoPercentuale, setRicaricoPercentuale] = useState<string>("");

  // Calcolo da costo e prezzo vendita
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

  // Calcolo da costo e margine desiderato
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

  // Calcolo da costo e ricarico desiderato
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

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Tecniche di Vendita</h1>
          <p className="text-muted-foreground mt-1">Manuale pratico e calcolatore margine/ricarico</p>
        </div>

        {/* Calcolatore */}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="costo1">Costo Acquisto (€)</Label>
                    <Input
                      id="costo1"
                      type="number"
                      step="0.01"
                      placeholder="Es: 5.00"
                      value={costoAcquisto}
                      onChange={(e) => setCostoAcquisto(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prezzo1">Prezzo Vendita (€)</Label>
                    <Input
                      id="prezzo1"
                      type="number"
                      step="0.01"
                      placeholder="Es: 8.00"
                      value={prezzoVendita}
                      onChange={(e) => setPrezzoVendita(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Percent className="h-4 w-4" />
                        Margine
                      </div>
                      <p className="text-2xl font-bold text-primary">{risultatiCostoPrezzo.margine}%</p>
                      <p className="text-xs text-muted-foreground">sul prezzo di vendita</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-secondary/50 border-secondary">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <TrendingUp className="h-4 w-4" />
                        Ricarico
                      </div>
                      <p className="text-2xl font-bold text-secondary-foreground">{risultatiCostoPrezzo.ricarico}%</p>
                      <p className="text-xs text-muted-foreground">sul costo d'acquisto</p>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="costo2">Costo Acquisto (€)</Label>
                    <Input
                      id="costo2"
                      type="number"
                      step="0.01"
                      placeholder="Es: 5.00"
                      value={costoAcquisto}
                      onChange={(e) => setCostoAcquisto(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="margine2">Margine Desiderato (%)</Label>
                    <Input
                      id="margine2"
                      type="number"
                      step="0.1"
                      placeholder="Es: 30"
                      value={marginePercentuale}
                      onChange={(e) => setMarginePercentuale(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="costo3">Costo Acquisto (€)</Label>
                    <Input
                      id="costo3"
                      type="number"
                      step="0.01"
                      placeholder="Es: 5.00"
                      value={costoAcquisto}
                      onChange={(e) => setCostoAcquisto(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ricarico3">Ricarico Desiderato (%)</Label>
                    <Input
                      id="ricarico3"
                      type="number"
                      step="0.1"
                      placeholder="Es: 50"
                      value={ricaricoPercentuale}
                      onChange={(e) => setRicaricoPercentuale(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
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

            {/* Spiegazione formule */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2">📐 Formule utilizzate:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Margine</strong> = (Prezzo - Costo) / Prezzo × 100</p>
                  <p className="text-muted-foreground text-xs mt-1">Quanto guadagni rispetto al prezzo di vendita</p>
                </div>
                <div>
                  <p><strong>Ricarico</strong> = (Prezzo - Costo) / Costo × 100</p>
                  <p className="text-muted-foreground text-xs mt-1">Quanto aggiungi rispetto al costo d'acquisto</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tecniche di Vendita */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Il "Gioco delle 3 Carte"
            </CardTitle>
            <CardDescription>
              Tecnica commerciale per non farti inchiodare su un solo prezzo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="font-semibold text-lg mb-2">Quando il cliente dice: "Mi fai un prezzo migliore?"</p>
              <p className="text-muted-foreground">Tu NON devi rispondere con un numero.</p>
              <p className="mt-2 text-primary font-medium">
                ✅ Risposta corretta: "Certo, ti posso venire incontro in 3 modi. Dimmi quale preferisci."
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Carta 1 */}
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardHeader className="pb-2">
                  <Badge variant="outline" className="w-fit border-amber-500 text-amber-600">Carta 1</Badge>
                  <CardTitle className="text-lg">Sconto Immediato</CardTitle>
                  <CardDescription className="text-amber-600">(la peggiore per te)</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">"Ti tolgo X cent a pezzo"</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Serve solo per far vedere che anche quello è possibile (ma deve essere la meno vantaggiosa).
                  </p>
                </CardContent>
              </Card>

              {/* Carta 2 */}
              <Card className="border-green-500/30 bg-green-500/5">
                <CardHeader className="pb-2">
                  <Badge variant="outline" className="w-fit border-green-500 text-green-600">Carta 2</Badge>
                  <CardTitle className="text-lg">Vantaggio su Volume</CardTitle>
                  <CardDescription className="text-green-600">(la migliore per te)</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">"Se mi fai X cartoni/pallet ti do X omaggio"</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Alzi quantità, alzi rotazione, ti fai spazio a scaffale, migliori sell-in.
                  </p>
                </CardContent>
              </Card>

              {/* Carta 3 */}
              <Card className="border-blue-500/30 bg-blue-500/5">
                <CardHeader className="pb-2">
                  <Badge variant="outline" className="w-fit border-blue-500 text-blue-600">Carta 3</Badge>
                  <CardTitle className="text-lg">Bonus Servizi/Extra</CardTitle>
                  <CardDescription className="text-blue-600">(molto utile)</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">"Prezzo uguale, ma ti regalo esposizione / materiale / 1 omaggio extra"</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Non tocchi prezzo, lui percepisce valore.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
              <h4 className="font-bold text-lg mb-2">🧠 Regola d'Oro</h4>
              <p className="text-lg">
                <strong>Il cliente deve sempre scegliere tra 3 opzioni, mai tra sì/no.</strong>
              </p>
              <p className="text-muted-foreground mt-1">
                Perché "sì/no" = lui comanda. "Quale preferisci?" = comandi te.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Frasi Pronte */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Frasi Pronte Anti-Sconto
            </CardTitle>
            <CardDescription>
              Risposte da usare quando il cliente ti attacca sul prezzo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Se dice: "Questo costa troppo"</p>
                <p className="font-medium">✅ "Certo, dipende da cosa vuoi ottenere: prezzo basso o margine alto?"</p>
              </div>
              
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Alternativa:</p>
                <p className="font-medium">✅ "Se vuoi spendere meno si può, ma bisogna cambiare una cosa: o quantità o condizioni."</p>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Frase da killer:</p>
                <p className="font-medium">✅ "Ti capisco, ed è giusto che tu faccia bene i conti. Fammi vedere come posso farti guadagnare di più, non solo pagare meno."</p>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Domande per spostare il focus dal prezzo
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium">"Dimmi: vuoi vendere di più o spendere di meno?"</p>
                </div>
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium">"Dove lo metti? Perché se lo metti bene, il prezzo non conta."</p>
                </div>
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium">"Quanti pezzi vuoi far girare a settimana?"</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tecniche Avanzate */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tecniche Avanzate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mai concedere senza ottenere */}
            <div>
              <h4 className="font-bold mb-3">🥊 Mai concedere senza ottenere</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                  <p className="text-red-600 font-medium">❌ NON fare mai:</p>
                  <p>"Ok ti abbasso"</p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                  <p className="text-green-600 font-medium">✅ Devi fare:</p>
                  <p>"Ok, ma in cambio…"</p>
                </div>
              </div>
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <p className="font-medium">Formula:</p>
                <p className="text-sm mt-1">"Ok, te lo posso fare… però mi devi dare una mano anche te: mi fai X cartoni / mi dai visibilità / mi dai riassortimento fisso."</p>
              </div>
            </div>

            <Separator />

            {/* Essere dalla sua parte */}
            <div>
              <h4 className="font-bold mb-3">🧲 Come essere "dalla sua parte"</h4>
              <p className="text-muted-foreground mb-3">Devi creare l'effetto: "Io e te contro il problema"</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <p className="text-sm">"Io voglio che tu guadagni. Se tu guadagni, io torno qui ogni mese."</p>
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <p className="text-sm">"Fammi capire come posso metterti in condizione di vendere, così poi il prezzo non è più un problema."</p>
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <p className="text-sm">"Io non ti vendo un prodotto: ti vendo una rotazione."</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Tecnica Premium */}
            <div>
              <h4 className="font-bold mb-3">🔥 La Tecnica "Premium" (la più efficace)</h4>
              <p className="text-muted-foreground mb-3">Quando vuoi alzare la marginalità:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                  <p className="font-semibold text-amber-600">Opzione A</p>
                  <p className="text-sm">Prezzo basso (poco margine)</p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30 ring-2 ring-green-500/50">
                  <p className="font-semibold text-green-600">Opzione B ⭐</p>
                  <p className="text-sm">Promo su quantità (migliore)</p>
                  <p className="text-xs text-green-600 mt-1">← Quella che vuoi tu!</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <p className="font-semibold text-blue-600">Opzione C</p>
                  <p className="text-sm">Pacchetto premium con esposizione + omaggi + extra</p>
                </div>
              </div>
              <div className="mt-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                <p className="text-sm">
                  💡 <strong>Il trucco:</strong> l'opzione C deve essere molto bella, così sembra che B sia il compromesso perfetto.
                  Il cliente sceglierà B (che è quella che vuoi tu).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Regola finale */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">🎯 La Tecnica per "Portarlo dalla Tua Parte"</h3>
              <p className="text-lg text-muted-foreground mb-4">Il tuo obiettivo è: <strong className="text-foreground">farlo sentire "furbo"</strong></p>
              <p className="text-muted-foreground">Un cliente compra quando pensa: <em>"L'ho spuntata io"</em></p>
              <p className="mt-2">Tu glielo devi far credere senza concedere troppo.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
