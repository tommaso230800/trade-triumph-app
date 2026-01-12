import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Handshake, 
  Package, 
  Eye, 
  RefreshCw,
  Copy,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";

const TIPOLOGIE_CLIENTE = [
  { value: "bar", label: "Bar" },
  { value: "alimentari", label: "Alimentari" },
  { value: "ingrosso", label: "Ingrosso" },
  { value: "ristorante", label: "Ristorante" },
  { value: "hotel", label: "Hotel" },
];

const CONTROPARTITE = {
  bar: [
    { 
      nome: "Aumento quantità", 
      descrizione: "+3 cartoni rispetto alla richiesta iniziale",
      script: "Ti faccio questo sconto, ma mi servono almeno 3 cartoni in più per sostenere l'investimento."
    },
    { 
      nome: "Esposizione garantita", 
      descrizione: "Banco frigo o testata per 15 giorni",
      script: "Posso venire incontro, ma mi serve esposizione sul banco frigo per almeno 2 settimane."
    },
    { 
      nome: "Riassortimento fisso", 
      descrizione: "Ordine minimo settimanale garantito",
      script: "Ok per la promo, ma mi impegni un riassortimento fisso ogni settimana?"
    },
  ],
  alimentari: [
    { 
      nome: "Testata di scaffale", 
      descrizione: "Visibilità premium per 1 mese",
      script: "Ti faccio questa condizione se mi dai la testata per un mese."
    },
    { 
      nome: "Aumento facing", 
      descrizione: "2 file invece di 1 sullo scaffale",
      script: "Posso concedere questo se mi raddoppi lo spazio a scaffale."
    },
    { 
      nome: "Ordine maggiorato", 
      descrizione: "+5 cartoni rispetto al solito",
      script: "Per questa promo mi servono almeno 5 cartoni extra."
    },
  ],
  ingrosso: [
    { 
      nome: "Pallet minimo", 
      descrizione: "Ordine minimo 1 pallet",
      script: "Questa condizione vale solo su ordine pallet."
    },
    { 
      nome: "Impegno trimestrale", 
      descrizione: "Ordine garantito ogni mese per 3 mesi",
      script: "Ti faccio questo prezzo se mi garantisci ordini per i prossimi 3 mesi."
    },
    { 
      nome: "Referenze multiple", 
      descrizione: "Aggiungi 2 referenze al tuo assortimento",
      script: "Posso concedere se mi inserisci anche queste 2 referenze."
    },
  ],
  ristorante: [
    { 
      nome: "Menù dedicato", 
      descrizione: "Inserimento prodotto in carta",
      script: "Ti faccio questa promo se inserisci il prodotto nel menù."
    },
    { 
      nome: "Visibilità tavoli", 
      descrizione: "Materiale sui tavoli/bar",
      script: "Posso venire incontro se mi dai visibilità sui tavoli."
    },
    { 
      nome: "Ordine fisso", 
      descrizione: "Riassortimento quindicinale garantito",
      script: "Ok per lo sconto, ma mi impegni un ordine ogni 2 settimane?"
    },
  ],
  hotel: [
    { 
      nome: "Frigobar", 
      descrizione: "Inserimento in tutti i frigobar camere",
      script: "Questa condizione vale se inserisci il prodotto in tutti i frigobar."
    },
    { 
      nome: "Breakfast room", 
      descrizione: "Esposizione nella sala colazioni",
      script: "Ti faccio questo prezzo se lo metti in sala colazioni."
    },
    { 
      nome: "Volume garantito", 
      descrizione: "Ordine mensile minimo concordato",
      script: "Posso concedere se mi garantisci un minimo mensile."
    },
  ],
};

export function PromoContropartitaGenerator() {
  const [tipologiaCliente, setTipologiaCliente] = useState<string>("bar");
  const [promoRichiesta, setPromoRichiesta] = useState<string>("");
  const [valorePromo, setValorePromo] = useState<number>(5);

  const contropartite = CONTROPARTITE[tipologiaCliente as keyof typeof CONTROPARTITE] || CONTROPARTITE.bar;

  const handleCopiaScript = (script: string) => {
    navigator.clipboard.writeText(script);
    toast.success("Script copiato!");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Handshake className="h-4 w-4" />
          Promo con Contropartita
        </CardTitle>
        <CardDescription>Non concedere mai gratis - chiedi sempre qualcosa in cambio</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tipologia cliente */}
        <div>
          <Label className="text-xs">Tipologia cliente</Label>
          <Select value={tipologiaCliente} onValueChange={setTipologiaCliente}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOLOGIE_CLIENTE.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Promo richiesta */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Promo richiesta</Label>
            <Input
              placeholder="Es: sconto 5%"
              value={promoRichiesta}
              onChange={(e) => setPromoRichiesta(e.target.value)}
              className="h-10"
            />
          </div>
          <div>
            <Label className="text-xs">Valore (%/€)</Label>
            <Input
              type="number"
              value={valorePromo || ""}
              onChange={(e) => setValorePromo(parseFloat(e.target.value) || 0)}
              className="h-10"
            />
          </div>
        </div>

        <Separator />

        {/* Contropartite suggerite */}
        <div>
          <p className="text-sm font-medium mb-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-primary" />
            Contropartite da chiedere:
          </p>
          <div className="space-y-3">
            {contropartite.map((cp, index) => (
              <div 
                key={index}
                className="p-3 bg-muted/50 rounded-lg border hover:bg-muted/80 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {index === 0 && <Package className="h-4 w-4 text-primary" />}
                      {index === 1 && <Eye className="h-4 w-4 text-primary" />}
                      {index === 2 && <RefreshCw className="h-4 w-4 text-primary" />}
                      <p className="font-medium text-sm">{cp.nome}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{cp.descrizione}</p>
                    <p className="text-sm italic bg-background p-2 rounded">
                      "{cp.script}"
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => handleCopiaScript(cp.script)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Frase master */}
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-xs text-primary font-medium mb-2">Frase universale:</p>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm italic flex-1">
              "Posso fare {promoRichiesta || "questa promo"} al {valorePromo}%, però mi serve anche qualcosa da te. Cosa puoi darmi in cambio?"
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => handleCopiaScript(`Posso fare ${promoRichiesta || "questa promo"} al ${valorePromo}%, però mi serve anche qualcosa da te. Cosa puoi darmi in cambio?`)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
