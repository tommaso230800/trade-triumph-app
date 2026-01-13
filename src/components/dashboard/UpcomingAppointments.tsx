import { Calendar, Clock, MapPin, User, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useUpcomingEventi, Evento } from "@/hooks/useEventi";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { it } from "date-fns/locale";

const tipoConfig = {
  meeting: { label: "Riunione", className: "bg-primary/10 text-primary" },
  presentazione: { label: "Presentazione", className: "bg-info/10 text-info" },
  visita: { label: "Visita", className: "bg-success/10 text-success" },
  altro: { label: "Altro", className: "bg-muted text-muted-foreground" },
};

const getDateLabel = (dateStr: string) => {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Oggi";
  if (isTomorrow(date)) return "Domani";
  return format(date, "EEE d MMM", { locale: it });
};

export function UpcomingAppointments() {
  const { data: eventi, isLoading } = useUpcomingEventi();
  const upcomingEventi = eventi?.slice(0, 4) || [];

  return (
    <div className="rounded-xl bg-card p-4 lg:p-6 shadow-card animate-fade-in hover-lift">
      <div className="mb-4 lg:mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <h3 className="section-heading">Prossimi Appuntamenti</h3>
        </div>
        <Link 
          to="/agenda" 
          className="text-body-md font-medium text-primary hover:underline underline-offset-4 transition-all"
        >
          Vedi tutti
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : upcomingEventi.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-body-md">Nessun appuntamento in programma</p>
          <Link 
            to="/agenda" 
            className="inline-block mt-3 text-body-sm font-medium text-primary hover:underline"
          >
            Aggiungi un appuntamento
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {upcomingEventi.map((evento, index) => (
            <div
              key={evento.id}
              className={cn(
                "rounded-xl border border-border p-3 lg:p-4 transition-all duration-200 hover:bg-muted/50 hover:border-primary/20 animate-fade-in animate-fill-both",
                `stagger-${index + 1}`
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={cn(tipoConfig[evento.tipo].className, "text-xs")}>
                      {tipoConfig[evento.tipo].label}
                    </Badge>
                    <span className="text-xs font-medium text-muted-foreground">
                      {getDateLabel(evento.data)}
                    </span>
                  </div>
                  <p className="font-semibold text-card-foreground truncate">{evento.titolo}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {evento.orario_inizio && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {evento.orario_inizio.slice(0, 5)}
                        {evento.orario_fine && ` - ${evento.orario_fine.slice(0, 5)}`}
                      </div>
                    )}
                    {evento.luogo && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[120px]">{evento.luogo}</span>
                      </div>
                    )}
                    {evento.clienti?.nome && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="truncate max-w-[100px]">{evento.clienti.nome}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}