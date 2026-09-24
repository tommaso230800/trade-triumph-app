import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Loader2,
  RefreshCw,
  Gift,
  UserRound,
  PackagePlus,
  ReceiptText,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  CalendarDays,
  Check,
  Store,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useClienti } from "@/hooks/useClienti";
import { useAziende } from "@/hooks/useAziende";
import { useProdotti } from "@/hooks/useProdotti";
import { useBrands } from "@/hooks/useBrands";
import { useCanvassAttive, type Canvass } from "@/hooks/useCanvass";
import { useClientProductHistory } from "@/hooks/useClientProductHistory";
import { useCreateOrdine } from "@/hooks/useOrdini";
import { useCreateOrdineRigheBatch } from "@/hooks/useOrdiniRighe";
import { useCustomerProductPrices, useUpsertCustomerProductPrice } from "@/hooks/useCustomerProductPrices";
import {
  resolveProductPrice,
  PRICE_SOURCE_LABELS,
  type PriceSource,
  type LastOrderPriceInfo,
} from "@/lib/priceResolver";
import type { ProformaData } from "./ProformaDialog";
import { OrdineRigaEditor } from "./OrdineRigaEditor";
import { PromozioniAttiveAlert } from "./PromozioniAttiveAlert";
import { formatCurrency, parseDecimalInput, TIPI_PAGAMENTO } from "./ordiniShared";

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
  strati: number;
  cartoni_per_strato: number;
  formato: string | null;
  prezzo_source: PriceSource;
  prezzo_source_info?: LastOrderPriceInfo;
  prezzo_baseline: string;
  prezzo_dirty_prompted?: boolean;
};

const emptyFormData = () => ({
  cliente_id: "",
  azienda_id: "",
  note: "",
  sconto: "0",
  sconto_merce: "0",
  tipo_pagamento: "Contanti",
  data_ordine: format(new Date(), "yyyy-MM-dd"),
});

interface NuovoOrdineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderCreated: (data: ProformaData) => void;
}

export function NuovoOrdineDialog({ open, onOpenChange, onOrderCreated }: NuovoOrdineDialogProps) {
  const [formData, setFormData] = useState(emptyFormData());
  const [righeOrdine, setRigheOrdine] = useState<RigaOrdine[]>([]);
  const [selectedProdotto, setSelectedProdotto] = useState("");
  const [appliedPromos, setAppliedPromos] = useState<string[]>([]);
  const [priceConfirmIndex, setPriceConfirmIndex] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  // true quando la conferma prezzo è stata aperta dal salvataggio: dopo la
  // scelta l'ordine prosegue automaticamente.
  const [pendingSubmit, setPendingSubmit] = useState(false);

  const { data: clienti } = useClienti();
  const { data: aziende } = useAziende();
  const { data: allProdotti } = useProdotti();
  const { data: canvassAttive = [] } = useCanvassAttive();
  const { data: brands } = useBrands();
  const createOrdine = useCreateOrdine();
  const createRigheBatch = useCreateOrdineRigheBatch();
  const { data: productHistory } = useClientProductHistory(
    formData.cliente_id || undefined,
    formData.azienda_id || undefined
  );
  const { data: customPrices } = useCustomerProductPrices(
    formData.cliente_id || undefined,
    formData.azienda_id || undefined
  );
  const upsertCustomPrice = useUpsertCustomerProductPrice();

  const customPriceMap = useMemo(
    () => new Map((customPrices ?? []).map((cp) => [cp.product_id, cp])),
    [customPrices]
  );
  const lastOrderMap = useMemo(
    () => new Map((productHistory?.products ?? []).map((p) => [p.prodotto_id, p])),
    [productHistory]
  );

  const resetForm = () => {
    setFormData(emptyFormData());
    setRigheOrdine([]);
    setSelectedProdotto("");
    setAppliedPromos([]);
    setPendingSubmit(false);
    setPriceConfirmIndex(null);
    setCurrentStep(0);
  };

  const handleOpenChange = (v: boolean) => {
    onOpenChange(v);
    if (!v) resetForm();
  };

  const clientiOptions = useMemo(
    () =>
      clienti?.map((c) => ({
        value: c.id,
        label: c.nome,
        searchTerms: [c.azienda || "", c.citta || "", c.consorzio || "", c.partita_iva || ""],
      })) || [],
    [clienti]
  );

  const aziendeOptions = useMemo(
    () =>
      aziende?.map((a) => ({
        value: a.id,
        label: a.nome,
        searchTerms: [a.settore || "", a.citta || "", a.partita_iva || ""],
      })) || [],
    [aziende]
  );

  const prodottiOptions = useMemo(() => {
    if (!formData.azienda_id || !allProdotti) return [];
    const prodotti = allProdotti.filter((p) => p.azienda_id === formData.azienda_id);
    return prodotti.map((p) => {
      const brand = brands?.find((b) => b.id === p.brand_id);
      return {
        value: p.id,
        label: `${p.nome} - ${formatCurrency(p.prezzo_listino)}`,
        searchTerms: [
          p.codice || "",
          p.formato || "",
          brand?.name || "",
          aziende?.find((a) => a.id === p.azienda_id)?.nome || "",
        ],
      };
    });
  }, [formData.azienda_id, allProdotti, brands, aziende]);

  const prodottiAzienda = useMemo(() => {
    if (!formData.azienda_id || !allProdotti) return [];
    return allProdotti.filter((p) => p.azienda_id === formData.azienda_id);
  }, [formData.azienda_id, allProdotti]);

  // Promozioni attive per il cliente/azienda selezionati
  const promozioniRilevanti = useMemo(() => {
    if (!formData.azienda_id) return [];
    return canvassAttive.filter(
      (c) =>
        c.azienda_id === formData.azienda_id &&
        (c.tutti_clienti || c.canvass_clienti?.some((cc) => cc.cliente_id === formData.cliente_id))
    );
  }, [formData.azienda_id, formData.cliente_id, canvassAttive]);

  // Promozioni che si applicano a prodotti specifici già nell'ordine
  const promozioniProdotti = useMemo(() => {
    if (righeOrdine.length === 0 || promozioniRilevanti.length === 0) return [];
    const prodottiInOrdine = righeOrdine.map((r) => r.prodotto_id);
    return promozioniRilevanti.filter((promo) =>
      promo.canvass_prodotti?.some((cp) => prodottiInOrdine.includes(cp.prodotto_id))
    );
  }, [righeOrdine, promozioniRilevanti]);

  const getPromoScSlot = (): "sc1" | "sc2" | "sc3" => {
    const azienda = aziende?.find((a) => a.id === formData.azienda_id);
    if (!azienda) return "sc1";
    const hasSc1 = (azienda.default_sc1 || 0) > 0;
    const hasSc2 = (azienda.default_sc2 || 0) > 0;
    if (hasSc1 && hasSc2) return "sc3";
    if (hasSc1) return "sc2";
    return "sc1";
  };

  const handleApplyPromo = (promo: Canvass) => {
    if (appliedPromos.includes(promo.id)) return;

    if (promo.tipo === "sconto_percentuale") {
      if (promo.canvass_prodotti && promo.canvass_prodotti.length > 0) {
        const scSlot = getPromoScSlot();
        const updatedRighe = righeOrdine.map((riga) => {
          const promoProduct = promo.canvass_prodotti?.find((cp) => cp.prodotto_id === riga.prodotto_id);
          if (promoProduct) {
            const scontoValue = promoProduct.valore_override ?? promo.valore;
            return { ...riga, [scSlot]: String(scontoValue).replace(".", ",") };
          }
          return riga;
        });
        setRigheOrdine(updatedRighe);
      } else {
        setFormData((prev) => ({
          ...prev,
          sconto: String(promo.valore).replace(".", ","),
        }));
      }
    } else if (promo.tipo === "prezzo_fisso") {
      if (promo.canvass_prodotti && promo.canvass_prodotti.length > 0) {
        const updatedRighe = righeOrdine.map((riga) => {
          const promoProduct = promo.canvass_prodotti?.find((cp) => cp.prodotto_id === riga.prodotto_id);
          if (promoProduct) {
            const prezzoFisso = promoProduct.valore_override ?? promo.valore;
            const prezzoStr = String(prezzoFisso).replace(".", ",");
            return { ...riga, prezzo_unitario: prezzoStr, prezzo_baseline: prezzoStr };
          }
          return riga;
        });
        setRigheOrdine(updatedRighe);
      }
    }

    setAppliedPromos((prev) => [...prev, promo.id]);
    toast.success(`Promozione "${promo.nome}" applicata!`);
  };

  // Applica automaticamente eventuali promozioni note quando si aggiunge un nuovo prodotto
  const applyPromoToNewProduct = (riga: RigaOrdine): RigaOrdine => {
    const scSlot = getPromoScSlot();
    for (const promo of promozioniRilevanti) {
      const promoProduct = promo.canvass_prodotti?.find((cp) => cp.prodotto_id === riga.prodotto_id);
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

  const addProdottoToOrder = () => {
    if (!selectedProdotto) return;
    const prodotto = prodottiAzienda.find((p) => p.id === selectedProdotto);
    if (!prodotto) return;

    const azienda = aziende?.find((a) => a.id === formData.azienda_id);

    const getSc1 = () => (prodotto.sc1_default > 0 ? prodotto.sc1_default : azienda?.default_sc1 || 0);
    const getSc2 = () => (prodotto.sc2_default > 0 ? prodotto.sc2_default : azienda?.default_sc2 || 0);
    const getSc3 = () => (prodotto.sc3_default > 0 ? prodotto.sc3_default : azienda?.default_sc3 || 0);

    const resolved = resolveProductPrice({
      productId: prodotto.id,
      listPrice: prodotto.prezzo_listino,
      customPricesByProduct: customPriceMap,
      lastOrderByProduct: lastOrderMap,
    });
    const prezzoIniziale = String(resolved.price).replace(".", ",");

    const newRiga: RigaOrdine = {
      prodotto_id: prodotto.id,
      prodotto_nome: prodotto.nome,
      prodotto_codice: prodotto.codice || undefined,
      prodotto_brand_id: prodotto.brand_id || undefined,
      prezzo_unitario: prezzoIniziale,
      quantita_pezzi: 0,
      quantita_cartoni: 0,
      pezzi_per_cartone: prodotto.pezzi_per_cartone,
      sc1: String(getSc1()).replace(".", ","),
      sc2: String(getSc2()).replace(".", ","),
      sc3: String(getSc3()).replace(".", ","),
      strati: prodotto.strati,
      cartoni_per_strato: prodotto.cartoni_per_strato,
      formato: prodotto.formato || null,
      prezzo_source: resolved.source,
      prezzo_source_info: resolved.lastOrderInfo,
      prezzo_baseline: prezzoIniziale,
    };

    const availablePromo = promozioniRilevanti.find((promo) =>
      promo.canvass_prodotti?.some((cp) => cp.prodotto_id === prodotto.id)
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

  // Una riga è "prezzo modificato" quando il valore digitato differisce da
  // quello proposto (personalizzato, ultimo applicato o listino) e non è già
  // stata posta la domanda per quella riga.
  const isPrezzoDirty = (riga?: RigaOrdine) =>
    !!riga &&
    !riga.is_omaggio &&
    !riga.prezzo_dirty_prompted &&
    parseDecimalInput(riga.prezzo_unitario) !== parseDecimalInput(riga.prezzo_baseline);

  const handlePrezzoBlur = (index: number) => {
    if (!isPrezzoDirty(righeOrdine[index])) return;
    setPriceConfirmIndex(index);
  };

  const markPrompted = (index: number) => {
    const updated = righeOrdine.map((r, i) => (i === index ? { ...r, prezzo_dirty_prompted: true } : r));
    setRigheOrdine(updated);
    setPriceConfirmIndex(null);
    return updated;
  };

  // Dopo la scelta: se restano altre righe con prezzo modificato le chiede in
  // sequenza, altrimenti prosegue con la creazione dell'ordine se in attesa.
  const afterPriceChoice = (updated: RigaOrdine[]) => {
    if (!pendingSubmit) return;
    const next = updated.findIndex((r) => isPrezzoDirty(r));
    if (next >= 0) {
      setPriceConfirmIndex(next);
      return;
    }
    setPendingSubmit(false);
    void doSubmit(updated);
  };

  const closePriceConfirm = (index: number) => {
    afterPriceChoice(markPrompted(index));
  };

  const handleSaveAsCustomerPrice = async () => {
    if (priceConfirmIndex === null) return;
    const index = priceConfirmIndex;
    const riga = righeOrdine[index];
    if (!riga || !formData.cliente_id || !formData.azienda_id) {
      closePriceConfirm(index);
      return;
    }
    await upsertCustomPrice.mutateAsync({
      customer_id: formData.cliente_id,
      company_id: formData.azienda_id,
      product_id: riga.prodotto_id,
      custom_price: parseDecimalInput(riga.prezzo_unitario),
    });
    closePriceConfirm(index);
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
      prezzo_baseline: "0",
      prezzo_dirty_prompted: true,
    };
    const updated = [...righeOrdine];
    updated.splice(index + 1, 0, omaggioRiga);
    setRigheOrdine(updated);
    toast.success(`Aggiunta riga omaggio per "${src.prodotto_nome}"`, {
      icon: <Gift className="h-4 w-4 text-success" />,
    });
  };

  const rigaSubtotale = (riga: RigaOrdine): number => {
    if (riga.is_omaggio) return 0;
    const pezziTotali = riga.quantita_pezzi + riga.quantita_cartoni * riga.pezzi_per_cartone;
    const prezzoBase = pezziTotali * parseDecimalInput(riga.prezzo_unitario);
    const sc1 = parseDecimalInput(riga.sc1);
    const sc2 = parseDecimalInput(riga.sc2);
    const sc3 = parseDecimalInput(riga.sc3);
    const scontoTotale = 1 - (1 - sc1 / 100) * (1 - sc2 / 100) * (1 - sc3 / 100);
    return prezzoBase * (1 - scontoTotale);
  };

  const calcolaTotale = () => {
    const subtotale = righeOrdine.reduce((sum, riga) => sum + rigaSubtotale(riga), 0);
    const sconto = parseDecimalInput(formData.sconto);
    const scontoMerce = parseDecimalInput(formData.sconto_merce);
    const afterSconto = subtotale * (1 - sconto / 100);
    return Math.max(0, afterSconto - scontoMerce);
  };

  const calcolaProdottiTotali = () =>
    righeOrdine.reduce((sum, riga) => sum + riga.quantita_pezzi + riga.quantita_cartoni * riga.pezzi_per_cartone, 0);

  const handleRiassortimento = () => {
    if (!productHistory || productHistory.products.length === 0) {
      toast.error("Nessun prodotto acquistato precedentemente da questo cliente/azienda");
      return;
    }

    const { products, defaults } = productHistory;

    setFormData((prev) => ({
      ...prev,
      sconto: String(defaults.sconto || 0).replace(".", ","),
      sconto_merce: String(defaults.sconto_merce || 0).replace(".", ","),
      tipo_pagamento: defaults.tipo_pagamento || "Contanti",
    }));

    const newRighe: RigaOrdine[] = products.map((p) => {
      const custom = customPriceMap.get(p.prodotto_id);
      const prezzo = custom ? custom.custom_price : p.last_prezzo_unitario;
      const prezzoStr = String(prezzo).replace(".", ",");
      return {
        prodotto_id: p.prodotto_id,
        prodotto_nome: p.prodotto_nome,
        prodotto_codice: p.prodotto_codice || undefined,
        prodotto_brand_id: p.brand_id || undefined,
        prezzo_unitario: prezzoStr,
        quantita_pezzi: 0,
        quantita_cartoni: 0,
        pezzi_per_cartone: p.pezzi_per_cartone,
        sc1: String(p.last_sc1).replace(".", ","),
        sc2: String(p.last_sc2).replace(".", ","),
        sc3: String(p.last_sc3).replace(".", ","),
        strati: p.strati,
        cartoni_per_strato: p.cartoni_per_strato,
        formato: p.formato,
        prezzo_source: custom ? ("custom" as const) : ("last_order" as const),
        prezzo_source_info: custom
          ? undefined
          : {
              date: p.last_order_date,
              orderCode: p.last_ordine_codice,
              price: p.last_prezzo_unitario,
              quantitaCartoni: p.last_quantita_cartoni,
              quantitaPezzi: p.last_quantita_pezzi,
            },
        prezzo_baseline: prezzoStr,
      };
    });

    setRigheOrdine(newRighe);
    toast.success(`${products.length} prodotti caricati da ${productHistory.totalOrders} ordini precedenti!`);
  };

  // Se l'utente ha modificato un prezzo e ha toccato direttamente "Crea Ordine"
  // (senza che il blur facesse in tempo a mostrare il pannello), la domanda
  // viene posta qui prima di salvare.
  const handleSubmit = async () => {
    if (righeOrdine.length === 0) return;
    const dirtyIndex = righeOrdine.findIndex((r) => isPrezzoDirty(r));
    if (dirtyIndex >= 0) {
      setPendingSubmit(true);
      setPriceConfirmIndex(dirtyIndex);
      return;
    }
    await doSubmit(righeOrdine);
  };

  const doSubmit = async (righe: RigaOrdine[]) => {
    if (righe.length === 0) return;

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

    await createRigheBatch.mutateAsync(
      righe.map((riga) => ({
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

    const cliente = clienti?.find((c) => c.id === formData.cliente_id);
    const azienda = aziende?.find((a) => a.id === formData.azienda_id);

    const promozioniApplicate = appliedPromos
      .map((promoId) => {
        const promo = canvassAttive.find((c) => c.id === promoId);
        return promo ? { nome: promo.nome, tipo: promo.tipo, valore: promo.valore } : null;
      })
      .filter(Boolean) as { nome: string; tipo: string; valore: number }[];

    onOrderCreated({
      codice: ordine.codice || `ORD-${ordine.id.slice(0, 8)}`,
      created_at: ordine.created_at,
      data_ordine: formData.data_ordine,
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
      righe: righe.map((riga) => {
        const promoForProduct = promozioniRilevanti.find((promo) =>
          promo.canvass_prodotti?.some((cp) => cp.prodotto_id === riga.prodotto_id)
        );
        const brandName = brands?.find((b) => b.id === riga.prodotto_brand_id)?.name;
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

    handleOpenChange(false);
  };

  const isSubmitting = createOrdine.isPending || createRigheBatch.isPending;
  const selectedClienteName = clienti?.find((c) => c.id === formData.cliente_id)?.nome;
  const selectedAziendaName = aziende?.find((a) => a.id === formData.azienda_id)?.nome;
  const selectedCliente = clienti?.find((c) => c.id === formData.cliente_id);
  const clienteStatusLabel = selectedCliente?.status === "premium" ? "Premium" : selectedCliente?.status === "nuovo" ? "Nuovo" : "Standard";
  const steps = [
    { label: "Cliente", icon: UserRound },
    { label: "Prodotti", icon: PackagePlus },
    { label: "Conferma", icon: ReceiptText },
  ];

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="inset-0 left-0 top-0 flex h-[100dvh] max-h-none w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-order-paper p-0 text-order-ink sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[92dvh] sm:w-[calc(100vw-2rem)] sm:max-w-3xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border sm:border-order-line lg:max-w-4xl">
        <DialogHeader className="shrink-0 border-b border-order-line bg-order-paper px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-left sm:px-8 sm:py-6">
          <div className="pr-10">
            <DialogDescription className="mb-1 text-xs font-semibold uppercase text-order-muted">
              Passaggio {currentStep + 1} di 3
            </DialogDescription>
            <div className="flex items-end justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl font-bold text-order-ink">Nuovo ordine</DialogTitle>
                <p className="mt-1 text-sm text-order-muted">
                  {currentStep === 0 && "Cliente e condizioni iniziali"}
                  {currentStep === 1 && "Prodotti e quantità"}
                  {currentStep === 2 && "Controllo economico"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-order-muted">Totale</p>
                <p className="text-2xl font-bold tabular-nums text-order-blue">{formatCurrency(calcolaTotale())}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2" aria-label="Avanzamento ordine">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const active = index === currentStep;
              const complete = index < currentStep;
              return (
                <Button
                  key={step.label}
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    if (index === 0 || (index === 1 && formData.azienda_id) || (index === 2 && righeOrdine.length > 0)) {
                      setCurrentStep(index);
                    }
                  }}
                  className={`flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg border px-2 text-xs font-semibold transition-colors duration-200 sm:text-sm ${
                    active
                      ? "border-order-blue bg-order-blue text-primary-foreground"
                      : complete
                        ? "border-order-blue/30 bg-order-blue/10 text-order-blue"
                        : "border-order-line bg-order-surface/60 text-order-muted"
                  }`}
                  aria-current={active ? "step" : undefined}
                >
                  <StepIcon className="h-4 w-4 shrink-0" />
                  <span>{step.label}</span>
                </Button>
              );
            })}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden bg-order-paper">
          <div className="mx-auto h-full max-w-3xl overflow-y-auto px-4 py-5 sm:px-8 sm:py-8" style={{ WebkitOverflowScrolling: "touch" }}>
            <section className={currentStep === 0 ? "space-y-6" : "hidden"}>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-order-blue/10 text-order-blue">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Destinatario dell’ordine</h3>
                   <p className="text-xs text-order-muted">Le scelte determinano listini, storico e prodotti.</p>
                </div>
              </div>
              <div className="grid gap-4 rounded-xl border border-order-line bg-order-surface p-4 shadow-sm sm:grid-cols-2 sm:p-6">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Cliente</Label>
                  <SearchableSelect options={clientiOptions} value={formData.cliente_id} onValueChange={(v) => setFormData({ ...formData, cliente_id: v })} placeholder="Seleziona cliente" searchPlaceholder="Cerca cliente..." emptyMessage="Nessun cliente trovato" />
                </div>
                <div className="space-y-2">
                  <Label>Azienda fornitrice *</Label>
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
                <div className="space-y-2">
                  <Label>Data ordine</Label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input type="date" className="pl-10" value={formData.data_ordine} onChange={(e) => setFormData({ ...formData, data_ordine: e.target.value })} />
                  </div>
                </div>
              </div>
              {selectedCliente && (
                <div className="rounded-xl border border-order-blue/20 bg-order-surface p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">{selectedCliente.nome}</p>
                      <p className="mt-1 truncate text-xs text-order-muted">
                        {[selectedCliente.indirizzo, selectedCliente.citta, selectedCliente.provincia].filter(Boolean).join(" · ") || "Indirizzo N/D"}
                      </p>
                    </div>
                    <span className="rounded-full bg-order-blue/10 px-3 py-1 text-xs font-semibold text-order-blue">{clienteStatusLabel}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-order-line bg-order-paper px-3 py-1 text-xs font-medium tabular-nums text-order-muted">
                      Storico · {selectedCliente.ordini_count ?? 0} ordini
                    </span>
                    {selectedCliente.partita_iva && (
                      <span className="rounded-full border border-order-line bg-order-paper px-3 py-1 text-xs font-medium text-order-muted">P.IVA {selectedCliente.partita_iva}</span>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section className={currentStep === 1 ? "space-y-4" : "hidden"}>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-order-blue/10 text-order-blue"><PackagePlus className="h-5 w-5" /></div>
                <div>
                  <h3 className="text-base font-semibold">Composizione ordine</h3>
                  <p className="text-xs text-order-muted">Cerca un prodotto e inserisci quantità e condizioni.</p>
                </div>
              </div>

              {promozioniRilevanti.length > 0 && <PromozioniAttiveAlert promozioni={promozioniRilevanti} appliedPromos={appliedPromos} onApply={handleApplyPromo} />}

              <div className="space-y-3 rounded-xl border border-order-line bg-order-surface p-4 shadow-sm sm:p-6">
                {formData.cliente_id && productHistory && productHistory.products.length > 0 && (
                  <Button type="button" variant="outline" className="h-auto min-h-11 w-full whitespace-normal border-primary/40 px-3 text-primary" onClick={handleRiassortimento}>
                    <RefreshCw className="h-4 w-4 shrink-0" />
                    Riassortimento · {productHistory.products.length} prodotti
                  </Button>
                )}
                <div className="flex gap-2">
                  <SearchableSelect className="min-w-0 flex-1 justify-between" options={prodottiOptions} value={selectedProdotto} onValueChange={setSelectedProdotto} placeholder="Cerca prodotto..." searchPlaceholder="Nome, codice o brand..." emptyMessage="Nessun prodotto trovato" />
                  <Button type="button" size="icon" onClick={addProdottoToOrder} disabled={!selectedProdotto} aria-label="Aggiungi prodotto"><Plus className="h-5 w-5" /></Button>
                </div>
                {prodottiAzienda.length === 0 && <p className="text-sm text-muted-foreground">Nessun prodotto disponibile per questa azienda.</p>}
              </div>

              {righeOrdine.length === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-order-line bg-order-surface p-6 text-center">
                  <ShoppingBag className="mb-3 h-6 w-6 text-muted-foreground" />
                  <p className="text-sm font-semibold">L’ordine è ancora vuoto</p>
                  <p className="mt-1 text-xs text-muted-foreground">Seleziona un prodotto dal campo qui sopra.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {righeOrdine.map((riga, index) => (
                    <OrdineRigaEditor
                      key={`${riga.prodotto_id}-${index}`}
                      prodottoNome={riga.prodotto_nome} formato={riga.formato} pezziPerCartone={riga.pezzi_per_cartone}
                      strati={riga.strati} cartoniPerStrato={riga.cartoni_per_strato} isOmaggio={riga.is_omaggio}
                      prezzoUnitario={riga.prezzo_unitario} quantitaPezzi={riga.quantita_pezzi} quantitaCartoni={riga.quantita_cartoni}
                      sc1={riga.sc1} sc2={riga.sc2} sc3={riga.sc3} subtotale={rigaSubtotale(riga)}
                      prezzoSourceLabel={riga.is_omaggio ? undefined : PRICE_SOURCE_LABELS[riga.prezzo_source]} prezzoSourceInfo={riga.prezzo_source_info}
                      onBlurPrezzo={() => handlePrezzoBlur(index)} onChangePrezzo={(v) => updateRiga(index, "prezzo_unitario", v)}
                      onChangeQuantitaPezzi={(v) => updateRiga(index, "quantita_pezzi", v)} onChangeQuantitaCartoni={(v) => updateRiga(index, "quantita_cartoni", v)}
                      onChangeSc1={(v) => updateRiga(index, "sc1", v)} onChangeSc2={(v) => updateRiga(index, "sc2", v)} onChangeSc3={(v) => updateRiga(index, "sc3", v)}
                      onRemove={() => removeRiga(index)} onAddOmaggio={riga.is_omaggio ? undefined : () => addOmaggioFromRiga(index)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className={currentStep === 2 ? "space-y-4" : "hidden"}>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-order-blue/10 text-order-blue"><ReceiptText className="h-5 w-5" /></div>
                <div>
                  <h3 className="text-base font-semibold">Dettagli e conferma</h3>
                  <p className="text-xs text-order-muted">Controlla pagamento, sconti e note.</p>
                </div>
              </div>
              <div className="grid gap-4 rounded-xl border border-order-line bg-order-surface p-4 shadow-sm sm:grid-cols-3 sm:p-6">
                <div className="space-y-2 sm:col-span-3"><Label>Tipo pagamento</Label><Select value={formData.tipo_pagamento} onValueChange={(v) => setFormData({ ...formData, tipo_pagamento: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TIPI_PAGAMENTO.map((tipo) => <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Sconto %</Label><Input type="text" inputMode="decimal" value={formData.sconto} onChange={(e) => setFormData({ ...formData, sconto: e.target.value })} placeholder="0" /></div>
                <div className="space-y-2 sm:col-span-2"><Label>Sconto merce €</Label><Input type="text" inputMode="decimal" value={formData.sconto_merce} onChange={(e) => setFormData({ ...formData, sconto_merce: e.target.value })} placeholder="0,00" /></div>
                <div className="space-y-2 sm:col-span-3"><Label>Note</Label><Textarea className="min-h-24" value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} placeholder="Aggiungi indicazioni utili all’ordine..." /></div>
              </div>
            </section>
          </div>

        </div>

        <div className="shrink-0 border-t border-order-line bg-order-surface px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-sm sm:px-8 sm:pb-5 sm:pt-4">
          <div className="mx-auto mb-3 flex max-w-3xl items-end justify-between">
            <div className="text-xs text-order-muted"><p>{righeOrdine.length} righe · {calcolaProdottiTotali()} pezzi</p></div>
            <div className="flex items-center gap-2 text-xs text-order-muted">
              {selectedAziendaName && <><Store className="h-3.5 w-3.5" /><span className="max-w-36 truncate">{selectedAziendaName}</span></>}
            </div>
          </div>
          <DialogFooter className="mx-auto grid max-w-3xl grid-cols-2 gap-2 sm:flex sm:justify-between sm:space-x-0">
            {currentStep === 0 ? (
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Annulla</Button>
            ) : (
              <Button variant="outline" onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}><ChevronLeft className="h-4 w-4" />Indietro</Button>
            )}
            {currentStep < 2 ? (
              <Button className="bg-order-ink text-primary-foreground hover:bg-order-ink/90" onClick={() => setCurrentStep((step) => Math.min(2, step + 1))} disabled={currentStep === 0 ? !formData.azienda_id : righeOrdine.length === 0}>Continua<ChevronRight className="h-4 w-4" /></Button>
            ) : (
              <Button className="bg-order-blue text-primary-foreground hover:bg-order-blue/90" onClick={handleSubmit} disabled={isSubmitting || righeOrdine.length === 0}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Crea ordine</Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>

      <AlertDialog open={priceConfirmIndex !== null} onOpenChange={(v) => !v && priceConfirmIndex !== null && closePriceConfirm(priceConfirmIndex)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Prezzo modificato</AlertDialogTitle>
            <AlertDialogDescription>
              {priceConfirmIndex !== null && (
                <>
                  Hai cambiato il prezzo di <strong>{righeOrdine[priceConfirmIndex]?.prodotto_nome}</strong> rispetto
                  a quello proposto ({PRICE_SOURCE_LABELS[righeOrdine[priceConfirmIndex]?.prezzo_source ?? "list"]}).
                  Vuoi applicarlo solo a questo ordine o salvarlo come prezzo riservato per il cliente?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => priceConfirmIndex !== null && closePriceConfirm(priceConfirmIndex)}>
              Solo questo ordine
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAsCustomerPrice} disabled={upsertCustomPrice.isPending}>
              Salva come prezzo cliente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
