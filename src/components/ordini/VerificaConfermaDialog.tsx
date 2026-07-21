import { useEffect, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertCircle, CheckCircle2, FileSearch, Loader2, Upload, XCircle, MinusCircle, PlusCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { confrontaOrdine, type ConfrontoEsito, type MatchStato, type PDFRiga } from "@/lib/orderMatchEngine";
import { loadCRMRighe, useOrdineConferme, useSaveOrdineConferma } from "@/hooks/useOrdiniConferme";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ordineId: string | null;
  ordineCodice?: string;
}

const STATO_LABEL: Record<MatchStato, { label: string; cls: string; icon: any }> = {
  ok: { label: "OK", cls: "bg-green-600/20 text-green-500 border-green-600/40", icon: CheckCircle2 },
  qta_diff: { label: "Quantità diversa", cls: "bg-red-600/20 text-red-500 border-red-600/40", icon: XCircle },
  prezzo_diff: { label: "Prezzo diverso", cls: "bg-red-600/20 text-red-500 border-red-600/40", icon: XCircle },
  sconto_diff: { label: "Sconto diverso", cls: "bg-yellow-600/20 text-yellow-500 border-yellow-600/40", icon: AlertCircle },
  omaggio_diff: { label: "Omaggio diverso", cls: "bg-red-600/20 text-red-500 border-red-600/40", icon: XCircle },
  mancante_in_conferma: { label: "Mancante in conferma", cls: "bg-red-600/20 text-red-500 border-red-600/40", icon: MinusCircle },
  extra_in_conferma: { label: "Extra in conferma", cls: "bg-orange-600/20 text-orange-500 border-orange-600/40", icon: PlusCircle },
  sostituito: { label: "Sostituito", cls: "bg-blue-600/20 text-blue-500 border-blue-600/40", icon: AlertCircle },
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const s = (r.result as string) || "";
      res(s.split(",")[1] ?? s);
    };
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function VerificaConfermaDialog({ open, onOpenChange, ordineId, ordineCodice }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [esito, setEsito] = useState<ConfrontoEsito | null>(null);
  const [sorgente, setSorgente] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const save = useSaveOrdineConferma();
  const { data: precedenti = [] } = useOrdineConferme(ordineId ?? undefined);

  useEffect(() => {
    if (!open) {
      setEsito(null);
      setSorgente(null);
      setNote("");
    }
  }, [open]);

  const handleFile = async (file: File) => {
    if (!ordineId) return;
    try {
      setParsing(true);
      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("parse-order-multi", {
        body: { fileBase64: base64, mimeType: file.type, filename: file.name },
      });
      if (error) throw error;
      const ordini = (data as any)?.data?.ordini ?? [];
      if (!ordini.length) throw new Error("Nessun ordine trovato nel documento");
      // usa il primo ordine estratto (ne può contenere uno solo tipicamente)
      const pdfRighe: PDFRiga[] = (ordini[0].righe ?? []).map((r: any) => ({
        codice_prodotto: r.codice_prodotto ?? null,
        nome_prodotto: r.nome_prodotto ?? "",
        quantita_cartoni: Number(r.quantita_cartoni ?? 0),
        pezzi_per_cartone: Number(r.pezzi_per_cartone ?? 0),
        prezzo_per_cartone: Number(r.prezzo_per_cartone ?? 0),
        sc1: Number(r.sc1 ?? 0),
        sc2: Number(r.sc2 ?? 0),
        sc3: Number(r.sc3 ?? 0),
        is_omaggio: !!r.is_omaggio,
        importo_riga: Number(r.importo_riga ?? 0),
      }));

      const crmRighe = await loadCRMRighe(ordineId);
      const cfr = confrontaOrdine(crmRighe, pdfRighe);
      setEsito(cfr);
      setSorgente(file.name);
    } catch (e: any) {
      toast.error("Errore analisi: " + e.message);
    } finally {
      setParsing(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const salva = (verificato = false) => {
    if (!esito || !ordineId) return;
    save.mutate(
      {
        ordine_id: ordineId,
        nome_sorgente: sorgente,
        esito,
        note: note.trim() || null,
        verificato_manualmente: verificato,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const scorePct = esito ? Math.round(esito.score * 100) : 0;
  const scoreColor =
    scorePct >= 90 ? "text-green-500" : scorePct >= 60 ? "text-yellow-500" : "text-red-500";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-primary" />
            Verifica conferma azienda {ordineCodice ? `— ${ordineCodice}` : ""}
          </DialogTitle>
          <DialogDescription>
            Carica il PDF o Excel di conferma inviato dall'azienda: lo confronto riga per riga con l'ordine CRM.
          </DialogDescription>
        </DialogHeader>

        {!esito && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/60 transition-colors cursor-pointer"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf,.xlsx,.xls,image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              {parsing ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div className="text-sm text-muted-foreground">Analisi documento in corso…</div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-primary" />
                  <div className="font-medium">Carica conferma d'ordine</div>
                  <div className="text-sm text-muted-foreground">PDF, Excel o immagine</div>
                </div>
              )}
            </div>

            {precedenti.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Verifiche precedenti</div>
                <div className="space-y-2">
                  {precedenti.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded border border-border text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{Math.round(Number(p.score) * 100)}%</Badge>
                        <span>{p.nome_sorgente ?? "—"}</span>
                        {p.verificato_manualmente && (
                          <Badge className="bg-green-600/20 text-green-500 border-green-600/40">
                            verificata
                          </Badge>
                        )}
                      </div>
                      <span className="text-muted-foreground">
                        {format(new Date(p.created_at), "dd MMM yyyy HH:mm", { locale: it })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {esito && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatBox label="Score" value={`${scorePct}%`} className={scoreColor} />
              <StatBox label="OK" value={String(esito.righe_ok)} className="text-green-500" />
              <StatBox label="Differenze" value={String(esito.righe_diff)} className="text-yellow-500" />
              <StatBox label="Mancanti" value={String(esito.righe_mancanti)} className="text-red-500" />
              <StatBox label="Extra" value={String(esito.righe_extra)} className="text-orange-500" />
            </div>
            <Progress value={scorePct} />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div className="p-2 rounded border border-border">
                <div className="text-muted-foreground text-xs">Totale CRM</div>
                <div className="font-semibold">€ {esito.totale_crm.toFixed(2)}</div>
              </div>
              <div className="p-2 rounded border border-border">
                <div className="text-muted-foreground text-xs">Totale conferma</div>
                <div className="font-semibold">€ {esito.totale_pdf.toFixed(2)}</div>
              </div>
              <div className="p-2 rounded border border-border">
                <div className="text-muted-foreground text-xs">Δ conferma - CRM</div>
                <div className={`font-semibold ${Math.abs(esito.delta_totale) < 0.01 ? "" : "text-red-500"}`}>
                  € {esito.delta_totale.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stato</TableHead>
                    <TableHead>Prodotto</TableHead>
                    <TableHead className="text-right">Ct CRM</TableHead>
                    <TableHead className="text-right">Ct conferma</TableHead>
                    <TableHead className="text-right">€ CRM</TableHead>
                    <TableHead className="text-right">€ conferma</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {esito.righe.map((r, i) => {
                    const meta = STATO_LABEL[r.stato];
                    const Icon = meta.icon;
                    const nome = r.crm?.prodotto_nome || r.pdf?.nome_prodotto || "—";
                    return (
                      <TableRow
                        key={i}
                        className={
                          r.gravita === "error" ? "bg-red-500/5" : r.gravita === "warning" ? "bg-yellow-500/5" : ""
                        }
                      >
                        <TableCell>
                          <Badge className={meta.cls}>
                            <Icon className="h-3 w-3 mr-1" />
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate" title={nome}>{nome}</TableCell>
                        <TableCell className="text-right">{r.crm?.quantita_cartoni ?? "—"}</TableCell>
                        <TableCell className="text-right">{r.pdf?.quantita_cartoni ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          {r.crm ? `€ ${r.crm.prezzo_unitario.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.pdf ? `€ ${r.pdf.prezzo_per_cartone.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[240px]">
                          {r.differenze.join(" · ")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div>
              <Textarea
                placeholder="Note sulla verifica (opzionale)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {esito && (
            <>
              <Button variant="outline" onClick={() => { setEsito(null); setSorgente(null); }}>
                Analizza un altro file
              </Button>
              <Button variant="secondary" onClick={() => salva(false)} disabled={save.isPending}>
                Salva esito
              </Button>
              <Button onClick={() => salva(true)} disabled={save.isPending}>
                {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salva e segna come verificato
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="p-3 rounded-lg border border-border bg-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold ${className ?? ""}`}>{value}</div>
    </div>
  );
}
