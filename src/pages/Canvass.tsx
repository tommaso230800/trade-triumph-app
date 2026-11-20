import { useState, useRef, useMemo } from "react";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { MetricTile } from "@/components/ui/metric-tile";
import { MainLayout } from "@/components/layout/MainLayout";
import { AcceptedConditions } from '@/components/proposte/AcceptedConditions';
import { useCanvass, useCanvassAttive, useContrattiClienti, useCreateCanvass, useUpdateCanvass, useDeleteCanvass, useCreateContrattoCliente, useUpdateContrattoCliente, useDeleteContrattoCliente, Canvass, ContrattoCliente } from "@/hooks/useCanvass";
import { useAziende } from "@/hooks/useAziende";
import { useClienti } from "@/hooks/useClienti";
import { useProdotti } from "@/hooks/useProdotti";
import { useOrdini } from "@/hooks/useOrdini";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Percent, Tag, Trophy, Calendar, Building2, Users, Package, Trash2, AlertCircle, Clock, CheckCircle2, AlertTriangle, Loader2, Sparkles, Gift, Target, Pencil, Eye } from "lucide-react";
import { format, parseISO, differenceInDays, isAfter, isBefore } from "date-fns";
import { it } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PromoFormDialog, PromoFormData } from "@/components/canvass/PromoFormDialog";
import { ContrattoFormDialog, ContrattoFormData } from "@/components/canvass/ContrattoFormDialog";
import { PromoDetailSheet } from "@/components/canvass/PromoDetailSheet";
import { ActivePromosSection } from "@/components/canvass/ActivePromosSection";
import { AIImportCanvassDialog } from "@/components/canvass/AIImportCanvassDialog";
import { formatEuro } from "@/lib/format";

const tipoConfig = {
  sconto_percentuale: { label: "Sconto %", icon: Percent, color: "bg-primary/10 text-primary" },
  prezzo_fisso: { label: "Prezzo Fisso", icon: Tag, color: "bg-success/10 text-success" },
  premio_fine_anno: { label: "Premio Fine Anno", icon: Trophy, color: "bg-warning/10 text-warning" },
};

const formatCurrency = (value: number) => 
  formatEuro(value);

export default function CanvassPage() {
  const { data: canvass = [], isLoading: loadingCanvass } = useCanvass();
  const { data: canvassAttive = [] } = useCanvassAttive();
  const { data: contratti = [], isLoading: loadingContratti } = useContrattiClienti();
  const { data: aziende = [] } = useAziende();
  const { data: clienti = [] } = useClienti();
  const { data: prodotti = [] } = useProdotti();
  const { data: ordini = [] } = useOrdini();
  
  const createCanvass = useCreateCanvass();
  const updateCanvass = useUpdateCanvass();
  const deleteCanvass = useDeleteCanvass();
  const createContratto = useCreateContrattoCliente();
  const updateContratto = useUpdateContrattoCliente();
  const deleteContratto = useDeleteContrattoCliente();

  const [isPromoDialogOpen, setIsPromoDialogOpen] = useState(false);
  const [isContrattoDialogOpen, setIsContrattoDialogOpen] = useState(false);
  const [isAIImportOpen, setIsAIImportOpen] = useState(false);
  
  const [editingPromo, setEditingPromo] = useState<Canvass | null>(null);
  const [editingContratto, setEditingContratto] = useState<ContrattoCliente | null>(null);
  const [viewingPromo, setViewingPromo] = useState<Canvass | null>(null);

  const today = new Date();
  const consorzi = [...new Set(clienti.filter(c => c.consorzio).map(c => c.consorzio))];
  
  const fatturatoData = useMemo(() => {
    const currentYear = today.getFullYear();
    const validOrdini = ordini.filter(o => o.status !== "annullato" && o.status !== "stand_by");
    return validOrdini.reduce((acc, ordine) => {
      const orderDate = new Date(ordine.data_ordine || ordine.created_at || "");
      if (orderDate.getFullYear() !== currentYear) return acc;
      const key = `${ordine.cliente_id || ""}_${ordine.azienda_id || ""}`;
      if (!acc[key]) acc[key] = { cliente_id: ordine.cliente_id, azienda_id: ordine.azienda_id, totale: 0 };
      acc[key].totale += Number(ordine.totale) || 0;
      return acc;
    }, {} as Record<string, { cliente_id: string | null; azienda_id: string | null; totale: number }>);
  }, [ordini, today]);

  const fatturatoConsorzioData = useMemo(() => {
    const currentYear = today.getFullYear();
    const validOrdini = ordini.filter(o => o.status !== "annullato" && o.status !== "stand_by");
    return validOrdini.reduce((acc, ordine) => {
      const orderDate = new Date(ordine.data_ordine || ordine.created_at || "");
      if (orderDate.getFullYear() !== currentYear) return acc;
      const cliente = clienti.find(c => c.id === ordine.cliente_id);
      if (!cliente?.consorzio) return acc;
      const key = `${cliente.consorzio}_${ordine.azienda_id || ""}`;
      if (!acc[key]) acc[key] = { consorzio: cliente.consorzio, azienda_id: ordine.azienda_id, totale: 0 };
      acc[key].totale += Number(ordine.totale) || 0;
      return acc;
    }, {} as Record<string, { consorzio: string; azienda_id: string | null; totale: number }>);
  }, [ordini, clienti, today]);

  const promozioniAttive = canvassAttive.length;
  const promozioniInScadenza = canvass.filter(c => {
    const dataFine = parseISO(c.data_fine);
    const daysLeft = differenceInDays(dataFine, today);
    return c.attivo && daysLeft >= 0 && daysLeft <= 7;
  }).length;
  const contrattiAnnoCorrente = contratti.filter(c => c.anno === today.getFullYear()).length;
  const promozioniFuture = canvass.filter(c => isAfter(parseISO(c.data_inizio), today)).length;

  const handleSavePromo = async (form: PromoFormData) => {
    const canvassData = {
      nome: form.nome,
      descrizione: form.descrizione || null,
      tipo: form.tipo,
      valore: form.valore,
      data_inizio: form.data_inizio,
      data_fine: form.data_fine,
      attivo: form.attivo,
      tutti_clienti: form.tutti_clienti,
      azienda_id: form.azienda_id,
      cartoni_omaggio: form.cartoni_omaggio,
      cartoni_acquisto: form.cartoni_acquisto,
    };

    if (editingPromo) {
      await updateCanvass.mutateAsync({
        id: editingPromo.id,
        canvass: canvassData,
        clienti_ids: form.tutti_clienti ? [] : form.clienti_ids,
        prodotti: form.prodotti,
        periodi: form.periodi_aggiuntivi.filter(p => p.data_inizio && p.data_fine),
      });
    } else {
      await createCanvass.mutateAsync({
        canvass: canvassData,
        clienti_ids: form.tutti_clienti ? [] : form.clienti_ids,
        prodotti: form.prodotti,
        periodi: form.periodi_aggiuntivi.filter(p => p.data_inizio && p.data_fine),
      });
    }
    
    setEditingPromo(null);
    setIsPromoDialogOpen(false);
  };

  const handleSaveContratto = async (form: ContrattoFormData) => {
    const contrattoData = {
      cliente_id: form.is_consorzio ? null : form.cliente_id,
      azienda_id: form.azienda_id,
      anno: form.anno,
      percentuale_premio: form.percentuale_premio,
      soglia_fatturato: form.soglia_fatturato,
      note: form.note || null,
      consorzio: form.is_consorzio ? form.consorzio : null,
      is_consorzio: form.is_consorzio,
      obbiettivi: form.obbiettivi?.map(o => ({
        tipo: o.tipo,
        percentuale_premio: o.percentuale_premio,
        soglia_fatturato: o.tipo === "incondizionato" ? 0 : o.soglia_fatturato,
        descrizione: o.descrizione || "",
      })),
    };

    if (editingContratto) {
      await updateContratto.mutateAsync({ id: editingContratto.id, ...contrattoData });
    } else {
      await createContratto.mutateAsync(contrattoData);
    }
    
    setEditingContratto(null);
    setIsContrattoDialogOpen(false);
  };


  const getPromoStatus = (promo: Canvass) => {
    const todayStr = format(today, "yyyy-MM-dd");
    if (!promo.attivo) return { label: "Disattivata", color: "bg-muted text-muted-foreground", icon: AlertCircle };
    const isInMainPeriod = promo.data_inizio <= todayStr && promo.data_fine >= todayStr;
    const isInAdditionalPeriod = promo.canvass_periodi?.some(p => p.data_inizio <= todayStr && p.data_fine >= todayStr);
    if (isInMainPeriod || isInAdditionalPeriod) {
      const allEndDates = [promo.data_fine, ...(promo.canvass_periodi?.map(p => p.data_fine) || [])];
      const nextEnd = allEndDates.filter(d => d >= todayStr).sort()[0];
      if (nextEnd) { const daysLeft = differenceInDays(parseISO(nextEnd), today); if (daysLeft <= 7) return { label: `Scade tra ${daysLeft}g`, color: "bg-warning/10 text-warning", icon: AlertTriangle }; }
      return { label: "Attiva", color: "bg-success/10 text-success", icon: CheckCircle2 };
    }
    const allEndDates = [promo.data_fine, ...(promo.canvass_periodi?.map(p => p.data_fine) || [])];
    const latestEnd = allEndDates.sort().pop() || promo.data_fine;
    if (isBefore(parseISO(latestEnd), today)) return { label: "Scaduta", color: "bg-destructive/10 text-destructive", icon: AlertCircle };
    return { label: "Futura", color: "bg-info/10 text-info", icon: Clock };
  };

  if (loadingCanvass || loadingContratti) {
    return <MainLayout><PageSkeleton kpis={4} rows={4} /></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Canvass</p>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Promozioni & PFA</h1>
            <p className="text-sm text-muted-foreground">Gestisci promozioni, sconti e premi fine anno</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setIsAIImportOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2 text-muted-foreground" />
              Importa con AI
            </Button>
            <Button variant="outline" onClick={() => { setEditingContratto(null); setIsContrattoDialogOpen(true); }}>
              <Trophy className="h-4 w-4 mr-2" />Nuovo Contratto
            </Button>
            <Button onClick={() => { setEditingPromo(null); setIsPromoDialogOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" />Nuova Promozione
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricTile label="Promo attive" value={promozioniAttive} icon={<CheckCircle2 />} tone="success" />
          <MetricTile label="In scadenza" value={promozioniInScadenza} icon={<AlertTriangle />} tone={promozioniInScadenza > 0 ? "warning" : "default"} />
          <MetricTile label="Future" value={promozioniFuture} icon={<Clock />} tone="info" />
          <MetricTile label={`Contratti ${today.getFullYear()}`} value={contrattiAnnoCorrente} icon={<Trophy />} />
        </div>

        <ActivePromosSection promos={canvassAttive} onViewDetail={(promo) => setViewingPromo(promo)} />

        <Tabs defaultValue="promozioni" className="space-y-4">
          <TabsList><TabsTrigger value="promozioni"><Tag className="h-4 w-4 mr-2" />Promozioni ({canvass.length})</TabsTrigger><TabsTrigger value="contratti"><Trophy className="h-4 w-4 mr-2" />Contratti ({contratti.length})</TabsTrigger></TabsList>

          <TabsContent value="promozioni">
            <Card>
              <CardHeader><CardTitle>Tutte le Promozioni</CardTitle><CardDescription>Lista completa</CardDescription></CardHeader>
              <CardContent>
                {canvass.length === 0 ? <div className="space-y-3 py-8 text-center"><Tag className="mx-auto h-6 w-6 text-muted-foreground" /><p className="text-sm text-muted-foreground">Nessuna promozione registrata</p><Button variant="outline" onClick={() => { setEditingPromo(null); setIsPromoDialogOpen(true); }}><Plus className="h-4 w-4" />Nuova promozione</Button></div> : (
                  <div><Table><TableHeader><TableRow><TableHead>Promozione</TableHead><TableHead>Azienda</TableHead><TableHead>Tipo</TableHead><TableHead>Valore</TableHead><TableHead>Periodo</TableHead><TableHead>Stato</TableHead><TableHead></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {canvass.map((promo) => { const status = getPromoStatus(promo); const TipoIcon = tipoConfig[promo.tipo].icon; const StatusIcon = status.icon;
                        return (<TableRow key={promo.id}><TableCell><div><p className="font-medium">{promo.nome}</p>{promo.cartoni_omaggio > 0 && <Badge variant="outline" className="mt-1"><Gift className="h-3 w-3 mr-1" />{promo.cartoni_acquisto}+{promo.cartoni_omaggio}</Badge>}</div></TableCell><TableCell><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{promo.azienda?.nome || "-"}</div></TableCell><TableCell><Badge className={tipoConfig[promo.tipo].color}><TipoIcon className="h-3 w-3 mr-1" />{tipoConfig[promo.tipo].label}</Badge></TableCell><TableCell className="text-right font-medium tabular-nums">{promo.tipo === "prezzo_fisso" ? formatCurrency(promo.valore) : `${promo.valore}%`}</TableCell><TableCell><div className="text-sm"><p>{format(parseISO(promo.data_inizio), "dd MMM", { locale: it })} - {format(parseISO(promo.data_fine), "dd MMM", { locale: it })}</p>{promo.canvass_periodi && promo.canvass_periodi.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{promo.canvass_periodi.map((p, idx) => <Badge key={idx} variant="outline" className="text-xs bg-muted/50">{format(parseISO(p.data_inizio), "dd/MM")} - {format(parseISO(p.data_fine), "dd/MM")}</Badge>)}</div>}</div></TableCell><TableCell><Badge className={status.color}><StatusIcon className="h-3 w-3 mr-1" />{status.label}</Badge></TableCell><TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label="Dettaglio promozione" onClick={() => setViewingPromo(promo)}><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon" aria-label="Modifica promozione" onClick={() => { setEditingPromo(promo); setIsPromoDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" aria-label="Elimina promozione" onClick={() => deleteCanvass.mutate(promo.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell></TableRow>);
                      })}
                    </TableBody>
                  </Table></div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contratti">
            <Card>
              <CardHeader><CardTitle>Contratti Premio Fine Anno</CardTitle><CardDescription>Clienti e consorzi contrattizzati</CardDescription></CardHeader>
              <CardContent>
                {contratti.length === 0 ? <div className="space-y-3 py-8 text-center"><Trophy className="mx-auto h-6 w-6 text-muted-foreground" /><p className="text-sm text-muted-foreground">Nessun contratto registrato</p><Button variant="outline" onClick={() => { setEditingContratto(null); setIsContrattoDialogOpen(true); }}><Plus className="h-4 w-4" />Nuovo contratto</Button></div> : (
                  <div className="space-y-4">
                    {contratti.map((contratto) => {
                      let fatturatoReale = 0;
                      if (contratto.is_consorzio) {
                        fatturatoReale = fatturatoConsorzioData[`${contratto.consorzio}_${contratto.azienda_id}`]?.totale || 0;
                      } else {
                        fatturatoReale = fatturatoData[`${contratto.cliente_id}_${contratto.azienda_id}`]?.totale || 0;
                      }

                      const obbiettivi = contratto.contratti_obbiettivi && contratto.contratti_obbiettivi.length > 0
                        ? [...contratto.contratti_obbiettivi].sort((a, b) => a.ordine - b.ordine)
                        : [{ id: "legacy", contratto_id: contratto.id, user_id: contratto.user_id, tipo: (contratto.soglia_fatturato || 0) > 0 ? "condizionato" : "incondizionato", percentuale_premio: contratto.percentuale_premio, soglia_fatturato: contratto.soglia_fatturato, descrizione: null, ordine: 0, created_at: "" }];

                      // Calculate total premio
                      let premioTotaleStimato = 0;
                      obbiettivi.forEach(obj => {
                        const soglia = obj.soglia_fatturato || 0;
                        const raggiunto = obj.tipo === "incondizionato" || soglia === 0 || fatturatoReale >= soglia;
                        if (raggiunto) premioTotaleStimato += fatturatoReale * obj.percentuale_premio / 100;
                      });

                      return (
                        <Card key={contratto.id} className="overflow-hidden">
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 p-4">
                            <div className="flex min-w-0 items-center gap-3">
                              {contratto.is_consorzio ? <Building2 className="h-5 w-5 text-primary" /> : <Users className="h-5 w-5 text-muted-foreground" />}
                              <div>
                                <p className="font-semibold">{contratto.is_consorzio ? contratto.consorzio : contratto.clienti?.nome}</p>
                                <p className="text-xs text-muted-foreground">
                                  {contratto.aziende?.nome} • <Badge variant="outline" className="text-xs">{contratto.anno}</Badge>
                                  {contratto.is_consorzio && ` • ${clienti.filter(c => c.consorzio === contratto.consorzio).length} clienti`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Fatturato</p>
                                <p className="font-bold tabular-nums">{formatCurrency(fatturatoReale)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Premio stimato</p>
                                <p className="font-bold tabular-nums text-success">{formatCurrency(premioTotaleStimato)}</p>
                              </div>
                              <Button variant="ghost" size="icon" aria-label="Modifica contratto" onClick={() => { setEditingContratto(contratto); setIsContrattoDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" aria-label="Elimina contratto" onClick={() => deleteContratto.mutate(contratto.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </div>
                          <div className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {obbiettivi.map((obj, idx) => {
                              const soglia = obj.soglia_fatturato || 0;
                              const isIncondizionato = obj.tipo === "incondizionato" || soglia === 0;
                              const raggiunto = isIncondizionato || fatturatoReale >= soglia;
                              const progress = isIncondizionato ? 100 : soglia > 0 ? Math.min((fatturatoReale / soglia) * 100, 100) : 100;
                              const premio = raggiunto ? fatturatoReale * obj.percentuale_premio / 100 : 0;

                              return (
                                <div key={obj.id} className={`p-3 rounded-lg border ${
                                  raggiunto 
                                    ? "border-success/30 bg-success/5" 
                                    : "border-warning/30 bg-warning/5"
                                }`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <Badge variant="outline" className="text-xs">
                                      {isIncondizionato ? "Incondizionato" : `Target ${formatCurrency(soglia)}`}
                                    </Badge>
                                    <span className="text-base font-bold tabular-nums">{obj.percentuale_premio.toLocaleString("it-IT")}%</span>
                                  </div>
                                  {obj.descrizione && <p className="text-xs text-muted-foreground mb-2">{obj.descrizione}</p>}
                                  {!isIncondizionato && (
                                    <div className="space-y-1">
                                      <Progress value={progress} className={`h-1.5 ${raggiunto ? '[&>div]:bg-success' : '[&>div]:bg-warning'}`} />
                                      <p className={`text-xs ${raggiunto ? "text-success" : "text-warning"}`}>
                                        {raggiunto ? "✓ Raggiunto" : `${Math.round(progress)}%`}
                                      </p>
                                    </div>
                                  )}
                                  {raggiunto && (
                                    <p className="mt-1 text-right text-sm font-semibold tabular-nums text-success">{formatCurrency(premio)}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {contratto.note && <div className="px-4 pb-3 text-xs text-muted-foreground">{contratto.note}</div>}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <AcceptedConditions/>
      </div>

      <PromoFormDialog open={isPromoDialogOpen} onOpenChange={(open) => { setIsPromoDialogOpen(open); if (!open) setEditingPromo(null); }} editingPromo={editingPromo} aziende={aziende} clienti={clienti} prodotti={prodotti} onSave={handleSavePromo} isPending={createCanvass.isPending || updateCanvass.isPending} />
      <ContrattoFormDialog open={isContrattoDialogOpen} onOpenChange={(open) => { setIsContrattoDialogOpen(open); if (!open) setEditingContratto(null); }} editingContratto={editingContratto} aziende={aziende} clienti={clienti} consorzi={consorzi} onSave={handleSaveContratto} isPending={createContratto.isPending || updateContratto.isPending} />
      <PromoDetailSheet promo={viewingPromo} open={!!viewingPromo} onOpenChange={(open) => { if (!open) setViewingPromo(null); }} onEdit={(promo) => { setViewingPromo(null); setEditingPromo(promo); setIsPromoDialogOpen(true); }} onDelete={(id) => { deleteCanvass.mutate(id); setViewingPromo(null); }} />
      <AIImportCanvassDialog open={isAIImportOpen} onOpenChange={setIsAIImportOpen} />
    </MainLayout>
  );
}
