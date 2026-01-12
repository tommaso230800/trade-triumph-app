import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  TrendingUp, 
  Package, 
  Wrench,
  Copy,
  AlertTriangle,
  Lightbulb
} from "lucide-react";
import { toast } from "sonner";

export function AntiCompetitorTool() {
  const [prezzoCompetitor, setPrezzoCompetitor] = useState<number>(0);
  const [prezzoMio, setPrezzoMio] = useState<number>(0);
  const [margineCliente, setMargineCliente] = useState<number>(30);
  const [costoAcquisto, setCostoAcquisto] = useState<number>(0);

  const analisi = useMemo(() => {
    if (prezzoCompetitor <= 0 || prezzoMio <= 0) return null;

    const differenza = prezzoMio - prezzoCompetitor;
    const percentualeDiff = (differenza / prezzoMio) * 100;
    const percentualeDiffCompetitor = (differenza / prezzoCompetitor) * 100;

    // Calcola margine cliente con entrambi i prodotti
    const prezzoVenditaCliente = prezzoMio * (1 + margineCliente / 100);
    const margineEuroMio = prezzoVenditaCliente - prezzoMio;
    const margineEuroCompetitor = prezzoVenditaCliente - prezzoCompetitor;

    // Mosse difensive
    const mosse = [
      {
        tipo: "volume",
        nome: "Leva Volume/Omaggio",
        descrizione: `Offri ${Math.ceil(percentualeDiff / 3)} pezzi omaggio ogni 10 per compensare il gap`,
        script: `"Il mio prodotto costa €${differenza.toFixed(2)} in più, ma se ne prendi una quantità maggiore ti compenso con omaggi. Su 10 pezzi te ne do ${Math.ceil(percentualeDiff / 3)} gratis."`,
        efficacia: "alta",
        costoStimato: costoAcquisto > 0 ? (costoAcquisto * Math.ceil(percentualeDiff / 3)) : null,
      },
      {
        tipo: "servizio",
        nome: "Leva Servizio/Materiali",
        descrizione: "Offri materiale POP, espositori, supporto vendita, consegna dedicata",
        script: `"Sì, costa un po' di più, ma io ti do anche ${percentualeDiff > 10 ? "espositore dedicato, materiale e" : ""} assistenza che l'altro non ti dà. Il valore è molto superiore alla differenza di prezzo."`,
        efficacia: "media",
        costoStimato: percentualeDiff > 10 ? 50 : 20,
      },
      {
        tipo: "margine",
        nome: "Leva Marginalità Cliente",
        descrizione: `Con il mio prodotto guadagna €${margineEuroMio.toFixed(2)} vs €${margineEuroCompetitor.toFixed(2)} (se vende allo stesso prezzo)`,
        script: margineEuroMio > margineEuroCompetitor 
          ? `"Guarda il margine che fai: con me guadagni €${margineEuroMio.toFixed(2)} a pezzo. L'altro costa meno ma tu ci guadagni meno. Fai i conti."` 
          : `"Se lo vendi al mio prezzo di vendita, con me il margine è garantito. L'altro costa meno ma la rotazione non è la stessa."`,
        efficacia: margineEuroMio > margineEuroCompetitor ? "alta" : "bassa",
        costoStimato: 0,
      },
      {
        tipo: "qualita",
        nome: "Leva Qualità/Rotazione",
        descrizione: "Enfatizza qualità superiore, brand più forte, rotazione migliore",
        script: `"La differenza di €${differenza.toFixed(2)} la recuperi in rotazione. Il mio gira ${percentualeDiff < 10 ? "il doppio" : "molto di più"}, quindi a fine mese ci guadagni di più."`,
        efficacia: "media",
        costoStimato: 0,
      },
    ];

    return {
      differenza,
      percentualeDiff,
      percentualeDiffCompetitor,
      margineEuroMio,
      margineEuroCompetitor,
      mosse,
    };
  }, [prezzoCompetitor, prezzoMio, margineCliente, costoAcquisto]);

  const handleCopiaScript = (script: string) => {
    navigator.clipboard.writeText(script);
    toast.success("Script copiato!");
  };

  const getEfficaciaColor = (efficacia: string) => {
    switch (efficacia) {
      case "alta":
        return "bg-green-500/10 text-green-600 border-green-500/30";
      case "media":
        return "bg-amber-500/10 text-amber-600 border-amber-500/30";
      case "bassa":
        return "bg-red-500/10 text-red-600 border-red-500/30";
      default:
        return "";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Anti-Competitor
        </CardTitle>
        <CardDescription>Difendi il tuo prezzo senza abbassarlo</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input prezzi */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Prezzo Competitor (€/pz)</Label>
            <Input
              type="number"
              step="0.01"
              value={prezzoCompetitor || ""}
              onChange={(e) => setPrezzoCompetitor(parseFloat(e.target.value) || 0)}
              className="h-10"
              placeholder="Es: 1.80"
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
              placeholder="Es: 2.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Ricarico cliente (%)</Label>
            <Input
              type="number"
              value={margineCliente || ""}
              onChange={(e) => setMargineCliente(parseFloat(e.target.value) || 30)}
              className="h-10"
              placeholder="Es: 30"
            />
          </div>
          <div>
            <Label className="text-xs">Mio costo (€/pz) - opz.</Label>
            <Input
              type="number"
              step="0.01"
              value={costoAcquisto || ""}
              onChange={(e) => setCostoAcquisto(parseFloat(e.target.value) || 0)}
              className="h-10"
              placeholder="Es: 1.20"
            />
          </div>
        </div>

        {/* Analisi gap */}
        {analisi && (
          <>
            <div className={`p-3 rounded-lg flex items-center justify-between ${
              analisi.differenza > 0 
                ? "bg-amber-500/10 border border-amber-500/30"
                : "bg-green-500/10 border border-green-500/30"
            }`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 ${analisi.differenza > 0 ? "text-amber-600" : "text-green-600"}`} />
                <span className="text-sm font-medium">
                  {analisi.differenza > 0 
                    ? `Sei più caro di €${analisi.differenza.toFixed(2)} (+${analisi.percentualeDiff.toFixed(1)}%)`
                    : `Sei più economico di €${Math.abs(analisi.differenza).toFixed(2)}`
                  }
                </span>
              </div>
            </div>

            <Separator />

            {/* Mosse difensive */}
            <div>
              <p className="text-sm font-medium mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                Mosse per difendere il prezzo:
              </p>
              <div className="space-y-3">
                {analisi.mosse.map((mossa, index) => (
                  <div 
                    key={index}
                    className="p-3 bg-muted/50 rounded-lg border"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {mossa.tipo === "volume" && <Package className="h-4 w-4 text-primary" />}
                        {mossa.tipo === "servizio" && <Wrench className="h-4 w-4 text-primary" />}
                        {mossa.tipo === "margine" && <TrendingUp className="h-4 w-4 text-primary" />}
                        {mossa.tipo === "qualita" && <Shield className="h-4 w-4 text-primary" />}
                        <p className="font-medium text-sm">{mossa.nome}</p>
                      </div>
                      <Badge variant="outline" className={getEfficaciaColor(mossa.efficacia)}>
                        {mossa.efficacia}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{mossa.descrizione}</p>
                    {mossa.costoStimato !== null && mossa.costoStimato > 0 && (
                      <p className="text-xs text-amber-600 mb-2">Costo stimato: €{mossa.costoStimato.toFixed(2)}</p>
                    )}
                    <div className="flex items-start justify-between gap-2 p-2 bg-background rounded">
                      <p className="text-sm italic flex-1">"{mossa.script}"</p>
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

            {/* Frase killer */}
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-xs text-primary font-medium mb-2">Frase killer finale:</p>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm italic flex-1">
                  "Non ti sto vendendo un prezzo, ti sto vendendo un risultato. 
                  Con me hai supporto, rotazione garantita e un partner che ti segue. 
                  L'altro ti fa risparmiare €{analisi.differenza.toFixed(2)} oggi, 
                  ma domani quando hai un problema chi chiami?"
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => handleCopiaScript(`Non ti sto vendendo un prezzo, ti sto vendendo un risultato. Con me hai supporto, rotazione garantita e un partner che ti segue. L'altro ti fa risparmiare €${analisi.differenza.toFixed(2)} oggi, ma domani quando hai un problema chi chiami?`)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
