import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar, User, FileText, ArrowRight, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClientVisit } from "@/hooks/useClientVisits";
import { cn } from "@/lib/utils";

const ESITO_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ordine_fatto: { label: "Ordine fatto", variant: "default" },
  preventivo: { label: "Preventivo", variant: "secondary" },
  problematiche: { label: "Problematiche", variant: "destructive" },
  da_ricontattare: { label: "Da ricontattare", variant: "outline" },
  visita_conoscitiva: { label: "Visita conoscitiva", variant: "secondary" },
  altro: { label: "Altro", variant: "outline" },
};

interface VisitCardProps {
  visit: ClientVisit;
  showClientName?: boolean;
  onEdit?: (visit: ClientVisit) => void;
  onDelete?: (visit: ClientVisit) => void;
  compact?: boolean;
}

export function VisitCard({ visit, showClientName = true, onEdit, onDelete, compact = false }: VisitCardProps) {
  const esitoInfo = visit.esito ? ESITO_LABELS[visit.esito] : null;

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md border-border/50",
      compact && "shadow-none"
    )}>
      <CardContent className={cn("p-4", compact && "p-3")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>{format(new Date(visit.data_visita), "d MMMM yyyy", { locale: it })}</span>
              </div>
              
              {showClientName && visit.clienti && (
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span>{visit.clienti.nome}</span>
                </div>
              )}
              
              {esitoInfo && (
                <Badge variant={esitoInfo.variant} className="text-xs">
                  {esitoInfo.label}
                </Badge>
              )}
            </div>

            {/* Titolo */}
            {visit.titolo && (
              <h4 className="font-medium text-foreground">{visit.titolo}</h4>
            )}

            {/* Note */}
            {visit.note_visita && (
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground line-clamp-2">{visit.note_visita}</p>
              </div>
            )}

            {/* Azioni Future */}
            {visit.azioni_future && (
              <div className="flex items-start gap-2 bg-primary/5 rounded-lg p-2">
                <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-foreground line-clamp-2">{visit.azioni_future}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          {(onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(visit)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Modifica
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem onClick={() => onDelete(visit)} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Elimina
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
