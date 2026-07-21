import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles, Link2, Check } from "lucide-react";
import {
  useCreaSegnalazione, useAggiornaSegnalazione,
  type Segnalazione, type SegnalazioneTipo, type SegnalazioneStato, type SegnalazionePriorita,
  STATO_LABEL,
} from "@/hooks/useSegnalazioni";
import { trovaCandidatiSegnalazione, type MatchCandidato } from "@/lib/segnalazioniMatch";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tipoDefault?: SegnalazioneTipo;
  editing?: Segnalazione | null;
};

const STATI: SegnalazioneStato[] = [
  "da_gestire","in_lavorazione","richiesta","sollecitata",
  "approvata","emessa","ricevuta","chiusa","respinta",
];

export function SegnalazioneDialog({ open, onOpenChange, tipoDefault = "reclamo", editing }: Props) {
  const isEdit = !!editing;
  const [tipo, setTipo] = useState<SegnalazioneTipo>(editing?.tipo ?? tipoDefault);
  const [oggetto, setOggetto] = useState(editing?.oggetto ?? "");
  const [descrizione, setDescrizione] = useState(editing?.descrizione ?? "");
  const [causa, setCausa] = useState(editing?.causa ?? "");
  const [priorita, setPriorita] = useState<SegnalazionePriorita>(editing?.priorita ?? "media");
  const [stato, setStato] = useState<SegnalazioneStato>(editing?.stato ?? "da_gestire");
  const [importoRichiesto, setImportoRichiesto] = useState<string>(String(editing?.importo_richiesto ?? ""));
  const [importoRiconosciuto, setImportoRiconosciuto] = useState<string>(String(editing?.importo_riconosciuto ?? ""));
  const [responsabile, setResponsabile] = useState(editing?.responsabile ?? "");
  const [scadenza, setScadenza] = useState(editing?.scadenza ?? "");
  const [numeroNC, setNumeroNC] = useState(editing?.numero_nota_credito ?? "");
  const [dataNC, setDataNC] = useState(editing?.data_emissione_nc ?? "");
  const [soluzione, setSoluzione] = useState(editing?.soluzione ?? "");

  // Matching
  const [clienteHint, setClienteHint] = useState("");
  const [codiceHint, setCodiceHint] = useState("");
  const [importoHint, setImportoHint] = useState("");
  const [candidati, setCandidati] = useState<MatchCandidato[]>([]);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [sel, setSel] = useState<{
    ordine_id: string | null; cliente_id: string | null; azienda_id: string | null;
    ordine_codice?: string | null; cliente_nome?: string | null; azienda_nome?: string | null;
  }>({
    ordine_id: editing?.ordine_id ?? null,
    cliente_id: editing?.cliente_id ?? null,
    azienda_id: editing?.azienda_id ?? null,
    ordine_codice: editing?.ordini?.codice ?? null,
    cliente_nome: editing?.clienti?.nome ?? null,
    azienda_nome: editing?.aziende?.nome ?? null,
  });

  const crea = useCreaSegnalazione();
  const aggiorna = useAggiornaSegnalazione();
  const isLoading = crea.isPending || aggiorna.isPending;

  const trovaMatch = async () => {
    setLoadingMatch(true);
    try {
      const res = await trovaCandidatiSegnalazione({
        cliente_hint: clienteHint || oggetto,
        testo: descrizione,
        ordine_codice_hint: codiceHint || null,
        importo_hint: importoHint ? Number(importoHint) : null,
      });
      setCandidati(res);
      if (res.length === 0) toast.info("Nessun candidato trovato — inserisci più dettagli");
    } finally {
      setLoadingMatch(false);
    }
  };

  const scegli = (c: MatchCandidato) => {
    setSel({
      ordine_id: c.ordine_id ?? null,
      cliente_id: c.cliente_id ?? null,
      azienda_id: c.azienda_id ?? null,
      ordine_codice: c.ordine_codice,
      cliente_nome: c.cliente_nome,
      azienda_nome: c.azienda_nome,
    });
  };

  const salva = async () => {
    if (!oggetto.trim()) { toast.error("Oggetto richiesto"); return; }
    const payload = {
      tipo,
      oggetto,
      descrizione,
      causa,
      priorita,
      stato,
      importo_richiesto: importoRichiesto ? Number(importoRichiesto) : 0,
      importo_riconosciuto: importoRiconosciuto ? Number(importoRiconosciuto) : 0,
      responsabile: responsabile || null,
      scadenza: scadenza || null,
      cliente_id: sel.cliente_id,
      azienda_id: sel.azienda_id,
      ordine_id: sel.ordine_id,
      numero_nota_credito: numeroNC || null,
      data_emissione_nc: dataNC || null,
      soluzione: soluzione || null,
    };
    try {
      if (isEdit && editing) {
        await aggiorna.mutateAsync({ id: editing.id, patch: payload });
      } else {
        await crea.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifica pratica" : "Nuova pratica"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as SegnalazioneTipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="reclamo">Reclamo</SelectItem>
                  <SelectItem value="nota_credito">Nota di credito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priorità</Label>
              <Select value={priorita} onValueChange={(v) => setPriorita(v as SegnalazionePriorita)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bassa">Bassa</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Oggetto *</Label>
            <Input value={oggetto} onChange={(e) => setOggetto(e.target.value)} placeholder="Es. Bottiglie rotte consegna Polara 12/07" />
          </div>

          <div>
            <Label>Descrizione</Label>
            <Textarea rows={3} value={descrizione ?? ""} onChange={(e) => setDescrizione(e.target.value)} placeholder="Descrivi il problema o la richiesta" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Causa</Label>
              <Input value={causa ?? ""} onChange={(e) => setCausa(e.target.value)} placeholder="Es. Trasporto, prezzo errato, prodotto difettoso" />
            </div>
            <div>
              <Label>Responsabile</Label>
              <Input value={responsabile ?? ""} onChange={(e) => setResponsabile(e.target.value)} placeholder="Chi segue la pratica" />
            </div>
          </div>

          {/* MATCHING */}
          <Card className="p-3 bg-surface-glass border-border/40 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Collega ordine / cliente / azienda</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input placeholder="Nome cliente" value={clienteHint} onChange={(e) => setClienteHint(e.target.value)} />
              <Input placeholder="Codice ordine (ORD-...)" value={codiceHint} onChange={(e) => setCodiceHint(e.target.value)} />
              <Input placeholder="Importo €" inputMode="decimal" value={importoHint} onChange={(e) => setImportoHint(e.target.value)} />
            </div>
            <Button size="sm" variant="outline" onClick={trovaMatch} disabled={loadingMatch}>
              {loadingMatch ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
              Cerca corrispondenze nel CRM
            </Button>

            {sel.ordine_id || sel.cliente_id ? (
              <div className="text-xs bg-success/10 border border-success/30 rounded p-2 flex items-start gap-2">
                <Check className="h-3.5 w-3.5 text-success mt-0.5" />
                <div>
                  <div className="font-semibold text-success">Collegato</div>
                  <div className="text-muted-foreground">
                    {sel.ordine_codice && <>Ordine <b>{sel.ordine_codice}</b> · </>}
                    {sel.cliente_nome && <>Cliente <b>{sel.cliente_nome}</b> · </>}
                    {sel.azienda_nome && <>Azienda <b>{sel.azienda_nome}</b></>}
                  </div>
                  <button className="text-destructive underline mt-1" onClick={() => setSel({ ordine_id: null, cliente_id: null, azienda_id: null })}>
                    Rimuovi collegamento
                  </button>
                </div>
              </div>
            ) : null}

            {candidati.length > 0 && (
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {candidati.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => scegli(c)}
                    className="w-full text-left text-xs p-2 rounded border border-border/50 hover:bg-primary/10 hover:border-primary/40 transition"
                  >
                    <div className="flex justify-between gap-2">
                      <div>
                        <div className="font-semibold">{c.ordine_codice || "—"} · {c.cliente_nome || "—"}</div>
                        <div className="text-muted-foreground">{c.azienda_nome || "—"} · {c.data_ordine ?? ""} {c.totale != null ? `· €${c.totale.toFixed(2)}` : ""}</div>
                        <div className="text-muted-foreground italic mt-0.5">{c.motivi.join(" · ")}</div>
                      </div>
                      <Badge variant="outline" className={c.score >= 80 ? "bg-success/15 text-success border-success/30" : c.score >= 50 ? "bg-warning/15 text-warning border-warning/30" : "bg-muted"}>
                        {c.score}%
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Importo richiesto €</Label>
              <Input inputMode="decimal" value={importoRichiesto} onChange={(e) => setImportoRichiesto(e.target.value)} />
            </div>
            <div>
              <Label>Importo riconosciuto €</Label>
              <Input inputMode="decimal" value={importoRiconosciuto} onChange={(e) => setImportoRiconosciuto(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Stato</Label>
              <Select value={stato} onValueChange={(v) => setStato(v as SegnalazioneStato)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATI.map((s) => <SelectItem key={s} value={s}>{STATO_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scadenza</Label>
              <Input type="date" value={scadenza ?? ""} onChange={(e) => setScadenza(e.target.value)} />
            </div>
          </div>

          {tipo === "nota_credito" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Numero NC</Label>
                <Input value={numeroNC ?? ""} onChange={(e) => setNumeroNC(e.target.value)} />
              </div>
              <div>
                <Label>Data emissione NC</Label>
                <Input type="date" value={dataNC ?? ""} onChange={(e) => setDataNC(e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <Label>Soluzione / esito</Label>
            <Textarea rows={2} value={soluzione ?? ""} onChange={(e) => setSoluzione(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={salva} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Salva modifiche" : "Crea pratica"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
