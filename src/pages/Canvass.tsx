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

  const findAziendaId = (nome: string | undefined) => {
    if (!nome) return null;
    const lower = nome.toLowerCase();
    return aziende.find(a => a.nome.toLowerCase().includes(lower) || lower.includes(a.nome.toLowerCase()))?.id || null;
  };

  const findClienteId = (nome: string | undefined) => {
    if (!nome) return null;
    const lower = nome.toLowerCase();
    return clienti.find(c => c.nome.toLowerCase().includes(lower) || lower.includes(c.nome.toLowerCase()))?.id || null;
  };

  const findProdottoId = (nome: string) => {
    const lower = nome.toLowerCase();
    return prodotti.find(p => p.nome.toLowerCase().includes(lower) || lower.includes(p.nome.toLowerCase()) || p.codice?.toLowerCase().includes(lower))?.id || null;
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
        try {
          const { data, error } = await supabase.functions.invoke("parse-canvass-document", {
            body: { file_base64: reader.result, file_type: file.type, clienti: clienti.map(c => ({ nome: c.nome, azienda: c.azienda, consorzio: c.consorzio })), aziende: aziende.map(a => ({ nome: a.nome })), prodotti: prodotti.map(p => ({ nome: p.nome, codice: p.codice })) },
          });
          if (error || data.error) { toast.error(data?.error || "Errore nell'analisi"); setIsParsingAI(false); return; }
          
          const parsed = data.data;
          const aziendaId = findAziendaId(parsed.azienda_nome);
          if (!aziendaId) { toast.error(`Azienda "${parsed.azienda_nome}" non trovata. Creala prima.`); setIsParsingAI(false); return; }

          let savedContratti = 0;
          let savedPromo = 0;

          // Save contratti/obiettivi
          if (parsed.tipo === "contratto" || parsed.tipo === "misto") {
            const clienteId = findClienteId(parsed.cliente_nome);
            const isConsorzio = !!parsed.consorzio && !clienteId;
            
            // Build obbiettivi array from parsed data
            const obbiettivi = (parsed.obbiettivi && parsed.obbiettivi.length > 0)
              ? parsed.obbiettivi.map((obj: any) => ({
                  tipo: (obj.soglia_fatturato && obj.soglia_fatturato > 0) ? "condizionato" : "incondizionato",
                  percentuale_premio: obj.percentuale_premio || 0,
                  soglia_fatturato: obj.soglia_fatturato || 0,
                  descrizione: obj.descrizione || "",
                }))
              : parsed.percentuale_premio
                ? [{
                    tipo: (parsed.soglia_fatturato && parsed.soglia_fatturato > 0) ? "condizionato" : "incondizionato",
                    percentuale_premio: parsed.percentuale_premio || 0,
                    soglia_fatturato: parsed.soglia_fatturato || 0,
                    descrizione: "",
                  }]
                : [];

            if (obbiettivi.length > 0) {
              const mainObj = obbiettivi[0];
              const contrattoData = {
                cliente_id: clienteId || clienti[0]?.id,
                azienda_id: aziendaId,
                anno: parsed.anno || new Date().getFullYear(),
                percentuale_premio: mainObj.percentuale_premio,
                soglia_fatturato: mainObj.tipo === "incondizionato" ? 0 : mainObj.soglia_fatturato,
                note: parsed.note || null,
                consorzio: parsed.consorzio || null,
                is_consorzio: isConsorzio,
                obbiettivi,
              };
              await createContratto.mutateAsync(contrattoData);
              savedContratti++;
            }
          }

          // Save promozioni
          if (parsed.tipo === "promozione" || parsed.tipo === "misto") {
            const promoList = parsed.promozioni && parsed.promozioni.length > 0 
              ? parsed.promozioni 
              : parsed.promozione ? [parsed.promozione] : [];

            for (const promo of promoList) {
              const prodottiIds = (promo.prodotti || [])
                .map((nome: string) => findProdottoId(nome))
                .filter(Boolean)
                .map((id: string) => ({ prodotto_id: id }));

              const periodi = (promo.periodi || [])
                .filter((p: any) => p.data_inizio && p.data_fine)
                .slice(1); // first period is the main one

              // Normalize tipo to valid values
              const validTipi = ["sconto_percentuale", "prezzo_fisso", "premio_fine_anno"];
              let tipo = promo.tipo || "sconto_percentuale";
              if (!validTipi.includes(tipo)) {
                tipo = tipo.includes("prezzo") ? "prezzo_fisso" : "sconto_percentuale";
              }

              const defaultYear = parsed.anno || new Date().getFullYear();
              const canvassData = {
                nome: promo.nome || "Promozione importata",
                descrizione: (promo as any).note || parsed.note || null,
                tipo: tipo as "sconto_percentuale" | "prezzo_fisso" | "premio_fine_anno",
                valore: promo.valore || 0,
                data_inizio: promo.data_inizio || promo.periodi?.[0]?.data_inizio || `${defaultYear}-01-01`,
                data_fine: promo.data_fine || promo.periodi?.[0]?.data_fine || `${defaultYear}-12-31`,
                attivo: true,
                tutti_clienti: true,
                azienda_id: aziendaId,
                cartoni_omaggio: promo.cartoni_omaggio || 0,
                cartoni_acquisto: promo.cartoni_acquisto || 0,
              };

              await createCanvass.mutateAsync({
                canvass: canvassData,
                clienti_ids: [],
                prodotti: prodottiIds,
                periodi,
              });
              savedPromo++;
            }
          }

          const messages = [];
          if (savedContratti > 0) messages.push(`${savedContratti} contratt${savedContratti === 1 ? 'o' : 'i'}`);
          if (savedPromo > 0) messages.push(`${savedPromo} promozion${savedPromo === 1 ? 'e' : 'i'}`);
          toast.success(`Importati: ${messages.join(" e ")}!`);
        } catch (err: any) {
          toast.error("Errore nel salvataggio: " + (err.message || "Errore sconosciuto"));
        }
        setIsParsingAI(false);
      };
      reader.readAsDataURL(file);
    } catch { toast.error("Errore nella lettura"); setIsParsingAI(false); }
    if (fileInputRef.current) fileInputRef.current.value = "";
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
            <p className="text-sm font-medium text-primary">Canvass</p>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">Promozioni & PFA</h1>
            <p className="text-muted-foreground">Gestisci promozioni, sconti e premi fine anno</p>
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
            <Button onClick={() => { setEditingPromo(null); setIsPromoDialogOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" />Nuova Promozione
            </Button>
          </div>
        </div>

        {/* Stats - Modern */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in stagger-1">
          <div className="rounded-2xl bg-card border border-success/20 p-5 shadow-sm bg-gradient-to-br from-card to-success/5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{promozioniAttive}</p>
                <p className="text-xs text-muted-foreground">Promo Attive</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-card border border-warning/20 p-5 shadow-sm bg-gradient-to-br from-card to-warning/5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{promozioniInScadenza}</p>
                <p className="text-xs text-muted-foreground">In Scadenza</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-card border border-info/20 p-5 shadow-sm bg-gradient-to-br from-card to-info/5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-info/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{promozioniFuture}</p>
                <p className="text-xs text-muted-foreground">Future</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-card border border-primary/20 p-5 shadow-sm bg-gradient-to-br from-card to-primary/5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contrattiAnnoCorrente}</p>
                <p className="text-xs text-muted-foreground">Contratti {today.getFullYear()}</p>
              </div>
            </div>
          </div>
        </div>

        <ActivePromosSection promos={canvassAttive} onViewDetail={(promo) => setViewingPromo(promo)} />

        <Tabs defaultValue="promozioni" className="space-y-4">
          <TabsList><TabsTrigger value="promozioni"><Tag className="h-4 w-4 mr-2" />Promozioni ({canvass.length})</TabsTrigger><TabsTrigger value="contratti"><Trophy className="h-4 w-4 mr-2" />Contratti ({contratti.length})</TabsTrigger></TabsList>

          <TabsContent value="promozioni">
            <Card>
              <CardHeader><CardTitle>Tutte le Promozioni</CardTitle><CardDescription>Lista completa</CardDescription></CardHeader>
              <CardContent>
                {canvass.length === 0 ? <div className="text-center py-8 text-muted-foreground"><Tag className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Nessuna promozione</p></div> : (
                  <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Promozione</TableHead><TableHead>Azienda</TableHead><TableHead>Tipo</TableHead><TableHead>Valore</TableHead><TableHead>Periodo</TableHead><TableHead>Stato</TableHead><TableHead></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {canvass.map((promo) => { const status = getPromoStatus(promo); const TipoIcon = tipoConfig[promo.tipo].icon; const StatusIcon = status.icon;
                        return (<TableRow key={promo.id}><TableCell><div><p className="font-medium">{promo.nome}</p>{promo.cartoni_omaggio > 0 && <Badge variant="outline" className="mt-1"><Gift className="h-3 w-3 mr-1" />{promo.cartoni_acquisto}+{promo.cartoni_omaggio}</Badge>}</div></TableCell><TableCell><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{promo.azienda?.nome || "-"}</div></TableCell><TableCell><Badge className={tipoConfig[promo.tipo].color}><TipoIcon className="h-3 w-3 mr-1" />{tipoConfig[promo.tipo].label}</Badge></TableCell><TableCell className="font-medium">{promo.tipo === "prezzo_fisso" ? formatCurrency(promo.valore) : `${promo.valore}%`}</TableCell><TableCell><div className="text-sm"><p>{format(parseISO(promo.data_inizio), "dd MMM", { locale: it })} - {format(parseISO(promo.data_fine), "dd MMM", { locale: it })}</p>{promo.canvass_periodi && promo.canvass_periodi.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{promo.canvass_periodi.map((p, idx) => <Badge key={idx} variant="outline" className="text-xs bg-purple-50">{format(parseISO(p.data_inizio), "dd/MM")} - {format(parseISO(p.data_fine), "dd/MM")}</Badge>)}</div>}</div></TableCell><TableCell><Badge className={status.color}><StatusIcon className="h-3 w-3 mr-1" />{status.label}</Badge></TableCell><TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => setViewingPromo(promo)}><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => { setEditingPromo(promo); setIsPromoDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => deleteCanvass.mutate(promo.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell></TableRow>);
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
                {contratti.length === 0 ? <div className="text-center py-8 text-muted-foreground"><Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Nessun contratto</p></div> : (
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
                          <div className="p-4 flex items-center justify-between border-b bg-muted/30">
                            <div className="flex items-center gap-3">
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
                              <div className="text-right mr-2">
                                <p className="text-xs text-muted-foreground">Fatturato</p>
                                <p className="font-bold">{formatCurrency(fatturatoReale)}</p>
                              </div>
                              <div className="text-right mr-2">
                                <p className="text-xs text-muted-foreground">Premio Stimato</p>
                                <p className="font-bold text-green-600">{formatCurrency(premioTotaleStimato)}</p>
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => { setEditingContratto(contratto); setIsContrattoDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteContratto.mutate(contratto.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
                                <div key={obj.id} className={`p-3 rounded-xl border-2 ${
                                  raggiunto 
                                    ? "border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-800" 
                                    : "border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-800"
                                }`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <Badge variant="outline" className="text-xs">
                                      {isIncondizionato ? "Incondizionato" : `Target €${soglia.toLocaleString("it-IT")}`}
                                    </Badge>
                                    <span className="text-lg font-bold text-primary">{obj.percentuale_premio}%</span>
                                  </div>
                                  {obj.descrizione && <p className="text-xs text-muted-foreground mb-2">{obj.descrizione}</p>}
                                  {!isIncondizionato && (
                                    <div className="space-y-1">
                                      <Progress value={progress} className={`h-1.5 ${raggiunto ? '[&>div]:bg-green-500' : '[&>div]:bg-amber-500'}`} />
                                      <p className={`text-xs ${raggiunto ? "text-green-600" : "text-amber-600"}`}>
                                        {raggiunto ? "✓ Raggiunto" : `${Math.round(progress)}%`}
                                      </p>
                                    </div>
                                  )}
                                  {raggiunto && (
                                    <p className="text-sm font-semibold text-green-600 mt-1">{formatCurrency(premio)}</p>
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
      </div>

      <PromoFormDialog open={isPromoDialogOpen} onOpenChange={(open) => { setIsPromoDialogOpen(open); if (!open) setEditingPromo(null); }} editingPromo={editingPromo} aziende={aziende} clienti={clienti} prodotti={prodotti} onSave={handleSavePromo} isPending={createCanvass.isPending || updateCanvass.isPending} />
      <ContrattoFormDialog open={isContrattoDialogOpen} onOpenChange={(open) => { setIsContrattoDialogOpen(open); if (!open) setEditingContratto(null); }} editingContratto={editingContratto} aziende={aziende} clienti={clienti} consorzi={consorzi} onSave={handleSaveContratto} isPending={createContratto.isPending || updateContratto.isPending} />
      <PromoDetailSheet promo={viewingPromo} open={!!viewingPromo} onOpenChange={(open) => { if (!open) setViewingPromo(null); }} onEdit={(promo) => { setViewingPromo(null); setEditingPromo(promo); setIsPromoDialogOpen(true); }} onDelete={(id) => { deleteCanvass.mutate(id); setViewingPromo(null); }} />
    </MainLayout>
  );
}
