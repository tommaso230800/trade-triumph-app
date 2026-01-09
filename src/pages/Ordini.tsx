import { useState, useMemo, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, Filter, MoreHorizontal, Loader2, Trash2, RefreshCw, Edit, FileText, Ban, RotateCcw, Upload } from "lucide-react";
import { useOrdini, useCreateOrdine, useUpdateOrdineStatus, Ordine } from "@/hooks/useOrdini";
import { useClienti } from "@/hooks/useClienti";
import { useAziende } from "@/hooks/useAziende";
import { useProdotti, Prodotto } from "@/hooks/useProdotti";
import { useCreateOrdineRigheBatch, useOrdiniRighe, useUpdateOrdineRiga, useUpdateOrdineTotale } from "@/hooks/useOrdiniRighe";
import { useLastOrdineForClient } from "@/hooks/useLastOrdineRighe";
import { format } from "date-fns";
import { toast } from "sonner";
import { ProformaDialog } from "@/components/ordini/ProformaDialog";
import { supabase } from "@/integrations/supabase/client";
import { ImportPDFDialog } from "@/components/ordini/ImportPDFDialog";

const statusConfig = {
  completato: { label: "Completato", className: "bg-success/10 text-success hover:bg-success/20" },
  in_attesa: { label: "In Attesa", className: "bg-warning/10 text-warning hover:bg-warning/20" },
  spedito: { label: "Spedito", className: "bg-info/10 text-info hover:bg-info/20" },
  annullato: { label: "Annullato", className: "bg-destructive/10 text-destructive hover:bg-destructive/20" },
};

const TIPI_PAGAMENTO = [
  "Anticipato",
  "Contanti",
  "Ri.Ba 30gg",
  "Ri.Ba 60gg",
  "Ri.Ba 90gg",
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);

const parseDecimalInput = (value: string): number => {
  const normalized = value.replace(",", ".");
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
};

type RigaOrdine = {
  prodotto_id: string;
  prodotto_nome: string;
  prezzo_unitario: string;
  quantita_pezzi: number;
  quantita_cartoni: number;
  pezzi_per_cartone: number;
  sc1: string;
  sc2: string;
  sc3: string;
};

const Ordini = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<Ordine["status"] | "tutti">("tutti");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    cliente_id: "",
    azienda_id: "",
    note: "",
    sconto: "0",
    sconto_merce: "0",
    tipo_pagamento: "Contanti",
    data_ordine: format(new Date(), "yyyy-MM-dd"),
  });
  const [righeOrdine, setRigheOrdine] = useState<RigaOrdine[]>([]);
  const [selectedProdotto, setSelectedProdotto] = useState("");
  
  // Edit order state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingOrdine, setEditingOrdine] = useState<Ordine | null>(null);
  const [editRighe, setEditRighe] = useState<{ id: string; prodotto_nome: string; quantita_pezzi: number; quantita_cartoni: number; prezzo_unitario: string; pezzi_per_cartone: number }[]>([]);
  
  // Proforma state
  const [isProformaOpen, setIsProformaOpen] = useState(false);
  
  // Import PDF state
  const [isImportPDFOpen, setIsImportPDFOpen] = useState(false);
  const [proformaData, setProformaData] = useState<{
    codice: string;
    created_at: string;
    cliente_nome: string;
    cliente_indirizzo?: string;
    cliente_citta?: string;
    cliente_cap?: string;
    cliente_piva?: string;
    azienda_nome: string;
    azienda_indirizzo?: string;
    azienda_citta?: string;
    tipo_pagamento: string;
    sconto: number;
    sconto_merce: number;
    totale: number;
    note?: string;
    righe: { prodotto_nome: string; prezzo_unitario: number; quantita_pezzi: number; quantita_cartoni: number; pezzi_per_cartone: number }[];
  } | null>(null);

  const { data: ordini, isLoading } = useOrdini(searchTerm, statusFilter);
  const { data: clienti } = useClienti();
  const { data: aziende } = useAziende();
  const { data: allProdotti, refetch: refetchProdotti } = useProdotti();
  const createOrdine = useCreateOrdine();
  const createRigheBatch = useCreateOrdineRigheBatch();
  const updateStatus = useUpdateOrdineStatus();
  const updateRigaMutation = useUpdateOrdineRiga();
  const updateOrdineTotale = useUpdateOrdineTotale();
  
  // Fetch righe for editing
  const { data: righeForEdit, refetch: refetchRighe } = useOrdiniRighe(editingOrdine?.id);

  // Get last order for restock functionality
  const { data: lastOrdineData } = useLastOrdineForClient(
    formData.cliente_id || undefined,
    formData.azienda_id || undefined
  );

  // Filter products by selected company
  const prodottiAzienda = useMemo(() => {
    if (!formData.azienda_id || !allProdotti) return [];
    return allProdotti.filter((p) => p.azienda_id === formData.azienda_id);
  }, [formData.azienda_id, allProdotti]);

  const addProdottoToOrder = () => {
    if (!selectedProdotto) return;
    const prodotto = prodottiAzienda.find((p) => p.id === selectedProdotto);
    if (!prodotto) return;

    // Check if already added
    if (righeOrdine.find((r) => r.prodotto_id === prodotto.id)) {
      return;
    }

    setRigheOrdine([
      ...righeOrdine,
      {
        prodotto_id: prodotto.id,
        prodotto_nome: prodotto.nome,
        prezzo_unitario: String(prodotto.prezzo_listino).replace(".", ","),
        quantita_pezzi: 0,
        quantita_cartoni: 0,
        pezzi_per_cartone: prodotto.pezzi_per_cartone,
        sc1: "0",
        sc2: "0",
        sc3: "0",
      },
    ]);
    setSelectedProdotto("");
  };

  const updateRiga = (index: number, field: keyof RigaOrdine, value: number | string) => {
    const updated = [...righeOrdine];
    updated[index] = { ...updated[index], [field]: value };
    setRigheOrdine(updated);
  };

  const removeRiga = (index: number) => {
    setRigheOrdine(righeOrdine.filter((_, i) => i !== index));
  };

  const calcolaTotale = () => {
    const subtotale = righeOrdine.reduce((sum, riga) => {
      const pezziTotali = riga.quantita_pezzi + riga.quantita_cartoni * riga.pezzi_per_cartone;
      const prezzoBase = pezziTotali * parseDecimalInput(riga.prezzo_unitario);
      const sc1 = parseDecimalInput(riga.sc1);
      const sc2 = parseDecimalInput(riga.sc2);
      const sc3 = parseDecimalInput(riga.sc3);
      const scontoTotale = 1 - (1 - sc1 / 100) * (1 - sc2 / 100) * (1 - sc3 / 100);
      return sum + prezzoBase * (1 - scontoTotale);
    }, 0);
    
    const sconto = parseDecimalInput(formData.sconto);
    const scontoMerce = parseDecimalInput(formData.sconto_merce);
    
    // Apply percentage discount
    const afterSconto = subtotale * (1 - sconto / 100);
    // Subtract merchandise discount value
    return Math.max(0, afterSconto - scontoMerce);
  };

  const calcolaProdottiTotali = () => {
    return righeOrdine.reduce((sum, riga) => {
      return sum + riga.quantita_pezzi + riga.quantita_cartoni * riga.pezzi_per_cartone;
    }, 0);
  };

  // Handle opening edit dialog
  const handleOpenEditDialog = (ordine: Ordine) => {
    setEditingOrdine(ordine);
    setIsEditDialogOpen(true);
  };

  // Populate edit righe when data arrives
  useEffect(() => {
    if (righeForEdit && isEditDialogOpen) {
      setEditRighe(righeForEdit.map((r) => ({
        id: r.id,
        prodotto_nome: r.prodotti?.nome || "Prodotto",
        quantita_pezzi: r.quantita_pezzi,
        quantita_cartoni: r.quantita_cartoni,
        prezzo_unitario: String(r.prezzo_unitario).replace(".", ","),
        pezzi_per_cartone: r.prodotti?.pezzi_per_cartone || 1,
      })));
    }
  }, [righeForEdit, isEditDialogOpen]);

  const updateEditRiga = (index: number, field: string, value: number | string) => {
    const updated = [...editRighe];
    updated[index] = { ...updated[index], [field]: value };
    setEditRighe(updated);
  };

  const calcolaEditTotale = () => {
    if (!editingOrdine) return 0;
    const subtotale = editRighe.reduce((sum, riga) => {
      const pezziTotali = riga.quantita_pezzi + riga.quantita_cartoni * riga.pezzi_per_cartone;
      return sum + pezziTotali * parseDecimalInput(riga.prezzo_unitario);
    }, 0);
    
    const sconto = Number(editingOrdine.sconto) || 0;
    const scontoMerce = Number(editingOrdine.sconto_merce) || 0;
    
    const afterSconto = subtotale * (1 - sconto / 100);
    return Math.max(0, afterSconto - scontoMerce);
  };

  const calcolaEditProdottiTotali = () => {
    return editRighe.reduce((sum, riga) => {
      return sum + riga.quantita_pezzi + riga.quantita_cartoni * riga.pezzi_per_cartone;
    }, 0);
  };

  const handleSaveEditRighe = async () => {
    if (!editingOrdine) return;
    
    try {
      // Update each riga
      for (const riga of editRighe) {
        await updateRigaMutation.mutateAsync({
          id: riga.id,
          quantita_pezzi: riga.quantita_pezzi,
          quantita_cartoni: riga.quantita_cartoni,
          prezzo_unitario: parseDecimalInput(riga.prezzo_unitario),
        });
      }
      
      // Update order totals
      await updateOrdineTotale.mutateAsync({
        ordine_id: editingOrdine.id,
        totale: calcolaEditTotale(),
        prodotti: calcolaEditProdottiTotali(),
      });
      
      setIsEditDialogOpen(false);
      setEditingOrdine(null);
      setEditRighe([]);
    } catch (error) {
      console.error("Error saving righe:", error);
    }
  };

  const handleRiassortimento = () => {
    if (!lastOrdineData) {
      toast.error("Nessun ordine precedente trovato per questo cliente/azienda");
      return;
    }

    const { ordine, righe } = lastOrdineData;

    // Set payment info from last order
    setFormData((prev) => ({
      ...prev,
      sconto: String(ordine.sconto || 0).replace(".", ","),
      sconto_merce: String(ordine.sconto_merce || 0).replace(".", ","),
      tipo_pagamento: ordine.tipo_pagamento || "Contanti",
    }));

    // Set order lines from last order
    const newRighe: RigaOrdine[] = righe.map((r) => ({
      prodotto_id: r.prodotto_id,
      prodotto_nome: r.prodotti?.nome || "Prodotto",
      prezzo_unitario: String(r.prezzo_unitario).replace(".", ","),
      quantita_pezzi: r.quantita_pezzi,
      quantita_cartoni: r.quantita_cartoni,
      pezzi_per_cartone: r.prodotti?.pezzi_per_cartone || 1,
      sc1: "0",
      sc2: "0",
      sc3: "0",
    }));

    setRigheOrdine(newRighe);
    toast.success("Dati dell'ultimo ordine caricati!");
  };

  const handleSubmit = async () => {
    if (righeOrdine.length === 0) return;

    const totale = calcolaTotale();
    const prodottiCount = calcolaProdottiTotali();

    const ordine = await createOrdine.mutateAsync({
      cliente_id: formData.cliente_id || undefined,
      azienda_id: formData.azienda_id || undefined,
      prodotti: prodottiCount,
      totale,
      note: formData.note || undefined,
      sconto: parseDecimalInput(formData.sconto),
      sconto_merce: parseDecimalInput(formData.sconto_merce),
      tipo_pagamento: formData.tipo_pagamento,
      data_ordine: formData.data_ordine,
    });

    // Create order lines
    await createRigheBatch.mutateAsync(
      righeOrdine.map((riga) => ({
        ordine_id: ordine.id,
        prodotto_id: riga.prodotto_id,
        quantita_pezzi: riga.quantita_pezzi,
        quantita_cartoni: riga.quantita_cartoni,
        prezzo_unitario: parseDecimalInput(riga.prezzo_unitario),
      }))
    );

    // Get client and company details for proforma
    const cliente = clienti?.find((c) => c.id === formData.cliente_id);
    const azienda = aziende?.find((a) => a.id === formData.azienda_id);

    // Show proforma
    setProformaData({
      codice: ordine.codice || `ORD-${ordine.id.slice(0, 8)}`,
      created_at: ordine.created_at,
      cliente_nome: cliente?.nome || "N/A",
      cliente_indirizzo: cliente?.indirizzo || undefined,
      cliente_citta: cliente?.citta || undefined,
      cliente_cap: cliente?.cap || undefined,
      cliente_piva: cliente?.partita_iva || undefined,
      azienda_nome: azienda?.nome || "N/A",
      azienda_indirizzo: azienda?.indirizzo || undefined,
      azienda_citta: azienda?.citta || undefined,
      tipo_pagamento: formData.tipo_pagamento,
      sconto: parseDecimalInput(formData.sconto),
      sconto_merce: parseDecimalInput(formData.sconto_merce),
      totale,
      note: formData.note || undefined,
      righe: righeOrdine.map((riga) => ({
        prodotto_nome: riga.prodotto_nome,
        prezzo_unitario: parseDecimalInput(riga.prezzo_unitario),
        quantita_pezzi: riga.quantita_pezzi,
        quantita_cartoni: riga.quantita_cartoni,
        pezzi_per_cartone: riga.pezzi_per_cartone,
      })),
    });
    setIsProformaOpen(true);

    setIsDialogOpen(false);
    setFormData({ cliente_id: "", azienda_id: "", note: "", sconto: "0", sconto_merce: "0", tipo_pagamento: "Contanti", data_ordine: format(new Date(), "yyyy-MM-dd") });
    setRigheOrdine([]);
  };

  // Handle showing proforma for existing order
  const handleShowProforma = async (ordine: Ordine) => {
    // We need to fetch the righe for this order
    const cliente = clienti?.find((c) => c.id === ordine.cliente_id);
    const azienda = aziende?.find((a) => a.id === ordine.azienda_id);
    
    // Fetch righe
    const { data: righeData } = await supabase
      .from("ordini_righe")
      .select(`
        *,
        prodotti (nome, pezzi_per_cartone)
      `)
      .eq("ordine_id", ordine.id);
    
    setProformaData({
      codice: ordine.codice || `ORD-${ordine.id.slice(0, 8)}`,
      created_at: ordine.created_at,
      cliente_nome: cliente?.nome || ordine.clienti?.nome || "N/A",
      cliente_indirizzo: cliente?.indirizzo || undefined,
      cliente_citta: cliente?.citta || undefined,
      cliente_cap: cliente?.cap || undefined,
      cliente_piva: cliente?.partita_iva || undefined,
      azienda_nome: azienda?.nome || ordine.aziende?.nome || "N/A",
      azienda_indirizzo: azienda?.indirizzo || undefined,
      azienda_citta: azienda?.citta || undefined,
      tipo_pagamento: ordine.tipo_pagamento || "Contanti",
      sconto: Number(ordine.sconto) || 0,
      sconto_merce: Number(ordine.sconto_merce) || 0,
      totale: Number(ordine.totale),
      note: ordine.note || undefined,
      righe: (righeData || []).map((r: any) => ({
        prodotto_nome: r.prodotti?.nome || "Prodotto",
        prezzo_unitario: Number(r.prezzo_unitario),
        quantita_pezzi: r.quantita_pezzi,
        quantita_cartoni: r.quantita_cartoni,
        pezzi_per_cartone: r.prodotti?.pezzi_per_cartone || 1,
      })),
    });
    setIsProformaOpen(true);
  };

  // Separate active orders from cancelled ones
  const ordiniAttivi = useMemo(() => 
    ordini?.filter((o) => o.status !== "annullato") || [], 
    [ordini]
  );
  
  const ordiniAnnullati = useMemo(() => 
    ordini?.filter((o) => o.status === "annullato") || [], 
    [ordini]
  );

  const stats = {
    totale: ordiniAttivi.length,
    inAttesa: ordiniAttivi.filter((o) => o.status === "in_attesa").length,
    completati: ordiniAttivi.filter((o) => o.status === "completato").length,
    valoreTotale: ordiniAttivi.reduce((sum, o) => sum + Number(o.totale), 0),
    annullati: ordiniAnnullati.length,
    valoreAnnullato: ordiniAnnullati.reduce((sum, o) => sum + Number(o.totale), 0),
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">Gestione Ordini</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Crea e gestisci gli ordini dei tuoi clienti
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setIsImportPDFOpen(true)}>
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Importa PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setFormData({ cliente_id: "", azienda_id: "", note: "", sconto: "0", sconto_merce: "0", tipo_pagamento: "Contanti", data_ordine: format(new Date(), "yyyy-MM-dd") });
                setRigheOrdine([]);
                setSelectedProdotto("");
              }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Nuovo Ordine</span>
                  <span className="sm:hidden">Aggiungi</span>
                </Button>
              </DialogTrigger>
            <DialogContent className="w-full max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>Crea Nuovo Ordine</DialogTitle>
                <DialogDescription>Seleziona cliente, azienda e aggiungi i prodotti</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Data Ordine */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Data Ordine</Label>
                  <Input
                    type="date"
                    value={formData.data_ordine}
                    onChange={(e) => setFormData({ ...formData, data_ordine: e.target.value })}
                  />
                </div>

                {/* Cliente e Azienda */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Cliente</Label>
                    <Select value={formData.cliente_id} onValueChange={(v) => setFormData({ ...formData, cliente_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clienti?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Azienda Fornitrice *</Label>
                    <Select 
                      value={formData.azienda_id} 
                      onValueChange={(v) => {
                        setFormData({ ...formData, azienda_id: v });
                        setRigheOrdine([]);
                        setSelectedProdotto("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona azienda" />
                      </SelectTrigger>
                      <SelectContent>
                        {aziende?.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Riassortimento Button */}
                {formData.cliente_id && formData.azienda_id && lastOrdineData && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleRiassortimento}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Riassortimento (carica ultimo ordine)
                  </Button>
                )}

                {/* Payment and Discounts */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Tipo Pagamento</Label>
                    <Select value={formData.tipo_pagamento} onValueChange={(v) => setFormData({ ...formData, tipo_pagamento: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPI_PAGAMENTO.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Sconto (%)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={formData.sconto}
                      onChange={(e) => setFormData({ ...formData, sconto: e.target.value })}
                      placeholder="es. 10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Sconto Merce (€)</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={formData.sconto_merce}
                      onChange={(e) => setFormData({ ...formData, sconto_merce: e.target.value })}
                      placeholder="es. 50"
                    />
                  </div>
                </div>

                {/* Add Product */}
                {formData.azienda_id && (
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium">Aggiungi Prodotti</h4>
                    <div className="flex gap-2">
                      <Select value={selectedProdotto} onValueChange={setSelectedProdotto}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Seleziona prodotto" />
                        </SelectTrigger>
                        <SelectContent>
                          {prodottiAzienda.map((p) => (
                            <SelectItem key={p.id} value={p.id} disabled={righeOrdine.some((r) => r.prodotto_id === p.id)}>
                              {p.nome} - {formatCurrency(p.prezzo_listino)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={addProdottoToOrder} disabled={!selectedProdotto}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {prodottiAzienda.length === 0 && (
                      <p className="text-sm text-muted-foreground">Nessun prodotto disponibile per questa azienda</p>
                    )}
                  </div>
                )}

                {/* Order Lines - Mobile Optimized */}
                {righeOrdine.length > 0 && (
                  <div className="space-y-3 border-t pt-4">
                    <h4 className="font-medium text-sm">Prodotti nell'ordine</h4>
                    <div className="space-y-3">
                      {righeOrdine.map((riga, index) => {
                        const pezziTotali = riga.quantita_pezzi + riga.quantita_cartoni * riga.pezzi_per_cartone;
                        const prezzoBase = pezziTotali * parseDecimalInput(riga.prezzo_unitario);
                        const sc1 = parseDecimalInput(riga.sc1);
                        const sc2 = parseDecimalInput(riga.sc2);
                        const sc3 = parseDecimalInput(riga.sc3);
                        const scontoTotale = 1 - (1 - sc1 / 100) * (1 - sc2 / 100) * (1 - sc3 / 100);
                        const subtotale = prezzoBase * (1 - scontoTotale);
                        return (
                          <div key={riga.prodotto_id} className="bg-muted/50 rounded-xl p-3 space-y-3">
                            {/* Product Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{riga.prodotto_nome}</p>
                                <p className="text-xs text-muted-foreground">{riga.pezzi_per_cartone} pz/cartone</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                                onClick={() => removeRiga(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            {/* Inputs Grid - Row 1 */}
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Prezzo</Label>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  className="h-10 px-2 text-sm"
                                  value={riga.prezzo_unitario}
                                  onChange={(e) => updateRiga(index, "prezzo_unitario", e.target.value)}
                                  placeholder="1,85"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Pezzi</Label>
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  min="0"
                                  className="h-10 px-2 text-sm"
                                  value={riga.quantita_pezzi}
                                  onChange={(e) => updateRiga(index, "quantita_pezzi", parseInt(e.target.value) || 0)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Cartoni</Label>
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  min="0"
                                  className="h-10 px-2 text-sm"
                                  value={riga.quantita_cartoni}
                                  onChange={(e) => updateRiga(index, "quantita_cartoni", parseInt(e.target.value) || 0)}
                                />
                              </div>
                            </div>
                            
                            {/* Inputs Grid - Row 2: Sconti */}
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Sc1 %</Label>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  className="h-10 px-2 text-sm"
                                  value={riga.sc1}
                                  onChange={(e) => updateRiga(index, "sc1", e.target.value)}
                                  placeholder="0"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Sc2 %</Label>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  className="h-10 px-2 text-sm"
                                  value={riga.sc2}
                                  onChange={(e) => updateRiga(index, "sc2", e.target.value)}
                                  placeholder="0"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Sc3 %</Label>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  className="h-10 px-2 text-sm"
                                  value={riga.sc3}
                                  onChange={(e) => updateRiga(index, "sc3", e.target.value)}
                                  placeholder="0"
                                />
                              </div>
                            </div>
                            
                            {/* Subtotal */}
                            <div className="flex justify-end pt-1 border-t border-border/50">
                              <p className="text-sm font-semibold">{formatCurrency(subtotale)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-end">
                      <div className="text-right space-y-1">
                        <p className="text-sm text-muted-foreground">Totale prodotti: {calcolaProdottiTotali()} pezzi</p>
                        {(parseDecimalInput(formData.sconto) > 0 || parseDecimalInput(formData.sconto_merce) > 0) && (
                          <p className="text-sm text-muted-foreground">
                            Sconto: {formData.sconto}% + {formatCurrency(parseDecimalInput(formData.sconto_merce))}
                          </p>
                        )}
                        <p className="text-xl font-bold">{formatCurrency(calcolaTotale())}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Note</Label>
                  <Textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Note aggiuntive..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annulla
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={createOrdine.isPending || createRigheBatch.isPending || righeOrdine.length === 0}
                >
                  {(createOrdine.isPending || createRigheBatch.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crea Ordine
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        </div>

        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-card p-4 shadow-card">
            <p className="text-xs lg:text-sm text-muted-foreground">Ordini Totali</p>
            <p className="text-xl lg:text-2xl font-bold text-card-foreground">{stats.totale}</p>
          </div>
          <div className="rounded-lg bg-card p-4 shadow-card">
            <p className="text-xs lg:text-sm text-muted-foreground">In Attesa</p>
            <p className="text-xl lg:text-2xl font-bold text-warning">{stats.inAttesa}</p>
          </div>
          <div className="rounded-lg bg-card p-4 shadow-card">
            <p className="text-xs lg:text-sm text-muted-foreground">Completati</p>
            <p className="text-xl lg:text-2xl font-bold text-success">{stats.completati}</p>
          </div>
          <div className="rounded-lg bg-card p-4 shadow-card">
            <p className="text-xs lg:text-sm text-muted-foreground">Valore Totale</p>
            <p className="text-xl lg:text-2xl font-bold text-card-foreground">{formatCurrency(stats.valoreTotale)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cerca ordine..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti</SelectItem>
              <SelectItem value="in_attesa">In Attesa</SelectItem>
              <SelectItem value="spedito">Spedito</SelectItem>
              <SelectItem value="completato">Completato</SelectItem>
              <SelectItem value="annullato">Annullato</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !ordiniAttivi.length && !ordiniAnnullati.length ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nessun ordine trovato</p>
            <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
              Crea il primo ordine
            </Button>
          </div>
        ) : (
          <>
          <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>ID Ordine</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden sm:table-cell">Prodotti</TableHead>
                    <TableHead>Totale</TableHead>
                    <TableHead className="hidden md:table-cell">Pagamento</TableHead>
                    <TableHead className="hidden md:table-cell">Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordiniAttivi.map((ordine) => (
                    <TableRow key={ordine.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs lg:text-sm font-medium text-primary">
                        {ordine.codice}
                      </TableCell>
                      <TableCell className="font-medium text-card-foreground">
                        <span className="truncate block max-w-[120px] sm:max-w-none">
                          {ordine.clienti?.nome || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{ordine.prodotti} articoli</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(Number(ordine.totale))}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {ordine.tipo_pagamento || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {format(new Date(ordine.data_ordine || ordine.created_at), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[ordine.status].className}>
                          <span className="hidden sm:inline">{statusConfig[ordine.status].label}</span>
                          <span className="sm:hidden">{statusConfig[ordine.status].label.slice(0, 4)}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleShowProforma(ordine)}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Visualizza Proforma
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleOpenEditDialog(ordine)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Modifica Quantità
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateStatus.mutate({ id: ordine.id, status: "spedito" })}
                            >
                              Segna come Spedito
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateStatus.mutate({ id: ordine.id, status: "completato" })}
                            >
                              Segna come Completato
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => updateStatus.mutate({ id: ordine.id, status: "annullato" })}
                            >
                              Annulla
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Cancelled Orders Section */}
          {ordiniAnnullati.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <Ban className="h-5 w-5 text-destructive" />
                <h2 className="text-lg font-semibold text-foreground">
                  Ordini Annullati ({ordiniAnnullati.length})
                </h2>
                <span className="text-sm text-muted-foreground ml-2">
                  Valore perso: {formatCurrency(stats.valoreAnnullato)}
                </span>
              </div>
              <div className="rounded-xl bg-card shadow-card overflow-hidden border border-destructive/20">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-destructive/5">
                        <TableHead>ID Ordine</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="hidden sm:table-cell">Prodotti</TableHead>
                        <TableHead>Totale</TableHead>
                        <TableHead className="hidden md:table-cell">Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordiniAnnullati.map((ordine) => (
                        <TableRow key={ordine.id} className="hover:bg-muted/30 transition-colors opacity-70">
                          <TableCell className="font-mono text-xs lg:text-sm font-medium text-muted-foreground">
                            {ordine.codice}
                          </TableCell>
                          <TableCell className="font-medium text-muted-foreground">
                            <span className="truncate block max-w-[120px] sm:max-w-none">
                              {ordine.clienti?.nome || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">
                            {ordine.prodotti} articoli
                          </TableCell>
                          <TableCell className="font-semibold text-muted-foreground line-through">
                            {formatCurrency(Number(ordine.totale))}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {format(new Date(ordine.created_at), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusConfig[ordine.status].className}>
                              {statusConfig[ordine.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleShowProforma(ordine)}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Visualizza Proforma
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => updateStatus.mutate({ id: ordine.id, status: "in_attesa" })}
                                >
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Riattiva Ordine
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </>
        )}

        {/* Edit Order Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setEditingOrdine(null);
            setEditRighe([]);
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifica Ordine {editingOrdine?.codice}</DialogTitle>
              <DialogDescription>
                Modifica le quantità dei prodotti nell'ordine
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {editRighe.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prodotto</TableHead>
                      <TableHead>Prezzo</TableHead>
                      <TableHead>Pezzi</TableHead>
                      <TableHead>Cartoni</TableHead>
                      <TableHead>Subtotale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editRighe.map((riga, index) => {
                      const pezziTotali = riga.quantita_pezzi + riga.quantita_cartoni * riga.pezzi_per_cartone;
                      const subtotale = pezziTotali * parseDecimalInput(riga.prezzo_unitario);
                      return (
                        <TableRow key={riga.id}>
                          <TableCell className="font-medium">
                            {riga.prodotto_nome}
                            <span className="text-xs text-muted-foreground block">
                              {riga.pezzi_per_cartone} pz/cartone
                            </span>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              inputMode="decimal"
                              className="w-20"
                              value={riga.prezzo_unitario}
                              onChange={(e) => updateEditRiga(index, "prezzo_unitario", e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              className="w-20"
                              value={riga.quantita_pezzi}
                              onChange={(e) => updateEditRiga(index, "quantita_pezzi", parseInt(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              className="w-20"
                              value={riga.quantita_cartoni}
                              onChange={(e) => updateEditRiga(index, "quantita_cartoni", parseInt(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell className="font-semibold">{formatCurrency(subtotale)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              <div className="flex justify-end pt-4 border-t">
                <div className="text-right space-y-1">
                  <p className="text-sm text-muted-foreground">Totale prodotti: {calcolaEditProdottiTotali()} pezzi</p>
                  {editingOrdine && (Number(editingOrdine.sconto) > 0 || Number(editingOrdine.sconto_merce) > 0) && (
                    <p className="text-sm text-muted-foreground">
                      Sconto: {editingOrdine.sconto}% + {formatCurrency(Number(editingOrdine.sconto_merce))}
                    </p>
                  )}
                  <p className="text-xl font-bold">{formatCurrency(calcolaEditTotale())}</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annulla
              </Button>
              <Button 
                onClick={handleSaveEditRighe}
                disabled={updateRigaMutation.isPending || updateOrdineTotale.isPending}
              >
                {(updateRigaMutation.isPending || updateOrdineTotale.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salva Modifiche
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Proforma Dialog */}
        <ProformaDialog 
          open={isProformaOpen} 
          onOpenChange={setIsProformaOpen} 
          data={proformaData} 
        />

        {/* Import PDF Dialog */}
        <ImportPDFDialog
          open={isImportPDFOpen}
          onOpenChange={setIsImportPDFOpen}
          clienti={clienti || []}
          aziende={aziende || []}
          prodotti={allProdotti || []}
          onProductsCreated={() => refetchProdotti()}
          onImportComplete={async (data) => {
            try {
              const ordine = await createOrdine.mutateAsync({
                cliente_id: data.cliente_id,
                azienda_id: data.azienda_id,
                prodotti: data.righe.reduce((sum, r) => sum + r.quantita_pezzi + r.quantita_cartoni, 0),
                totale: data.totale,
                note: data.note || undefined,
                sconto: data.sconto,
                sconto_merce: data.sconto_merce,
                tipo_pagamento: data.tipo_pagamento,
                data_ordine: data.data_ordine,
              });

              await createRigheBatch.mutateAsync(
                data.righe.map((riga) => ({
                  ordine_id: ordine.id,
                  prodotto_id: riga.prodotto_id,
                  quantita_pezzi: riga.quantita_pezzi,
                  quantita_cartoni: riga.quantita_cartoni,
                  prezzo_unitario: riga.prezzo_unitario,
                }))
              );

              toast.success("Ordine importato con successo!");
            } catch (error) {
              console.error("Error importing order:", error);
              toast.error("Errore nell'importazione dell'ordine");
            }
          }}
        />
      </div>
    </MainLayout>
  );
};

export default Ordini;
