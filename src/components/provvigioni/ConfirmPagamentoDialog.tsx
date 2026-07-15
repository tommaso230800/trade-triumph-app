import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { EstrattoDoc, EstrattoRiga, useConfirmPagamento } from "@/hooks/useRiconciliazione";

const METODI = [
  { v: "bonifico", l: "Bonifico bancario" },
  { v: "assegno", l: "Assegno" },
  { v: "compensazione", l: "Compensazione" },
  { v: "contanti", l: "Contanti" },
  { v: "altro", l: "Altro" },
];

function formatEuro(n: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n || 0);
}

export function ConfirmPagamentoDialog({
  open, onOpenChange, estratto, righe, allRighe, onSaved,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  estratto: EstrattoDoc;
  righe: EstrattoRiga[]; // selezionate
  allRighe: EstrattoRiga[];
  onSaved?: (res: { pagamentoId: string; aziendaId: string | null; anno: number; trimestre: number }) => void;
}) {
  const confirm = useConfirmPagamento();
  const totaleSelezionato = useMemo(() => righe.reduce((s, r) => s + (Number(r.provvigione) || 0), 0), [righe]);
  const [tipo, setTipo] = useState<"completo" | "parziale">("completo");
  const [dataPag, setDataPag] = useState<string>(new Date().toISOString().slice(0, 10));
  const [importo, setImporto] = useState<number>(totaleSelezionato);
  const [metodo, setMetodo] = useState<string>("bonifico");
  const [rif, setRif] = useState("");
  const [note, setNote] = useState("");
  const [ripartizione, setRipartizione] = useState<Record<string, number>>({});
  const [risultato, setRisultato] = useState<any>(null);

  const anomalie = allRighe.filter((r) => r.crm_only || r.match_status === "mancante_crm" || r.match_status === "multipli").length;
  const bonusSel = righe.filter((r) => r.match_status === "bonus" || r.match_status === "straordinaria" || (r.tipo_movimento && r.tipo_movimento !== "ordinaria")).length;
  const escluse = allRighe.filter((r) => !r.crm_only && !righe.find((x) => x.id === r.id)).length;

  const resetAndClose = () => {
    setRisultato(null);
    setTipo("completo");
    setImporto(totaleSelezionato);
    setRipartizione({});
    setNote(""); setRif("");
    onOpenChange(false);
  };

  const submit = async () => {
    if (!dataPag) return;
    try {
      const res = await confirm.mutateAsync({
        estratto,
        righeIds: righe.map((r) => r.id),
        data_pagamento: dataPag,
        importo_totale: importo,
        metodo_pagamento: metodo,
        riferimento_pagamento: rif || undefined,
        note: note || undefined,
        tipo_pagamento: tipo,
        ripartizione: tipo === "parziale" ? ripartizione : undefined,
      });
      setRisultato(res);
      onSaved?.({ pagamentoId: res.pagamentoId, aziendaId: res.aziendaId, anno: res.anno, trimestre: res.trimestre });
    } catch { /* toast handled */ }
  };

  return (
    <Dialog open={open} onOpenChange={(b) => { if (!b) resetAndClose(); else onOpenChange(true); }}>
      <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
        {!risultato ? (
          <>
            <DialogHeader>
              <DialogTitle>Conferma pagamento provvigioni</DialogTitle>
              <DialogDescription>
                Le righe selezionate verranno segnate come pagate nel tabulato principale. L'operazione è idempotente: righe già pagate non verranno duplicate.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm border rounded-lg p-3 bg-muted/30">
              <div><div className="text-xs text-muted-foreground">Azienda</div><div className="font-medium">{estratto.aziende?.nome || "—"}</div></div>
              <div><div className="text-xs text-muted-foreground">Periodo</div><div className="font-medium">{estratto.anno} · T{estratto.trimestre}</div></div>
              <div><div className="text-xs text-muted-foreground">Documento</div><div className="font-medium truncate">{estratto.file_name || "—"}</div></div>
              <div><div className="text-xs text-muted-foreground">Righe selezionate</div><div className="font-medium">{righe.length} · {formatEuro(totaleSelezionato)}</div></div>
              <div><div className="text-xs text-muted-foreground">Bonus/conguagli</div><div className="font-medium">{bonusSel}</div></div>
              <div><div className="text-xs text-muted-foreground">Righe escluse</div><div className="font-medium">{escluse}</div></div>
              <div className="col-span-2"><div className="text-xs text-muted-foreground">Anomalie ancora aperte</div><div className={`font-medium ${anomalie > 0 ? "text-orange-600" : ""}`}>{anomalie > 0 ? <><AlertTriangle className="h-3 w-3 inline mr-1" />{anomalie}</> : "Nessuna"}</div></div>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Tipo pagamento</Label>
                <RadioGroup value={tipo} onValueChange={(v: any) => { setTipo(v); if (v === "completo") setImporto(totaleSelezionato); }} className="flex gap-4 mt-1">
                  <div className="flex items-center gap-2"><RadioGroupItem value="completo" id="tp-c" /><label htmlFor="tp-c" className="text-sm">Pagamento completo</label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="parziale" id="tp-p" /><label htmlFor="tp-p" className="text-sm">Pagamento parziale</label></div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Data pagamento *</Label>
                  <Input type="date" value={dataPag} onChange={(e) => setDataPag(e.target.value)} required />
                </div>
                <div>
                  <Label>Importo ricevuto</Label>
                  <Input type="number" step="0.01" value={importo} onChange={(e) => setImporto(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Metodo pagamento</Label>
                  <Select value={metodo} onValueChange={setMetodo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{METODI.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Riferimento bonifico / documento</Label>
                  <Input value={rif} onChange={(e) => setRif(e.target.value)} placeholder="Opzionale" />
                </div>
                <div className="md:col-span-1">
                  <Label>Residuo previsto</Label>
                  <Input readOnly value={formatEuro(Math.max(0, totaleSelezionato - importo))} />
                </div>
                <div className="md:col-span-3">
                  <Label>Note</Label>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Opzionale" />
                </div>
              </div>

              {tipo === "parziale" && (
                <div className="border rounded p-2 max-h-64 overflow-y-auto">
                  <div className="text-xs font-medium mb-2">Ripartizione importo per riga</div>
                  {righe.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 py-1 text-sm">
                      <div className="flex-1 truncate">{r.cliente_nome || "—"} · {r.numero_fattura || r.numero_ordine || "—"}</div>
                      <div className="text-xs text-muted-foreground w-24 text-right">di {formatEuro(Number(r.provvigione) || 0)}</div>
                      <Input
                        type="number" step="0.01" className="w-28"
                        value={ripartizione[r.id] ?? (Number(r.provvigione) || 0)}
                        onChange={(e) => setRipartizione((p) => ({ ...p, [r.id]: Number(e.target.value) }))}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={resetAndClose}>Annulla</Button>
              <Button onClick={submit} disabled={confirm.isPending || !dataPag || righe.length === 0}>
                {confirm.isPending ? "Salvataggio…" : `Conferma e segna come pagate — ${righe.length} righe, ${formatEuro(importo)}`}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" />Pagamento registrato</DialogTitle>
              <DialogDescription>Il tabulato principale delle Provvigioni è stato aggiornato.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <StatRow label="Provvigioni segnate come pagate" value={`${risultato.righeAggiornate - risultato.righeParziali}`} />
              <StatRow label="Parzialmente pagate" value={`${risultato.righeParziali}`} />
              <StatRow label="Ordini aggiornati" value={risultato.ordiniPagate} />
              <StatRow label="Movimenti creati (bonus/conguagli)" value={risultato.movimentiCreati} />
              <StatRow label="Già pagate in precedenza (saltate)" value={risultato.righeGiaPagate} />
              <StatRow label="Anomalie ancora aperte" value={anomalie} />
              <StatRow label="Righe escluse dal salvataggio" value={escluse} />
              <StatRow label="Importo totale" value={formatEuro(importo)} />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={resetAndClose}>Chiudi</Button>
              <Button onClick={() => { resetAndClose(); }}>
                Vai al tabulato delle provvigioni pagate
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between border rounded p-2 bg-card">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant="outline">{String(value)}</Badge>
    </div>
  );
}
