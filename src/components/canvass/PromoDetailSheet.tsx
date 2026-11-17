import { Canvass } from "@/hooks/useCanvass";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format, parseISO, differenceInDays, isBefore } from "date-fns";
import { it } from "date-fns/locale";
import { 
  Percent, Tag, Trophy, Building2, Users, Package, Calendar, 
  Gift, CheckCircle2, AlertTriangle, Clock, AlertCircle, Pencil, Trash2
} from "lucide-react";
import { formatEuro } from "@/lib/format";

interface PromoDetailSheetProps {
  promo: Canvass | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (promo: Canvass) => void;
  onDelete: (id: string) => void;
}

const tipoConfig = {
  sconto_percentuale: { label: "Sconto %", icon: Percent, color: "bg-primary/10 text-primary  " },
  prezzo_fisso: { label: "Prezzo Fisso", icon: Tag, color: "bg-success/10 text-success  " },
  premio_fine_anno: { label: "Premio Fine Anno", icon: Trophy, color: "bg-warning/10 text-warning  " },
};

const formatCurrency = (value: number) => 
  formatEuro(value);

export function PromoDetailSheet({ promo, open, onOpenChange, onEdit, onDelete }: PromoDetailSheetProps) {
  if (!promo) return null;

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  
  const getPromoStatus = () => {
    if (!promo.attivo) return { label: "Disattivata", color: "bg-muted text-muted-foreground", icon: AlertCircle };
    
    const isInMainPeriod = promo.data_inizio <= todayStr && promo.data_fine >= todayStr;
    const isInAdditionalPeriod = promo.canvass_periodi?.some(p => 
      p.data_inizio <= todayStr && p.data_fine >= todayStr
    );
    
    if (isInMainPeriod || isInAdditionalPeriod) {
      const allEndDates = [promo.data_fine, ...(promo.canvass_periodi?.map(p => p.data_fine) || [])];
      const nextEnd = allEndDates.filter(d => d >= todayStr).sort()[0];
      
      if (nextEnd) {
        const daysLeft = differenceInDays(parseISO(nextEnd), today);
        if (daysLeft <= 7) return { label: `Scade tra ${daysLeft}g`, color: "bg-warning/10 text-warning", icon: AlertTriangle };
      }
      return { label: "Attiva", color: "bg-success/10 text-success", icon: CheckCircle2 };
    }
    
    const allEndDates = [promo.data_fine, ...(promo.canvass_periodi?.map(p => p.data_fine) || [])];
    const latestEnd = allEndDates.sort().pop() || promo.data_fine;
    if (isBefore(parseISO(latestEnd), today)) return { label: "Scaduta", color: "bg-destructive/10 text-destructive", icon: AlertCircle };
    
    return { label: "Futura", color: "bg-info/10 text-info", icon: Clock };
  };

  const status = getPromoStatus();
  const StatusIcon = status.icon;
  const TipoIcon = tipoConfig[promo.tipo].icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <SheetTitle className="text-xl font-bold">{promo.nome}</SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {promo.azienda?.nome || "N/A"}
              </SheetDescription>
            </div>
            <Badge className={status.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Tipo e Valore */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Dettagli Promozione</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tipo</p>
                  <Badge className={tipoConfig[promo.tipo].color}>
                    <TipoIcon className="h-3 w-3 mr-1" />
                    {tipoConfig[promo.tipo].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Valore</p>
                  <p className="text-2xl font-bold text-primary">
                    {promo.tipo === "prezzo_fisso" ? formatCurrency(promo.valore) : `${promo.valore}%`}
                  </p>
                </div>
              </div>
              
              {promo.cartoni_omaggio > 0 && (
                <div className="p-3 bg-success/10  rounded-lg border border-success/30 ">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-success" />
                    <span className="font-medium text-success ">
                      Prendi {promo.cartoni_acquisto}, ricevi {promo.cartoni_omaggio} omaggio
                    </span>
                  </div>
                </div>
              )}

              {promo.descrizione && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Descrizione</p>
                  <p className="text-sm">{promo.descrizione}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Periodi */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Periodi di Validità
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="p-3 bg-muted/50 rounded-lg flex justify-between items-center">
                <span className="text-sm font-medium">Periodo Principale</span>
                <span className="text-sm">
                  {format(parseISO(promo.data_inizio), "dd MMM yyyy", { locale: it })} - {format(parseISO(promo.data_fine), "dd MMM yyyy", { locale: it })}
                </span>
              </div>
              
              {promo.canvass_periodi && promo.canvass_periodi.length > 0 && (
                <>
                  <Separator />
                  <p className="text-xs text-muted-foreground">Periodi Aggiuntivi</p>
                  {promo.canvass_periodi.map((periodo, idx) => (
                    <div key={idx} className="p-3 bg-muted/50 rounded-lg flex justify-between items-center border border-border">
                      <span className="text-sm text-foreground">Periodo {idx + 2}</span>
                      <span className="text-sm font-medium">
                        {format(parseISO(periodo.data_inizio), "dd MMM", { locale: it })} - {format(parseISO(periodo.data_fine), "dd MMM", { locale: it })}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          {/* Clienti */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Clienti Target
              </CardTitle>
            </CardHeader>
            <CardContent>
              {promo.tutti_clienti ? (
                <div className="p-3 bg-primary/10  rounded-lg text-center">
                  <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="font-medium text-primary ">Tutti i Clienti</p>
                  <p className="text-xs text-primary">Questa promozione si applica a tutti</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {promo.canvass_clienti?.map((cc) => (
                    <div key={cc.cliente_id} className="p-2 bg-muted/50 rounded-lg flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{cc.clienti.nome}</span>
                      {cc.clienti.azienda && (
                        <span className="text-xs text-muted-foreground">({cc.clienti.azienda})</span>
                      )}
                    </div>
                  ))}
                  {(!promo.canvass_clienti || promo.canvass_clienti.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">Nessun cliente specifico</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prodotti */}
          {promo.canvass_prodotti && promo.canvass_prodotti.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Prodotti Coinvolti ({promo.canvass_prodotti.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {promo.canvass_prodotti.map((cp) => (
                    <div key={cp.prodotto_id} className="p-2 bg-muted/50 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{cp.prodotti.nome}</span>
                        {cp.prodotti.codice && (
                          <Badge variant="outline" className="text-xs">{cp.prodotti.codice}</Badge>
                        )}
                      </div>
                      {cp.valore_override && (
                        <Badge variant="secondary">{cp.valore_override}%</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <SheetFooter className="mt-6 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onDelete(promo.id)}>
            <Trash2 className="h-4 w-4 mr-2 text-destructive" />
            Elimina
          </Button>
          <Button className="flex-1" onClick={() => onEdit(promo)}>
            <Pencil className="h-4 w-4 mr-2" />
            Modifica
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
