import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, ClipboardCheck, Trash2 } from "lucide-react";
import { useVisitPreparations, usePrepareVisitAI, useDeleteVisitPreparation } from "@/hooks/useVisitPreparations";
import { useVisitReports } from "@/hooks/useVisitReports";
import { VisitPreparationView } from "./VisitPreparationView";
import { VisitReportDialog } from "./VisitReportDialog";

interface Props { clienteId: string; }

export function VisitsSection({ clienteId }: Props) {
  const { data: preps = [] } = useVisitPreparations(clienteId);
  const { data: reports = [] } = useVisitReports(clienteId);
  const prepare = usePrepareVisitAI();
  const del = useDeleteVisitPreparation();

  const [reportOpen, setReportOpen] = useState(false);
  const [reportPrepId, setReportPrepId] = useState<string | undefined>();

  const handlePrepare = async () => {
    await prepare.mutateAsync({ cliente_id: clienteId });
  };

  const openReport = (prepId?: string) => { setReportPrepId(prepId); setReportOpen(true); };

  return (
    <div className="space-y-3">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Prepara visita con AI</div>
            <p className="text-xs text-muted-foreground mt-1">L'AI analizza ordini, concorrenza, note e visite passate per costruire la prossima visita.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePrepare} disabled={prepare.isPending}>
              {prepare.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Genero…</> : <><Sparkles className="h-4 w-4 mr-2" />Genera</>}
            </Button>
            <Button variant="outline" onClick={() => openReport(undefined)}><ClipboardCheck className="h-4 w-4 mr-2" />Report rapido</Button>
          </div>
        </CardContent>
      </Card>

      {preps.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Preparazioni AI ({preps.length})</h4>
          {preps.map((p, idx) => (
            <div key={p.id} className="relative">
              <VisitPreparationView prep={p} defaultOpen={idx === 0} onCompileReport={() => openReport(p.id)} />
              <Button size="icon" variant="ghost" className="absolute top-3 right-12 h-7 w-7" onClick={() => { if (confirm("Eliminare questa preparazione?")) del.mutate(p.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </div>
      )}

      {reports.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Report visite ({reports.length})</h4>
          {reports.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{new Date(r.data_visita).toLocaleDateString("it-IT")}{r.esito && ` · ${r.esito}`}</div>
                  <div className="flex gap-1">
                    {r.ordine_preso && <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Ordine €{Number(r.valore_ordine).toFixed(2)}</Badge>}
                    {r.interesse_cliente && <Badge variant="outline">{r.interesse_cliente}</Badge>}
                  </div>
                </div>
                {r.prossima_azione && <div className="text-xs"><strong>Prossima azione:</strong> {r.prossima_azione}{r.data_follow_up && ` (entro ${new Date(r.data_follow_up).toLocaleDateString("it-IT")})`}</div>}
                {r.obiezioni && <div className="text-xs text-muted-foreground"><strong>Obiezioni:</strong> {r.obiezioni}</div>}
                {Array.isArray(r.concorrenza_rilevata) && r.concorrenza_rilevata.length > 0 && (
                  <div className="text-xs"><strong>Concorrenza:</strong> {r.concorrenza_rilevata.map((c: any) => `${c.nome}${c.prezzo_acquisto ? ` €${c.prezzo_acquisto}` : ""}`).join(", ")}</div>
                )}
                {r.note && <div className="text-xs text-muted-foreground italic">{r.note}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <VisitReportDialog open={reportOpen} onOpenChange={setReportOpen} clienteId={clienteId} visitPreparationId={reportPrepId} />
    </div>
  );
}
