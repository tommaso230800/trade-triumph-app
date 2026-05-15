import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, FileText, Pencil, Save, X } from "lucide-react";
import { VisitPreparation, useUpdateVisitPreparation } from "@/hooks/useVisitPreparations";

interface Props { prep: VisitPreparation; defaultOpen?: boolean; onCompileReport?: () => void; }

const SECTIONS: Array<[keyof VisitPreparation, string]> = [
  ["riepilogo_cliente", "Riepilogo cliente"],
  ["storico_commerciale", "Storico commerciale"],
  ["analisi_concorrenza", "Analisi concorrenza"],
  ["obiettivo_visita", "Obiettivo visita"],
  ["proposta_consigliata", "Proposta consigliata"],
  ["argomenti_vendita", "Argomenti di vendita"],
  ["obiezioni_previste", "Obiezioni e risposte"],
  ["domande_consigliate", "Domande da fare"],
  ["prossima_azione", "Prossima azione"],
];

export function VisitPreparationView({ prep, defaultOpen, onCompileReport }: Props) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<any>(prep);
  const update = useUpdateVisitPreparation();

  const save = async () => {
    const patch: any = { id: prep.id };
    SECTIONS.forEach(([k]) => (patch[k] = draft[k]));
    await update.mutateAsync(patch);
    setEdit(false);
  };

  const priorita = prep.contenuto_completo?.priorita;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 cursor-pointer" onClick={() => setOpen((o) => !o)}>
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold truncate">Preparazione AI · {new Date(prep.created_at).toLocaleDateString("it-IT")}</div>
              <div className="text-xs text-muted-foreground">{prep.status.replace(/_/g, " ")}{priorita && ` · priorità ${priorita}`}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {priorita && <Badge variant="outline" className={priorita === "alta" ? "border-destructive/30 text-destructive" : ""}>{priorita}</Badge>}
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>

        {open && (
          <div className="mt-4 space-y-4">
            {prep.contenuto_completo?.motivo_priorita && (
              <div className="text-xs p-2 rounded-md bg-muted/40 border border-border"><strong>Motivo priorità:</strong> {prep.contenuto_completo.motivo_priorita}</div>
            )}
            {SECTIONS.map(([k, label]) => (
              <div key={k as string}>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
                {edit ? (
                  <Textarea rows={3} value={(draft as any)[k] || ""} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
                ) : (
                  <div className="text-sm whitespace-pre-wrap mt-1">{(prep as any)[k] || <span className="text-muted-foreground italic">—</span>}</div>
                )}
              </div>
            ))}

            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              {edit ? (
                <>
                  <Button size="sm" onClick={save} disabled={update.isPending}><Save className="h-4 w-4 mr-1" />Salva modifiche</Button>
                  <Button size="sm" variant="outline" onClick={() => { setDraft(prep); setEdit(false); }}><X className="h-4 w-4 mr-1" />Annulla</Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => setEdit(true)}><Pencil className="h-4 w-4 mr-1" />Modifica</Button>
                  {onCompileReport && <Button size="sm" onClick={onCompileReport}>Compila report visita</Button>}
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
