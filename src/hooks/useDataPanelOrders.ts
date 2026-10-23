import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DataPanelOrder } from "@/lib/dataPanelMetrics";

export async function fetchDataPanelOrders(): Promise<DataPanelOrder[]> {
  const all: DataPanelOrder[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("ordini").select("id,codice,status,totale,data_ordine,data_conferma,created_at,sconto,sconto_merce,clienti(nome),ordini_righe(quantita_pezzi,quantita_cartoni,prezzo_unitario,sc1,sc2,sc3,is_omaggio,prodotti(pezzi_per_cartone,costo_acquisto))").order("id").range(from, from + 999);
    if (error) throw error;
    all.push(...(data ?? []) as DataPanelOrder[]);
    if (!data || data.length < 1000) return all;
  }
}

export function useDataPanelOrders() {
  return useQuery({ queryKey: ["data_panel_orders"], queryFn: fetchDataPanelOrders, staleTime: 60_000 });
}