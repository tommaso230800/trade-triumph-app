import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scale, Percent, Gift, TrendingUp, Package } from "lucide-react";
import { calcolaBreakEvenPromo } from "@/hooks/usePromoClienti";

export function BreakEvenCalculator() {
  const [tipoPromo, setTipoPromo] = useState<"sconto" | "omaggio">("sconto");
  const [scontoPercentuale, setScontoPercentuale] = useState<number>(10);
  const [pezziOmaggio, setPezziOmaggio] = useState<number>(6);
  const [prezzoListino, setPrezzoListino] = useState<number>(2);
  const [costoAcquisto, setCostoAcquisto] = useState<number>(1.2);
  const [quantitaCartoni, setQuantitaCartoni] = useState<number>(10);
  const [pezziPerCartone, setPezziPerCartone] = useState<number>(6);

  const risultato = useMemo(() => {
    if (prezzoListino <= 0 || costoAcquisto <= 0 || quantitaCartoni <= 0) return null;

    return calcolaBreakEvenPromo({
      prezzoListino,
      costoAcquisto,
      scontoPercentuale: tipoPromo === "sconto" ? scontoPercentuale : undefined,
      pezziOmaggio: tipoPromo === "omaggio" ? pezziOmaggio : undefined,
      quantitaBaseCartoni: quantitaCartoni,
      pezziPerCartone,
    });
  }, [tipoPromo, scontoPercentuale, pezziOmaggio, prezzoListino, costoAcquisto, quantitaCartoni, pezziPerCartone]);

  const margineBase = ((prezzoListino - costoAcquisto) / prezzoListino) * 100;
  const margineEuroBase = (prezzoListino - costoAcquisto) * quantitaCartoni * pezziPerCartone;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Scale className="h-4 w-4" />
          Break-Even Promo
        </CardTitle>
        <CardDescription>Quanti cartoni servono per mantenere lo stesso margine?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ordine base */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground mb-2">Ordine base (senza promo)</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="font-semibold">{quantitaCartoni} ct</p>
              <p className="text-xs text-muted-foreground">{quantitaCartoni * pezziPerCartone} pz</p>
            </div>
            <div>
              <p className="font-semibold">{margineBase.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">margine</p>
            </div>
            <div>
              <p className="font-semibold">€{margineEuroBase.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">guadagno</p>
            </div>
          </div>
        </div>

        {/* Input promo */}
        <Tabs value={tipoPromo} onValueChange={(v) => setTipoPromo(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sconto" className="gap-1">
              <Percent className="h-3 w-3" /> Con Sconto
            </TabsTrigger>
            <TabsTrigger value="omaggio" className="gap-1">
              <Gift className="h-3 w-3" /> Con Omaggio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sconto" className="mt-4">
            <div>
              <Label className="text-xs">Sconto % che vuoi concedere</Label>
              <Input
                type="number"
                step="0.5"
                value={scontoPercentuale || ""}
                onChange={(e) => setScontoPercentuale(parseFloat(e.target.value) || 0)}
                className="h-10"
              />
            </div>
          </TabsContent>

          <TabsContent value="omaggio" className="mt-4">
            <div>
              <Label className="text-xs">Pezzi omaggio che vuoi concedere</Label>
              <Input
                type="number"
                value={pezziOmaggio || ""}
                onChange={(e) => setPezziOmaggio(parseInt(e.target.value) || 0)}
                className="h-10"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Parametri prodotto */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Listino €/pz</Label>
            <Input
              type="number"
              step="0.01"
              value={prezzoListino || ""}
              onChange={(e) => setPrezzoListino(parseFloat(e.target.value) || 0)}
              className="h-10"
            />
          </div>
          <div>
            <Label className="text-xs">Costo €/pz</Label>
            <Input
              type="number"
              step="0.01"
              value={costoAcquisto || ""}
              onChange={(e) => setCostoAcquisto(parseFloat(e.target.value) || 0)}
              className="h-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Cartoni ordine attuale</Label>
            <Input
              type="number"
              value={quantitaCartoni || ""}
              onChange={(e) => setQuantitaCartoni(parseInt(e.target.value) || 1)}
              className="h-10"
            />
          </div>
          <div>
            <Label className="text-xs">Pz/cartone</Label>
            <Input
              type="number"
              value={pezziPerCartone || ""}
              onChange={(e) => setPezziPerCartone(parseInt(e.target.value) || 6)}
              className="h-10"
            />
          </div>
        </div>

        {/* Risultato */}
        {risultato && (
          <div className="space-y-3 pt-2">
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-2">Per mantenere €{margineEuroBase.toFixed(2)} di margine:</p>
              <div className="flex items-center justify-center gap-4">
                <div>
                  <p className="text-4xl font-bold text-primary">{risultato.quantitaCartoni}</p>
                  <p className="text-sm text-muted-foreground">cartoni</p>
                </div>
                <div className="text-muted-foreground">=</div>
                <div>
                  <p className="text-4xl font-bold text-primary">{risultato.quantitaPezzi}</p>
                  <p className="text-sm text-muted-foreground">pezzi</p>
                </div>
              </div>
            </div>

            {/* Delta */}
            <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium">Incremento necessario:</span>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                  +{risultato.quantitaCartoni - quantitaCartoni} cartoni
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  (+{risultato.incrementoPercentuale.toFixed(1)}%)
                </p>
              </div>
            </div>

            {/* Messaggio */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">{risultato.messaggio}</p>
            </div>

            {/* Script */}
            <div className="p-3 bg-background border rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Da dire al cliente:</p>
              <p className="text-sm italic">
                "Posso farti {tipoPromo === "sconto" ? `il ${scontoPercentuale}%` : `${pezziOmaggio} pezzi omaggio`}, 
                ma per sostenere questa promo mi servono almeno {risultato.quantitaCartoni} cartoni invece di {quantitaCartoni}."
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
