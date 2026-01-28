import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ClientProductHistoryItem = {
  prodotto_id: string;
  prodotto_nome: string;
  prodotto_codice: string | null;
  brand_id: string | null;
  pezzi_per_cartone: number;
  prezzo_listino: number;
  strati: number;
  cartoni_per_strato: number;
  formato: string | null;
  // Last order data
  last_quantita_cartoni: number;
  last_quantita_pezzi: number;
  last_prezzo_unitario: number;
  last_sc1: number;
  last_sc2: number;
  last_sc3: number;
  // Stats
  ordini_count: number;
  total_cartoni: number;
  total_pezzi: number;
  last_order_date: string;
};

export type ClientOrderDefaults = {
  sconto: number;
  sconto_merce: number;
  tipo_pagamento: string;
};

/**
 * Hook per recuperare TUTTI i prodotti acquistati da un cliente per una specifica azienda.
 * Include i dati dell'ultimo ordine per pre-compilare quantità e sconti.
 */
export function useClientProductHistory(clienteId?: string, aziendaId?: string) {
  return useQuery({
    queryKey: ["client_product_history", clienteId, aziendaId],
    queryFn: async () => {
      if (!clienteId || !aziendaId) return null;

      // Get all orders for this client and company
      const { data: ordini, error: ordiniError } = await supabase
        .from("ordini")
        .select("id, sconto, sconto_merce, tipo_pagamento, created_at")
        .eq("cliente_id", clienteId)
        .eq("azienda_id", aziendaId)
        .neq("status", "annullato")
        .order("created_at", { ascending: false });

      if (ordiniError) throw ordiniError;
      if (!ordini || ordini.length === 0) return null;

      const orderIds = ordini.map(o => o.id);

      // Get all order lines from all orders
      const { data: righe, error: righeError } = await supabase
        .from("ordini_righe")
        .select(`
          ordine_id,
          prodotto_id,
          quantita_pezzi,
          quantita_cartoni,
          prezzo_unitario,
          sc1,
          sc2,
          sc3,
          created_at,
          prodotti (
            id,
            nome,
            codice,
            brand_id,
            pezzi_per_cartone,
            prezzo_listino,
            strati,
            cartoni_per_strato,
            formato
          )
        `)
        .in("ordine_id", orderIds)
        .order("created_at", { ascending: false });

      if (righeError) throw righeError;
      if (!righe) return null;

      // Group by product and aggregate
      const productMap = new Map<string, ClientProductHistoryItem>();
      const orderDateMap = new Map<string, { ordine_id: string; created_at: string }>();

      // Build order date map
      ordini.forEach(o => {
        orderDateMap.set(o.id, { ordine_id: o.id, created_at: o.created_at });
      });

      righe.forEach((riga) => {
        if (!riga.prodotti) return;
        
        const prodottoId = riga.prodotto_id;
        const orderInfo = orderDateMap.get(riga.ordine_id);
        
        const existing = productMap.get(prodottoId);
        
        if (existing) {
          // Aggregate totals
          existing.ordini_count += 1;
          existing.total_cartoni += riga.quantita_cartoni;
          existing.total_pezzi += riga.quantita_pezzi;
          
          // Keep most recent order data
          if (orderInfo && orderInfo.created_at > existing.last_order_date) {
            existing.last_order_date = orderInfo.created_at;
            existing.last_quantita_cartoni = riga.quantita_cartoni;
            existing.last_quantita_pezzi = riga.quantita_pezzi;
            existing.last_prezzo_unitario = Number(riga.prezzo_unitario);
            existing.last_sc1 = Number(riga.sc1) || 0;
            existing.last_sc2 = Number(riga.sc2) || 0;
            existing.last_sc3 = Number(riga.sc3) || 0;
          }
        } else {
          productMap.set(prodottoId, {
            prodotto_id: prodottoId,
            prodotto_nome: riga.prodotti.nome,
            prodotto_codice: riga.prodotti.codice,
            brand_id: riga.prodotti.brand_id,
            pezzi_per_cartone: riga.prodotti.pezzi_per_cartone,
            prezzo_listino: Number(riga.prodotti.prezzo_listino),
            strati: riga.prodotti.strati,
            cartoni_per_strato: riga.prodotti.cartoni_per_strato,
            formato: riga.prodotti.formato,
            last_quantita_cartoni: riga.quantita_cartoni,
            last_quantita_pezzi: riga.quantita_pezzi,
            last_prezzo_unitario: Number(riga.prezzo_unitario),
            last_sc1: Number(riga.sc1) || 0,
            last_sc2: Number(riga.sc2) || 0,
            last_sc3: Number(riga.sc3) || 0,
            ordini_count: 1,
            total_cartoni: riga.quantita_cartoni,
            total_pezzi: riga.quantita_pezzi,
            last_order_date: orderInfo?.created_at || "",
          });
        }
      });

      // Get defaults from most recent order
      const lastOrdine = ordini[0];
      const defaults: ClientOrderDefaults = {
        sconto: Number(lastOrdine.sconto) || 0,
        sconto_merce: Number(lastOrdine.sconto_merce) || 0,
        tipo_pagamento: lastOrdine.tipo_pagamento || "Contanti",
      };

      return {
        products: Array.from(productMap.values()).sort((a, b) => 
          new Date(b.last_order_date).getTime() - new Date(a.last_order_date).getTime()
        ),
        defaults,
        totalOrders: ordini.length,
      };
    },
    enabled: !!clienteId && !!aziendaId,
  });
}
