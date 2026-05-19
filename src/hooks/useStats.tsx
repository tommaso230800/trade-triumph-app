import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardStats {
  fatturatoMensile: number;
  ordiniTotali: number;
  ordiniCompletati: number;
  ordiniInAttesa: number;
  clientiAttivi: number;
  clientiPremium: number;
  clientiNuovi: number;
  aziendePartner: number;
  valoremedioOrdine: number;
  tassoConversione: number;
  ordiniPerMese: { mese: string; ordini: number; fatturato: number }[];
}

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: async (): Promise<DashboardStats> => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Fetch ordini
      const { data: ordini } = await supabase
        .from("ordini")
        .select("*");

      // Fetch clienti
      const { data: clienti } = await supabase
        .from("clienti")
        .select("*");

      // Fetch aziende
      const { data: aziende } = await supabase
        .from("aziende")
        .select("*");

      // Filter out cancelled orders from all stats
      const ordiniList = (ordini || []).filter(o => o.status !== "annullato" && o.status !== "stand_by");
      const clientiList = clienti || [];
      const aziendeList = aziende || [];

      // Calculate stats
      const ordiniMese = ordiniList.filter(o => (o.data_ordine || o.created_at) >= startOfMonth);
      const fatturatoMensile = ordiniMese.reduce((sum, o) => sum + Number(o.totale || 0), 0);
      const ordiniCompletati = ordiniList.filter(o => o.status === "completato").length;
      const ordiniInAttesa = ordiniList.filter(o => o.status === "in_attesa").length;

      const clientiPremium = clientiList.filter(c => c.status === "premium").length;
      const clientiNuovi = clientiList.filter(c => c.created_at >= startOfMonth).length;
      const aziendeAttive = aziendeList.filter(a => a.status === "attivo").length;

      const valoremedioOrdine = ordiniList.length > 0
        ? ordiniList.reduce((sum, o) => sum + Number(o.totale || 0), 0) / ordiniList.length
        : 0;

      const tassoConversione = ordiniList.length > 0
        ? Math.round((ordiniCompletati / ordiniList.length) * 100)
        : 0;

      // Calculate monthly data for charts (last 6 months)
      const ordiniPerMese = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const monthOrdini = ordiniList.filter(o => {
          const date = new Date(o.data_ordine || o.created_at);
          return date >= monthStart && date <= monthEnd;
        });
        ordiniPerMese.push({
          mese: monthStart.toLocaleDateString("it-IT", { month: "short" }),
          ordini: monthOrdini.length,
          fatturato: monthOrdini.reduce((sum, o) => sum + Number(o.totale || 0), 0),
        });
      }

      return {
        fatturatoMensile,
        ordiniTotali: ordiniList.length,
        ordiniCompletati,
        ordiniInAttesa,
        clientiAttivi: clientiList.length,
        clientiPremium,
        clientiNuovi,
        aziendePartner: aziendeAttive,
        valoremedioOrdine,
        tassoConversione,
        ordiniPerMese,
      };
    },
  });
}
