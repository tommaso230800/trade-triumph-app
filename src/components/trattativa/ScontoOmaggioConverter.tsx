import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRightLeft, Percent, Gift, TrendingUp } from "lucide-react";
import { convertiScontoOmaggio } from "@/hooks/usePromoClienti";

export function ScontoOmaggioConverter() {
  const [direzione, setDirezione] = useState<"sconto_to_omaggio" | "omaggio_to_sconto">("sconto_to_omaggio");
  const [scontoPercentuale, setScontoPercentuale] = useState<number>(5);
  const [pezziOmaggio, setPezziOmaggio] = useState<number>(6);
  const [prezzoListino, setPrezzoListino] = useState<number>(2);
  const [costoAcquisto, setCostoAcquisto] = useState<number>(1.2);
  const [quantitaCartoni, setQuantitaCartoni] = useState<number>(10);
  const [pezziPerCartone, setPezziPerCartone] = useState<number>(6);

  const quantitaPezzi = quantitaCartoni * pezziPerCartone;

  const risultato = useMemo(() => {
    if (prezzoListino <= 0 || costoAcquisto <= 0 || quantitaPezzi <= 0) return null;

    return convertiScontoOmaggio({
      tipo: direzione,
      valore: direzione === "sconto_to_omaggio" ? scontoPercentuale : pezziOmaggio,
      prezzoListino,
      costoAcquisto,
      quantitaPezzi,
      pezziPerCartone,
    });
  }, [direzione, scontoPercentuale, pezziOmaggio, prezzoListino, costoAcquisto, quantitaPezzi, pezziPerCartone]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4" />
          Convertitore Sconto ↔ Omaggio
        </CardTitle>
        <CardDescription>Converti sconti in omaggi equivalenti e viceversa</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Direzione */}
        <Tabs value={direzione} onValueChange={(v) => setDirezione(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sconto_to_omaggio" className="gap-1">
              <Percent className="h-3 w-3" /> → <Gift className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger value="omaggio_to_sconto" className="gap-1">
              <Gift className="h-3 w-3" /> → <Percent className="h-3 w-3" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sconto_to_omaggio" className="mt-4 space-y-4">
            <div>
              <Label className="text-xs">Sconto % da convertire</Label>
              <Input
                type="number"
                step="0.5"
                value={scontoPercentuale || ""}
                onChange={(e) => setScontoPercentuale(parseFloat(e.target.value) || 0)}
                className="h-10"
                placeholder="Es: 5"
              />
            </div>
          </TabsContent>

          <TabsContent value="omaggio_to_sconto" className="mt-4 space-y-4">
            <div>
              <Label className="text-xs">Pezzi omaggio da convertire</Label>
              <Input
                type="number"
                value={pezziOmaggio || ""}
                onChange={(e) => setPezziOmaggio(parseInt(e.target.value) || 0)}
                className="h-10"
                placeholder="Es: 6"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Dati prodotto */}
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
            <Label className="text-xs">Cartoni ordine</Label>
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
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              {direzione === "sconto_to_omaggio" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Sconto {scontoPercentuale}% equivale a:</span>
                  </div>
                  <div className="text-center py-2">
                    <p className="text-3xl font-bold text-primary">
                      {"pezziOmaggio" in risultato ? risultato.pezziOmaggio : 0} pezzi
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {"cartoniOmaggio" in risultato ? `(${risultato.cartoniOmaggio} cartoni)` : ""}
                    </p>
                  </div>
                  {"formula" in risultato && (
                    <div className="text-center">
                      <Badge variant="outline" className="text-lg px-4 py-1">
                        Formula: {risultato.formula}
                      </Badge>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{pezziOmaggio} pezzi omaggio equivalgono a:</span>
                  </div>
                  <div className="text-center py-2">
                    <p className="text-3xl font-bold text-primary">
                      {"scontoPercentuale" in risultato ? risultato.scontoPercentuale : 0}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {"scontoEuro" in risultato ? `(€${risultato.scontoEuro}/pz)` : ""}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Confronto costi */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Costo omaggio</p>
                <p className="font-semibold">€{risultato.costoPerAzienda.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Costo sconto equiv.</p>
                <p className="font-semibold">€{risultato.costoScontoEquivalente.toFixed(2)}</p>
              </div>
            </div>

            {/* Convenienza */}
            <div className={`p-3 rounded-lg flex items-center justify-between ${
              risultato.convenienza === "omaggio" 
                ? "bg-green-500/10 border border-green-500/30"
                : "bg-amber-500/10 border border-amber-500/30"
            }`}>
              <div className="flex items-center gap-2">
                <TrendingUp className={`h-4 w-4 ${risultato.convenienza === "omaggio" ? "text-green-600" : "text-amber-600"}`} />
                <span className="text-sm font-medium">
                  Più conveniente per l'azienda:
                </span>
              </div>
              <Badge variant="outline" className={
                risultato.convenienza === "omaggio"
                  ? "bg-green-500/10 text-green-600 border-green-500/30"
                  : "bg-amber-500/10 text-amber-600 border-amber-500/30"
              }>
                {risultato.convenienza === "omaggio" ? "OMAGGIO" : "SCONTO"}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
