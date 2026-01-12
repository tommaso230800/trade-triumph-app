import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Calculator, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Lightbulb,
  Copy
} from "lucide-react";
import { calcolaImpattoPromo, type CalcoloImpatto } from "@/hooks/usePromoClienti";
import { toast } from "sonner";

interface BudgetPromoCalculatorProps {
  clienteFatturato?: number;
  clienteBudgetPercentuale?: number;
  clienteCostoPromoGiaConcesse?: number;
  clienteScontoMaxPolicy?: number;
  onSalvaPromo?: (promo: any) => void;
}

const TIPI_PROMO = [
  { value: "sconto_percentuale", label: "Sconto % (es. 5%)" },
  { value: "sconto_euro", label: "Sconto €/pz (es. -0,10€)" },
  { value: "omaggio", label: "Omaggi (es. 10+1)" },
  { value: "materiale", label: "Materiali (valore €)" },
  { value: "dilazione", label: "Dilazione pagamento (gg extra)" },
];

const FRASI_LIMITE = [
  "Ti ho già dato tre interventi quest'anno, se aggiungo questo vado fuori budget e non riesco a garantirti continuità sui riassortimenti...",
  "Guarda, quest'anno ti ho già supportato con diverse iniziative. Posso aiutarti ancora, ma devo farlo in modo sostenibile.",
  "Il budget che ho per te è quasi esaurito. Se vuoi un altro intervento, dobbiamo ragionare su un ordine più grande.",
];

export function BudgetPromoCalculator({
  clienteFatturato = 10000,
  clienteBudgetPercentuale = 5,
  clienteCostoPromoGiaConcesse = 200,
  clienteScontoMaxPolicy = 15,
  onSalvaPromo,
}: BudgetPromoCalculatorProps) {
  const [tipoPromo, setTipoPromo] = useState("sconto_percentuale");
  const [valore, setValore] = useState<number>(5);
  const [quantitaCartoni, setQuantitaCartoni] = useState<number>(10);
  const [pezziPerCartone, setPezziPerCartone] = useState<number>(6);
  const [prezzoListino, setPrezzoListino] = useState<number>(2);
  const [costoAcquisto, setCostoAcquisto] = useState<number>(1.2);

  const quantitaPezzi = quantitaCartoni * pezziPerCartone;

  const impatto = useMemo<CalcoloImpatto | null>(() => {
    if (prezzoListino <= 0 || quantitaPezzi <= 0) return null;

    return calcolaImpattoPromo({
      fatturatoCliente: clienteFatturato,
      budgetPromoPercentuale: clienteBudgetPercentuale,
      costoPromoGiaConcesse: clienteCostoPromoGiaConcesse,
      scontoMaxPolicy: clienteScontoMaxPolicy,
      tipoPromo,
      valore,
      quantitaPezzi,
      prezzoListino,
      costoAcquisto,
    });
  }, [
    clienteFatturato,
    clienteBudgetPercentuale,
    clienteCostoPromoGiaConcesse,
    clienteScontoMaxPolicy,
    tipoPromo,
    valore,
    quantitaPezzi,
    prezzoListino,
    costoAcquisto,
  ]);

  const getStatusIcon = () => {
    if (!impatto) return null;
    switch (impatto.status) {
      case "ok":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "attenzione":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "non_concedibile":
        return <XCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const getStatusColor = () => {
    if (!impatto) return "";
    switch (impatto.status) {
      case "ok":
        return "border-green-500/50 bg-green-500/5";
      case "attenzione":
        return "border-amber-500/50 bg-amber-500/5";
      case "non_concedibile":
        return "border-destructive/50 bg-destructive/5";
    }
  };

  const handleCopiaFrase = (frase: string) => {
    navigator.clipboard.writeText(frase);
    toast.success("Frase copiata!");
  };

  const calcolaPromoMassima = () => {
    if (!impatto) return;
    const maxValore = (impatto.promoMassimaConcedibile / (prezzoListino * quantitaPezzi)) * 100;
    setValore(Math.floor(maxValore * 10) / 10);
    toast.info(`Promo massima: ${maxValore.toFixed(1)}%`);
  };

  return (
    <div className="space-y-4">
      {/* Input Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Budget Promo - Impatto Economico
          </CardTitle>
          <CardDescription>Calcola quanto costa concedere questa promo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Info cliente (se disponibili) */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg text-sm">
            <div>
              <span className="text-muted-foreground">Fatturato cliente:</span>
              <p className="font-semibold">€{clienteFatturato.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Budget promo ({clienteBudgetPercentuale}%):</span>
              <p className="font-semibold">€{((clienteFatturato * clienteBudgetPercentuale) / 100).toFixed(2)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Già speso:</span>
              <p className="font-semibold text-amber-600">€{clienteCostoPromoGiaConcesse.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Disponibile:</span>
              <p className="font-semibold text-green-600">
                €{(((clienteFatturato * clienteBudgetPercentuale) / 100) - clienteCostoPromoGiaConcesse).toFixed(2)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Tipo promo */}
          <div>
            <Label className="text-xs">Tipo promo richiesta</Label>
            <Select value={tipoPromo} onValueChange={setTipoPromo}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPI_PROMO.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valore promo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">
                {tipoPromo === "sconto_percentuale" ? "Sconto %" : 
                 tipoPromo === "sconto_euro" ? "Sconto €/pz" :
                 tipoPromo === "omaggio" ? "Pezzi omaggio" :
                 tipoPromo === "materiale" ? "Valore € materiale" :
                 "Giorni extra"}
              </Label>
              <Input
                type="number"
                step={tipoPromo === "sconto_euro" ? "0.01" : "1"}
                value={valore || ""}
                onChange={(e) => setValore(parseFloat(e.target.value) || 0)}
                className="h-10"
              />
            </div>
            <div>
              <Label className="text-xs">Cartoni ordine</Label>
              <Input
                type="number"
                value={quantitaCartoni || ""}
                onChange={(e) => setQuantitaCartoni(parseInt(e.target.value) || 1)}
                className="h-10"
              />
            </div>
          </div>

          {/* Prezzi */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Pz/cartone</Label>
              <Input
                type="number"
                value={pezziPerCartone || ""}
                onChange={(e) => setPezziPerCartone(parseInt(e.target.value) || 6)}
                className="h-10"
              />
            </div>
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

          <Button variant="outline" size="sm" onClick={calcolaPromoMassima} className="w-full">
            <Lightbulb className="h-4 w-4 mr-2" />
            Calcola promo massima concedibile
          </Button>
        </CardContent>
      </Card>

      {/* Output - Impatto */}
      {impatto && (
        <Card className={`border-2 ${getStatusColor()}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {getStatusIcon()}
                Risultato Analisi
              </CardTitle>
              <Badge 
                variant="outline" 
                className={
                  impatto.status === "ok" 
                    ? "bg-green-500/10 text-green-600 border-green-500/30"
                    : impatto.status === "attenzione"
                      ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                      : "bg-destructive/10 text-destructive border-destructive/30"
                }
              >
                {impatto.status === "ok" ? "OK" : impatto.status === "attenzione" ? "ATTENZIONE" : "NON CONCEDIBILE"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Metriche principali */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-background rounded-lg border text-center">
                <p className="text-xs text-muted-foreground">Costo promo</p>
                <p className="text-xl font-bold">€{impatto.costoPromo.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">€{impatto.costoPerPezzo.toFixed(3)}/pz</p>
              </div>
              <div className="p-3 bg-background rounded-lg border text-center">
                <p className="text-xs text-muted-foreground">Impatto su fatturato</p>
                <p className="text-xl font-bold">{impatto.impattoPercentuale.toFixed(2)}%</p>
              </div>
            </div>

            {/* Margini */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Margine prima</p>
                <p className="font-semibold flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  {impatto.marginePrima.toFixed(1)}%
                </p>
              </div>
              <div className="text-2xl text-muted-foreground">→</div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Margine dopo</p>
                <p className="font-semibold flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-amber-500" />
                  {impatto.margineDopo.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Budget */}
            <div className="p-3 bg-background rounded-lg border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm">Budget residuo dopo promo:</span>
                <span className={`font-bold ${impatto.budgetResiduo < 0 ? "text-destructive" : "text-green-600"}`}>
                  €{impatto.budgetResiduo.toFixed(2)}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full ${impatto.budgetResiduo < 0 ? "bg-destructive" : "bg-green-500"}`}
                  style={{ width: `${Math.max(0, Math.min(100, (impatto.budgetResiduo / impatto.budgetDisponibile) * 100))}%` }}
                />
              </div>
            </div>

            {/* Messaggio status */}
            <div className={`p-3 rounded-lg ${
              impatto.status === "ok" 
                ? "bg-green-500/10 border border-green-500/30"
                : impatto.status === "attenzione"
                  ? "bg-amber-500/10 border border-amber-500/30"
                  : "bg-destructive/10 border border-destructive/30"
            }`}>
              <p className="text-sm font-medium">{impatto.messaggioStatus}</p>
            </div>

            {/* Suggerimento alternativa */}
            {impatto.suggerimentoAlternativa && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-primary">Suggerimento:</p>
                    <p className="text-sm">{impatto.suggerimentoAlternativa}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Frasi pronte per giustificare limite */}
      {impatto && (impatto.status === "attenzione" || impatto.status === "non_concedibile") && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Frasi per spiegare il limite al cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {FRASI_LIMITE.map((frase, i) => (
              <div key={i} className="flex items-start justify-between gap-2 p-2 bg-muted/50 rounded border">
                <p className="text-sm italic flex-1">"{frase}"</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => handleCopiaFrase(frase)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
