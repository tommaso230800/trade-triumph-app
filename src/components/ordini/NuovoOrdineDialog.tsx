import { useEffect, useMemo, useRef, useState } from "react";
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
  Search,
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
import { ProductPicker } from "./ProductPicker";
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
  tipo_pagamento: "Come precedente ordine",
  data_ordine: format(new Date(), "yyyy-MM-dd"),
});

/** Pre-riempimento per il flusso Riordino → Ordina: cliente, azienda e
 *  prodotti con quantità suggerita arrivano dalla pagina Riordino. */
export interface OrdinePrefill {
  cliente_id: string;
  azienda_id: string;
  righe: Array<{ prodotto_id: string; quantita_cartoni: number }>;
}

interface NuovoOrdineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderCreated: (data: ProformaData) => void;
  prefill?: OrdinePrefill | null;
}

export function NuovoOrdineDialog({ open, onOpenChange, onOrderCreated, prefill }: NuovoOrdineDialogProps) {
  const [formData, setFormData] = useState(emptyFormData());
  const [righeOrdine, setRigheOrdine] = useState<RigaOrdine[]>([]);
  const [selectedProdotto, setSelectedProdotto] = useState("");
  const [appliedPromos, setAppliedPromos] = useState<string[]>([]);
  const [priceConfirmIndex, setPriceConfirmIndex] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  // true quando la conferma prezzo è stata aperta dal salvataggio: dopo la
  // scelta l'ordine prosegue automaticamente.
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

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

  // ── Pre-riempimento Riordino → Ordina ──────────────────────────────
  // Fase 1: imposta cliente e azienda. Fase 2: quando lo storico prezzi del
  // cliente è caricato, costruisce le righe con i prezzi attuali (mai prezzi
  // storici non più validi: vale la stessa priorità dell'aggiunta manuale).
  const prefillAppliedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      prefillAppliedRef.current = false;
      return;
    }
    if (!prefill) return;
    if (formData.cliente_id !== prefill.cliente_id || formData.azienda_id !== prefill.azienda_id) {
      setFormData((prev) => ({
        ...prev,
        cliente_id: prefill.cliente_id,
        azienda_id: prefill.azienda_id,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill]);

  useEffect(() => {
    if (!open || !prefill || prefillAppliedRef.current) return;
    if (formData.cliente_id !== prefill.cliente_id || formData.azienda_id !== prefill.azienda_id) return;
    if (!allProdotti || productHistory === undefined || customPrices === undefined) return;

    const prodottiValidi = allProdotti.filter((p) => p.azienda_id === prefill.azienda_id);
    const righe: RigaOrdine[] = [];
    const mancanti: string[] = [];
    for (const r of prefill.righe) {
      const prodotto = prodottiValidi.find((p) => p.id === r.prodotto_id);
      if (!prodotto) {
        const altrove = allProdotti.find((p) => p.id === r.prodotto_id);
        mancanti.push(altrove ? `${altrove.nome} (non più dell'azienda selezionata)` : "un prodotto non più disponibile");
        continue;
      }
      if (righe.some((x) => x.prodotto_id === prodotto.id)) continue;
      righe.push(buildRiga(prodotto, Math.max(0, Math.round(r.quantita_cartoni))));
    }
    setRigheOrdine(righe);
    if (righe.length > 0) setCurrentStep(1);
    if (mancanti.length > 0) {
      toast.warning(`Alcuni prodotti non sono stati caricati: ${mancanti.join(", ")}.`);
    }
    prefillAppliedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefill, formData.cliente_id, formData.azienda_id, allProdotti, productHistory, customPrices]);

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

  // Costruisce una riga ordine per un prodotto: prezzo risolto con la stessa
  // priorità ovunque (prezzo personalizzato cliente → ultimo ordine → listino),
  // sconti da prodotto o da azienda. Usata sia dall'aggiunta manuale sia dal
  // pre-riempimento Riordino → Ordina.
  const buildRiga = (prodotto: (typeof prodottiAzienda)[number], quantitaCartoni = 0): RigaOrdine => {
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

    return {
      prodotto_id: prodotto.id,
      prodotto_nome: prodotto.nome,
      prodotto_codice: prodotto.codice || undefined,
      prodotto_brand_id: prodotto.brand_id || undefined,
      prezzo_unitario: prezzoIniziale,
      quantita_pezzi: 0,
      quantita_cartoni: quantitaCartoni,
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
  };

  const addProdottoToOrder = (id: string = selectedProdotto) => {
    if (!id) return;
    const prodotto = prodottiAzienda.find((p) => p.id === id);
    if (!prodotto) return;

    const newRiga = buildRiga(prodotto);

    const availablePromo = promozioniRilevanti.find((promo) =>
      promo.canvass_prodotti?.some((cp) => cp.prodotto_id === prodotto.id)
    );
    if (availablePromo) {
      toast.info(`Promozione "${availablePromo.nome}" disponibile per questo prodotto. Clicca "Applica" nella sezione promozioni.`, {
        icon: <Gift className="h-4 w-4 text-primary" />,
        duration: 4000,
      });
    }

    setRigheOrdine((prev) => [...prev, newRiga]);
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
      // Nessun recupero del pagamento precedente: resta la dicitura scelta.
      tipo_pagamento: prev.tipo_pagamento,
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
      ordine_id: ordine.id,
      azienda_id: ordine.azienda_id,
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
  const canGoTo = (index: number) => index === 0 || (index === 1 && !!formData.azienda_id) || (index === 2 && righeOrdine.length > 0);
  const subtotaleRighe = righeOrdine.reduce((sum, r) => sum + rigaSubtotale(r), 0);
  const totale = calcolaTotale();
  const scontoPct = parseDecimalInput(formData.sconto);
  const scontoMerce = parseDecimalInput(formData.sconto_merce);
  const omaggiCount = righeOrdine.filter((r) => r.is_omaggio).length;
  const prodottiIdsInOrdine = new Set(righeOrdine.map((r) => r.prodotto_id));
  const pickerProducts = prodottiAzienda.map((p) => ({
    id: p.id,
    nome: p.nome,
    codice: p.codice,
    formato: p.formato,
    pezzi_per_cartone: p.pezzi_per_cartone,
    prezzo_listino: p.prezzo_listino,
    brand: brands?.find((b) => b.id === p.brand_id)?.name,
  }));
  const fieldCls = "h-11 w-full min-w-0 rounded-lg border-order-line bg-order-paper text-base sm:text-sm";

  const SectionTitle = ({ n, title, hint }: { n: string; title: string; hint?: string }) => (
    <div className="mb-3 flex items-baseline gap-2">
      <span className="text-xs font-semibold tabular-nums text-order-muted">{n}</span>
      <h3 className="text-base font-semibold">{title}</h3>
      {hint && <span className="ml-auto text-xs text-order-muted">{hint}</span>}
    </div>
  );

  const SummaryRow = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-order-muted">{label}</span>
      <span className={`tabular-nums ${strong ? "font-semibold text-order-ink" : "text-order-ink"}`}>{value}</span>
    </div>
  );

  const ReviewBlock = ({ title, step, children }: { title: string; step: number; children: React.ReactNode }) => (
    <div className="min-w-0 rounded-xl border border-order-line bg-order-surface p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-order-muted">{title}</h4>
        <Button type="button" variant="ghost" size="sm" className="h-9 px-2 text-xs font-semibold text-order-blue hover:bg-order-blue/10" onClick={() => setCurrentStep(step)}>
          Modifica
        </Button>
      </div>
      {children}
    </div>
  );

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="inset-0 left-0 top-0 flex h-[100dvh] max-h-none w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-order-paper p-0 text-order-ink sm:left-1/2 sm:top-1/2 sm:h-[min(92dvh,900px)] sm:w-[calc(100vw-2rem)] sm:max-w-3xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border sm:border-order-line lg:max-w-6xl">
        {/* Intestazione compatta: titolo, totale, avanzamento */}
        <DialogHeader className="shrink-0 space-y-4 border-b border-order-line bg-order-paper px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-left sm:px-6 sm:pt-5">
          <div className="flex items-start justify-between gap-4 pr-10">
            <div className="min-w-0">
              <DialogTitle className="text-xl font-bold sm:text-2xl">Nuovo ordine</DialogTitle>
              <DialogDescription className="mt-0.5 truncate text-xs text-order-muted sm:text-sm">
                {selectedClienteName || "Nessun cliente"}{selectedAziendaName ? ` · ${selectedAziendaName}` : ""}
              </DialogDescription>
            </div>
            <div className="shrink-0 text-right lg:hidden">
              <p className="text-[11px] text-order-muted">Totale</p>
              <p className="text-lg font-bold tabular-nums text-order-blue sm:text-xl">{formatCurrency(totale)}</p>
            </div>
          </div>

          <ol className="flex items-center gap-2" aria-label="Avanzamento ordine">
            {steps.map((step, index) => {
              const active = index === currentStep;
              const complete = index < currentStep;
              const enabled = canGoTo(index);
              return (
                <li key={step.label} className="flex min-w-0 flex-1 items-center gap-2">
                  <button
                    type="button"
                    disabled={!enabled}
                    onClick={() => enabled && setCurrentStep(index)}
                    aria-current={active ? "step" : undefined}
                    className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg pr-2 text-left disabled:cursor-not-allowed"
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums transition-colors duration-200 ${
                        active
                          ? "border-order-blue bg-order-blue text-primary-foreground"
                          : complete
                            ? "border-order-blue/40 bg-order-blue/10 text-order-blue"
                            : "border-order-line bg-order-surface text-order-muted"
                      }`}
                    >
                      {complete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    <span className={`truncate text-sm ${active ? "font-semibold text-order-ink" : complete ? "text-order-ink" : "text-order-muted"}`}>
                      {step.label}
                    </span>
                  </button>
                  {index < steps.length - 1 && <span className={`h-px flex-1 ${complete ? "bg-order-blue/40" : "bg-order-line"}`} />}
                </li>
              );
            })}
          </ol>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-6">
            {/* ── 1. Cliente ─────────────────────────────── */}
            <section className={currentStep === 0 ? "space-y-6" : "hidden"}>
              <div>
                <SectionTitle n="01" title="Cliente" hint="Facoltativo" />
                <div className="min-w-0 space-y-3 rounded-xl border border-order-line bg-order-surface p-4 shadow-sm sm:p-5">
                  <SearchableSelect options={clientiOptions} value={formData.cliente_id} onValueChange={(v) => setFormData({ ...formData, cliente_id: v })} placeholder="Cerca e seleziona il cliente" searchPlaceholder="Nome, città, P.IVA…" emptyMessage="Nessun cliente trovato" className={fieldCls} />
                  {selectedCliente && (
                    <div className="min-w-0 rounded-lg bg-order-paper p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 break-words text-sm font-semibold leading-snug">{selectedCliente.nome}</p>
                        <span className="shrink-0 rounded-full bg-order-blue/10 px-2.5 py-0.5 text-xs font-semibold text-order-blue">{clienteStatusLabel}</span>
                      </div>
                      <p className="mt-1 break-words text-xs text-order-muted">
                        {[selectedCliente.indirizzo, selectedCliente.citta, selectedCliente.provincia].filter(Boolean).join(" · ") || "Indirizzo N/D"}
                      </p>
                      <p className="mt-2 text-xs tabular-nums text-order-muted">
                        {selectedCliente.ordini_count ?? 0} ordini nello storico
                        {selectedCliente.partita_iva && ` · P.IVA ${selectedCliente.partita_iva}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <SectionTitle n="02" title="Fornitore e data" />
                <div className="grid min-w-0 gap-4 rounded-xl border border-order-line bg-order-surface p-4 shadow-sm sm:grid-cols-2 sm:p-5">
                  <div className="min-w-0 space-y-1.5">
                    <Label className="text-xs text-order-muted">Azienda fornitrice <span className="text-destructive">*</span></Label>
                    <SearchableSelect
                      options={aziendeOptions}
                      value={formData.azienda_id}
                      onValueChange={(v) => {
                        setFormData({ ...formData, azienda_id: v });
                        setRigheOrdine([]);
                        setSelectedProdotto("");
                      }}
                      placeholder="Seleziona fornitore"
                      searchPlaceholder="Cerca fornitore…"
                      emptyMessage="Nessuna azienda trovata"
                      className={`${fieldCls} ${!formData.azienda_id ? "border-order-line" : ""}`}
                    />
                    {!formData.azienda_id && <p className="text-xs text-order-muted">Necessaria per scegliere i prodotti.</p>}
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <Label htmlFor="nuovo-ordine-data" className="text-xs text-order-muted">Data ordine</Label>
                    <div className="relative min-w-0">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-order-muted" />
                      <Input id="nuovo-ordine-data" type="date" className={`${fieldCls} block appearance-none pl-10 text-left [&::-webkit-date-and-time-value]:text-left`} value={formData.data_ordine} onChange={(e) => setFormData({ ...formData, data_ordine: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <SectionTitle n="03" title="Pagamento" />
                <div className="rounded-xl border border-order-line bg-order-surface p-4 shadow-sm sm:p-5">
                  <Select value={formData.tipo_pagamento} onValueChange={(v) => setFormData({ ...formData, tipo_pagamento: v })}>
                    <SelectTrigger className={fieldCls} aria-label="Tipo pagamento"><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPI_PAGAMENTO.map((tipo) => <SelectItem key={tipo} value={tipo} className="min-h-11">{tipo}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* ── 2. Prodotti ────────────────────────────── */}
            <section className={currentStep === 1 ? "space-y-4" : "hidden"}>
              {promozioniRilevanti.length > 0 && <PromozioniAttiveAlert promozioni={promozioniRilevanti} appliedPromos={appliedPromos} onApply={handleApplyPromo} />}

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  disabled={prodottiAzienda.length === 0}
                  className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-xl border border-order-line bg-order-surface px-4 text-left text-base text-order-muted shadow-sm transition-colors duration-150 hover:border-order-blue/50 disabled:opacity-50 sm:text-sm"
                >
                  <Search className="h-4 w-4 shrink-0" />
                  <span className="truncate">Cerca e aggiungi prodotti…</span>
                  <span className="ml-auto shrink-0 text-xs tabular-nums">{prodottiAzienda.length}</span>
                </button>
                {formData.cliente_id && productHistory && productHistory.products.length > 0 && (
                  <Button type="button" variant="outline" className="h-12 shrink-0 gap-2 rounded-xl border-order-line bg-order-surface text-order-ink hover:bg-order-paper" onClick={handleRiassortimento}>
                    <RefreshCw className="h-4 w-4" />
                    Riassortimento ({productHistory.products.length})
                  </Button>
                )}
              </div>
              {prodottiAzienda.length === 0 && <p className="text-sm text-order-muted">Nessun prodotto disponibile per questo fornitore.</p>}

              {righeOrdine.length === 0 ? (
                <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-order-line p-6 text-center">
                  <ShoppingBag className="mb-3 h-6 w-6 text-order-muted" />
                  <p className="text-sm font-semibold">L’ordine è ancora vuoto</p>
                  <p className="mt-1 text-xs text-order-muted">Aggiungi i prodotti con la ricerca qui sopra.</p>
                  <Button type="button" className="mt-4 h-11 gap-2 rounded-lg bg-order-ink text-primary-foreground hover:bg-order-ink/90" onClick={() => setPickerOpen(true)} disabled={prodottiAzienda.length === 0}>
                    <Plus className="h-4 w-4" /> Aggiungi prodotto
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between px-1 text-xs text-order-muted">
                    <span>{righeOrdine.length} righe{omaggiCount > 0 ? ` · ${omaggiCount} omaggi` : ""}</span>
                    <span className="tabular-nums">{calcolaProdottiTotali()} pezzi</span>
                  </div>
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
                  <Button type="button" variant="outline" className="h-12 w-full gap-2 rounded-xl border-dashed border-order-line bg-transparent text-order-ink hover:bg-order-surface" onClick={() => setPickerOpen(true)}>
                    <Plus className="h-4 w-4" /> Aggiungi altro prodotto
                  </Button>
                </div>
              )}
            </section>

            {/* ── 3. Conferma ────────────────────────────── */}
            <section className={currentStep === 2 ? "space-y-4" : "hidden"}>
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <ReviewBlock title="Cliente" step={0}>
                  <p className="break-words text-sm font-semibold leading-snug">{selectedClienteName || "Nessun cliente"}</p>
                  {selectedCliente?.citta && <p className="mt-0.5 text-xs text-order-muted">{selectedCliente.citta}</p>}
                </ReviewBlock>
                <ReviewBlock title="Fornitore" step={0}>
                  <p className="break-words text-sm font-semibold leading-snug">{selectedAziendaName || "—"}</p>
                  <p className="mt-0.5 text-xs tabular-nums text-order-muted">
                    {format(new Date(`${formData.data_ordine}T12:00:00`), "dd/MM/yyyy")} · {formData.tipo_pagamento}
                  </p>
                </ReviewBlock>
              </div>

              <ReviewBlock title={`Prodotti · ${righeOrdine.length}`} step={1}>
                <ul className="divide-y divide-order-line">
                  {righeOrdine.map((r, i) => (
                    <li key={`${r.prodotto_id}-${i}`} className="flex items-start justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="break-words text-sm leading-snug">{r.prodotto_nome}</p>
                        <p className="mt-0.5 text-xs tabular-nums text-order-muted">
                          {r.quantita_cartoni > 0 && `${r.quantita_cartoni} cart`}
                          {r.quantita_cartoni > 0 && r.quantita_pezzi > 0 && " + "}
                          {r.quantita_pezzi > 0 && `${r.quantita_pezzi} pz`}
                          {r.quantita_cartoni === 0 && r.quantita_pezzi === 0 && "Quantità 0"}
                          {!r.is_omaggio && ` · ${r.prezzo_unitario} €/pz`}
                        </p>
                      </div>
                      <span className={`shrink-0 text-sm font-semibold tabular-nums ${r.is_omaggio ? "text-success" : ""}`}>
                        {r.is_omaggio ? "Omaggio" : formatCurrency(rigaSubtotale(r))}
                      </span>
                    </li>
                  ))}
                </ul>
              </ReviewBlock>

              <div className="min-w-0 rounded-xl border border-order-line bg-order-surface p-4 shadow-sm">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-order-muted">Condizioni finali</h4>
                <div className="grid min-w-0 grid-cols-2 gap-3">
                  <div className="min-w-0 space-y-1.5"><Label className="text-xs text-order-muted">Sconto in fattura %</Label><Input type="text" inputMode="decimal" className={`${fieldCls} text-right tabular-nums`} value={formData.sconto} onChange={(e) => setFormData({ ...formData, sconto: e.target.value })} placeholder="0" /></div>
                  <div className="min-w-0 space-y-1.5"><Label className="text-xs text-order-muted">Sconto merce €</Label><Input type="text" inputMode="decimal" className={`${fieldCls} text-right tabular-nums`} value={formData.sconto_merce} onChange={(e) => setFormData({ ...formData, sconto_merce: e.target.value })} placeholder="0,00" /></div>
                  <div className="col-span-2 min-w-0 space-y-1.5"><Label className="text-xs text-order-muted">Note</Label><Textarea className="min-h-24 rounded-lg border-order-line bg-order-paper text-base sm:text-sm" value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} placeholder="Indicazioni per consegna o fornitore…" /></div>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-order-blue/30 bg-order-surface p-4 shadow-sm lg:hidden">
                <SummaryRow label="Subtotale righe" value={formatCurrency(subtotaleRighe)} />
                {scontoPct > 0 && <SummaryRow label={`Sconto ${formData.sconto}%`} value={`-${formatCurrency(subtotaleRighe * scontoPct / 100)}`} />}
                {scontoMerce > 0 && <SummaryRow label="Sconto merce" value={`-${formatCurrency(scontoMerce)}`} />}
                <div className="flex items-baseline justify-between border-t border-order-line pt-2">
                  <span className="text-sm font-semibold">Totale ordine</span>
                  <span className="text-2xl font-bold tabular-nums text-order-blue">{formatCurrency(totale)}</span>
                </div>
              </div>
            </section>
            </div>
          </div>

          {/* Riepilogo laterale (solo computer) */}
          <aside className="hidden w-80 shrink-0 flex-col border-l border-order-line bg-order-surface lg:flex">
            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-order-muted">Riepilogo</p>
                <p className="mt-2 break-words text-sm font-semibold leading-snug">{selectedClienteName || "Nessun cliente"}</p>
                <p className="mt-0.5 break-words text-xs text-order-muted">{selectedAziendaName || "Fornitore da scegliere"}</p>
              </div>
              <div className="space-y-2">
                <SummaryRow label="Righe" value={`${righeOrdine.length}${omaggiCount ? ` (${omaggiCount} omaggi)` : ""}`} />
                <SummaryRow label="Pezzi" value={String(calcolaProdottiTotali())} />
                <SummaryRow label="Pagamento" value={formData.tipo_pagamento} />
              </div>
              <div className="space-y-2 border-t border-order-line pt-4">
                <SummaryRow label="Subtotale" value={formatCurrency(subtotaleRighe)} />
                {scontoPct > 0 && <SummaryRow label={`Sconto ${formData.sconto}%`} value={`-${formatCurrency(subtotaleRighe * scontoPct / 100)}`} />}
                {scontoMerce > 0 && <SummaryRow label="Sconto merce" value={`-${formatCurrency(scontoMerce)}`} />}
              </div>
            </div>
            <div className="border-t border-order-line p-6">
              <p className="text-xs text-order-muted">Totale ordine</p>
              <p className="text-3xl font-bold tracking-tight tabular-nums text-order-blue">{formatCurrency(totale)}</p>
            </div>
          </aside>
        </div>

        {/* Barra azioni fissa, rispetta la safe area */}
        <div className="shrink-0 border-t border-order-line bg-order-surface px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-4">
          <DialogFooter className="flex flex-row items-center gap-2 sm:justify-between sm:space-x-0">
            {currentStep === 0 ? (
              <Button variant="outline" className="h-11 rounded-lg border-order-line" onClick={() => handleOpenChange(false)}>Annulla</Button>
            ) : (
              <Button variant="outline" className="h-11 rounded-lg border-order-line" onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}><ChevronLeft className="h-4 w-4" />Indietro</Button>
            )}
            <div className="hidden min-w-0 flex-1 text-center text-xs tabular-nums text-order-muted sm:block lg:hidden">
              {righeOrdine.length} righe · {calcolaProdottiTotali()} pezzi
            </div>
            {currentStep < 2 ? (
              <Button className="h-11 flex-1 rounded-lg bg-order-ink text-primary-foreground hover:bg-order-ink/90 sm:flex-none sm:px-6" onClick={() => setCurrentStep((step) => Math.min(2, step + 1))} disabled={currentStep === 0 ? !formData.azienda_id : righeOrdine.length === 0}>
                {currentStep === 0 ? "Scegli prodotti" : "Rivedi ordine"}<ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button className="h-11 flex-1 gap-2 rounded-lg bg-order-blue font-semibold text-primary-foreground hover:bg-order-blue/90 sm:flex-none sm:px-6" onClick={handleSubmit} disabled={isSubmitting || righeOrdine.length === 0}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span className="truncate">Crea ordine · {formatCurrency(totale)}</span>
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>

    <ProductPicker
      open={pickerOpen}
      onOpenChange={setPickerOpen}
      products={pickerProducts}
      inOrder={prodottiIdsInOrdine}
      onPick={(id) => addProdottoToOrder(id)}
    />

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
