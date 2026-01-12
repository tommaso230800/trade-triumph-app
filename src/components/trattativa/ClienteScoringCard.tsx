import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Gift,
  Lightbulb
} from "lucide-react";
import { calcolaScoringCliente } from "@/hooks/usePromoClienti";

interface ClienteScoringCardProps {
  fatturato: number;
  fatturatoTarget: number;
  nPromo: number;
  crescitaPercentuale?: number;
  nomeCliente?: string;
}

export function ClienteScoringCard({
  fatturato,
  fatturatoTarget,
  nPromo,
  crescitaPercentuale = 0,
  nomeCliente,
}: ClienteScoringCardProps) {
  const scoring = useMemo(() => {
    return calcolaScoringCliente({
      fatturato,
      fatturatoTarget,
      nPromo,
      crescitaPercentuale,
    });
  }, [fatturato, fatturatoTarget, nPromo, crescitaPercentuale]);

  const getStatusIcon = () => {
    switch (scoring.status) {
      case "verde":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "giallo":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "rosso":
        return <XCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const getStatusColor = () => {
    switch (scoring.status) {
      case "verde":
        return "border-green-500/50 bg-green-500/5";
      case "giallo":
        return "border-amber-500/50 bg-amber-500/5";
      case "rosso":
        return "border-destructive/50 bg-destructive/5";
    }
  };

  const getBadgeColor = () => {
    switch (scoring.status) {
      case "verde":
        return "bg-green-500/10 text-green-600 border-green-500/30";
      case "giallo":
        return "bg-amber-500/10 text-amber-600 border-amber-500/30";
      case "rosso":
        return "bg-destructive/10 text-destructive border-destructive/30";
    }
  };

  return (
    <Card className={`border-2 ${getStatusColor()}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {getStatusIcon()}
            {nomeCliente ? `Scoring: ${nomeCliente}` : "Scoring Cliente"}
          </CardTitle>
          <Badge variant="outline" className={getBadgeColor()}>
            {scoring.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress vs Target */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Fatturato vs Target</span>
            <span className="font-medium">{scoring.percentualeTarget.toFixed(0)}%</span>
          </div>
          <Progress 
            value={Math.min(100, scoring.percentualeTarget)} 
            className="h-3"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>€{fatturato.toLocaleString()}</span>
            <span>Target: €{fatturatoTarget.toLocaleString()}</span>
          </div>
        </div>

        {/* Metriche */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 bg-background rounded-lg border text-center">
            <Target className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold">{scoring.percentualeTarget.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">del target</p>
          </div>
          <div className="p-2 bg-background rounded-lg border text-center">
            <Gift className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold">{nPromo}</p>
            <p className="text-xs text-muted-foreground">promo fatte</p>
          </div>
          <div className="p-2 bg-background rounded-lg border text-center">
            {crescitaPercentuale >= 0 ? (
              <TrendingUp className="h-4 w-4 mx-auto text-green-500 mb-1" />
            ) : (
              <TrendingDown className="h-4 w-4 mx-auto text-destructive mb-1" />
            )}
            <p className="text-lg font-bold">{crescitaPercentuale > 0 ? "+" : ""}{crescitaPercentuale.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">crescita</p>
          </div>
        </div>

        {/* Descrizione */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium">{scoring.descrizione}</p>
        </div>

        {/* Strategia consigliata */}
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-primary font-medium mb-1">Strategia consigliata:</p>
              <p className="text-sm">{scoring.strategia}</p>
            </div>
          </div>
        </div>

        {/* Warning promo */}
        {nPromo >= 3 && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm">
              {nPromo >= 4 
                ? "Troppe promo già concesse! Chiedi contropartita prima di concedere altro."
                : "Attenzione: già 3 promo quest'anno. Valuta bene prima di concederne altre."
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
