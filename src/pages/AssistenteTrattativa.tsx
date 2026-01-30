import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Calculator, 
  Target,
  TrendingUp,
  TrendingDown,
  Package,
  Percent,
  DollarSign,
  Building2,
  Copy,
  Save,
  CheckCircle,
  AlertTriangle,
  XCircle
} from "lucide-react";
import { useClienti, useCliente } from "@/hooks/useClienti";
import { useAziende } from "@/hooks/useAziende";
import { useProdotti } from "@/hooks/useProdotti";
import { useSaveTrattativa } from "@/hooks/useTrattativa";
import { useClientKPI } from "@/hooks/useClientKPI";
import { usePromoCliente } from "@/hooks/usePromoClienti";
import { ClientStatusBadge } from "@/components/commercial/ClientStatusBadge";
import { useClientiCommercialiPrioritari } from "@/hooks/useClientCommercialData";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(value);

export default function AssistenteTrattativa() {
  const { data: clienti } = useClienti();
  const { data: aziende } = useAziende();
  const { data: clientiCommerciali } = useClientiCommercialiPrioritari();
  const saveTrattativa = useSaveTrattativa();

  // Selezione
  const [clienteId, setClienteId] = useState<string>("");
  const [aziendaId, setAziendaId] = useState<string>("");
  const [prodottoId, setProdottoId] = useState<string>("");

  // Input calcolo
  const [prezzoListino, setPrezzoListino] = useState<number>(0);
  const [costoAcquisto, setCostoAcquisto] = useState<number>(0);
  const [pezziPerCartone, setPezziPerCartone] = useState<number>(6);
  const [quantitaCartoni, setQuantitaCartoni] = useState<number>(1);
  const [scontoRichiesto, setScontoRichiesto] = useState<number>(0);

  // Dati
  const { data: prodotti } = useProdotti(aziendaId || undefined);
  const { data: clienteDettaglio } = useCliente(clienteId || undefined);
  const { data: kpi } = useClientKPI(clienteId || undefined);
  const { data: promoClienti } = usePromoCliente(clienteId || undefined);
  const clienteCommerciale = clientiCommerciali?.find(c => c.id === clienteId);

  // Calcoli
  const calcoli = useMemo(() => {
    if (prezzoListino <= 0 || quantitaCartoni <= 0) return null;

    const quantitaPezzi = quantitaCartoni * pezziPerCartone;
    const fatturatoOrdine = prezzoListino * quantitaPezzi;
    
    // Margine base (senza sconto)
    const margineBase = costoAcquisto > 0 
      ? ((prezzoListino - costoAcquisto) / prezzoListino) * 100 
      : 30;
    const utileBase = (prezzoListino - costoAcquisto) * quantitaPezzi;

    // Con sconto richiesto
    const prezzoScontato = prezzoListino * (1 - scontoRichiesto / 100);
    const margineScontato = costoAcquisto > 0 
      ? ((prezzoScontato - costoAcquisto) / prezzoScontato) * 100 
      : margineBase - scontoRichiesto;
    const utileScontato = (prezzoScontato - costoAcquisto) * quantitaPezzi;
    const perditaSconto = utileBase - utileScontato;

    // Budget promo cliente
    const budgetPromo = clienteCommerciale 
      ? (clienteCommerciale.fatturato * (clienteCommerciale.budget_promo_percentuale || 3) / 100)
      : 0;
    const promoGiaSpeso = clienteCommerciale?.costo_promo_totale || 0;
    const budgetResiduo = budgetPromo - promoGiaSpeso;

    // Status
    let status: "ok" | "attenzione" | "non_concedibile" = "ok";
    let messaggioStatus = "";
    
    if (perditaSconto > budgetResiduo) {
      status = "non_concedibile";
      messaggioStatus = "Questo sconto supera il budget promo disponibile per il cliente";
    } else if (margineScontato < 15) {
      status = "non_concedibile";
      messaggioStatus = "Margine troppo basso, rischio di perdita";
    } else if (margineScontato < 20 || perditaSconto > budgetResiduo * 0.5) {
      status = "attenzione";
      messaggioStatus = "Sconto concedibile ma con cautela";
    } else {
      messaggioStatus = "Sconto concedibile, margine protetto";
    }

    return {
      quantitaPezzi,
      fatturatoOrdine,
      margineBase,
      utileBase,
      prezzoScontato,
      margineScontato,
      utileScontato,
      perditaSconto,
      budgetPromo,
      promoGiaSpeso,
      budgetResiduo,
      status,
      messaggioStatus,
    };
  }, [prezzoListino, costoAcquisto, pezziPerCartone, quantitaCartoni, scontoRichiesto, clienteCommerciale]);

  // Handlers
  const handleProdottoSelect = (id: string) => {
    setProdottoId(id);
    const prodotto = prodotti?.find(p => p.id === id);
    if (prodotto) {
      setPrezzoListino(prodotto.prezzo_listino);
      setPezziPerCartone(prodotto.pezzi_per_cartone);
    }
  };

  const handleCopia = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiato!");
  };

  const handleSalva = () => {
    if (!clienteId || !calcoli) {
      toast.error("Compila tutti i campi");
      return;
    }
    
    const cliente = clienti?.find(c => c.id === clienteId);
    const prodotto = prodotti?.find(p => p.id === prodottoId);
    
    saveTrattativa.mutate({
      cliente_id: clienteId,
      cliente_nome: cliente?.nome || "Cliente",
      tipologia_cliente: cliente?.tipologia_cliente || "bar",
      prodotto_nome: prodotto?.nome || "Prodotto",
      prezzo_listino: prezzoListino,
      costo_acquisto: costoAcquisto || null,
      margine_target: null,
      pezzi_per_cartone: pezziPerCartone,
      quantita_cartoni: quantitaCartoni,
      quantita_pezzi: calcoli.quantitaPezzi,
      sconto_richiesto: scontoRichiesto,
      obiettivo: "calcolo_margine",
      carta_scelta: null,
      esito: null,
      note: null,
      dati_carte: calcoli,
    });
  };

  const getStatusIcon = () => {
    if (!calcoli) return null;
    switch (calcoli.status) {
      case "ok":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "attenzione":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "non_concedibile":
        return <XCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const getStatusColor = () => {
    if (!calcoli) return "";
    switch (calcoli.status) {
      case "ok":
        return "border-green-500/50 bg-green-500/5";
      case "attenzione":
        return "border-amber-500/50 bg-amber-500/5";
      case "non_concedibile":
        return "border-destructive/50 bg-destructive/5";
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            Assistente Trattativa
          </h1>
          <p className="text-muted-foreground">
            Calcola margini e verifica se puoi concedere lo sconto
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Colonna Sinistra: Input */}
          <div className="space-y-4">
            {/* Selezione Cliente/Azienda */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Cliente e Prodotto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={clienteId} onValueChange={setClienteId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clienti?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Azienda</Label>
                  <Select value={aziendaId} onValueChange={(v) => { setAziendaId(v); setProdottoId(""); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona azienda..." />
                    </SelectTrigger>
                    <SelectContent>
                      {aziende?.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {aziendaId && (
                  <div className="space-y-2">
                    <Label>Prodotto (opzionale)</Label>
                    <Select value={prodottoId} onValueChange={handleProdottoSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona prodotto..." />
                      </SelectTrigger>
                      <SelectContent>
                        {prodotti?.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stato Cliente */}
            {clienteCommerciale && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium">Stato Cliente</span>
                    <ClientStatusBadge semaforo={clienteCommerciale.statoCliente.semaforo} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-muted-foreground text-xs">Fatturato 2026</p>
                      <p className="font-semibold">{formatCurrency(clienteCommerciale.fatturato)}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-muted-foreground text-xs">Trend</p>
                      <p className={cn("font-semibold", clienteCommerciale.statoCliente.crescitaPercentuale >= 0 ? "text-green-600" : "text-red-600")}>
                        {clienteCommerciale.statoCliente.crescitaPercentuale >= 0 ? "+" : ""}
                        {clienteCommerciale.statoCliente.crescitaPercentuale.toFixed(1)}%
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-muted-foreground text-xs">Promo fatte</p>
                      <p className="font-semibold">{clienteCommerciale.n_promo_concesse || 0}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-muted-foreground text-xs">Budget residuo</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(
                          (clienteCommerciale.fatturato * (clienteCommerciale.budget_promo_percentuale || 3) / 100) 
                          - (clienteCommerciale.costo_promo_totale || 0)
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Input Numeri */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Dati Prodotto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Prezzo Listino (€/pz)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={prezzoListino || ""}
                      onChange={(e) => setPrezzoListino(parseFloat(e.target.value) || 0)}
                      placeholder="2.50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Costo Acquisto (€/pz)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={costoAcquisto || ""}
                      onChange={(e) => setCostoAcquisto(parseFloat(e.target.value) || 0)}
                      placeholder="1.50"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Pezzi/Cartone</Label>
                    <Input
                      type="number"
                      value={pezziPerCartone || ""}
                      onChange={(e) => setPezziPerCartone(parseInt(e.target.value) || 6)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cartoni</Label>
                    <Input
                      type="number"
                      value={quantitaCartoni || ""}
                      onChange={(e) => setQuantitaCartoni(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-2">
                    <Percent className="h-3 w-3" />
                    Sconto Richiesto dal Cliente
                  </Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={scontoRichiesto || ""}
                    onChange={(e) => setScontoRichiesto(parseFloat(e.target.value) || 0)}
                    placeholder="5"
                    className="text-lg font-bold"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonna Destra: Risultati */}
          <div className="space-y-4">
            {/* Risultato Calcolo */}
            {calcoli && (
              <>
                <Card className={cn("border-2", getStatusColor())}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        {getStatusIcon()}
                        Analisi Sconto
                      </CardTitle>
                      <Badge 
                        variant="outline"
                        className={cn(
                          calcoli.status === "ok" 
                            ? "bg-green-500/10 text-green-600 border-green-500/30"
                            : calcoli.status === "attenzione"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                              : "bg-destructive/10 text-destructive border-destructive/30"
                        )}
                      >
                        {calcoli.status === "ok" ? "CONCEDIBILE" : calcoli.status === "attenzione" ? "ATTENZIONE" : "NON CONCEDERE"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Confronto Margini */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-muted/50 text-center">
                        <p className="text-xs text-muted-foreground">Margine Senza Sconto</p>
                        <p className="text-xl font-bold flex items-center justify-center gap-1">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          {calcoli.margineBase.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Utile: {formatCurrency(calcoli.utileBase)}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 text-center">
                        <p className="text-xs text-muted-foreground">Margine Con Sconto {scontoRichiesto}%</p>
                        <p className={cn("text-xl font-bold flex items-center justify-center gap-1", calcoli.margineScontato < 20 ? "text-amber-500" : "")}>
                          <TrendingDown className="h-4 w-4 text-amber-500" />
                          {calcoli.margineScontato.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Utile: {formatCurrency(calcoli.utileScontato)}
                        </p>
                      </div>
                    </div>

                    {/* Perdita */}
                    <div className="p-3 rounded-lg border bg-background text-center">
                      <p className="text-xs text-muted-foreground">Perdita con questo sconto</p>
                      <p className="text-2xl font-bold text-destructive">
                        -{formatCurrency(calcoli.perditaSconto)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        su ordine di {formatCurrency(calcoli.fatturatoOrdine)}
                      </p>
                    </div>

                    {/* Budget */}
                    {clienteCommerciale && (
                      <div className="p-3 rounded-lg border bg-background">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm">Budget promo residuo:</span>
                          <span className={cn("font-bold", calcoli.budgetResiduo < 0 ? "text-destructive" : "text-green-600")}>
                            {formatCurrency(calcoli.budgetResiduo)}
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full", calcoli.perditaSconto > calcoli.budgetResiduo ? "bg-destructive" : "bg-green-500")}
                            style={{ width: `${Math.max(0, Math.min(100, ((calcoli.budgetResiduo - calcoli.perditaSconto) / calcoli.budgetPromo) * 100))}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Messaggio */}
                    <div className={cn(
                      "p-3 rounded-lg border",
                      calcoli.status === "ok" 
                        ? "bg-green-500/10 border-green-500/30"
                        : calcoli.status === "attenzione"
                          ? "bg-amber-500/10 border-amber-500/30"
                          : "bg-destructive/10 border-destructive/30"
                    )}>
                      <p className="text-sm font-medium">{calcoli.messaggioStatus}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Suggerimento */}
                {calcoli.status !== "ok" && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">💡 Suggerimento</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        Invece di uno sconto del {scontoRichiesto}%, proponi:
                      </p>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-left h-auto py-2"
                          onClick={() => handleCopia(`"Se me ne prendi ${quantitaCartoni + 2}, te ne regalo 1. Fai i conti, conviene."`)}
                        >
                          <Package className="h-4 w-4 mr-2 shrink-0" />
                          <span className="truncate">Omaggio: {quantitaCartoni}+1 cartone</span>
                          <Copy className="h-3 w-3 ml-auto shrink-0" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-left h-auto py-2"
                          onClick={() => handleCopia(`"Il prezzo resta quello, ma ti do esposizione e materiale POP. Valore in più per te."`)}
                        >
                          <Target className="h-4 w-4 mr-2 shrink-0" />
                          <span className="truncate">Extra servizi invece di sconto</span>
                          <Copy className="h-3 w-3 ml-auto shrink-0" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Salva */}
                <Button onClick={handleSalva} className="w-full" disabled={saveTrattativa.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Salva nello Storico
                </Button>
              </>
            )}

            {!calcoli && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calculator className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Inserisci prezzo e quantità per calcolare
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
