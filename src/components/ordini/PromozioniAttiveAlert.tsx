import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Gift, CheckCircle2 } from "lucide-react";
import type { Canvass } from "@/hooks/useCanvass";

interface PromozioniAttiveAlertProps {
  promozioni: Canvass[];
  appliedPromos: string[];
  onApply: (promo: Canvass) => void;
}

export function PromozioniAttiveAlert({ promozioni, appliedPromos, onApply }: PromozioniAttiveAlertProps) {
  if (promozioni.length === 0) return null;

  return (
    <Alert className="border-success/50 bg-success/10">
      <Sparkles className="h-4 w-4 text-success" />
      <AlertTitle className="flex items-center gap-2 text-success">
        <Gift className="h-4 w-4" />
        {promozioni.length} Promozioni Attive
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        {promozioni.map((promo) => (
          <div
            key={promo.id}
            className="flex flex-col justify-between gap-2 rounded-lg bg-background/60 p-2 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{promo.nome}</p>
              <p className="text-xs text-muted-foreground">
                {promo.tipo === "sconto_percentuale" && `Sconto ${promo.valore}%`}
                {promo.tipo === "prezzo_fisso" && `Prezzo fisso €${promo.valore}`}
                {promo.cartoni_omaggio > 0 && ` • ${promo.cartoni_acquisto}+${promo.cartoni_omaggio} omaggio`}
                {promo.canvass_prodotti && promo.canvass_prodotti.length > 0 && (
                  <span> • {promo.canvass_prodotti.length} prodotti</span>
                )}
              </p>
            </div>
            {appliedPromos.includes(promo.id) ? (
              <Badge variant="success" className="shrink-0">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Applicata
              </Badge>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 border-success/50 text-success hover:bg-success/20"
                onClick={() => onApply(promo)}
              >
                <Gift className="mr-1 h-3 w-3" />
                Applica
              </Button>
            )}
          </div>
        ))}
        <p className="mt-2 text-xs text-muted-foreground">
          Le promozioni sui prodotti vengono applicate automaticamente quando li aggiungi all'ordine.
        </p>
      </AlertDescription>
    </Alert>
  );
}
