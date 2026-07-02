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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus, Search, Filter, MoreHorizontal, Loader2, Trash2, RefreshCw, Edit, FileText, Ban, RotateCcw, Upload, Tag, Gift, Sparkles, CheckCircle2, PauseCircle, PlayCircle } from "lucide-react";
import { useOrdini, useCreateOrdine, useUpdateOrdineStatus, useUpdateOrdine, useConfermaOrdineDaStandBy, Ordine } from "@/hooks/useOrdini";
import { useClienti } from "@/hooks/useClienti";
import { useAziende } from "@/hooks/useAziende";
import { useProdotti, Prodotto } from "@/hooks/useProdotti";
import { useCreateOrdineRigheBatch, useOrdiniRighe, useUpdateOrdineRiga, useUpdateOrdineTotale } from "@/hooks/useOrdiniRighe";
import { useClientProductHistory } from "@/hooks/useClientProductHistory";
import { useCanvassAttive } from "@/hooks/useCanvass";
import { useBrands } from "@/hooks/useBrands";
import { format } from "date-fns";
import { toast } from "sonner";
import { ProformaDialog } from "@/components/ordini/ProformaDialog";
import { supabase } from "@/integrations/supabase/client";
import { ImportPDFDialog } from "@/components/ordini/ImportPDFDialog";
import { MultiFileImportDialog } from "@/components/ordini/MultiFileImportDialog";
import { StandByDialog } from "@/components/ordini/StandByDialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MultiSelect } from "@/components/ui/multi-select";

const statusConfig = {
  completato: { label: "Completato", className: "bg-success/10 text-success hover:bg-success/20" },
  in_attesa: { label: "In Attesa", className: "bg-warning/10 text-warning hover:bg-warning/20" },
  spedito: { label: "Spedito", className: "bg-info/10 text-info hover:bg-info/20" },
  annullato: { label: "Annullato", className: "bg-destructive/10 text-destructive hover:bg-destructive/20" },
  stand_by: { label: "Stand-by", className: "bg-warning/15 text-warning border border-warning/40 hover:bg-warning/25" },
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
  prodotto_codice?: string;
  prodotto_brand_id?: string;
  prezzo_unitario: string;
  quantita_pezzi: number;
  quantita_cartoni: number;
  pezzi_per_cartone: number;
  sc1: string;
  sc2: string;
  sc3: string;
  is_omaggio?: boolean;
  // Pallettizzazione info
  strati: number;
  cartoni_per_strato: number;
  formato: string | null;
};

const Ordini = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<Ordine["status"] | "tutti">("tutti");
  const [monthFilters, setMonthFilters] = useState<string[]>([]);
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
  const [editFormData, setEditFormData] = useState({
    cliente_id: "",
    azienda_id: "",
    note: "",
    sconto: "0",
    sconto_merce: "0",
    tipo_pagamento: "Contanti",
    data_ordine: "",
  });
  const [editRighe, setEditRighe] = useState<{ 
    id: string; 
    prodotto_nome: string; 
    quantita_pezzi: number; 
    quantita_cartoni: number; 
    prezzo_unitario: string; 
    pezzi_per_cartone: number;
    sc1: string;
    sc2: string;
    sc3: string;
  }[]>([]);
  
  // Proforma state
  const [isProformaOpen, setIsProformaOpen] = useState(false);
  
  // Import PDF state
  const [isImportPDFOpen, setIsImportPDFOpen] = useState(false);
  const [isMultiImportOpen, setIsMultiImportOpen] = useState(false);
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
    righe: { 
      prodotto_codice?: string;
      prodotto_nome: string; 
      prodotto_brand?: string;
      prezzo_unitario: number; 
      quantita_pezzi: number; 
      quantita_cartoni: number; 
      pezzi_per_cartone: number;
      sc1?: number;
      sc2?: number;
      sc3?: number;
      is_omaggio?: boolean;
      promo_applicata?: string;
      promo_tipo?: string;
      promo_valore?: number;
    }[];
    promozioni_applicate?: { nome: string; tipo: string; valore: number }[];
  } | null>(null);

  const { data: ordini, isLoading } = useOrdini(searchTerm, statusFilter, monthFilters);
  const { data: clienti } = useClienti();
  const { data: aziende } = useAziende();
  const { data: allProdotti, refetch: refetchProdotti } = useProdotti();
  const { data: canvassAttive = [] } = useCanvassAttive();
  const { data: brands } = useBrands();
  const createOrdine = useCreateOrdine();
  const createRigheBatch = useCreateOrdineRigheBatch();
  const updateStatus = useUpdateOrdineStatus();
  const updateRigaMutation = useUpdateOrdineRiga();
  const updateOrdineTotale = useUpdateOrdineTotale();
  const updateOrdine = useUpdateOrdine();
  const confermaStandBy = useConfermaOrdineDaStandBy();

  // Stand-by dialog state
  const [standByTarget, setStandByTarget] = useState<{ id: string; codice?: string } | null>(null);

  // Searchable options for dropdowns
  const clientiOptions = useMemo(() => 
    clienti?.map(c => ({
      value: c.id,
      label: c.nome,
      searchTerms: [c.azienda || "", c.citta || "", c.consorzio || "", c.partita_iva || ""]
    })) || [], 
    [clienti]
  );

  const aziendeOptions = useMemo(() => 
    aziende?.map(a => ({
      value: a.id,
      label: a.nome,
      searchTerms: [a.settore || "", a.citta || "", a.partita_iva || ""]
    })) || [], 
    [aziende]
  );

  const prodottiOptions = useMemo(() => {
    if (!formData.azienda_id || !allProdotti) return [];
    const prodotti = allProdotti.filter(p => p.azienda_id === formData.azienda_id);
    return prodotti.map(p => {
      const brand = brands?.find(b => b.id === p.brand_id);
      return {
        value: p.id,
        label: `${p.nome} - ${formatCurrency(p.prezzo_listino)}`,
        searchTerms: [
          p.codice || "", 
          p.formato || "", 
          brand?.name || "",
          aziende?.find(a => a.id === p.azienda_id)?.nome || ""
        ]
      };
    });
  }, [formData.azienda_id, allProdotti, brands, aziende]);
  
  // State for applied promotions
  const [appliedPromos, setAppliedPromos] = useState<string[]>([]);

  // Get active promotions for selected client/company
  const promozioniRilevanti = useMemo(() => {
    if (!formData.azienda_id) return [];
    return canvassAttive.filter(c => 
      c.azienda_id === formData.azienda_id && 
      (c.tutti_clienti || c.canvass_clienti?.some(cc => cc.cliente_id === formData.cliente_id))
    );
  }, [formData.azienda_id, formData.cliente_id, canvassAttive]);

  // Get promotions that apply to specific products in the order
  const promozioniProdotti = useMemo(() => {
    if (righeOrdine.length === 0 || promozioniRilevanti.length === 0) return [];
    const prodottiInOrdine = righeOrdine.map(r => r.prodotto_id);
    return promozioniRilevanti.filter(promo => 
      promo.canvass_prodotti?.some(cp => prodottiInOrdine.includes(cp.prodotto_id))
    );
  }, [righeOrdine, promozioniRilevanti]);

  // Determine which sc slot to use for promo based on company defaults
  const getPromoScSlot = (): "sc1" | "sc2" | "sc3" => {
    const azienda = aziende?.find((a) => a.id === formData.azienda_id);
    if (!azienda) return "sc1";
    const hasSc1 = (azienda.default_sc1 || 0) > 0;
    const hasSc2 = (azienda.default_sc2 || 0) > 0;
    if (hasSc1 && hasSc2) return "sc3";
    if (hasSc1) return "sc2";
    return "sc1";
  };

  // Apply promotion to order
  const handleApplyPromo = (promo: typeof canvassAttive[0]) => {
    if (appliedPromos.includes(promo.id)) return;
    
    // Apply based on promo type
    if (promo.tipo === "sconto_percentuale") {
      // Apply percentage discount to relevant products or globally
      if (promo.canvass_prodotti && promo.canvass_prodotti.length > 0) {
        const scSlot = getPromoScSlot();
        // Apply to specific products
        const updatedRighe = righeOrdine.map(riga => {
          const promoProduct = promo.canvass_prodotti?.find(cp => cp.prodotto_id === riga.prodotto_id);
          if (promoProduct) {
            const scontoValue = promoProduct.valore_override ?? promo.valore;
            return { ...riga, [scSlot]: String(scontoValue).replace(".", ",") };
          }
          return riga;
        });
        setRigheOrdine(updatedRighe);
      } else {
        // Apply as global discount
        setFormData(prev => ({
          ...prev,
          sconto: String(promo.valore).replace(".", ",")
        }));
      }
    } else if (promo.tipo === "prezzo_fisso") {
      // Apply fixed price to products
      if (promo.canvass_prodotti && promo.canvass_prodotti.length > 0) {
        const updatedRighe = righeOrdine.map(riga => {
          const promoProduct = promo.canvass_prodotti?.find(cp => cp.prodotto_id === riga.prodotto_id);
          if (promoProduct) {
            const prezzoFisso = promoProduct.valore_override ?? promo.valore;
            return { ...riga, prezzo_unitario: String(prezzoFisso).replace(".", ",") };
          }
          return riga;
        });
        setRigheOrdine(updatedRighe);
      }
    }
    
    setAppliedPromos(prev => [...prev, promo.id]);
    toast.success(`Promozione "${promo.nome}" applicata!`);
  };

  // Auto-apply promos when adding products
  const applyPromoToNewProduct = (riga: RigaOrdine): RigaOrdine => {
    const scSlot = getPromoScSlot();
    for (const promo of promozioniRilevanti) {
      const promoProduct = promo.canvass_prodotti?.find(cp => cp.prodotto_id === riga.prodotto_id);
      if (promoProduct) {
        const scontoValue = promoProduct.valore_override ?? promo.valore;
        if (promo.tipo === "sconto_percentuale") {
          return { ...riga, [scSlot]: String(scontoValue).replace(".", ",") };
        } else if (promo.tipo === "prezzo_fisso") {
          return { ...riga, prezzo_unitario: String(scontoValue).replace(".", ",") };
        }
      }
    }
    return riga;
  };
  
  // Fetch righe for editing
  const { data: righeForEdit, refetch: refetchRighe } = useOrdiniRighe(editingOrdine?.id);

  // Get all products ever purchased by this client from this company
  const { data: productHistory } = useClientProductHistory(
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

    // Nota: consentiamo di aggiungere lo stesso prodotto più volte (es. una riga a pagamento + una riga omaggio)

    // Get azienda defaults for fallback
    const azienda = aziende?.find((a) => a.id === formData.azienda_id);
    
    // Determine discounts: product override > azienda default > 0
    const getSc1 = () => prodotto.sc1_default > 0 ? prodotto.sc1_default : (azienda?.default_sc1 || 0);
    const getSc2 = () => prodotto.sc2_default > 0 ? prodotto.sc2_default : (azienda?.default_sc2 || 0);
    const getSc3 = () => prodotto.sc3_default > 0 ? prodotto.sc3_default : (azienda?.default_sc3 || 0);

    let newRiga: RigaOrdine = {
      prodotto_id: prodotto.id,
      prodotto_nome: prodotto.nome,
      prodotto_codice: prodotto.codice || undefined,
      prodotto_brand_id: prodotto.brand_id || undefined,
      prezzo_unitario: String(prodotto.prezzo_listino).replace(".", ","),
      quantita_pezzi: 0,
      quantita_cartoni: 0,
      pezzi_per_cartone: prodotto.pezzi_per_cartone,
      // Use default discounts from product or fallback to azienda
      sc1: String(getSc1()).replace(".", ","),
      sc2: String(getSc2()).replace(".", ","),
      sc3: String(getSc3()).replace(".", ","),
      // Pallettizzazione
      strati: prodotto.strati,
      cartoni_per_strato: prodotto.cartoni_per_strato,
      formato: prodotto.formato || null,
    };

    // Show info if there's a promo available (but don't auto-apply)
    const availablePromo = promozioniRilevanti.find(promo => 
      promo.canvass_prodotti?.some(cp => cp.prodotto_id === prodotto.id)
    );
    if (availablePromo) {
      toast.info(`Promozione "${availablePromo.nome}" disponibile per questo prodotto. Clicca "Applica" nella sezione promozioni.`, {
        icon: <Gift className="h-4 w-4 text-primary" />,
        duration: 4000,
      });
    }

    setRigheOrdine([...righeOrdine, newRiga]);
    setSelectedProdotto("");
  };

  const updateRiga = (index: number, field: keyof RigaOrdine, value: number | string | boolean) => {
    const updated = [...righeOrdine];
    updated[index] = { ...updated[index], [field]: value } as RigaOrdine;
    setRigheOrdine(updated);
  };

  const removeRiga = (index: number) => {
    setRigheOrdine(righeOrdine.filter((_, i) => i !== index));
  };

  const addOmaggioFromRiga = (index: number) => {
    const src = righeOrdine[index];
    if (!src) return;
    const omaggioRiga: RigaOrdine = {
      ...src,
      quantita_pezzi: 0,
      quantita_cartoni: 0,
      prezzo_unitario: "0",
      sc1: "0",
      sc2: "0",
      sc3: "0",
      is_omaggio: true,
    };
    // Inserisci la riga omaggio subito dopo la riga di origine
    const updated = [...righeOrdine];
    updated.splice(index + 1, 0, omaggioRiga);
    setRigheOrdine(updated);
    toast.success(`Aggiunta riga omaggio per "${src.prodotto_nome}"`, {
      icon: <Gift className="h-4 w-4 text-success" />,
    });
  };

  const calcolaTotale = () => {
    const subtotale = righeOrdine.reduce((sum, riga) => {
      if (riga.is_omaggio) return sum;
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
    setEditFormData({
      cliente_id: ordine.cliente_id || "",
      azienda_id: ordine.azienda_id || "",
      note: ordine.note || "",
      sconto: String(ordine.sconto || 0).replace(".", ","),
      sconto_merce: String(ordine.sconto_merce || 0).replace(".", ","),
      tipo_pagamento: ordine.tipo_pagamento || "Contanti",
      data_ordine: ordine.data_ordine || "",
    });
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
        sc1: String(r.sc1 || 0).replace(".", ","),
        sc2: String(r.sc2 || 0).replace(".", ","),
        sc3: String(r.sc3 || 0).replace(".", ","),
      })));
    }
  }, [righeForEdit, isEditDialogOpen]);

  const updateEditRiga = (index: number, field: string, value: number | string) => {
    const updated = [...editRighe];
    updated[index] = { ...updated[index], [field]: value };
    setEditRighe(updated);
  };

  const calcolaEditTotale = () => {
    const subtotale = editRighe.reduce((sum, riga) => {
      const pezziTotali = riga.quantita_pezzi + riga.quantita_cartoni * riga.pezzi_per_cartone;
      const prezzoBase = pezziTotali * parseDecimalInput(riga.prezzo_unitario);
      const sc1 = parseDecimalInput(riga.sc1);
      const sc2 = parseDecimalInput(riga.sc2);
      const sc3 = parseDecimalInput(riga.sc3);
      const scontoTotale = 1 - (1 - sc1 / 100) * (1 - sc2 / 100) * (1 - sc3 / 100);
      return sum + prezzoBase * (1 - scontoTotale);
    }, 0);
    
    const sconto = parseDecimalInput(editFormData.sconto);
    const scontoMerce = parseDecimalInput(editFormData.sconto_merce);
    
    const afterSconto = subtotale * (1 - sconto / 100);
    return Math.max(0, afterSconto - scontoMerce);
  };

  const calcolaEditProdottiTotali = () => {
    return editRighe.reduce((sum, riga) => {
      return sum + riga.quantita_pezzi + riga.quantita_cartoni * riga.pezzi_per_cartone;
    }, 0);
  };

  const handleSaveEdit = async () => {
    if (!editingOrdine) return;
    
    try {
      // Update each riga with all fields
      for (const riga of editRighe) {
        await updateRigaMutation.mutateAsync({
          id: riga.id,
          quantita_pezzi: riga.quantita_pezzi,
          quantita_cartoni: riga.quantita_cartoni,
          prezzo_unitario: parseDecimalInput(riga.prezzo_unitario),
          sc1: parseDecimalInput(riga.sc1),
          sc2: parseDecimalInput(riga.sc2),
          sc3: parseDecimalInput(riga.sc3),
        });
      }
      
      // Update order with all fields
      await updateOrdine.mutateAsync({
        id: editingOrdine.id,
        cliente_id: editFormData.cliente_id || null,
        azienda_id: editFormData.azienda_id || null,
        sconto: parseDecimalInput(editFormData.sconto),
        sconto_merce: parseDecimalInput(editFormData.sconto_merce),
        tipo_pagamento: editFormData.tipo_pagamento,
        note: editFormData.note || null,
        data_ordine: editFormData.data_ordine || null,
        totale: calcolaEditTotale(),
        prodotti: calcolaEditProdottiTotali(),
      });
      
      setIsEditDialogOpen(false);
      setEditingOrdine(null);
      setEditRighe([]);
    } catch (error) {
      console.error("Error saving order:", error);
    }
  };

  const handleRiassortimento = () => {
    if (!productHistory || productHistory.products.length === 0) {
      toast.error("Nessun prodotto acquistato precedentemente da questo cliente/azienda");
      return;
    }

    const { products, defaults } = productHistory;

    // Set payment info from last order
    setFormData((prev) => ({
      ...prev,
      sconto: String(defaults.sconto || 0).replace(".", ","),
      sconto_merce: String(defaults.sconto_merce || 0).replace(".", ","),
      tipo_pagamento: defaults.tipo_pagamento || "Contanti",
    }));

    // Set order lines from ALL products ever purchased
    const newRighe: RigaOrdine[] = products.map((p) => ({
      prodotto_id: p.prodotto_id,
      prodotto_nome: p.prodotto_nome,
      prodotto_codice: p.prodotto_codice || undefined,
      prodotto_brand_id: p.brand_id || undefined,
      prezzo_unitario: String(p.last_prezzo_unitario).replace(".", ","),
      quantita_pezzi: 0, // Reset to 0 so user can fill new quantities
      quantita_cartoni: 0,
      pezzi_per_cartone: p.pezzi_per_cartone,
      sc1: String(p.last_sc1).replace(".", ","),
      sc2: String(p.last_sc2).replace(".", ","),
      sc3: String(p.last_sc3).replace(".", ","),
      strati: p.strati,
      cartoni_per_strato: p.cartoni_per_strato,
      formato: p.formato,
    }));

    setRigheOrdine(newRighe);
    toast.success(`${products.length} prodotti caricati da ${productHistory.totalOrders} ordini precedenti!`);
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

    // Create order lines with discounts
    await createRigheBatch.mutateAsync(
      righeOrdine.map((riga) => ({
        ordine_id: ordine.id,
        prodotto_id: riga.prodotto_id,
        quantita_pezzi: riga.quantita_pezzi,
        quantita_cartoni: riga.quantita_cartoni,
        prezzo_unitario: riga.is_omaggio ? 0 : parseDecimalInput(riga.prezzo_unitario),
        sc1: riga.is_omaggio ? 0 : parseDecimalInput(riga.sc1),
        sc2: riga.is_omaggio ? 0 : parseDecimalInput(riga.sc2),
        sc3: riga.is_omaggio ? 0 : parseDecimalInput(riga.sc3),
        is_omaggio: !!riga.is_omaggio,
      }))
    );

    // Get client and company details for proforma
    const cliente = clienti?.find((c) => c.id === formData.cliente_id);
    const azienda = aziende?.find((a) => a.id === formData.azienda_id);

    // Build applied promotions list for proforma
    const promozioniApplicate = appliedPromos.map(promoId => {
      const promo = canvassAttive.find(c => c.id === promoId);
      return promo ? {
        nome: promo.nome,
        tipo: promo.tipo,
        valore: promo.valore,
      } : null;
    }).filter(Boolean) as { nome: string; tipo: string; valore: number }[];

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
      righe: righeOrdine.map((riga) => {
        // Find if there's a promo applied to this product
        const promoForProduct = promozioniRilevanti.find(promo => 
          promo.canvass_prodotti?.some(cp => cp.prodotto_id === riga.prodotto_id)
        );
        const brandName = brands?.find(b => b.id === riga.prodotto_brand_id)?.name;
        return {
          prodotto_codice: riga.prodotto_codice,
          prodotto_nome: riga.prodotto_nome,
          prodotto_brand: brandName,
          prezzo_unitario: riga.is_omaggio ? 0 : parseDecimalInput(riga.prezzo_unitario),
          quantita_pezzi: riga.quantita_pezzi,
          quantita_cartoni: riga.quantita_cartoni,
          pezzi_per_cartone: riga.pezzi_per_cartone,
          sc1: riga.is_omaggio ? 0 : parseDecimalInput(riga.sc1),
          sc2: riga.is_omaggio ? 0 : parseDecimalInput(riga.sc2),
          sc3: riga.is_omaggio ? 0 : parseDecimalInput(riga.sc3),
          is_omaggio: !!riga.is_omaggio,
          promo_applicata: promoForProduct?.nome,
          promo_tipo: promoForProduct?.tipo,
          promo_valore: promoForProduct?.valore,
        };
      }),
      promozioni_applicate: promozioniApplicate.length > 0 ? promozioniApplicate : undefined,
    });
    setIsProformaOpen(true);

    setIsDialogOpen(false);
    setFormData({ cliente_id: "", azienda_id: "", note: "", sconto: "0", sconto_merce: "0", tipo_pagamento: "Contanti", data_ordine: format(new Date(), "yyyy-MM-dd") });
    setRigheOrdine([]);
    setAppliedPromos([]);
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
        prodotti (nome, codice, pezzi_per_cartone, brand_id)
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
      righe: (righeData || []).map((r: any) => {
        const brandName = brands?.find(b => b.id === r.prodotti?.brand_id)?.name;
        return {
          prodotto_codice: r.prodotti?.codice || undefined,
          prodotto_nome: r.prodotti?.nome || "Prodotto",
          prodotto_brand: brandName,
          prezzo_unitario: Number(r.prezzo_unitario),
          quantita_pezzi: r.quantita_pezzi,
          quantita_cartoni: r.quantita_cartoni,
          pezzi_per_cartone: r.prodotti?.pezzi_per_cartone || 1,
          sc1: Number(r.sc1) || 0,
          sc2: Number(r.sc2) || 0,
          sc3: Number(r.sc3) || 0,
          is_omaggio: !!r.is_omaggio,
        };
      }),
    });
    setIsProformaOpen(true);
  };

  // Separate orders by status group
  const ordiniAttivi = useMemo(() =>
    ordini?.filter((o) => o.status !== "annullato" && o.status !== "stand_by") || [],
    [ordini]
  );

  const ordiniStandBy = useMemo(() =>
    ordini?.filter((o) => o.status === "stand_by") || [],
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
    standBy: ordiniStandBy.length,
    valoreStandBy: ordiniStandBy.reduce((sum, o) => sum + Number(o.totale), 0),
  };

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="page-title">Gestione Ordini</h1>
            <p className="text-body-md text-muted-foreground">
              Crea e gestisci gli ordini dei tuoi clienti
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="default" className="gap-2" onClick={() => setIsMultiImportOpen(true)}>
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Carica file ordini</span>
              <span className="sm:hidden">Carica</span>
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setIsImportPDFOpen(true)}>
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Importa singolo PDF/Excel</span>
              <span className="sm:hidden">Singolo</span>
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setFormData({ cliente_id: "", azienda_id: "", note: "", sconto: "0", sconto_merce: "0", tipo_pagamento: "Contanti", data_ordine: format(new Date(), "yyyy-MM-dd") });
                setRigheOrdine([]);
                setSelectedProdotto("");
                setAppliedPromos([]);
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

                {/* Cliente e Azienda con ricerca */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Cliente</Label>
                    <SearchableSelect
                      options={clientiOptions}
                      value={formData.cliente_id}
                      onValueChange={(v) => setFormData({ ...formData, cliente_id: v })}
                      placeholder="Seleziona cliente"
                      searchPlaceholder="Cerca cliente..."
                      emptyMessage="Nessun cliente trovato"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Azienda Fornitrice *</Label>
                    <SearchableSelect
                      options={aziendeOptions}
                      value={formData.azienda_id}
                      onValueChange={(v) => {
                        setFormData({ ...formData, azienda_id: v });
                        setRigheOrdine([]);
                        setSelectedProdotto("");
                      }}
                      placeholder="Seleziona azienda"
                      searchPlaceholder="Cerca azienda..."
                      emptyMessage="Nessuna azienda trovata"
                    />
                  </div>
                </div>

                {/* Promozioni Attive Alert */}
                {formData.azienda_id && promozioniRilevanti.length > 0 && (
                  <Alert className="border-success/50 bg-success/10">
                    <Sparkles className="h-4 w-4 text-success" />
                    <AlertTitle className="text-success flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      {promozioniRilevanti.length} Promozioni Attive
                    </AlertTitle>
                    <AlertDescription className="mt-2 space-y-2">
                      {promozioniRilevanti.map(promo => (
                        <div 
                          key={promo.id} 
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg bg-background/60"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{promo.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {promo.tipo === "sconto_percentuale" && `Sconto ${promo.valore}%`}
                              {promo.tipo === "prezzo_fisso" && `Prezzo fisso €${promo.valore}`}
                              {promo.cartoni_omaggio > 0 && ` • ${promo.cartoni_acquisto}+${promo.cartoni_omaggio} omaggio`}
                              {promo.canvass_prodotti && promo.canvass_prodotti.length > 0 && (
                                <span> • {promo.canvass_prodotti.length} prodotti</span>
                              )}
                            </p>
                          </div>
                          {appliedPromos.includes(promo.id) ? (
                            <Badge variant="outline" className="bg-success/20 text-success border-success/30 shrink-0">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Applicata
                            </Badge>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-success/50 text-success hover:bg-success/20 shrink-0"
                              onClick={() => handleApplyPromo(promo)}
                            >
                              <Gift className="h-3 w-3 mr-1" />
                              Applica
                            </Button>
                          )}
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground italic mt-2">
                        💡 Le promozioni sui prodotti verranno applicate automaticamente quando li aggiungi
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Riassortimento Button */}
                {formData.cliente_id && formData.azienda_id && productHistory && productHistory.products.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2 border-primary/50 text-primary hover:bg-primary/10"
                    onClick={handleRiassortimento}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Riassortimento ({productHistory.products.length} prodotti da {productHistory.totalOrders} ordini)
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
                      <div className="flex-1">
                        <SearchableSelect
                          options={prodottiOptions}
                          value={selectedProdotto}
                          onValueChange={setSelectedProdotto}
                          placeholder="Cerca prodotto..."
                          searchPlaceholder="Cerca per nome, codice, brand..."
                          emptyMessage="Nessun prodotto trovato"
                        />
                      </div>
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
                        const subtotale = riga.is_omaggio ? 0 : prezzoBase * (1 - scontoTotale);
                        return (
                          <div key={index} className={`rounded-xl p-3 space-y-3 ${riga.is_omaggio ? "bg-success/10 border border-success/40" : "bg-muted/50"}`}>
                            {/* Product Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-sm truncate">{riga.prodotto_nome}</p>
                                  {riga.is_omaggio && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-success/20 text-success">
                                      <Gift className="h-3 w-3" /> Omaggio
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {riga.formato && <span className="mr-2">{riga.formato}</span>}
                                  {riga.pezzi_per_cartone} pz/cart
                                </p>
                                {/* Pallettizzazione */}
                                <p className="text-xs text-primary/80 mt-1">
                                  🧱 {riga.strati} strati × {riga.cartoni_per_strato} cart/strato = {riga.strati * riga.cartoni_per_strato} cart/pallet
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  type="button"
                                  variant={riga.is_omaggio ? "default" : "outline"}
                                  size="sm"
                                  className={`h-8 gap-1 ${riga.is_omaggio ? "bg-success hover:bg-success/90 text-success-foreground" : ""}`}
                                  onClick={() => updateRiga(index, "is_omaggio", !riga.is_omaggio)}
                                  title={riga.is_omaggio ? "Rimuovi omaggio" : "Segna come omaggio"}
                                >
                                  <Gift className="h-3.5 w-3.5" />
                                  <span className="text-xs">{riga.is_omaggio ? "Omaggio" : "Omaggio"}</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => removeRiga(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* Inputs Grid - Row 1 */}
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Prezzo</Label>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  className="h-10 px-2 text-sm"
                                  value={riga.is_omaggio ? "0" : riga.prezzo_unitario}
                                  disabled={riga.is_omaggio}
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
                            
                            {/* Inputs Grid - Row 2: Sconti (nascosti per omaggio) */}
                            {!riga.is_omaggio && (
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
                            )}
                            
                            {/* Subtotal */}
                            <div className="flex justify-end pt-1 border-t border-border/50">
                              <p className="text-sm font-semibold">
                                {riga.is_omaggio ? <span className="text-success">Omaggio (0,00 €)</span> : formatCurrency(subtotale)}
                              </p>
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
        <div className="flex flex-col sm:flex-row gap-3 animate-fade-in">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cerca per cliente, azienda o prodotto..."
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
              <SelectItem value="stand_by">Stand-by</SelectItem>
              <SelectItem value="spedito">Spedito</SelectItem>
              <SelectItem value="completato">Completato</SelectItem>
              <SelectItem value="annullato">Annullato</SelectItem>
            </SelectContent>
          </Select>
          <MultiSelect
            className="w-full sm:w-64"
            placeholder="Filtra per mese"
            values={monthFilters}
            onValuesChange={setMonthFilters}
            options={(() => {
              // Ultimi 24 mesi
              const opts: { value: string; label: string }[] = [];
              const now = new Date();
              for (let i = 0; i < 24; i++) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                const label = d.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
                opts.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
              }
              return opts;
            })()}
          />
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
                              onClick={() => setStandByTarget({ id: ordine.id, codice: ordine.codice })}
                            >
                              <PauseCircle className="h-4 w-4 mr-2" />
                              Metti in Stand-by
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

          {/* Stand-by Orders Section */}
          {ordiniStandBy.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <PauseCircle className="h-5 w-5 text-warning" />
                <h2 className="text-lg font-semibold text-foreground">
                  Ordini in Stand-by ({ordiniStandBy.length})
                </h2>
                <span className="text-sm text-muted-foreground ml-2">
                  Valore sospeso (non in KPI): {formatCurrency(stats.valoreStandBy)}
                </span>
              </div>
              <div className="rounded-xl bg-card shadow-card overflow-hidden border border-warning/30">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-warning/5">
                        <TableHead>ID Ordine</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead className="hidden md:table-cell">Prodotto bloccato</TableHead>
                        <TableHead className="hidden md:table-cell">Data prevista</TableHead>
                        <TableHead>Totale</TableHead>
                        <TableHead className="w-32">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordiniStandBy.map((ordine) => {
                        const giorniInStandBy = ordine.stand_by_data_inizio
                          ? Math.floor((Date.now() - new Date(ordine.stand_by_data_inizio).getTime()) / 86400000)
                          : 0;
                        return (
                          <TableRow key={ordine.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="font-mono text-xs lg:text-sm font-medium">
                              {ordine.codice}
                              {giorniInStandBy > 0 && (
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                  {giorniInStandBy}g in stand-by
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {ordine.clienti?.nome || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge className={statusConfig.stand_by.className}>
                                {ordine.stand_by_motivo || "Stand-by"}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                              {ordine.stand_by_prodotto_bloccato || "—"}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm">
                              {ordine.stand_by_data_prevista
                                ? format(new Date(ordine.stand_by_data_prevista), "dd/MM/yyyy")
                                : "—"}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(Number(ordine.totale))}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="success"
                                  onClick={() => confermaStandBy.mutate({ id: ordine.id })}
                                  disabled={confermaStandBy.isPending}
                                  title="Rendi disponibile e conteggia ordine"
                                >
                                  <PlayCircle className="h-4 w-4 mr-1" />
                                  Conferma
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleShowProforma(ordine)}>
                                      <FileText className="h-4 w-4 mr-2" />
                                      Visualizza Proforma
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleOpenEditDialog(ordine)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Modifica
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => updateStatus.mutate({ id: ordine.id, status: "annullato" })}
                                    >
                                      Annulla ordine
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifica Ordine {editingOrdine?.codice}</DialogTitle>
              <DialogDescription>
                Modifica tutti i dettagli dell'ordine
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Data Ordine */}
              <div className="space-y-1.5">
                <Label className="text-sm">Data Ordine</Label>
                <Input
                  type="date"
                  value={editFormData.data_ordine}
                  onChange={(e) => setEditFormData({ ...editFormData, data_ordine: e.target.value })}
                />
              </div>

              {/* Cliente e Azienda */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Cliente</Label>
                  <Select value={editFormData.cliente_id} onValueChange={(v) => setEditFormData({ ...editFormData, cliente_id: v })}>
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
                  <Label className="text-sm">Azienda Fornitrice</Label>
                  <Select value={editFormData.azienda_id} onValueChange={(v) => setEditFormData({ ...editFormData, azienda_id: v })}>
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

              {/* Payment and Discounts */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Tipo Pagamento</Label>
                  <Select value={editFormData.tipo_pagamento} onValueChange={(v) => setEditFormData({ ...editFormData, tipo_pagamento: v })}>
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
                    value={editFormData.sconto}
                    onChange={(e) => setEditFormData({ ...editFormData, sconto: e.target.value })}
                    placeholder="es. 10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Sconto Merce (€)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={editFormData.sconto_merce}
                    onChange={(e) => setEditFormData({ ...editFormData, sconto_merce: e.target.value })}
                    placeholder="es. 50"
                  />
                </div>
              </div>

              {/* Order Lines */}
              {editRighe.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3 border-t pt-4">
                  <h4 className="font-medium text-sm">Prodotti nell'ordine</h4>
                  <div className="space-y-3">
                    {editRighe.map((riga, index) => {
                      const pezziTotali = riga.quantita_pezzi + riga.quantita_cartoni * riga.pezzi_per_cartone;
                      const prezzoBase = pezziTotali * parseDecimalInput(riga.prezzo_unitario);
                      const sc1 = parseDecimalInput(riga.sc1);
                      const sc2 = parseDecimalInput(riga.sc2);
                      const sc3 = parseDecimalInput(riga.sc3);
                      const scontoTotale = 1 - (1 - sc1 / 100) * (1 - sc2 / 100) * (1 - sc3 / 100);
                      const subtotale = prezzoBase * (1 - scontoTotale);
                      return (
                        <div key={riga.id} className="bg-muted/50 rounded-xl p-3 space-y-3">
                          {/* Product Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{riga.prodotto_nome}</p>
                              <p className="text-xs text-muted-foreground">{riga.pezzi_per_cartone} pz/cartone</p>
                            </div>
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
                                onChange={(e) => updateEditRiga(index, "prezzo_unitario", e.target.value)}
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
                                onChange={(e) => updateEditRiga(index, "quantita_pezzi", parseInt(e.target.value) || 0)}
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
                                onChange={(e) => updateEditRiga(index, "quantita_cartoni", parseInt(e.target.value) || 0)}
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
                                onChange={(e) => updateEditRiga(index, "sc1", e.target.value)}
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
                                onChange={(e) => updateEditRiga(index, "sc2", e.target.value)}
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
                                onChange={(e) => updateEditRiga(index, "sc3", e.target.value)}
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
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label>Note</Label>
                <Textarea
                  value={editFormData.note}
                  onChange={(e) => setEditFormData({ ...editFormData, note: e.target.value })}
                  placeholder="Note aggiuntive..."
                />
              </div>

              <div className="flex justify-end pt-4 border-t">
                <div className="text-right space-y-1">
                  <p className="text-sm text-muted-foreground">Totale prodotti: {calcolaEditProdottiTotali()} pezzi</p>
                  {(parseDecimalInput(editFormData.sconto) > 0 || parseDecimalInput(editFormData.sconto_merce) > 0) && (
                    <p className="text-sm text-muted-foreground">
                      Sconto: {editFormData.sconto}% + {formatCurrency(parseDecimalInput(editFormData.sconto_merce))}
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
                onClick={handleSaveEdit}
                disabled={updateRigaMutation.isPending || updateOrdine.isPending}
              >
                {(updateRigaMutation.isPending || updateOrdine.isPending) && (
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
                  sc1: 0,
                  sc2: 0,
                  sc3: 0,
                }))
              );

              toast.success("Ordine importato con successo!");
            } catch (error) {
              console.error("Error importing order:", error);
              toast.error("Errore nell'importazione dell'ordine");
            }
          }}
        />

        <MultiFileImportDialog
          open={isMultiImportOpen}
          onOpenChange={setIsMultiImportOpen}
          clienti={clienti || []}
          aziende={aziende || []}
          prodotti={allProdotti || []}
          onProductsCreated={() => refetchProdotti()}
          onCreateOrder={async (data) => {
            const ordine = await createOrdine.mutateAsync({
              cliente_id: data.cliente_id,
              azienda_id: data.azienda_id,
              prodotti: data.righe.reduce((s, r) => s + r.quantita_cartoni, 0),
              totale: data.totale,
              note: data.note || undefined,
              sconto: data.sconto,
              sconto_merce: data.sconto_merce,
              tipo_pagamento: data.tipo_pagamento,
              data_ordine: data.data_ordine,
            });
            await createRigheBatch.mutateAsync(
              data.righe.map((r) => ({
                ordine_id: ordine.id,
                prodotto_id: r.prodotto_id,
                quantita_pezzi: 0,
                quantita_cartoni: r.quantita_cartoni,
                prezzo_unitario: r.prezzo_unitario,
                sc1: r.sc1 || 0,
                sc2: r.sc2 || 0,
                sc3: r.sc3 || 0,
              }))
            );
          }}
        />

        <StandByDialog
          open={!!standByTarget}
          onOpenChange={(v) => { if (!v) setStandByTarget(null); }}
          ordineId={standByTarget?.id || null}
          ordineCodice={standByTarget?.codice}
        />
      </div>
    </MainLayout>
  );
};

export default Ordini;
