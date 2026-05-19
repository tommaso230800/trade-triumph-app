import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { subMonths, startOfMonth, endOfMonth, differenceInDays, parseISO } from "date-fns";

export interface ClientKPI {
  fatturato1M: number;
  fatturato3M: number;
  fatturato12M: number;
  trend3M: number; // percentuale vs periodo precedente
  trend12M: number;
  frequenzaOrdini: number; // giorni medi tra ordini
  numeroOrdini: number;
  ultimoOrdine: string | null;
  topProdotti: Array<{
    prodotto_id: string;
    nome: string;
    quantita: number;
    valore: number;
  }>;
  ordiniPerMese: Array<{
    mese: string;
    totale: number;
  }>;
}

export function useClientKPI(clientId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["client_kpi", clientId],
    queryFn: async (): Promise<ClientKPI> => {
      const now = new Date();
      const oneMonthAgo = subMonths(now, 1);
      const threeMonthsAgo = subMonths(now, 3);
      const sixMonthsAgo = subMonths(now, 6);
      const twelveMonthsAgo = subMonths(now, 12);
      const twentyFourMonthsAgo = subMonths(now, 24);

      // Fetch ordini with righe
      const { data: ordini, error } = await supabase
        .from("ordini")
        .select(`
          id,
          totale,
          data_ordine,
          created_at,
          status,
          ordini_righe(
            quantita_pezzi,
            quantita_cartoni,
            prezzo_unitario,
            prodotto_id,
            prodotti(nome)
          )
        `)
        .eq("cliente_id", clientId!)
        .not("status","in","(annullato,stand_by)")
        .gte("data_ordine", twentyFourMonthsAgo.toISOString().split("T")[0])
        .order("data_ordine", { ascending: false });

      if (error) throw error;

      const ordiniList = ordini || [];
      
      // Calculate fatturato by period
      const fatturato1M = ordiniList
        .filter(o => o.data_ordine && new Date(o.data_ordine) >= oneMonthAgo)
        .reduce((sum, o) => sum + (o.totale || 0), 0);

      const fatturato3M = ordiniList
        .filter(o => o.data_ordine && new Date(o.data_ordine) >= threeMonthsAgo)
        .reduce((sum, o) => sum + (o.totale || 0), 0);

      const fatturato12M = ordiniList
        .filter(o => o.data_ordine && new Date(o.data_ordine) >= twelveMonthsAgo)
        .reduce((sum, o) => sum + (o.totale || 0), 0);

      // Calculate trend (compare current period vs previous period)
      const fatturato3MPrev = ordiniList
        .filter(o => {
          const date = o.data_ordine ? new Date(o.data_ordine) : null;
          return date && date >= sixMonthsAgo && date < threeMonthsAgo;
        })
        .reduce((sum, o) => sum + (o.totale || 0), 0);

      const fatturato12MPrev = ordiniList
        .filter(o => {
          const date = o.data_ordine ? new Date(o.data_ordine) : null;
          return date && date >= twentyFourMonthsAgo && date < twelveMonthsAgo;
        })
        .reduce((sum, o) => sum + (o.totale || 0), 0);

      const trend3M = fatturato3MPrev > 0 
        ? ((fatturato3M - fatturato3MPrev) / fatturato3MPrev) * 100 
        : 0;

      const trend12M = fatturato12MPrev > 0 
        ? ((fatturato12M - fatturato12MPrev) / fatturato12MPrev) * 100 
        : 0;

      // Calculate order frequency
      const ordiniUltimi12M = ordiniList.filter(
        o => o.data_ordine && new Date(o.data_ordine) >= twelveMonthsAgo
      );
      
      let frequenzaOrdini = 0;
      if (ordiniUltimi12M.length >= 2) {
        const dates = ordiniUltimi12M
          .map(o => new Date(o.data_ordine!))
          .sort((a, b) => a.getTime() - b.getTime());
        
        let totalDays = 0;
        for (let i = 1; i < dates.length; i++) {
          totalDays += differenceInDays(dates[i], dates[i - 1]);
        }
        frequenzaOrdini = Math.round(totalDays / (dates.length - 1));
      }

      // Top products
      const prodottiMap = new Map<string, { nome: string; quantita: number; valore: number }>();
      
      ordiniList
        .filter(o => o.data_ordine && new Date(o.data_ordine) >= twelveMonthsAgo)
        .forEach(ordine => {
          (ordine.ordini_righe || []).forEach((riga: any) => {
            const key = riga.prodotto_id;
            const existing = prodottiMap.get(key) || { nome: riga.prodotti?.nome || "Sconosciuto", quantita: 0, valore: 0 };
            existing.quantita += (riga.quantita_cartoni || 0) + (riga.quantita_pezzi || 0);
            existing.valore += (riga.prezzo_unitario || 0) * ((riga.quantita_cartoni || 0) + (riga.quantita_pezzi || 0));
            prodottiMap.set(key, existing);
          });
        });

      const topProdotti = Array.from(prodottiMap.entries())
        .map(([prodotto_id, data]) => ({ prodotto_id, ...data }))
        .sort((a, b) => b.valore - a.valore)
        .slice(0, 10);

      // Ordini per mese (ultimi 12 mesi)
      const ordiniPerMese: Array<{ mese: string; totale: number }> = [];
      for (let i = 11; i >= 0; i--) {
        const month = subMonths(now, i);
        const start = startOfMonth(month);
        const end = endOfMonth(month);
        
        const totale = ordiniList
          .filter(o => {
            const date = o.data_ordine ? new Date(o.data_ordine) : null;
            return date && date >= start && date <= end;
          })
          .reduce((sum, o) => sum + (o.totale || 0), 0);

        ordiniPerMese.push({
          mese: month.toLocaleDateString("it-IT", { month: "short", year: "2-digit" }),
          totale,
        });
      }

      return {
        fatturato1M,
        fatturato3M,
        fatturato12M,
        trend3M,
        trend12M,
        frequenzaOrdini,
        numeroOrdini: ordiniUltimi12M.length,
        ultimoOrdine: ordiniList[0]?.data_ordine || null,
        topProdotti,
        ordiniPerMese,
      };
    },
    enabled: !!user && !!clientId,
  });
}
