import { useState, useRef, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
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
  const { data: ordini = [] } = useOrdini();
  
  const createCanvass = useCreateCanvass();
  const updateCanvass = useUpdateCanvass();
  const deleteCanvass = useDeleteCanvass();
  const createContratto = useCreateContrattoCliente();
  const updateContratto = useUpdateContrattoCliente();
  const deleteContratto = useDeleteContrattoCliente();

  const [isPromoDialogOpen, setIsPromoDialogOpen] = useState(false);
  const [isContrattoDialogOpen, setIsContrattoDialogOpen] = useState(false);
  const [isParsingAI, setIsParsingAI] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [editingPromo, setEditingPromo] = useState<Canvass | null>(null);
  const [editingContratto, setEditingContratto] = useState<ContrattoCliente | null>(null);
  const [viewingPromo, setViewingPromo] = useState<Canvass | null>(null);

  const today = new Date();
  const consorzi = [...new Set(clienti.filter(c => c.consorzio).map(c => c.consorzio))];
  
  const fatturatoData = useMemo(() => {
    const currentYear = today.getFullYear();
    const validOrdini = ordini.filter(o => o.status !== "annullato");
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
    const validOrdini = ordini.filter(o => o.status !== "annullato");
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
    };

    if (editingContratto) {
      await updateContratto.mutateAsync({ id: editingContratto.id, ...contrattoData });
    } else {
      await createContratto.mutateAsync(contrattoData);
    }
    
    setEditingContratto(null);
    setIsContrattoDialogOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) { toast.error("Formato non supportato"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("File troppo grande"); return; }
    setIsParsingAI(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const { data, error } = await supabase.functions.invoke("parse-canvass-document", {
          body: { file_base64: reader.result, file_type: file.type, clienti: clienti.map(c => ({ nome: c.nome, azienda: c.azienda, consorzio: c.consorzio })), aziende: aziende.map(a => ({ nome: a.nome })), prodotti: prodotti.map(p => ({ nome: p.nome, codice: p.codice })) },
        });
        if (error || data.error) { toast.error(data?.error || "Errore nell'analisi"); setIsParsingAI(false); return; }
        toast.success("Documento analizzato! Controlla i risultati.");
        setIsParsingAI(false);
      };
      reader.readAsDataURL(file);
    } catch { toast.error("Errore nella lettura"); setIsParsingAI(false); }
  };

  const getPromoStatus = (promo: Canvass) => {
    const todayStr = format(today, "yyyy-MM-dd");
    if (!promo.attivo) return { label: "Disattivata", color: "bg-gray-100 text-gray-600", icon: AlertCircle };
    const isInMainPeriod = promo.data_inizio <= todayStr && promo.data_fine >= todayStr;
    const isInAdditionalPeriod = promo.canvass_periodi?.some(p => p.data_inizio <= todayStr && p.data_fine >= todayStr);
    if (isInMainPeriod || isInAdditionalPeriod) {
      const allEndDates = [promo.data_fine, ...(promo.canvass_periodi?.map(p => p.data_fine) || [])];
      const nextEnd = allEndDates.filter(d => d >= todayStr).sort()[0];
      if (nextEnd) { const daysLeft = differenceInDays(parseISO(nextEnd), today); if (daysLeft <= 7) return { label: `Scade tra ${daysLeft}g`, color: "bg-orange-100 text-orange-800", icon: AlertTriangle }; }
      return { label: "Attiva", color: "bg-green-100 text-green-800", icon: CheckCircle2 };
    }
    const allEndDates = [promo.data_fine, ...(promo.canvass_periodi?.map(p => p.data_fine) || [])];
    const latestEnd = allEndDates.sort().pop() || promo.data_fine;
    if (isBefore(parseISO(latestEnd), today)) return { label: "Scaduta", color: "bg-red-100 text-red-800", icon: AlertCircle };
    return { label: "Futura", color: "bg-purple-100 text-purple-800", icon: Clock };
  };

  if (loadingCanvass || loadingContratti) {
    return <MainLayout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="page-title">Canvass/PFA</h1>
            <p className="text-body-md text-muted-foreground">Gestisci promozioni, sconti e premi fine anno</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isParsingAI} className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-200 hover:border-purple-300">
              {isParsingAI ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2 text-purple-600" />}
              Importa con AI
            </Button>
            <Button variant="outline" onClick={() => { setEditingContratto(null); setIsContrattoDialogOpen(true); }}>
              <Trophy className="h-4 w-4 mr-2" />Nuovo Contratto
            </Button>
            <Button onClick={() => { setEditingPromo(null); setIsPromoDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />Nuova Promozione
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-green-100 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-600" /></div><div><p className="text-2xl font-bold">{promozioniAttive}</p><p className="text-sm text-muted-foreground">Promo Attive</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-orange-100 rounded-lg"><AlertTriangle className="h-5 w-5 text-orange-600" /></div><div><p className="text-2xl font-bold">{promozioniInScadenza}</p><p className="text-sm text-muted-foreground">In Scadenza</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><Clock className="h-5 w-5 text-purple-600" /></div><div><p className="text-2xl font-bold">{promozioniFuture}</p><p className="text-sm text-muted-foreground">Future</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-amber-100 rounded-lg"><Trophy className="h-5 w-5 text-amber-600" /></div><div><p className="text-2xl font-bold">{contrattiAnnoCorrente}</p><p className="text-sm text-muted-foreground">Contratti {today.getFullYear()}</p></div></div></CardContent></Card>
        </div>

        <ActivePromosSection promos={canvassAttive} onViewDetail={(promo) => setViewingPromo(promo)} />

        <Tabs defaultValue="promozioni" className="space-y-4">
          <TabsList><TabsTrigger value="promozioni"><Tag className="h-4 w-4 mr-2" />Promozioni ({canvass.length})</TabsTrigger><TabsTrigger value="contratti"><Trophy className="h-4 w-4 mr-2" />Contratti ({contratti.length})</TabsTrigger></TabsList>

          <TabsContent value="promozioni">
            <Card>
              <CardHeader><CardTitle>Tutte le Promozioni</CardTitle><CardDescription>Lista completa</CardDescription></CardHeader>
              <CardContent>
                {canvass.length === 0 ? <div className="text-center py-8 text-muted-foreground"><Tag className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Nessuna promozione</p></div> : (
                  <Table><TableHeader><TableRow><TableHead>Promozione</TableHead><TableHead>Azienda</TableHead><TableHead>Tipo</TableHead><TableHead>Valore</TableHead><TableHead>Periodo</TableHead><TableHead>Stato</TableHead><TableHead></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {canvass.map((promo) => { const status = getPromoStatus(promo); const TipoIcon = tipoConfig[promo.tipo].icon; const StatusIcon = status.icon;
                        return (<TableRow key={promo.id}><TableCell><div><p className="font-medium">{promo.nome}</p>{promo.cartoni_omaggio > 0 && <Badge variant="outline" className="mt-1"><Gift className="h-3 w-3 mr-1" />{promo.cartoni_acquisto}+{promo.cartoni_omaggio}</Badge>}</div></TableCell><TableCell><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{promo.azienda?.nome || "-"}</div></TableCell><TableCell><Badge className={tipoConfig[promo.tipo].color}><TipoIcon className="h-3 w-3 mr-1" />{tipoConfig[promo.tipo].label}</Badge></TableCell><TableCell className="font-medium">{promo.tipo === "prezzo_fisso" ? formatCurrency(promo.valore) : `${promo.valore}%`}</TableCell><TableCell><div className="text-sm"><p>{format(parseISO(promo.data_inizio), "dd MMM", { locale: it })} - {format(parseISO(promo.data_fine), "dd MMM", { locale: it })}</p>{promo.canvass_periodi && promo.canvass_periodi.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{promo.canvass_periodi.map((p, idx) => <Badge key={idx} variant="outline" className="text-xs bg-purple-50">{format(parseISO(p.data_inizio), "dd/MM")} - {format(parseISO(p.data_fine), "dd/MM")}</Badge>)}</div>}</div></TableCell><TableCell><Badge className={status.color}><StatusIcon className="h-3 w-3 mr-1" />{status.label}</Badge></TableCell><TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => setViewingPromo(promo)}><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => { setEditingPromo(promo); setIsPromoDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => deleteCanvass.mutate(promo.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell></TableRow>);
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contratti">
            <Card>
              <CardHeader><CardTitle>Contratti Premio Fine Anno</CardTitle><CardDescription>Clienti e consorzi contrattizzati</CardDescription></CardHeader>
              <CardContent>
                {contratti.length === 0 ? <div className="text-center py-8 text-muted-foreground"><Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Nessun contratto</p></div> : (
                  <Table><TableHeader><TableRow><TableHead>Cliente/Consorzio</TableHead><TableHead>Azienda</TableHead><TableHead>Anno</TableHead><TableHead>Premio</TableHead><TableHead>Avanzamento</TableHead><TableHead>Premio Stimato</TableHead><TableHead></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {contratti.map((contratto) => { let fatturatoReale = 0; if (contratto.is_consorzio) { fatturatoReale = fatturatoConsorzioData[`${contratto.consorzio}_${contratto.azienda_id}`]?.totale || 0; } else { fatturatoReale = fatturatoData[`${contratto.cliente_id}_${contratto.azienda_id}`]?.totale || 0; } const soglia = contratto.soglia_fatturato || 0; const sogliaRaggiunta = soglia === 0 || fatturatoReale >= soglia; const progressPercent = soglia > 0 ? Math.min((fatturatoReale / soglia) * 100, 100) : 100; const premioStimato = sogliaRaggiunta ? (fatturatoReale * contratto.percentuale_premio / 100) : 0;
                        return (<TableRow key={contratto.id}><TableCell><div className="flex items-center gap-2">{contratto.is_consorzio ? <Building2 className="h-4 w-4 text-primary" /> : <Users className="h-4 w-4 text-muted-foreground" />}<div>{contratto.is_consorzio ? <><p className="font-medium">{contratto.consorzio}</p><p className="text-xs text-muted-foreground">{clienti.filter(c => c.consorzio === contratto.consorzio).length} clienti</p></> : <><p className="font-medium">{contratto.clienti?.nome}</p>{contratto.clienti?.azienda && <p className="text-sm text-muted-foreground">{contratto.clienti.azienda}</p>}</>}</div></div></TableCell><TableCell>{contratto.aziende?.nome || "-"}</TableCell><TableCell><Badge variant="outline">{contratto.anno}</Badge></TableCell><TableCell className="font-bold text-primary">{contratto.percentuale_premio}%</TableCell><TableCell className="min-w-[180px]"><div className="space-y-1"><div className="flex justify-between text-sm"><span className="font-medium">{formatCurrency(fatturatoReale)}</span>{soglia > 0 && <span className="text-muted-foreground">/ {formatCurrency(soglia)}</span>}</div><Progress value={progressPercent} className={`h-2 ${sogliaRaggiunta ? '[&>div]:bg-green-500' : '[&>div]:bg-amber-500'}`} /><span className={`text-xs ${sogliaRaggiunta ? "text-green-600" : "text-amber-600"}`}>{sogliaRaggiunta ? <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Target raggiunto!</span> : `${Math.round(progressPercent)}%`}</span></div></TableCell><TableCell>{sogliaRaggiunta ? <span className="font-bold text-green-600 text-lg">{formatCurrency(premioStimato)}</span> : <span className="text-sm text-muted-foreground">-</span>}</TableCell><TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => { setEditingContratto(contratto); setIsContrattoDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => deleteContratto.mutate(contratto.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell></TableRow>);
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <PromoFormDialog open={isPromoDialogOpen} onOpenChange={(open) => { setIsPromoDialogOpen(open); if (!open) setEditingPromo(null); }} editingPromo={editingPromo} aziende={aziende} clienti={clienti} prodotti={prodotti} onSave={handleSavePromo} isPending={createCanvass.isPending || updateCanvass.isPending} />
      <ContrattoFormDialog open={isContrattoDialogOpen} onOpenChange={(open) => { setIsContrattoDialogOpen(open); if (!open) setEditingContratto(null); }} editingContratto={editingContratto} aziende={aziende} clienti={clienti} consorzi={consorzi} onSave={handleSaveContratto} isPending={createContratto.isPending || updateContratto.isPending} />
      <PromoDetailSheet promo={viewingPromo} open={!!viewingPromo} onOpenChange={(open) => { if (!open) setViewingPromo(null); }} onEdit={(promo) => { setViewingPromo(null); setEditingPromo(promo); setIsPromoDialogOpen(true); }} onDelete={(id) => { deleteCanvass.mutate(id); setViewingPromo(null); }} />
    </MainLayout>
  );
}
