import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Percent, Users2, BookUser } from "lucide-react";
import { useAziende } from "@/hooks/useAziende";
import { useClienti } from "@/hooks/useClienti";
import { useProdotti } from "@/hooks/useProdotti";
import { useProvvigioniCondizioni, useUpsertCondizione, useDeleteCondizione, type CondizioneProvvigione } from "@/hooks/useProvvigioniCondizioni";
import { useClientiAlias, useUpsertAlias, useDeleteAlias, type ClienteAlias } from "@/hooks/useClientiAlias";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function CondizioneDialog({
  open, onOpenChange, iniziale, aziendaFiltro,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  iniziale?: Partial<CondizioneProvvigione>;
  aziendaFiltro?: string;
}) {
  const { data: aziende = [] } = useAziende();
  const { data: clienti = [] } = useClienti();
  const { data: prodotti = [] } = useProdotti();
  const upsert = useUpsertCondizione();

  const [aziendaId, setAziendaId] = useState(iniziale?.azienda_id || aziendaFiltro || "");
  const [clienteId, setClienteId] = useState(iniziale?.cliente_id || "");
  const [prodottoId, setProdottoId] = useState(iniziale?.prodotto_id || "");
  const [percentuale, setPercentuale] = useState(String(iniziale?.percentuale ?? ""));
  const [calcoloSu, setCalcoloSu] = useState<"lordo" | "netto" | "imponibile_fattura">(iniziale?.calcolo_su || "netto");
  const [arrotondamento, setArrotondamento] = useState<"nessuno" | "2dec" | "intero">(iniziale?.arrotondamento || "nessuno");
  const [validoDa, setValidoDa] = useState(iniziale?.valido_da || new Date().toISOString().slice(0, 10));
  const [validoA, setValidoA] = useState(iniziale?.valido_a || "");
  const [priorita, setPriorita] = useState(String(iniziale?.priorita ?? 0));
  const [note, setNote] = useState(iniziale?.note || "");

  const clientiAzienda = clienti.filter(c => !aziendaId || (c as any).azienda_id === aziendaId);

  const submit = async () => {
    if (!aziendaId || !percentuale) { return; }
    await upsert.mutateAsync({
      id: iniziale?.id,
      azienda_id: aziendaId,
      cliente_id: clienteId || null,
      prodotto_id: prodottoId || null,
      percentuale: parseFloat(percentuale),
      calcolo_su: calcoloSu,
      arrotondamento,
      valido_da: validoDa,
      valido_a: validoA || null,
      priorita: parseInt(priorita) || 0,
      note: note || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{iniziale?.id ? "Modifica condizione" : "Nuova condizione provvigione"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Azienda *</Label>
              <Select value={aziendaId} onValueChange={setAziendaId}>
                <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
                <SelectContent>
                  {aziende.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Percentuale % *</Label>
              <Input type="number" step="0.001" value={percentuale} onChange={e => setPercentuale(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cliente (opzionale)</Label>
              <Select value={clienteId || "all"} onValueChange={v => setClienteId(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i clienti</SelectItem>
                  {clientiAzienda.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prodotto (opzionale)</Label>
              <Select value={prodottoId || "all"} onValueChange={v => setProdottoId(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i prodotti</SelectItem>
                  {prodotti.filter(p => !aziendaId || p.azienda_id === aziendaId).map(p =>
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valido da *</Label>
              <Input type="date" value={validoDa} onChange={e => setValidoDa(e.target.value)} />
            </div>
            <div>
              <Label>Valido a (opzionale)</Label>
              <Input type="date" value={validoA} onChange={e => setValidoA(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Calcolo su</Label>
              <Select value={calcoloSu} onValueChange={(v: any) => setCalcoloSu(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="netto">Netto (dopo sconti)</SelectItem>
                  <SelectItem value="lordo">Lordo (listino)</SelectItem>
                  <SelectItem value="imponibile_fattura">Imponibile fattura</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Arrotondamento</Label>
              <Select value={arrotondamento} onValueChange={(v: any) => setArrotondamento(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nessuno">Nessuno</SelectItem>
                  <SelectItem value="2dec">2 decimali</SelectItem>
                  <SelectItem value="intero">Intero</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priorità</Label>
              <Input type="number" value={priorita} onChange={e => setPriorita(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Note</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={submit} disabled={upsert.isPending || !aziendaId || !percentuale}>Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AliasDialog({
  open, onOpenChange, iniziale,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  iniziale?: Partial<ClienteAlias>;
}) {
  const { data: clienti = [] } = useClienti();
  const { data: aziende = [] } = useAziende();
  const upsert = useUpsertAlias();

  const [clienteId, setClienteId] = useState(iniziale?.cliente_id || "");
  const [aziendaId, setAziendaId] = useState(iniziale?.azienda_id || "");
  const [codice, setCodice] = useState(iniziale?.codice_cliente_aziendale || "");
  const [denom, setDenom] = useState(iniziale?.denominazione_alternativa || "");
  const [piva, setPiva] = useState(iniziale?.partita_iva || "");
  const [cf, setCf] = useState(iniziale?.codice_fiscale || "");
  const [note, setNote] = useState(iniziale?.note || "");

  const submit = async () => {
    if (!clienteId) return;
    await upsert.mutateAsync({
      id: iniziale?.id,
      cliente_id: clienteId,
      azienda_id: aziendaId || null,
      codice_cliente_aziendale: codice || null,
      denominazione_alternativa: denom || null,
      partita_iva: piva || null,
      codice_fiscale: cf || null,
      note: note || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{iniziale?.id ? "Modifica alias cliente" : "Nuovo alias cliente"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label>Cliente CRM *</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
              <SelectContent>
                {clienti.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}{c.azienda ? ` — ${c.azienda}` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Azienda mandante (opzionale)</Label>
            <Select value={aziendaId || "all"} onValueChange={v => setAziendaId(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte</SelectItem>
                {aziende.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Codice cliente aziendale</Label><Input value={codice} onChange={e => setCodice(e.target.value)} /></div>
            <div><Label>Partita IVA</Label><Input value={piva} onChange={e => setPiva(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Denominazione alternativa</Label><Input value={denom} onChange={e => setDenom(e.target.value)} /></div>
            <div><Label>Codice fiscale</Label><Input value={cf} onChange={e => setCf(e.target.value)} /></div>
          </div>
          <div><Label>Note</Label><Textarea rows={2} value={note} onChange={e => setNote(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={submit} disabled={upsert.isPending || !clienteId}>Salva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MatriceProvvigioniSection() {
  const { data: aziende = [] } = useAziende();
  const [aziendaFiltro, setAziendaFiltro] = useState<string>("");
  const { data: condizioni = [], isLoading } = useProvvigioniCondizioni(aziendaFiltro || undefined);
  const { data: alias = [] } = useClientiAlias();
  const del = useDeleteCondizione();
  const delAlias = useDeleteAlias();

  const [dlgOpen, setDlgOpen] = useState(false);
  const [editing, setEditing] = useState<CondizioneProvvigione | undefined>();

  const [aliasDlg, setAliasDlg] = useState(false);
  const [editingAlias, setEditingAlias] = useState<ClienteAlias | undefined>();

  const scopeBadge = (c: CondizioneProvvigione) => {
    if (c.cliente_id && c.prodotto_id) return <Badge variant="secondary">Cliente + Prodotto</Badge>;
    if (c.cliente_id) return <Badge variant="secondary">Cliente</Badge>;
    if (c.prodotto_id) return <Badge variant="secondary">Prodotto</Badge>;
    return <Badge variant="outline">Base azienda</Badge>;
  };

  return (
    <Tabs defaultValue="condizioni" className="space-y-4">
      <TabsList>
        <TabsTrigger value="condizioni" className="gap-2"><Percent className="h-4 w-4" /> Condizioni</TabsTrigger>
        <TabsTrigger value="alias" className="gap-2"><BookUser className="h-4 w-4" /> Rubrica clienti</TabsTrigger>
      </TabsList>

      <TabsContent value="condizioni" className="space-y-3">
        <Card className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2">
              <Users2 className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm">Filtra per azienda</Label>
              <Select value={aziendaFiltro || "all"} onValueChange={v => setAziendaFiltro(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte</SelectItem>
                  {aziende.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => { setEditing(undefined); setDlgOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Nuova condizione
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Il sistema applica sempre la condizione più specifica valida alla data dell'ordine
            (cliente+prodotto → cliente → prodotto → base azienda). Aggiornando la matrice, le provvigioni previste degli ordini vengono ricalcolate ai prossimi cambi ordine.
          </div>
        </Card>

        <Card className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Azienda</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Prodotto</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead>Calcolo</TableHead>
                <TableHead>Valido da</TableHead>
                <TableHead>Valido a</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Caricamento…</TableCell></TableRow>}
              {!isLoading && condizioni.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">Nessuna condizione configurata</TableCell></TableRow>
              )}
              {condizioni.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.aziende?.nome || "—"}</TableCell>
                  <TableCell>{scopeBadge(c)}</TableCell>
                  <TableCell className="text-sm">{c.clienti?.nome || <span className="text-muted-foreground">tutti</span>}</TableCell>
                  <TableCell className="text-sm">{c.prodotti?.nome || <span className="text-muted-foreground">tutti</span>}</TableCell>
                  <TableCell className="text-right font-semibold">{Number(c.percentuale).toFixed(2)}%</TableCell>
                  <TableCell className="text-xs uppercase text-muted-foreground">{c.calcolo_su}</TableCell>
                  <TableCell className="text-sm">{c.valido_da}</TableCell>
                  <TableCell className="text-sm">{c.valido_a || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setDlgOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => del.mutate(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </TabsContent>

      <TabsContent value="alias" className="space-y-3">
        <Card className="p-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Associa denominazioni, codici cliente e partite IVA usati dalle aziende mandanti ai clienti del CRM.
            Il motore di riconciliazione userà questi alias per abbinare automaticamente le righe dell'estratto.
          </div>
          <Button onClick={() => { setEditingAlias(undefined); setAliasDlg(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Nuovo alias
          </Button>
        </Card>
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente CRM</TableHead>
                <TableHead>Azienda</TableHead>
                <TableHead>Codice</TableHead>
                <TableHead>Denominazione alt.</TableHead>
                <TableHead>P.IVA</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alias.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nessun alias configurato</TableCell></TableRow>
              )}
              {alias.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.clienti?.nome}</TableCell>
                  <TableCell className="text-sm">{a.aziende?.nome || <span className="text-muted-foreground">tutte</span>}</TableCell>
                  <TableCell className="text-sm font-mono">{a.codice_cliente_aziendale || "—"}</TableCell>
                  <TableCell className="text-sm">{a.denominazione_alternativa || "—"}</TableCell>
                  <TableCell className="text-sm font-mono">{a.partita_iva || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditingAlias(a); setAliasDlg(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => delAlias.mutate(a.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </TabsContent>

      {dlgOpen && <CondizioneDialog open={dlgOpen} onOpenChange={setDlgOpen} iniziale={editing} aziendaFiltro={aziendaFiltro} />}
      {aliasDlg && <AliasDialog open={aliasDlg} onOpenChange={setAliasDlg} iniziale={editingAlias} />}
    </Tabs>
  );
}
