// Priorità di prezzo per un ordine: prezzo personalizzato cliente > ultimo
// prezzo realmente applicato allo stesso cliente per la stessa azienda >
// prezzo di listino generale del prodotto. Logica pura, condivisa tra i
// dialog ordine e il Listino personalizzato in scheda cliente.

export type PriceSource = "custom" | "last_order" | "list";

export const PRICE_SOURCE_LABELS: Record<PriceSource, string> = {
  custom: "Prezzo personalizzato",
  last_order: "Ultimo prezzo applicato",
  list: "Prezzo di listino",
};

export interface LastOrderPriceInfo {
  date: string;
  orderCode: string | null;
  price: number;
  quantitaCartoni: number;
  quantitaPezzi: number;
}

export interface ResolvedPrice {
  price: number;
  source: PriceSource;
  lastOrderInfo?: LastOrderPriceInfo;
}

export interface CustomPriceLookup {
  custom_price: number;
}

export interface LastOrderLookup {
  last_prezzo_unitario: number;
  last_order_date: string;
  last_ordine_codice?: string | null;
  last_quantita_cartoni: number;
  last_quantita_pezzi: number;
}

export function resolveProductPrice(params: {
  productId: string;
  listPrice: number;
  customPricesByProduct: Map<string, CustomPriceLookup>;
  lastOrderByProduct: Map<string, LastOrderLookup>;
}): ResolvedPrice {
  const custom = params.customPricesByProduct.get(params.productId);
  if (custom) {
    return { price: custom.custom_price, source: "custom" };
  }

  const last = params.lastOrderByProduct.get(params.productId);
  if (last) {
    return {
      price: last.last_prezzo_unitario,
      source: "last_order",
      lastOrderInfo: {
        date: last.last_order_date,
        orderCode: last.last_ordine_codice ?? null,
        price: last.last_prezzo_unitario,
        quantitaCartoni: last.last_quantita_cartoni,
        quantitaPezzi: last.last_quantita_pezzi,
      },
    };
  }

  return { price: params.listPrice, source: "list" };
}
