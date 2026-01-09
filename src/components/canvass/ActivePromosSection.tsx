import { Canvass } from "@/hooks/useCanvass";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { format, parseISO, differenceInDays } from "date-fns";
import { it } from "date-fns/locale";
import { 
  Percent, Tag, Trophy, Building2, Users, Gift, AlertTriangle, 
  ChevronRight, Zap
} from "lucide-react";

interface ActivePromosSectionProps {
  promos: Canvass[];
  onViewDetail: (promo: Canvass) => void;
}

const tipoConfig = {
  sconto_percentuale: { label: "Sconto", icon: Percent, color: "from-blue-500 to-blue-600" },
  prezzo_fisso: { label: "Prezzo Fisso", icon: Tag, color: "from-green-500 to-green-600" },
  premio_fine_anno: { label: "Premio", icon: Trophy, color: "from-amber-500 to-amber-600" },
};

const formatCurrency = (value: number) => 
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);

export function ActivePromosSection({ promos, onViewDetail }: ActivePromosSectionProps) {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const getEndDate = (promo: Canvass) => {
    // Get the currently active period's end date
    if (promo.data_inizio <= todayStr && promo.data_fine >= todayStr) {
      return promo.data_fine;
    }
    const activePeriod = promo.canvass_periodi?.find(p => 
      p.data_inizio <= todayStr && p.data_fine >= todayStr
    );
    return activePeriod?.data_fine || promo.data_fine;
  };

  if (promos.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Zap className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold">Nessuna promozione attiva</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Le promozioni attive appariranno qui
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Promozioni Attive
            </CardTitle>
            <CardDescription>
              {promos.length} promozioni in corso in questo periodo
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-2">
            {promos.map((promo) => {
              const TipoIcon = tipoConfig[promo.tipo].icon;
              const endDate = getEndDate(promo);
              const daysLeft = differenceInDays(parseISO(endDate), today);
              const isExpiring = daysLeft <= 7;

              return (
                <Card 
                  key={promo.id} 
                  className={`min-w-[280px] flex-shrink-0 overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 ${
                    isExpiring ? "ring-2 ring-orange-400" : ""
                  }`}
                  onClick={() => onViewDetail(promo)}
                >
                  {/* Header with gradient */}
                  <div className={`h-2 bg-gradient-to-r ${tipoConfig[promo.tipo].color}`} />
                  
                  <CardContent className="p-4 space-y-3">
                    {/* Title and Type */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold line-clamp-1">{promo.nome}</h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Building2 className="h-3 w-3" />
                          {promo.azienda?.nome || "N/A"}
                        </div>
                      </div>
                      <Badge variant="secondary" className="flex-shrink-0">
                        <TipoIcon className="h-3 w-3 mr-1" />
                        {tipoConfig[promo.tipo].label}
                      </Badge>
                    </div>

                    {/* Value Display */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-primary">
                          {promo.tipo === "prezzo_fisso" ? formatCurrency(promo.valore) : `${promo.valore}%`}
                        </p>
                        {promo.cartoni_omaggio > 0 && (
                          <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                            <Gift className="h-3 w-3" />
                            {promo.cartoni_acquisto}+{promo.cartoni_omaggio} omaggio
                          </div>
                        )}
                      </div>
                      {promo.tutti_clienti ? (
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          Tutti
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {promo.canvass_clienti?.length || 0}
                        </Badge>
                      )}
                    </div>

                    {/* Expiry Info */}
                    <div className={`flex items-center justify-between p-2 rounded-lg ${
                      isExpiring 
                        ? "bg-orange-100 dark:bg-orange-900/30" 
                        : "bg-muted/50"
                    }`}>
                      <div className="flex items-center gap-2">
                        {isExpiring && <AlertTriangle className="h-4 w-4 text-orange-600" />}
                        <span className={`text-xs font-medium ${isExpiring ? "text-orange-700 dark:text-orange-400" : ""}`}>
                          {isExpiring 
                            ? `Scade tra ${daysLeft} giorni` 
                            : `Fino al ${format(parseISO(endDate), "dd MMM", { locale: it })}`
                          }
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
