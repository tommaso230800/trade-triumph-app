import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ReorderAlert {
  id: string;
  cliente_id: string;
  azienda_id: string;
  cliente_nome: string;
  azienda_nome: string;
  ultimo_ordine_data: string | null;
  media_giorni_riordino: number;
  numero_ordini: number;
  prossimo_riordino_previsto: string | null;
  giorni_ritardo: number;
}

export function useReorderTracking() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reorder_tracking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reorder_tracking")
        .select("*")
        .order("prossimo_riordino_previsto", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useReorderAlerts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reorder_alerts"],
    queryFn: async (): Promise<ReorderAlert[]> => {
      // Fetch tracking data with prossimo_riordino_previsto <= today
      const today = new Date().toISOString().split("T")[0];
      
      const { data: tracking, error } = await supabase
        .from("reorder_tracking")
        .select("*")
        .gte("numero_ordini", 2) // Solo se ha almeno 2 ordini (per avere una media)
        .lte("prossimo_riordino_previsto", today)
        .order("prossimo_riordino_previsto", { ascending: true });

      if (error) throw error;
      if (!tracking || tracking.length === 0) return [];

      // Fetch nomi clienti e aziende
      const clienteIds = [...new Set(tracking.map(t => t.cliente_id))];
      const aziendaIds = [...new Set(tracking.map(t => t.azienda_id))];

      const [{ data: clienti }, { data: aziende }] = await Promise.all([
        supabase.from("clienti").select("id, nome").in("id", clienteIds),
        supabase.from("aziende").select("id, nome").in("id", aziendaIds),
      ]);

      const clientiMap = new Map((clienti || []).map(c => [c.id, c.nome]));
      const aziendeMap = new Map((aziende || []).map(a => [a.id, a.nome]));

      return tracking.map(t => {
        const previsto = t.prossimo_riordino_previsto ? new Date(t.prossimo_riordino_previsto) : new Date();
        const giorni_ritardo = Math.max(0, Math.floor((new Date().getTime() - previsto.getTime()) / (1000 * 60 * 60 * 24)));
        
        return {
          id: t.id,
          cliente_id: t.cliente_id,
          azienda_id: t.azienda_id,
          cliente_nome: clientiMap.get(t.cliente_id) || "Cliente",
          azienda_nome: aziendeMap.get(t.azienda_id) || "Azienda",
          ultimo_ordine_data: t.ultimo_ordine_data,
          media_giorni_riordino: Number(t.media_giorni_riordino) || 0,
          numero_ordini: t.numero_ordini || 0,
          prossimo_riordino_previsto: t.prossimo_riordino_previsto,
          giorni_ritardo,
        };
      });
    },
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useClienteReorderTracking(clienteId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reorder_tracking_cliente", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      
      const { data, error } = await supabase
        .from("reorder_tracking")
        .select("*")
        .eq("cliente_id", clienteId)
        .order("ultimo_ordine_data", { ascending: false });

      if (error) throw error;

      // Fetch nomi aziende
      if (!data || data.length === 0) return [];
      const aziendaIds = [...new Set(data.map(t => t.azienda_id))];
      const { data: aziende } = await supabase.from("aziende").select("id, nome").in("id", aziendaIds);
      const aziendeMap = new Map((aziende || []).map(a => [a.id, a.nome]));

      return data.map(t => ({
        ...t,
        azienda_nome: aziendeMap.get(t.azienda_id) || "Azienda",
        media_giorni_riordino: Number(t.media_giorni_riordino) || 0,
      }));
    },
    enabled: !!user && !!clienteId,
  });
}
