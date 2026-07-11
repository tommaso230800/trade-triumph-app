import { useEffect, useMemo, useRef, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Sparkles, Mic, MicOff, Loader2, Check, X, Pencil, Copy, Save,
  ChevronsUpDown, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useClienti } from "@/hooks/useClienti";
import { useAziende } from "@/hooks/useAziende";
import {
  useAnalizzaNota, useConfermaAzioni, useAttivitaRecenti,
  type AzioneProposta, type Priorita, type RisultatoAnalisi, type StatoAttivita, type TipoAttivita,
} from "@/hooks/useAssistenteAI";

const TIPO_LABEL: Record<TipoAttivita, string> = {
  visita_cliente: "Visita cliente",
  telefonata: "Telefonata",
  ordine: "Ordine",
  preventivo: "Preventivo",
  consegna: "Consegna",
  reclamo: "Reclamo",
  incasso: "Incasso",
  presentazione_prodotto: "Presentazione prodotto",
  follow_up: "Follow-up",
  altro: "Altro",
};

const PRIORITA_CLASS: Record<Priorita, string> = {
  bassa: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  media: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  alta: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  urgente: "bg-red-500/15 text-red-500 border-red-500/30",
};

const STATO_LABEL: Record<StatoAttivita, string> = {
  da_fare: "Da fare", in_corso: "In corso", completata: "Completata", annullata: "Annullata",
};

const AZIONE_LABEL: Record<AzioneProposta["tipo"], string> = {
  crea_visita: "Registra attività",
  crea_promemoria: "Crea promemoria",
  salva_bozza: "Salva bozza comunicazione",
};

// Web Speech API typings (permissive)
type SpeechRecognitionCtor = new () => any;
const SpeechRecognitionImpl: SpeechRecognitionCtor | undefined =
  (typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) || undefined;

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}
function fromDatetimeLocal(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function EntityCombobox({
  value, onChange, options, placeholder,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  options: { id: string; nome: string }[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          <span className="truncate">{selected?.nome ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[420px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Cerca..." />
          <CommandList>
            <CommandEmpty>Nessun risultato.</CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={() => { onChange(null); setOpen(false); }}>
                <span className="text-muted-foreground">— Nessuno —</span>
              </CommandItem>
              {options.map((o) => (
                <CommandItem key={o.id} value={o.nome} onSelect={() => { onChange(o.id); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", value === o.id ? "opacity-100" : "opacity-0")} />
                  {o.nome}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function AssistenteAI() {
  const [note, setNote] = useState("");
  const [risultato, setRisultato] = useState<RisultatoAnalisi | null>(null);
  const [logId, setLogId] = useState<string | null>(null);
  const [azioni, setAzioni] = useState<AzioneProposta[]>([]);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  const analizza = useAnalizzaNota();
  const conferma = useConfermaAzioni();
  const { data: recenti } = useAttivitaRecenti();
  const { data: clienti = [] } = useClienti();
  const { data: aziende = [] } = useAziende();

  const clientiOpt = useMemo(() => (clienti as any[]).map((c) => ({ id: c.id, nome: c.nome })), [clienti]);
  const aziendeOpt = useMemo(() => (aziende as any[]).map((a) => ({ id: a.id, nome: a.nome })), [aziende]);

  useEffect(() => () => { try { recRef.current?.stop?.(); } catch {} }, []);

  const toggleMic = () => {
    if (!SpeechRecognitionImpl) {
      toast.error("Riconoscimento vocale non supportato su questo browser");
      return;
    }
    if (listening) {
      try { recRef.current?.stop?.(); } catch {}
      setListening(false);
      return;
    }
    const rec = new SpeechRecognitionImpl();
    rec.lang = "it-IT";
    rec.continuous = true;
    rec.interimResults = true;
    let base = note ? note + " " : "";
    rec.onresult = (e: any) => {
      let finalT = "";
      let interimT = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalT += t + " ";
        else interimT += t;
      }
      if (finalT) { base += finalT; }
      setNote((base + interimT).trimStart());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const onAnalizza = async () => {
    if (note.trim().length < 5) { toast.error("Scrivi almeno qualche parola"); return; }
    const res = await analizza.mutateAsync(note.trim());
    setRisultato(res.risultato);
    setLogId(res.logId);
    setAzioni(res.risultato.azioni_proposte);
  };

  const updateRis = <K extends keyof RisultatoAnalisi>(k: K, v: RisultatoAnalisi[K]) => {
    setRisultato((r) => (r ? { ...r, [k]: v } : r));
  };

  const rimuoviAzione = (i: number) => setAzioni((a) => a.filter((_, idx) => idx !== i));

  const onCopiaBozza = async () => {
    if (!risultato?.bozza_comunicazione) return;
    await navigator.clipboard.writeText(risultato.bozza_comunicazione);
    toast.success("Bozza copiata");
  };

  const onConferma = async () => {
    if (!risultato || !logId) return;
    await conferma.mutateAsync({ logId, risultato, azioni });
    setRisultato(null); setLogId(null); setAzioni([]); setNote("");
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" /> Assistente AI
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Registra visite, crea promemoria e prepara comunicazioni
          </p>
        </div>

        {/* Input nota */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Scrivi cosa è successo durante una visita, una telefonata o una comunicazione con il cliente…"
                className="min-h-[180px] text-base pr-14 resize-y"
              />
              {SpeechRecognitionImpl && (
                <Button
                  type="button"
                  size="icon"
                  variant={listening ? "destructive" : "secondary"}
                  onClick={toggleMic}
                  className="absolute bottom-3 right-3 h-11 w-11 rounded-full shadow-md"
                  aria-label={listening ? "Ferma dettatura" : "Avvia dettatura"}
                >
                  {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
              )}
            </div>
            <Button
              onClick={onAnalizza}
              disabled={analizza.isPending || note.trim().length < 5}
              className="w-full h-12 text-base"
            >
              {analizza.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
              Analizza nota
            </Button>
          </CardContent>
        </Card>

        {/* Risultato */}
        {risultato && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Risultato dell'analisi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {risultato.informazioni_mancanti?.length > 0 && (
                <div className="flex gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-yellow-500" />
                  <div>
                    <div className="font-medium">Informazioni mancanti:</div>
                    <ul className="list-disc pl-5">
                      {risultato.informazioni_mancanti.map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Cliente</Label>
                  <EntityCombobox
                    value={risultato.cliente_id}
                    onChange={(v) => updateRis("cliente_id", v)}
                    options={clientiOpt}
                    placeholder={risultato.cliente_nome_suggerito ?? "Seleziona cliente"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Azienda mandante</Label>
                  <EntityCombobox
                    value={risultato.azienda_id}
                    onChange={(v) => updateRis("azienda_id", v)}
                    options={aziendeOpt}
                    placeholder={risultato.azienda_nome_suggerita ?? "Seleziona azienda"}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Tipo attività</Label>
                  <Select value={risultato.tipo_attivita} onValueChange={(v) => updateRis("tipo_attivita", v as TipoAttivita)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPO_LABEL).map(([k, l]) => (
                        <SelectItem key={k} value={k}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Data attività</Label>
                  <Input
                    type="datetime-local"
                    value={toDatetimeLocal(risultato.data_attivita)}
                    onChange={(e) => updateRis("data_attivita", fromDatetimeLocal(e.target.value) ?? risultato.data_attivita)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Priorità</Label>
                  <Select value={risultato.priorita} onValueChange={(v) => updateRis("priorita", v as Priorita)}>
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2.5 w-2.5 rounded-full",
                          risultato.priorita === "bassa" && "bg-emerald-500",
                          risultato.priorita === "media" && "bg-yellow-500",
                          risultato.priorita === "alta" && "bg-orange-500",
                          risultato.priorita === "urgente" && "bg-red-500")} />
                        <span className="capitalize">{risultato.priorita}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bassa">Bassa</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Stato</Label>
                  <Select value={risultato.stato} onValueChange={(v) => updateRis("stato", v as StatoAttivita)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATO_LABEL).map(([k, l]) => (
                        <SelectItem key={k} value={k}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Riepilogo</Label>
                <Textarea value={risultato.riepilogo} onChange={(e) => updateRis("riepilogo", e.target.value)} className="min-h-[80px]" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Prossima azione</Label>
                  <Input
                    value={risultato.prossima_azione ?? ""}
                    onChange={(e) => updateRis("prossima_azione", e.target.value || null)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Data e ora promemoria</Label>
                  <Input
                    type="datetime-local"
                    value={toDatetimeLocal(risultato.data_promemoria)}
                    onChange={(e) => updateRis("data_promemoria", fromDatetimeLocal(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Bozza comunicazione</Label>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={onCopiaBozza} disabled={!risultato.bozza_comunicazione}>
                      <Copy className="h-4 w-4 mr-1" /> Copia
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={risultato.bozza_comunicazione ?? ""}
                  onChange={(e) => updateRis("bozza_comunicazione", e.target.value || null)}
                  placeholder="Nessuna bozza generata"
                  className="min-h-[120px]"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Azioni proposte */}
        {risultato && azioni.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Azioni da confermare</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {azioni.map((a, i) => (
                <div key={i} className="flex flex-col sm:flex-row gap-3 rounded-lg border border-border p-3">
                  <div className="flex-1 min-w-0">
                    <Badge variant="secondary" className="mb-1">{AZIONE_LABEL[a.tipo]}</Badge>
                    <p className="text-sm">{a.descrizione}</p>
                  </div>
                  <div className="flex gap-2 sm:flex-col shrink-0">
                    <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={() => rimuoviAzione(i)}>
                      <X className="h-4 w-4 mr-1" /> Ignora
                    </Button>
                  </div>
                </div>
              ))}

              <Button onClick={onConferma} disabled={conferma.isPending || azioni.length === 0} className="w-full h-12 text-base">
                {conferma.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Check className="h-5 w-5 mr-2" />}
                Conferma tutte le azioni ({azioni.length})
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Attività recenti */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Attività recenti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(!recenti || recenti.length === 0) && (
              <p className="text-sm text-muted-foreground">Nessuna attività ancora registrata.</p>
            )}
            {recenti?.map((r: any) => {
              const ris = r.risultato_analisi as RisultatoAnalisi | null;
              return (
                <div key={r.id} className="rounded-lg border border-border p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge className={cn("border", PRIORITA_CLASS[ris?.priorita ?? "media"])}>
                        {ris?.priorita ?? "media"}
                      </Badge>
                      <Badge variant="outline">{ris ? TIPO_LABEL[ris.tipo_attivita] : "—"}</Badge>
                      <Badge variant="secondary" className="text-xs">{r.stato}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("it-IT")}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-2">{ris?.riepilogo ?? r.input_originale}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
