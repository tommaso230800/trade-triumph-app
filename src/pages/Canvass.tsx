import { useState, useRef, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useCanvass, useCanvassAttive, useContrattiClienti, useCreateCanvass, useUpdateCanvass, useDeleteCanvass, useCreateContrattoCliente, useUpdateContrattoCliente, useDeleteContrattoCliente, Canvass, ContrattoCliente } from "@/hooks/useCanvass";
import { useAziende } from "@/hooks/useAziende";
import { useClienti } from "@/hooks/useClienti";
import { useProdotti } from "@/hooks/useProdotti";
import { useOrdini } from "@/hooks/useOrdini";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus, Percent, Tag, Trophy, Calendar, Building2, Users, Package, Trash2, AlertCircle, Clock, CheckCircle2, AlertTriangle, Upload, Loader2, Sparkles, FileImage, Gift, TrendingUp, Target, Pencil } from "lucide-react";
import { format, parseISO, differenceInDays, isAfter, isBefore } from "date-fns";
import { it } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [selectedAziendaId, setSelectedAziendaId] = useState<string>("");
  const [isParsingAI, setIsParsingAI] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Edit mode state
  const [editingPromo, setEditingPromo] = useState<Canvass | null>(null);
  const [editingContratto, setEditingContratto] = useState<ContrattoCliente | null>(null);
  
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
    cartoni_omaggio: 0,
    cartoni_acquisto: 0,
    periodi_aggiuntivi: [] as { data_inizio: string; data_fine: string }[],
  });

  const [contrattoForm, setContrattoForm] = useState({
    cliente_id: "",
    azienda_id: "",
    anno: new Date().getFullYear(),
    percentuale_premio: 0,
    soglia_fatturato: 0,
    note: "",
    consorzio: "",
    is_consorzio: false,
  });

  const today = new Date();
  
  // Get unique consorzi
  const consorzi = [...new Set(clienti.filter(c => c.consorzio).map(c => c.consorzio))];
  
  // Calculate fatturato by client/consorzio/azienda for the current year
  const fatturatoData = useMemo(() => {
    const currentYear = today.getFullYear();
    const validOrdini = ordini.filter(o => o.status !== "annullato");
    
    return validOrdini.reduce((acc, ordine) => {
      const orderDate = new Date(ordine.data_ordine || ordine.created_at || "");
      if (orderDate.getFullYear() !== currentYear) return acc;
      
      const key = `${ordine.cliente_id || ""}_${ordine.azienda_id || ""}`;
      if (!acc[key]) {
        acc[key] = { cliente_id: ordine.cliente_id, azienda_id: ordine.azienda_id, totale: 0 };
      }
      acc[key].totale += Number(ordine.totale) || 0;
      return acc;
    }, {} as Record<string, { cliente_id: string | null; azienda_id: string | null; totale: number }>);
  }, [ordini, today]);

  // Calculate fatturato by consorzio for the current year
  const fatturatoConsorzioData = useMemo(() => {
    const currentYear = today.getFullYear();
    const validOrdini = ordini.filter(o => o.status !== "annullato");
    
    return validOrdini.reduce((acc, ordine) => {
      const orderDate = new Date(ordine.data_ordine || ordine.created_at || "");
      if (orderDate.getFullYear() !== currentYear) return acc;
      
      const cliente = clienti.find(c => c.id === ordine.cliente_id);
      if (!cliente?.consorzio) return acc;
      
      const key = `${cliente.consorzio}_${ordine.azienda_id || ""}`;
      if (!acc[key]) {
        acc[key] = { consorzio: cliente.consorzio, azienda_id: ordine.azienda_id, totale: 0 };
      }
      acc[key].totale += Number(ordine.totale) || 0;
      return acc;
    }, {} as Record<string, { consorzio: string; azienda_id: string | null; totale: number }>);
  }, [ordini, clienti, today]);
  
  // Statistiche
  const promozioniAttive = canvassAttive.length;
  const promozioniInScadenza = canvass.filter(c => {
    const dataFine = parseISO(c.data_fine);
    const daysLeft = differenceInDays(dataFine, today);
    return c.attivo && daysLeft >= 0 && daysLeft <= 7;
  }).length;
  const contrattiAnnoCorrente = contratti.filter(c => c.anno === today.getFullYear()).length;
  const promozioniFuture = canvass.filter(c => isAfter(parseISO(c.data_inizio), today)).length;

  const openEditPromo = (promo: Canvass) => {
    setEditingPromo(promo);
    setPromoForm({
      nome: promo.nome,
      descrizione: promo.descrizione || "",
      tipo: promo.tipo,
      valore: promo.valore,
      data_inizio: promo.data_inizio,
      data_fine: promo.data_fine,
      attivo: promo.attivo,
      tutti_clienti: promo.tutti_clienti,
      azienda_id: promo.azienda_id,
      clienti_ids: promo.canvass_clienti?.map(cc => cc.cliente_id) || [],
      prodotti: promo.canvass_prodotti?.map(cp => ({ prodotto_id: cp.prodotto_id, valore_override: cp.valore_override || undefined })) || [],
      cartoni_omaggio: promo.cartoni_omaggio || 0,
      cartoni_acquisto: promo.cartoni_acquisto || 0,
      periodi_aggiuntivi: promo.canvass_periodi?.map(p => ({ data_inizio: p.data_inizio, data_fine: p.data_fine })) || [],
    });
    setSelectedAziendaId(promo.azienda_id);
    setIsPromoDialogOpen(true);
  };

  const openEditContratto = (contratto: ContrattoCliente) => {
    setEditingContratto(contratto);
    setContrattoForm({
      cliente_id: contratto.cliente_id || "",
      azienda_id: contratto.azienda_id,
      anno: contratto.anno,
      percentuale_premio: contratto.percentuale_premio,
      soglia_fatturato: contratto.soglia_fatturato || 0,
      note: contratto.note || "",
      consorzio: contratto.consorzio || "",
      is_consorzio: contratto.is_consorzio,
    });
    setIsContrattoDialogOpen(true);
  };

  const handleSavePromo = async () => {
    if (!promoForm.nome || !promoForm.azienda_id || !promoForm.data_inizio || !promoForm.data_fine) {
      return;
    }
    
    const canvassData = {
      nome: promoForm.nome,
      descrizione: promoForm.descrizione || null,
      tipo: promoForm.tipo,
      valore: promoForm.valore,
      data_inizio: promoForm.data_inizio,
      data_fine: promoForm.data_fine,
      attivo: promoForm.attivo,
      tutti_clienti: promoForm.tutti_clienti,
      azienda_id: promoForm.azienda_id,
      cartoni_omaggio: promoForm.cartoni_omaggio,
      cartoni_acquisto: promoForm.cartoni_acquisto,
    };

    if (editingPromo) {
      await updateCanvass.mutateAsync({
        id: editingPromo.id,
        canvass: canvassData,
        clienti_ids: promoForm.tutti_clienti ? [] : promoForm.clienti_ids,
        prodotti: promoForm.prodotti,
        periodi: promoForm.periodi_aggiuntivi.filter(p => p.data_inizio && p.data_fine),
      });
    } else {
      await createCanvass.mutateAsync({
        canvass: canvassData,
        clienti_ids: promoForm.tutti_clienti ? [] : promoForm.clienti_ids,
        prodotti: promoForm.prodotti,
        periodi: promoForm.periodi_aggiuntivi.filter(p => p.data_inizio && p.data_fine),
      });
    }
    
    resetPromoForm();
    setEditingPromo(null);
    setIsPromoDialogOpen(false);
  };

  const resetPromoForm = () => {
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
      cartoni_omaggio: 0,
      cartoni_acquisto: 0,
      periodi_aggiuntivi: [],
    });
    setSelectedAziendaId("");
  };

  const handleSaveContratto = async () => {
    if (contrattoForm.is_consorzio) {
      if (!contrattoForm.consorzio || !contrattoForm.azienda_id) return;
    } else {
      if (!contrattoForm.cliente_id || !contrattoForm.azienda_id) return;
    }
    
    const contrattoData = {
      cliente_id: contrattoForm.is_consorzio ? null : contrattoForm.cliente_id,
      azienda_id: contrattoForm.azienda_id,
      anno: contrattoForm.anno,
      percentuale_premio: contrattoForm.percentuale_premio,
      soglia_fatturato: contrattoForm.soglia_fatturato,
      note: contrattoForm.note || null,
      consorzio: contrattoForm.is_consorzio ? contrattoForm.consorzio : null,
      is_consorzio: contrattoForm.is_consorzio,
    };

    if (editingContratto) {
      await updateContratto.mutateAsync({
        id: editingContratto.id,
        ...contrattoData,
      });
    } else {
      await createContratto.mutateAsync(contrattoData);
    }
    
    resetContrattoForm();
    setEditingContratto(null);
    setIsContrattoDialogOpen(false);
  };

  const resetContrattoForm = () => {
    setContrattoForm({
      cliente_id: "",
      azienda_id: "",
      anno: new Date().getFullYear(),
      percentuale_premio: 0,
      soglia_fatturato: 0,
      note: "",
      consorzio: "",
      is_consorzio: false,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato non supportato. Usa JPG, PNG, WebP o PDF.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File troppo grande. Massimo 10MB.");
      return;
    }

    setIsParsingAI(true);
    setAiResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        const { data, error } = await supabase.functions.invoke("parse-canvass-document", {
          body: {
            file_base64: base64,
            file_type: file.type,
            clienti: clienti.map(c => ({ nome: c.nome, azienda: c.azienda, consorzio: c.consorzio })),
            aziende: aziende.map(a => ({ nome: a.nome })),
            prodotti: prodotti.map(p => ({ nome: p.nome, codice: p.codice })),
          },
        });

        if (error) {
          console.error("AI Parse error:", error);
          toast.error("Errore nell'analisi del documento");
          setIsParsingAI(false);
          return;
        }

        if (data.error) {
          toast.error(data.error);
          setIsParsingAI(false);
          return;
        }

        setAiResult(data.data);
        setIsParsingAI(false);
        setIsAIDialogOpen(true);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("File read error:", err);
      toast.error("Errore nella lettura del file");
      setIsParsingAI(false);
    }
  };

  const applyAIResult = async () => {
    if (!aiResult) return;

    try {
      const azienda = aziende.find(a => a.nome.toLowerCase().includes(aiResult.azienda_nome?.toLowerCase() || ""));
      if (!azienda) {
        toast.error("Azienda non trovata: " + aiResult.azienda_nome);
        return;
      }

      // Handle mixed documents or contracts
      if (aiResult.tipo === "contratto" || aiResult.tipo === "misto") {
        // Create contract(s)
        if (aiResult.obbiettivi && aiResult.obbiettivi.length > 0) {
          // Multiple objectives - create a contract for each or use the first
          const primaryObj = aiResult.obbiettivi[0];
          
          if (aiResult.consorzio) {
            await createContratto.mutateAsync({
              cliente_id: null,
              azienda_id: azienda.id,
              anno: aiResult.anno || new Date().getFullYear(),
              percentuale_premio: primaryObj.percentuale_premio || aiResult.percentuale_premio || 0,
              soglia_fatturato: primaryObj.soglia_fatturato || aiResult.soglia_fatturato || 0,
              note: aiResult.obbiettivi.length > 1 
                ? `Obbiettivi: ${aiResult.obbiettivi.map((o: any) => `${o.percentuale_premio}% sopra ${formatCurrency(o.soglia_fatturato)}`).join(", ")}. ${aiResult.note || ""}`
                : aiResult.note || null,
              consorzio: aiResult.consorzio,
              is_consorzio: true,
            });
          } else {
            const cliente = clienti.find(c => c.nome.toLowerCase().includes(aiResult.cliente_nome?.toLowerCase() || ""));
            if (!cliente) {
              toast.error("Cliente non trovato: " + aiResult.cliente_nome);
              return;
            }

            await createContratto.mutateAsync({
              cliente_id: cliente.id,
              azienda_id: azienda.id,
              anno: aiResult.anno || new Date().getFullYear(),
              percentuale_premio: primaryObj.percentuale_premio || aiResult.percentuale_premio || 0,
              soglia_fatturato: primaryObj.soglia_fatturato || aiResult.soglia_fatturato || 0,
              note: aiResult.obbiettivi.length > 1 
                ? `Obbiettivi: ${aiResult.obbiettivi.map((o: any) => `${o.percentuale_premio}% sopra ${formatCurrency(o.soglia_fatturato)}`).join(", ")}. ${aiResult.note || ""}`
                : aiResult.note || null,
              consorzio: null,
              is_consorzio: false,
            });
          }
          
          toast.success("Contratto creato con successo!");
        } else if (aiResult.percentuale_premio !== undefined) {
          // Single objective contract
          if (aiResult.consorzio) {
            await createContratto.mutateAsync({
              cliente_id: null,
              azienda_id: azienda.id,
              anno: aiResult.anno || new Date().getFullYear(),
              percentuale_premio: aiResult.percentuale_premio || 0,
              soglia_fatturato: aiResult.soglia_fatturato || 0,
              note: aiResult.note || null,
              consorzio: aiResult.consorzio,
              is_consorzio: true,
            });
          } else {
            const cliente = clienti.find(c => c.nome.toLowerCase().includes(aiResult.cliente_nome?.toLowerCase() || ""));
            if (!cliente) {
              toast.error("Cliente non trovato: " + aiResult.cliente_nome);
              return;
            }

            await createContratto.mutateAsync({
              cliente_id: cliente.id,
              azienda_id: azienda.id,
              anno: aiResult.anno || new Date().getFullYear(),
              percentuale_premio: aiResult.percentuale_premio || 0,
              soglia_fatturato: aiResult.soglia_fatturato || 0,
              note: aiResult.note || null,
              consorzio: null,
              is_consorzio: false,
            });
          }
          toast.success("Contratto creato con successo!");
        }
      }

      // Handle promotions
      const promosToCreate = aiResult.promozioni || (aiResult.promozione ? [aiResult.promozione] : []);
      
      for (const promo of promosToCreate) {
        // Find matching products
        const prodottiMatch = promo.prodotti?.map((pName: string) => {
          const found = prodotti.find(p => 
            p.nome.toLowerCase().includes(pName.toLowerCase()) ||
            p.codice?.toLowerCase().includes(pName.toLowerCase())
          );
          return found ? { prodotto_id: found.id } : null;
        }).filter(Boolean) || [];

        // Find matching client
        const clienteMatch = aiResult.cliente_nome 
          ? clienti.find(c => c.nome.toLowerCase().includes(aiResult.cliente_nome.toLowerCase()))
          : null;

        // Handle multiple periods
        const periodiAggiuntivi = promo.periodi?.slice(1) || [];

        await createCanvass.mutateAsync({
          canvass: {
            nome: promo.nome,
            descrizione: aiResult.note || null,
            tipo: promo.tipo,
            valore: promo.valore,
            data_inizio: promo.periodi?.[0]?.data_inizio || promo.data_inizio || format(new Date(), "yyyy-MM-dd"),
            data_fine: promo.periodi?.[0]?.data_fine || promo.data_fine || format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
            attivo: true,
            tutti_clienti: !clienteMatch,
            azienda_id: azienda.id,
            cartoni_omaggio: promo.cartoni_omaggio || 0,
            cartoni_acquisto: promo.cartoni_acquisto || 0,
          },
          clienti_ids: clienteMatch ? [clienteMatch.id] : [],
          prodotti: prodottiMatch,
          periodi: periodiAggiuntivi,
        });
      }

      if (promosToCreate.length > 0) {
        toast.success(`${promosToCreate.length} promozione/i creata/e!`);
      }

      setIsAIDialogOpen(false);
      setAiResult(null);
    } catch (err) {
      console.error("Apply AI result error:", err);
      toast.error("Errore nell'applicazione del risultato");
    }
  };

  const getPromoStatus = (promo: Canvass) => {
    const inizio = parseISO(promo.data_inizio);
    const fine = parseISO(promo.data_fine);
    const todayStr = format(today, "yyyy-MM-dd");
    
    if (!promo.attivo) return { label: "Disattivata", color: "bg-gray-100 text-gray-600", icon: AlertCircle };
    
    // Check if currently in any active period (main or additional)
    const isInMainPeriod = promo.data_inizio <= todayStr && promo.data_fine >= todayStr;
    const isInAdditionalPeriod = promo.canvass_periodi?.some(p => 
      p.data_inizio <= todayStr && p.data_fine >= todayStr
    );
    
    if (isInMainPeriod || isInAdditionalPeriod) {
      // Find the closest end date
      const allEndDates = [promo.data_fine, ...(promo.canvass_periodi?.map(p => p.data_fine) || [])];
      const nextEnd = allEndDates
        .filter(d => d >= todayStr)
        .sort()[0];
      
      if (nextEnd) {
        const daysLeft = differenceInDays(parseISO(nextEnd), today);
        if (daysLeft <= 7) return { label: `Scade tra ${daysLeft}g`, color: "bg-orange-100 text-orange-800", icon: AlertTriangle };
      }
      return { label: "Attiva", color: "bg-green-100 text-green-800", icon: CheckCircle2 };
    }
    
    // Check if all periods are past
    const allEndDates = [promo.data_fine, ...(promo.canvass_periodi?.map(p => p.data_fine) || [])];
    const latestEnd = allEndDates.sort().pop() || promo.data_fine;
    if (isBefore(parseISO(latestEnd), today)) return { label: "Scaduta", color: "bg-red-100 text-red-800", icon: AlertCircle };
    
    // Future
    return { label: "Futura", color: "bg-purple-100 text-purple-800", icon: Clock };
  };

  const filteredProdotti = selectedAziendaId 
    ? prodotti.filter(p => p.azienda_id === selectedAziendaId)
    : prodotti;
    
  // Get clients for selected consorzio
  const clientiConsorzio = contrattoForm.consorzio 
    ? clienti.filter(c => c.consorzio === contrattoForm.consorzio)
    : [];

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
            <h1 className="text-3xl font-bold tracking-tight">Canvass/PFA</h1>
            <p className="text-muted-foreground">Gestisci promozioni, sconti e premi fine anno</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* AI Upload Button */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsingAI}
              className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-200 hover:border-purple-300"
            >
              {isParsingAI ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
              )}
              Importa con AI
            </Button>

            <Dialog open={isContrattoDialogOpen} onOpenChange={(open) => {
              setIsContrattoDialogOpen(open);
              if (!open) {
                setEditingContratto(null);
                resetContrattoForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Trophy className="h-4 w-4 mr-2" />
                  Nuovo Contratto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingContratto ? "Modifica Contratto Premio" : "Nuovo Contratto Premio"}</DialogTitle>
                  <DialogDescription>
                    {editingContratto ? "Modifica il contratto premio fine anno" : "Crea un contratto premio fine anno per un cliente o consorzio"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="is_consorzio" 
                      checked={contrattoForm.is_consorzio} 
                      onCheckedChange={(c) => setContrattoForm(f => ({ ...f, is_consorzio: !!c, cliente_id: "", consorzio: "" }))} 
                    />
                    <Label htmlFor="is_consorzio">Contratto per Consorzio</Label>
                  </div>
                  
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
                  
                  {contrattoForm.is_consorzio ? (
                    <div>
                      <Label>Consorzio *</Label>
                      <Select value={contrattoForm.consorzio} onValueChange={(v) => setContrattoForm(f => ({ ...f, consorzio: v }))}>
                        <SelectTrigger><SelectValue placeholder="Seleziona consorzio" /></SelectTrigger>
                        <SelectContent>
                          {consorzi.map(c => (
                            <SelectItem key={c} value={c!}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {contrattoForm.consorzio && clientiConsorzio.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {clientiConsorzio.length} clienti associati
                        </p>
                      )}
                    </div>
                  ) : (
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
                  )}
                  
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
                  <Button variant="outline" onClick={() => {
                    setIsContrattoDialogOpen(false);
                    setEditingContratto(null);
                    resetContrattoForm();
                  }}>Annulla</Button>
                  <Button onClick={handleSaveContratto} disabled={createContratto.isPending || updateContratto.isPending}>
                    {editingContratto ? "Salva Modifiche" : "Crea"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isPromoDialogOpen} onOpenChange={(open) => {
              setIsPromoDialogOpen(open);
              if (!open) {
                setEditingPromo(null);
                resetPromoForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuova Promozione
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingPromo ? "Modifica Promozione" : "Nuova Promozione"}</DialogTitle>
                  <DialogDescription>
                    {editingPromo ? "Modifica la promozione esistente" : "Crea una nuova promozione o sconto"}
                  </DialogDescription>
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
                  
                  {/* Cartoni omaggio */}
                  <div className="col-span-2 grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                    <div className="col-span-2 flex items-center gap-2">
                      <Gift className="h-4 w-4 text-primary" />
                      <Label className="font-medium">Promo Cartoni Omaggio</Label>
                    </div>
                    <div>
                      <Label className="text-sm">Acquisti (cartoni)</Label>
                      <Input 
                        type="number" 
                        value={promoForm.cartoni_acquisto} 
                        onChange={(e) => setPromoForm(f => ({ ...f, cartoni_acquisto: parseInt(e.target.value) || 0 }))} 
                        placeholder="Es. 10"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Omaggio (cartoni)</Label>
                      <Input 
                        type="number" 
                        value={promoForm.cartoni_omaggio} 
                        onChange={(e) => setPromoForm(f => ({ ...f, cartoni_omaggio: parseInt(e.target.value) || 0 }))} 
                        placeholder="Es. 1"
                      />
                    </div>
                  </div>
                  
                  {/* Periodi Aggiuntivi */}
                  <div className="col-span-2 space-y-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-purple-600" />
                        <Label className="font-medium text-purple-800 dark:text-purple-300">Periodi Aggiuntivi</Label>
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setPromoForm(f => ({ 
                          ...f, 
                          periodi_aggiuntivi: [...f.periodi_aggiuntivi, { data_inizio: "", data_fine: "" }] 
                        }))}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Aggiungi Periodo
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Aggiungi periodi separati durante l'anno (es. Marzo, Giugno, Ottobre)
                    </p>
                    {promoForm.periodi_aggiuntivi.map((periodo, idx) => (
                      <div key={idx} className="grid grid-cols-5 gap-2 items-end">
                        <div className="col-span-2">
                          <Label className="text-xs">Inizio</Label>
                          <Input 
                            type="date" 
                            value={periodo.data_inizio}
                            onChange={(e) => {
                              const newPeriodi = [...promoForm.periodi_aggiuntivi];
                              newPeriodi[idx].data_inizio = e.target.value;
                              setPromoForm(f => ({ ...f, periodi_aggiuntivi: newPeriodi }));
                            }}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Fine</Label>
                          <Input 
                            type="date" 
                            value={periodo.data_fine}
                            onChange={(e) => {
                              const newPeriodi = [...promoForm.periodi_aggiuntivi];
                              newPeriodi[idx].data_fine = e.target.value;
                              setPromoForm(f => ({ ...f, periodi_aggiuntivi: newPeriodi }));
                            }}
                          />
                        </div>
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setPromoForm(f => ({ 
                              ...f, 
                              periodi_aggiuntivi: f.periodi_aggiuntivi.filter((_, i) => i !== idx) 
                            }));
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
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
                  <Button variant="outline" onClick={() => {
                    setIsPromoDialogOpen(false);
                    setEditingPromo(null);
                    resetPromoForm();
                  }}>Annulla</Button>
                  <Button onClick={handleSavePromo} disabled={createCanvass.isPending || updateCanvass.isPending}>
                    {editingPromo ? "Salva Modifiche" : "Crea Promozione"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* AI Result Dialog */}
        <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Risultato Analisi AI
              </DialogTitle>
              <DialogDescription>
                Verifica i dati estratti dal documento
              </DialogDescription>
            </DialogHeader>
            {aiResult && (
              <div className="space-y-4">
                <Alert>
                  <FileImage className="h-4 w-4" />
                  <AlertTitle>
                    {aiResult.tipo === "contratto" ? "Contratto Premio" : 
                     aiResult.tipo === "misto" ? "Documento Misto (Contratto + Promozioni)" : 
                     "Promozione"}
                  </AlertTitle>
                  <AlertDescription>
                    Confidenza: {Math.round((aiResult.confidence || 0) * 100)}%
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {aiResult.azienda_nome && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Azienda</Label>
                      <p className="font-medium">{aiResult.azienda_nome}</p>
                    </div>
                  )}
                  {aiResult.cliente_nome && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Cliente</Label>
                      <p className="font-medium">{aiResult.cliente_nome}</p>
                    </div>
                  )}
                  {aiResult.consorzio && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Consorzio</Label>
                      <p className="font-medium">{aiResult.consorzio}</p>
                    </div>
                  )}
                  {aiResult.anno && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Anno</Label>
                      <p className="font-medium">{aiResult.anno}</p>
                    </div>
                  )}
                </div>

                {/* Multiple objectives */}
                {aiResult.obbiettivi && aiResult.obbiettivi.length > 0 && (
                  <div className="space-y-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200">
                    <Label className="font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Obbiettivi ({aiResult.obbiettivi.length})
                    </Label>
                    {aiResult.obbiettivi.map((obj: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-sm bg-white dark:bg-background p-2 rounded">
                        <span>{obj.descrizione || `Scaglione ${idx + 1}`}</span>
                        <span className="font-medium">
                          {obj.percentuale_premio}% sopra {formatCurrency(obj.soglia_fatturato)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Single contract info */}
                {!aiResult.obbiettivi?.length && aiResult.percentuale_premio !== undefined && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">Premio %</Label>
                      <p className="font-medium">{aiResult.percentuale_premio}%</p>
                    </div>
                    {aiResult.soglia_fatturato > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Soglia</Label>
                        <p className="font-medium">{formatCurrency(aiResult.soglia_fatturato)}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Multiple promotions */}
                {aiResult.promozioni && aiResult.promozioni.length > 0 && (
                  <div className="space-y-2 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200">
                    <Label className="font-medium text-purple-800 dark:text-purple-300 flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Promozioni ({aiResult.promozioni.length})
                    </Label>
                    {aiResult.promozioni.map((promo: any, idx: number) => (
                      <div key={idx} className="text-sm bg-white dark:bg-background p-2 rounded space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{promo.nome}</span>
                          <Badge variant="outline">
                            {promo.valore}{promo.tipo !== "prezzo_fisso" ? "%" : "€"}
                          </Badge>
                        </div>
                        {promo.periodi && promo.periodi.length > 1 && (
                          <div className="flex flex-wrap gap-1">
                            {promo.periodi.map((p: any, pIdx: number) => (
                              <Badge key={pIdx} variant="secondary" className="text-xs">
                                {format(parseISO(p.data_inizio), "dd/MM")} - {format(parseISO(p.data_fine), "dd/MM")}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Single promotion (fallback) */}
                {aiResult.promozione && !aiResult.promozioni?.length && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground">Nome Promozione</Label>
                      <p className="font-medium">{aiResult.promozione.nome}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Tipo</Label>
                      <p className="font-medium">{tipoConfig[aiResult.promozione.tipo as keyof typeof tipoConfig]?.label || aiResult.promozione.tipo}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Valore</Label>
                      <p className="font-medium">{aiResult.promozione.valore}{aiResult.promozione.tipo !== "prezzo_fisso" ? "%" : "€"}</p>
                    </div>
                    {aiResult.promozione.cartoni_omaggio > 0 && (
                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground">Cartoni Omaggio</Label>
                        <p className="font-medium">Prendi {aiResult.promozione.cartoni_acquisto}, ricevi {aiResult.promozione.cartoni_omaggio} omaggio</p>
                      </div>
                    )}
                    {aiResult.promozione.periodi && aiResult.promozione.periodi.length > 1 && (
                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground">Periodi</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {aiResult.promozione.periodi.map((p: any, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {format(parseISO(p.data_inizio), "dd/MM")} - {format(parseISO(p.data_fine), "dd/MM")}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {aiResult.note && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Note</Label>
                    <p className="text-sm">{aiResult.note}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAIDialogOpen(false)}>Annulla</Button>
              <Button onClick={applyAIResult} disabled={createCanvass.isPending || createContratto.isPending}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Applica
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                    <p className="text-sm">Crea la tua prima promozione o importa un documento con AI</p>
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
                                {promo.cartoni_omaggio > 0 && (
                                  <Badge variant="outline" className="mt-1">
                                    <Gift className="h-3 w-3 mr-1" />
                                    {promo.cartoni_acquisto}+{promo.cartoni_omaggio}
                                  </Badge>
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
                              <div className="text-sm space-y-1">
                                <div>
                                  <p>{format(parseISO(promo.data_inizio), "dd MMM", { locale: it })} - {format(parseISO(promo.data_fine), "dd MMM", { locale: it })}</p>
                                </div>
                                {promo.canvass_periodi && promo.canvass_periodi.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {promo.canvass_periodi.map((p, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs bg-purple-50 dark:bg-purple-950/20">
                                        {format(parseISO(p.data_inizio), "dd/MM", { locale: it })} - {format(parseISO(p.data_fine), "dd/MM", { locale: it })}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
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
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => openEditPromo(promo)}
                                >
                                  <Pencil className="h-4 w-4 text-muted-foreground" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => deleteCanvass.mutate(promo.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
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
                <CardDescription>Clienti e consorzi contrattizzati con premi in percentuale sul fatturato</CardDescription>
              </CardHeader>
              <CardContent>
                {contratti.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nessun contratto presente</p>
                    <p className="text-sm">Crea un contratto premio o importa un documento con AI</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente/Consorzio</TableHead>
                        <TableHead>Azienda</TableHead>
                        <TableHead>Anno</TableHead>
                        <TableHead>Premio %</TableHead>
                        <TableHead>Avanzamento Target</TableHead>
                        <TableHead>Premio Stimato</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contratti.map((contratto) => {
                        // Calculate real fatturato from orders for this year
                        let fatturatoReale = 0;
                        
                        if (contratto.is_consorzio) {
                          // For consortium, get fatturato for all associated clients
                          const key = `${contratto.consorzio}_${contratto.azienda_id}`;
                          fatturatoReale = fatturatoConsorzioData[key]?.totale || 0;
                        } else {
                          // For single client
                          const key = `${contratto.cliente_id}_${contratto.azienda_id}`;
                          fatturatoReale = fatturatoData[key]?.totale || 0;
                        }
                        
                        const soglia = contratto.soglia_fatturato || 0;
                        const sogliaRaggiunta = soglia === 0 || fatturatoReale >= soglia;
                        const progressPercent = soglia > 0 ? Math.min((fatturatoReale / soglia) * 100, 100) : 100;
                        const premioStimato = sogliaRaggiunta ? (fatturatoReale * contratto.percentuale_premio / 100) : 0;
                        const clientiAssociati = contratto.is_consorzio 
                          ? clienti.filter(c => c.consorzio === contratto.consorzio)
                          : [];
                        
                        return (
                          <TableRow key={contratto.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {contratto.is_consorzio ? (
                                  <Building2 className="h-4 w-4 text-primary" />
                                ) : (
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                )}
                                <div>
                                  {contratto.is_consorzio ? (
                                    <>
                                      <p className="font-medium">{contratto.consorzio}</p>
                                      <p className="text-xs text-muted-foreground">{clientiAssociati.length} clienti associati</p>
                                    </>
                                  ) : (
                                    <>
                                      <p className="font-medium">{contratto.clienti?.nome}</p>
                                      {contratto.clienti?.azienda && (
                                        <p className="text-sm text-muted-foreground">{contratto.clienti.azienda}</p>
                                      )}
                                    </>
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
                            <TableCell className="min-w-[200px]">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-medium">{formatCurrency(fatturatoReale)}</span>
                                  {soglia > 0 && (
                                    <span className="text-muted-foreground">/ {formatCurrency(soglia)}</span>
                                  )}
                                </div>
                                <Progress 
                                  value={progressPercent} 
                                  className={`h-2 ${sogliaRaggiunta ? '[&>div]:bg-green-500' : '[&>div]:bg-amber-500'}`}
                                />
                                <div className="flex items-center justify-between text-xs">
                                  <span className={sogliaRaggiunta ? "text-green-600 font-medium flex items-center gap-1" : "text-amber-600 flex items-center gap-1"}>
                                    {sogliaRaggiunta ? (
                                      <>
                                        <CheckCircle2 className="h-3 w-3" />
                                        Target raggiunto!
                                      </>
                                    ) : (
                                      <>
                                        <Target className="h-3 w-3" />
                                        {Math.round(progressPercent)}% completato
                                      </>
                                    )}
                                  </span>
                                  {soglia > 0 && !sogliaRaggiunta && (
                                    <span className="text-muted-foreground">
                                      Mancano {formatCurrency(soglia - fatturatoReale)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {sogliaRaggiunta ? (
                                  <span className="font-bold text-green-600 text-lg">{formatCurrency(premioStimato)}</span>
                                ) : (
                                  <span className="text-muted-foreground text-sm">Soglia non raggiunta</span>
                                )}
                                {contratto.note && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[120px]" title={contratto.note}>
                                    {contratto.note}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => openEditContratto(contratto)}
                                >
                                  <Pencil className="h-4 w-4 text-muted-foreground" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => deleteContratto.mutate(contratto.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
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
