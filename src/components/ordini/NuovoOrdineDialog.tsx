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
import { Plus, Loader2, RefreshCw, Gift } from "lucide-react";
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

  // Se il prezzo digitato manualmente differisce da quello proposto (listino,
  // ultimo applicato o personalizzato) e non è già stato chiesto per questa
  // riga, apre la conferma "solo questo ordine" vs "salva come prezzo cliente".
  const handlePrezzoBlur = (index: number) => {
    const riga = righeOrdine[index];
    if (!riga || riga.is_omaggio || riga.prezzo_dirty_prompted) return;
    if (parseDecimalInput(riga.prezzo_unitario) === parseDecimalInput(riga.prezzo_baseline)) return;
    setPriceConfirmIndex(index);
  };

  const closePriceConfirm = (index: number) => {
    const updated = [...righeOrdine];
    if (updated[index]) updated[index] = { ...updated[index], prezzo_dirty_prompted: true };
    setRigheOrdine(updated);
    setPriceConfirmIndex(null);
  };

  const handleSaveAsCustomerPrice = async () => {
    if (priceConfirmIndex === null) return;
    const riga = righeOrdine[priceConfirmIndex];
    if (!riga || !formData.cliente_id || !formData.azienda_id) {
      closePriceConfirm(priceConfirmIndex);
      return;
    }
    await upsertCustomPrice.mutateAsync({
      customer_id: formData.cliente_id,
      company_id: formData.azienda_id,
      product_id: riga.prodotto_id,
      custom_price: parseDecimalInput(riga.prezzo_unitario),
    });
    closePriceConfirm(priceConfirmIndex);
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-4 py-4 sm:px-6">
          <DialogTitle>Crea Nuovo Ordine</DialogTitle>
          <DialogDescription>Seleziona cliente, azienda e aggiungi i prodotti</DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4 sm:px-6">
          {/* Cliente, azienda, data */}
          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Cliente e azienda</h4>
            <div className="space-y-1.5">
              <Label className="text-sm">Data Ordine</Label>
              <Input
                type="date"
                value={formData.data_ordine}
                onChange={(e) => setFormData({ ...formData, data_ordine: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          </section>

          {/* Promozioni attive */}
          {formData.azienda_id && promozioniRilevanti.length > 0 && (
            <PromozioniAttiveAlert
              promozioni={promozioniRilevanti}
              appliedPromos={appliedPromos}
              onApply={handleApplyPromo}
            />
          )}

          {/* Prodotti */}
          {formData.azienda_id && (
            <section className="space-y-3 border-t border-border pt-4">
              <h4 className="text-sm font-semibold">Prodotti</h4>

              {formData.cliente_id && productHistory && productHistory.products.length > 0 && (
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

              {righeOrdine.length > 0 && (
                <div className="space-y-3">
                  {righeOrdine.map((riga, index) => (
                    <OrdineRigaEditor
                      key={index}
                      prodottoNome={riga.prodotto_nome}
                      formato={riga.formato}
                      pezziPerCartone={riga.pezzi_per_cartone}
                      strati={riga.strati}
                      cartoniPerStrato={riga.cartoni_per_strato}
                      isOmaggio={riga.is_omaggio}
                      prezzoUnitario={riga.prezzo_unitario}
                      quantitaPezzi={riga.quantita_pezzi}
                      quantitaCartoni={riga.quantita_cartoni}
                      sc1={riga.sc1}
                      sc2={riga.sc2}
                      sc3={riga.sc3}
                      subtotale={rigaSubtotale(riga)}
                      prezzoSourceLabel={riga.is_omaggio ? undefined : PRICE_SOURCE_LABELS[riga.prezzo_source]}
                      prezzoSourceInfo={riga.prezzo_source_info}
                      onBlurPrezzo={() => handlePrezzoBlur(index)}
                      onChangePrezzo={(v) => updateRiga(index, "prezzo_unitario", v)}
                      onChangeQuantitaPezzi={(v) => updateRiga(index, "quantita_pezzi", v)}
                      onChangeQuantitaCartoni={(v) => updateRiga(index, "quantita_cartoni", v)}
                      onChangeSc1={(v) => updateRiga(index, "sc1", v)}
                      onChangeSc2={(v) => updateRiga(index, "sc2", v)}
                      onChangeSc3={(v) => updateRiga(index, "sc3", v)}
                      onRemove={() => removeRiga(index)}
                      onAddOmaggio={riga.is_omaggio ? undefined : () => addOmaggioFromRiga(index)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Pagamento e sconti */}
          <section className="space-y-3 border-t border-border pt-4">
            <h4 className="text-sm font-semibold">Pagamento e sconti</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Tipo Pagamento</Label>
                <Select
                  value={formData.tipo_pagamento}
                  onValueChange={(v) => setFormData({ ...formData, tipo_pagamento: v })}
                >
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
          </section>

          {/* Note */}
          <section className="space-y-2">
            <Label>Note</Label>
            <Textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Note aggiuntive..."
            />
          </section>
        </div>

        {/* Footer sticky: totale sempre visibile */}
        <div className="border-t border-border bg-card px-4 py-3 sm:px-6">
          <div className="mb-3 flex items-end justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              <p>{calcolaProdottiTotali()} pezzi</p>
              {(parseDecimalInput(formData.sconto) > 0 || parseDecimalInput(formData.sconto_merce) > 0) && (
                <p>
                  Sconto: {formData.sconto}% + {formatCurrency(parseDecimalInput(formData.sconto_merce))}
                </p>
              )}
            </div>
            <p className="text-xl font-bold tabular-nums">{formatCurrency(calcolaTotale())}</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Annulla
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || righeOrdine.length === 0}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crea Ordine
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>

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
    </Dialog>
  );
}
