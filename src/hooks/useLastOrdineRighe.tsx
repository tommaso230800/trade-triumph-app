import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LastOrdineRiga = {
  prodotto_id: string;
  quantita_pezzi: number;
  quantita_cartoni: number;
  prezzo_unitario: number;
  prodotti?: { nome: string; pezzi_per_cartone: number } | null;
};

export type LastOrdine = {
  id: string;
  sconto: number;
  sconto_merce: number;
  tipo_pagamento: string;
};

export function useLastOrdineForClient(clienteId?: string, aziendaId?: string) {
  return useQuery({
    queryKey: ["last_ordine", clienteId, aziendaId],
    queryFn: async () => {
      if (!clienteId || !aziendaId) return null;

      // Get the last order for this client and company
      const { data: lastOrdine, error: ordineError } = await supabase
        .from("ordini")
        .select("id, sconto, sconto_merce, tipo_pagamento")
        .eq("cliente_id", clienteId)
        .eq("azienda_id", aziendaId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (ordineError || !lastOrdine) return null;

      // Get the order lines
      const { data: righe, error: righeError } = await supabase
        .from("ordini_righe")
        .select(`
          prodotto_id,
          quantita_pezzi,
          quantita_cartoni,
          prezzo_unitario,
          prodotti (nome, pezzi_per_cartone)
        `)
        .eq("ordine_id", lastOrdine.id);

      if (righeError) return null;

      return {
        ordine: lastOrdine as LastOrdine,
        righe: righe as LastOrdineRiga[],
      };
    },
    enabled: !!clienteId && !!aziendaId,
  });
}
