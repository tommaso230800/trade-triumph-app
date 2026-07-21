import { useSegnalazioneEventi, useAggiungiEvento, type SegnalazioneEvento } from "@/hooks/useSegnalazioni";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { MessageSquare, Mail, Phone, Bell, RefreshCw, Paperclip, Bot, Loader2, Send } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const ICON: Record<SegnalazioneEvento["tipo_evento"], any> = {
  nota: MessageSquare,
  email: Mail,
  telefonata: Phone,
  sollecito: Bell,
  cambio_stato: RefreshCw,
  allegato: Paperclip,
  sistema: Bot,
};

const LABEL: Record<SegnalazioneEvento["tipo_evento"], string> = {
  nota: "Nota", email: "Email", telefonata: "Telefonata",
  sollecito: "Sollecito", cambio_stato: "Cambio stato",
  allegato: "Allegato", sistema: "Sistema",
};

export function SegnalazioneTimeline({ segnalazioneId }: { segnalazioneId: string }) {
  const { data: eventi = [], isLoading } = useSegnalazioneEventi(segnalazioneId);
  const aggiungi = useAggiungiEvento();
  const [tipo, setTipo] = useState<SegnalazioneEvento["tipo_evento"]>("nota");
  const [testo, setTesto] = useState("");

  const invia = async () => {
    if (!testo.trim()) return;
    await aggiungi.mutateAsync({ segnalazione_id: segnalazioneId, tipo_evento: tipo, descrizione: testo });
    setTesto("");
  };

  return (
    <div className="space-y-3">
      <Card className="p-3 bg-surface-glass border-border/40 space-y-2">
        <div className="flex gap-2">
          <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nota">Nota</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="telefonata">Telefonata</SelectItem>
              <SelectItem value="sollecito">Sollecito</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Textarea rows={2} placeholder="Aggiungi un aggiornamento..." value={testo} onChange={(e) => setTesto(e.target.value)} />
        <Button size="sm" onClick={invia} disabled={aggiungi.isPending || !testo.trim()}>
          {aggiungi.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Aggiungi
        </Button>
      </Card>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Caricamento...</div>
      ) : eventi.length === 0 ? (
        <div className="text-sm text-muted-foreground italic">Nessun evento</div>
      ) : (
        <div className="space-y-2">
          {eventi.map((e) => {
            const Icon = ICON[e.tipo_evento];
            return (
              <Card key={e.id} className="p-3 bg-surface-noir border-border/40">
                <div className="flex items-start gap-2">
                  <Icon className="h-4 w-4 text-primary mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{LABEL[e.tipo_evento]}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(e.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                      </span>
                    </div>
                    {e.tipo_evento === "cambio_stato" && (
                      <div className="text-xs text-muted-foreground mb-1">
                        {e.stato_precedente ?? "—"} → <b>{e.stato_nuovo}</b>
                      </div>
                    )}
                    {e.descrizione && <div className="text-sm whitespace-pre-wrap">{e.descrizione}</div>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
