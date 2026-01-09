import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useCanvass, useCanvassAttive, useContrattiClienti, useCreateCanvass, useDeleteCanvass, useCreateContrattoCliente, useDeleteContrattoCliente, Canvass, ContrattoCliente } from "@/hooks/useCanvass";
import { useAziende } from "@/hooks/useAziende";
import { useClienti } from "@/hooks/useClienti";
import { useProdotti } from "@/hooks/useProdotti";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Percent, Tag, Trophy, Calendar, Building2, Users, Package, Trash2, AlertCircle, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { format, isWithinInterval, parseISO, differenceInDays, isAfter, isBefore } from "date-fns";
import { it } from "date-fns/locale";

const tipoConfig = {
  sconto_percentuale: { label: "Sconto %", icon: Percent, color: "bg-blue-100 text-blue-800" },
  prezzo_fisso: { label: "Prezzo Fisso", icon: Tag, color: "bg-green-100 text-green-800" },
  premio_fine_anno: { label: "Premio Fine Anno", icon: Trophy, color: "bg-amber-100 text-amber-800" },
};

const formatCurrency = (value: number) => 
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);

export default function CanvassPage() {
  const { data: canvass = [], isLoading: loadingCanvass } = useCanvass();
  const { data: canvassAttive = [] } = useCanvassAttive();
  const { data: contratti = [], isLoading: loadingContratti } = useContrattiClienti();
  const { data: aziende = [] } = useAziende();
  const { data: clienti = [] } = useClienti();
  const { data: prodotti = [] } = useProdotti();
  
  const createCanvass = useCreateCanvass();
  const deleteCanvass = useDeleteCanvass();
  const createContratto = useCreateContrattoCliente();
  const deleteContratto = useDeleteContrattoCliente();

  const [isPromoDialogOpen, setIsPromoDialogOpen] = useState(false);
  const [isContrattoDialogOpen, setIsContrattoDialogOpen] = useState(false);
  const [selectedAziendaId, setSelectedAziendaId] = useState<string>("");
  
  const [promoForm, setPromoForm] = useState({
    nome: "",
    descrizione: "",
    tipo: "sconto_percentuale" as "sconto_percentuale" | "prezzo_fisso" | "premio_fine_anno",
    valore: 0,
    data_inizio: "",
    data_fine: "",
    attivo: true,
    tutti_clienti: true,
    azienda_id: "",
    clienti_ids: [] as string[],
    prodotti: [] as { prodotto_id: string; valore_override?: number }[],
  });

  const [contrattoForm, setContrattoForm] = useState({
    cliente_id: "",
    azienda_id: "",
    anno: new Date().getFullYear(),
    percentuale_premio: 0,
    soglia_fatturato: 0,
    note: "",
  });

  const today = new Date();
  
  // Statistiche
  const promozioniAttive = canvassAttive.length;
  const promozioniInScadenza = canvass.filter(c => {
    const dataFine = parseISO(c.data_fine);
    const daysLeft = differenceInDays(dataFine, today);
    return c.attivo && daysLeft >= 0 && daysLeft <= 7;
  }).length;
  const contrattiAnnoCorrente = contratti.filter(c => c.anno === today.getFullYear()).length;
  const promozioniFuture = canvass.filter(c => isAfter(parseISO(c.data_inizio), today)).length;

  const handleCreatePromo = async () => {
    if (!promoForm.nome || !promoForm.azienda_id || !promoForm.data_inizio || !promoForm.data_fine) {
      return;
    }
    
    await createCanvass.mutateAsync({
      canvass: {
        nome: promoForm.nome,
        descrizione: promoForm.descrizione || null,
        tipo: promoForm.tipo,
        valore: promoForm.valore,
        data_inizio: promoForm.data_inizio,
        data_fine: promoForm.data_fine,
        attivo: promoForm.attivo,
        tutti_clienti: promoForm.tutti_clienti,
        azienda_id: promoForm.azienda_id,
      },
      clienti_ids: promoForm.tutti_clienti ? [] : promoForm.clienti_ids,
      prodotti: promoForm.prodotti,
    });
    
    setPromoForm({
      nome: "",
      descrizione: "",
      tipo: "sconto_percentuale",
      valore: 0,
      data_inizio: "",
      data_fine: "",
      attivo: true,
      tutti_clienti: true,
      azienda_id: "",
      clienti_ids: [],
      prodotti: [],
    });
    setIsPromoDialogOpen(false);
  };

  const handleCreateContratto = async () => {
    if (!contrattoForm.cliente_id || !contrattoForm.azienda_id) return;
    
    await createContratto.mutateAsync(contrattoForm);
    
    setContrattoForm({
      cliente_id: "",
      azienda_id: "",
      anno: new Date().getFullYear(),
      percentuale_premio: 0,
      soglia_fatturato: 0,
      note: "",
    });
    setIsContrattoDialogOpen(false);
  };

  const getPromoStatus = (promo: Canvass) => {
    const inizio = parseISO(promo.data_inizio);
    const fine = parseISO(promo.data_fine);
    
    if (!promo.attivo) return { label: "Disattivata", color: "bg-gray-100 text-gray-600", icon: AlertCircle };
    if (isBefore(fine, today)) return { label: "Scaduta", color: "bg-red-100 text-red-800", icon: AlertCircle };
    if (isAfter(inizio, today)) return { label: "Futura", color: "bg-purple-100 text-purple-800", icon: Clock };
    
    const daysLeft = differenceInDays(fine, today);
    if (daysLeft <= 7) return { label: `Scade tra ${daysLeft}g`, color: "bg-orange-100 text-orange-800", icon: AlertTriangle };
    return { label: "Attiva", color: "bg-green-100 text-green-800", icon: CheckCircle2 };
  };

  const filteredProdotti = selectedAziendaId 
    ? prodotti.filter(p => p.azienda_id === selectedAziendaId)
    : prodotti;

  if (loadingCanvass || loadingContratti) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Canvass Aziende</h1>
            <p className="text-muted-foreground">Gestisci promozioni, sconti e premi dei tuoi partner</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isContrattoDialogOpen} onOpenChange={setIsContrattoDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Trophy className="h-4 w-4 mr-2" />
                  Nuovo Contratto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Nuovo Contratto Premio</DialogTitle>
                  <DialogDescription>Crea un contratto premio fine anno per un cliente</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Azienda *</Label>
                    <Select value={contrattoForm.azienda_id} onValueChange={(v) => setContrattoForm(f => ({ ...f, azienda_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Seleziona azienda" /></SelectTrigger>
                      <SelectContent>
                        {aziende.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Cliente *</Label>
                    <Select value={contrattoForm.cliente_id} onValueChange={(v) => setContrattoForm(f => ({ ...f, cliente_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Seleziona cliente" /></SelectTrigger>
                      <SelectContent>
                        {clienti.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.nome} {c.azienda && `- ${c.azienda}`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Anno</Label>
                      <Input 
                        type="number" 
                        value={contrattoForm.anno} 
                        onChange={(e) => setContrattoForm(f => ({ ...f, anno: parseInt(e.target.value) }))} 
                      />
                    </div>
                    <div>
                      <Label>Premio %</Label>
                      <Input 
                        type="number" 
                        step="0.1"
                        value={contrattoForm.percentuale_premio} 
                        onChange={(e) => setContrattoForm(f => ({ ...f, percentuale_premio: parseFloat(e.target.value) || 0 }))} 
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Soglia Fatturato (opzionale)</Label>
                    <Input 
                      type="number" 
                      value={contrattoForm.soglia_fatturato} 
                      onChange={(e) => setContrattoForm(f => ({ ...f, soglia_fatturato: parseFloat(e.target.value) || 0 }))} 
                    />
                  </div>
                  <div>
                    <Label>Note</Label>
                    <Textarea 
                      value={contrattoForm.note} 
                      onChange={(e) => setContrattoForm(f => ({ ...f, note: e.target.value }))} 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsContrattoDialogOpen(false)}>Annulla</Button>
                  <Button onClick={handleCreateContratto} disabled={createContratto.isPending}>Crea</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isPromoDialogOpen} onOpenChange={setIsPromoDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuova Promozione
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nuova Promozione</DialogTitle>
                  <DialogDescription>Crea una nuova promozione o sconto</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nome Promozione *</Label>
                    <Input 
                      value={promoForm.nome} 
                      onChange={(e) => setPromoForm(f => ({ ...f, nome: e.target.value }))} 
                      placeholder="Es. Promo Estate 2024"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Descrizione</Label>
                    <Textarea 
                      value={promoForm.descrizione} 
                      onChange={(e) => setPromoForm(f => ({ ...f, descrizione: e.target.value }))} 
                    />
                  </div>
                  <div>
                    <Label>Azienda *</Label>
                    <Select 
                      value={promoForm.azienda_id} 
                      onValueChange={(v) => {
                        setPromoForm(f => ({ ...f, azienda_id: v, prodotti: [] }));
                        setSelectedAziendaId(v);
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Seleziona azienda" /></SelectTrigger>
                      <SelectContent>
                        {aziende.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo Promozione</Label>
                    <Select value={promoForm.tipo} onValueChange={(v: any) => setPromoForm(f => ({ ...f, tipo: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sconto_percentuale">Sconto Percentuale</SelectItem>
                        <SelectItem value="prezzo_fisso">Prezzo Fisso Scontato</SelectItem>
                        <SelectItem value="premio_fine_anno">Premio Fine Anno</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{promoForm.tipo === "sconto_percentuale" || promoForm.tipo === "premio_fine_anno" ? "Valore %" : "Prezzo €"}</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={promoForm.valore} 
                      onChange={(e) => setPromoForm(f => ({ ...f, valore: parseFloat(e.target.value) || 0 }))} 
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Checkbox 
                      id="attivo" 
                      checked={promoForm.attivo} 
                      onCheckedChange={(c) => setPromoForm(f => ({ ...f, attivo: !!c }))} 
                    />
                    <Label htmlFor="attivo">Promozione Attiva</Label>
                  </div>
                  <div>
                    <Label>Data Inizio *</Label>
                    <Input 
                      type="date" 
                      value={promoForm.data_inizio} 
                      onChange={(e) => setPromoForm(f => ({ ...f, data_inizio: e.target.value }))} 
                    />
                  </div>
                  <div>
                    <Label>Data Fine *</Label>
                    <Input 
                      type="date" 
                      value={promoForm.data_fine} 
                      onChange={(e) => setPromoForm(f => ({ ...f, data_fine: e.target.value }))} 
                    />
                  </div>
                  
                  <div className="col-span-2 space-y-4 border-t pt-4">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="tutti_clienti" 
                        checked={promoForm.tutti_clienti} 
                        onCheckedChange={(c) => setPromoForm(f => ({ ...f, tutti_clienti: !!c, clienti_ids: [] }))} 
                      />
                      <Label htmlFor="tutti_clienti">Applicare a tutti i clienti</Label>
                    </div>
                    
                    {!promoForm.tutti_clienti && (
                      <div>
                        <Label>Clienti Specifici</Label>
                        <ScrollArea className="h-32 border rounded-md p-2 mt-1">
                          {clienti.map(c => (
                            <div key={c.id} className="flex items-center gap-2 py-1">
                              <Checkbox 
                                id={`cliente-${c.id}`}
                                checked={promoForm.clienti_ids.includes(c.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setPromoForm(f => ({ ...f, clienti_ids: [...f.clienti_ids, c.id] }));
                                  } else {
                                    setPromoForm(f => ({ ...f, clienti_ids: f.clienti_ids.filter(id => id !== c.id) }));
                                  }
                                }}
                              />
                              <Label htmlFor={`cliente-${c.id}`} className="text-sm font-normal">
                                {c.nome} {c.azienda && `- ${c.azienda}`}
                              </Label>
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                    )}
                    
                    {promoForm.azienda_id && (
                      <div>
                        <Label>Prodotti Specifici (opzionale)</Label>
                        <ScrollArea className="h-32 border rounded-md p-2 mt-1">
                          {filteredProdotti.map(p => (
                            <div key={p.id} className="flex items-center gap-2 py-1">
                              <Checkbox 
                                id={`prodotto-${p.id}`}
                                checked={promoForm.prodotti.some(pr => pr.prodotto_id === p.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setPromoForm(f => ({ ...f, prodotti: [...f.prodotti, { prodotto_id: p.id }] }));
                                  } else {
                                    setPromoForm(f => ({ ...f, prodotti: f.prodotti.filter(pr => pr.prodotto_id !== p.id) }));
                                  }
                                }}
                              />
                              <Label htmlFor={`prodotto-${p.id}`} className="text-sm font-normal">
                                {p.nome} {p.codice && `(${p.codice})`}
                              </Label>
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPromoDialogOpen(false)}>Annulla</Button>
                  <Button onClick={handleCreatePromo} disabled={createCanvass.isPending}>Crea Promozione</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{promozioniAttive}</p>
                  <p className="text-sm text-muted-foreground">Promo Attive</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{promozioniInScadenza}</p>
                  <p className="text-sm text-muted-foreground">In Scadenza (7gg)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{promozioniFuture}</p>
                  <p className="text-sm text-muted-foreground">Promo Future</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Trophy className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{contrattiAnnoCorrente}</p>
                  <p className="text-sm text-muted-foreground">Contratti {today.getFullYear()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert promozioni in scadenza */}
        {promozioniInScadenza > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-orange-800">Promozioni in scadenza</h3>
                  <p className="text-sm text-orange-700">
                    Hai {promozioniInScadenza} promozioni che scadono nei prossimi 7 giorni. Controlla la lista per i dettagli.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="promozioni" className="space-y-4">
          <TabsList>
            <TabsTrigger value="promozioni">
              <Tag className="h-4 w-4 mr-2" />
              Promozioni ({canvass.length})
            </TabsTrigger>
            <TabsTrigger value="contratti">
              <Trophy className="h-4 w-4 mr-2" />
              Contratti Premio ({contratti.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="promozioni">
            <Card>
              <CardHeader>
                <CardTitle>Tutte le Promozioni</CardTitle>
                <CardDescription>Lista completa delle promozioni e sconti</CardDescription>
              </CardHeader>
              <CardContent>
                {canvass.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nessuna promozione presente</p>
                    <p className="text-sm">Crea la tua prima promozione per iniziare</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Promozione</TableHead>
                        <TableHead>Azienda</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Valore</TableHead>
                        <TableHead>Periodo</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {canvass.map((promo) => {
                        const status = getPromoStatus(promo);
                        const TipoIcon = tipoConfig[promo.tipo].icon;
                        const StatusIcon = status.icon;
                        
                        return (
                          <TableRow key={promo.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{promo.nome}</p>
                                {promo.descrizione && (
                                  <p className="text-sm text-muted-foreground truncate max-w-[200px]">{promo.descrizione}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {promo.azienda?.nome || "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={tipoConfig[promo.tipo].color}>
                                <TipoIcon className="h-3 w-3 mr-1" />
                                {tipoConfig[promo.tipo].label}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {promo.tipo === "prezzo_fisso" 
                                ? formatCurrency(promo.valore)
                                : `${promo.valore}%`
                              }
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p>{format(parseISO(promo.data_inizio), "dd MMM", { locale: it })}</p>
                                <p className="text-muted-foreground">{format(parseISO(promo.data_fine), "dd MMM yyyy", { locale: it })}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {promo.tutti_clienti ? (
                                <Badge variant="outline"><Users className="h-3 w-3 mr-1" />Tutti</Badge>
                              ) : (
                                <Badge variant="outline">
                                  <Users className="h-3 w-3 mr-1" />
                                  {promo.canvass_clienti?.length || 0} clienti
                                </Badge>
                              )}
                              {promo.canvass_prodotti && promo.canvass_prodotti.length > 0 && (
                                <Badge variant="outline" className="ml-1">
                                  <Package className="h-3 w-3 mr-1" />
                                  {promo.canvass_prodotti.length} prodotti
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={status.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => deleteCanvass.mutate(promo.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contratti">
            <Card>
              <CardHeader>
                <CardTitle>Contratti Premio Fine Anno</CardTitle>
                <CardDescription>Clienti contrattizzati con premi in percentuale sul fatturato</CardDescription>
              </CardHeader>
              <CardContent>
                {contratti.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nessun contratto presente</p>
                    <p className="text-sm">Crea un contratto premio per un cliente</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Azienda</TableHead>
                        <TableHead>Anno</TableHead>
                        <TableHead>Premio %</TableHead>
                        <TableHead>Soglia</TableHead>
                        <TableHead>Fatturato Cliente</TableHead>
                        <TableHead>Premio Stimato</TableHead>
                        <TableHead>Note</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contratti.map((contratto) => {
                        const fatturato = contratto.clienti?.fatturato || 0;
                        const sogliaRaggiunta = fatturato >= contratto.soglia_fatturato;
                        const premioStimato = sogliaRaggiunta ? (fatturato * contratto.percentuale_premio / 100) : 0;
                        
                        return (
                          <TableRow key={contratto.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{contratto.clienti?.nome}</p>
                                  {contratto.clienti?.azienda && (
                                    <p className="text-sm text-muted-foreground">{contratto.clienti.azienda}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{contratto.aziende?.nome || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{contratto.anno}</Badge>
                            </TableCell>
                            <TableCell className="font-bold text-primary">
                              {contratto.percentuale_premio}%
                            </TableCell>
                            <TableCell>
                              {contratto.soglia_fatturato > 0 
                                ? formatCurrency(contratto.soglia_fatturato)
                                : "-"
                              }
                            </TableCell>
                            <TableCell>
                              <span className={sogliaRaggiunta ? "text-green-600 font-medium" : ""}>
                                {formatCurrency(fatturato)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {sogliaRaggiunta ? (
                                <span className="font-bold text-green-600">{formatCurrency(premioStimato)}</span>
                              ) : (
                                <span className="text-muted-foreground">Soglia non raggiunta</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate">
                              {contratto.note || "-"}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => deleteContratto.mutate(contratto.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
