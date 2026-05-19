import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { differenceInDays, parseISO, startOfYear, subMonths } from "date-fns";
import { calcolaStatoCliente, ClientStatusData } from "./useClientStatus";

export interface ClienteCommerciale {
  id: string;
  nome: string;
  azienda: string | null;
  tipologia_cliente: string | null;
  consorzio: string | null;
  status: string;
  fatturato: number;
  fatturato_2025: number | null;
  fatturato_target: number | null;
  n_promo_concesse: number | null;
  budget_promo_percentuale: number | null;
  costo_promo_totale: number | null;
  obiezione_principale: string | null;
  // Dati calcolati
  ultimoOrdine: string | null;
  frequenzaOrdini: number;
  giorniSenzaOrdine: number;
  statoCliente: ClientStatusData;
  // Priorità
  priorita: "rischio" | "sotto_target" | "alto_potenziale" | "routine";
  prioritaOrdine: number;
}

export interface ClienteAziendaStats {
  aziendaId: string;
  aziendaNome: string;
  fatturato2026: number;
  fatturato2025: number;
  differenzaPercentuale: number;
  numeroOrdini: number;
  valoreMedioOrdine: number;
  ultimoOrdine: string | null;
  haContratto: boolean;
  targetFatturato: number;
  premioPercentuale: number;
  percentualeTarget: number;
  budgetPromoUsato: number;
  promoFatte: number;
}

export function useClientiCommercialiPrioritari() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["clienti_commerciali_prioritari"],
    queryFn: async (): Promise<ClienteCommerciale[]> => {
      // Fetch clienti con dati base
      const { data: clienti, error } = await supabase
        .from("clienti")
        .select("*")
        .order("nome");

      if (error) throw error;

      // Fetch ultimo ordine per ogni cliente
      const { data: ordini } = await supabase
        .from("ordini")
        .select("cliente_id, data_ordine, created_at")
        .not("status","in","(annullato,stand_by)")
        .order("data_ordine", { ascending: false });

      // Mappa ultimo ordine per cliente
      const ultimiOrdini = new Map<string, { data: string; count: number }>();
      (ordini || []).forEach(o => {
        const clienteId = o.cliente_id;
        if (!clienteId) return;
        
        if (!ultimiOrdini.has(clienteId)) {
          ultimiOrdini.set(clienteId, { data: o.data_ordine || o.created_at?.split("T")[0], count: 0 });
        }
        ultimiOrdini.get(clienteId)!.count++;
      });

      // Calcola dati commerciali per ogni cliente
      const clientiConDati: ClienteCommerciale[] = (clienti || []).map(cliente => {
        const ultimoOrdineData = ultimiOrdini.get(cliente.id);
        const ultimoOrdine = ultimoOrdineData?.data || null;
        const numeroOrdini = ultimoOrdineData?.count || 0;
        
        // Frequenza ordini (media giorni tra ordini, stima)
        const frequenzaOrdini = numeroOrdini > 1 ? Math.round(365 / numeroOrdini) : 999;
        
        const giorniSenzaOrdine = ultimoOrdine 
          ? differenceInDays(new Date(), parseISO(ultimoOrdine))
          : 999;

        // Calcola stato cliente
        const statoCliente = calcolaStatoCliente({
          fatturato2026: cliente.fatturato || 0,
          fatturato2025: cliente.fatturato_2025 || 0,
          ultimoOrdine,
          frequenzaOrdini,
          nPromoFatte: cliente.n_promo_concesse || 0,
        });

        // Determina priorità
        let priorita: ClienteCommerciale["priorita"];
        let prioritaOrdine: number;

        if (statoCliente.allarmeRischio) {
          priorita = "rischio";
          prioritaOrdine = 1;
        } else if (cliente.fatturato_target && cliente.fatturato < cliente.fatturato_target * 0.8) {
          priorita = "sotto_target";
          prioritaOrdine = 2;
        } else if (statoCliente.crescitaPercentuale > 10) {
          priorita = "alto_potenziale";
          prioritaOrdine = 3;
        } else {
          priorita = "routine";
          prioritaOrdine = 4;
        }

        return {
          id: cliente.id,
          nome: cliente.nome,
          azienda: cliente.azienda,
          tipologia_cliente: cliente.tipologia_cliente,
          consorzio: cliente.consorzio,
          status: cliente.status || "nuovo",
          fatturato: cliente.fatturato || 0,
          fatturato_2025: cliente.fatturato_2025,
          fatturato_target: cliente.fatturato_target,
          n_promo_concesse: cliente.n_promo_concesse,
          budget_promo_percentuale: cliente.budget_promo_percentuale,
          costo_promo_totale: cliente.costo_promo_totale,
          obiezione_principale: cliente.obiezione_principale,
          ultimoOrdine,
          frequenzaOrdini,
          giorniSenzaOrdine,
          statoCliente,
          priorita,
          prioritaOrdine,
        };
      });

      // Ordina per priorità
      return clientiConDati.sort((a, b) => {
        if (a.prioritaOrdine !== b.prioritaOrdine) {
          return a.prioritaOrdine - b.prioritaOrdine;
        }
        // A parità di priorità, ordina per giorni senza ordine (desc)
        return b.giorniSenzaOrdine - a.giorniSenzaOrdine;
      });
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minuti
  });
}

export function useClienteAziendaStats(clienteId?: string, aziendaId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["cliente_azienda_stats", clienteId, aziendaId],
    queryFn: async (): Promise<ClienteAziendaStats | null> => {
      if (!clienteId || !aziendaId) return null;

      const annoCorrente = new Date().getFullYear();
      const annoPrecedente = annoCorrente - 1;
      const inizioAnno = `${annoCorrente}-01-01`;
      const inizioAnnoPrecedente = `${annoPrecedente}-01-01`;
      const fineAnnoPrecedente = `${annoPrecedente}-12-31`;

      // Fetch ordini anno corrente
      const { data: ordini2026 } = await supabase
        .from("ordini")
        .select("id, totale, data_ordine")
        .eq("cliente_id", clienteId)
        .eq("azienda_id", aziendaId)
        .not("status","in","(annullato,stand_by)")
        .gte("data_ordine", inizioAnno);

      // Fetch ordini anno precedente
      const { data: ordini2025 } = await supabase
        .from("ordini")
        .select("id, totale, data_ordine")
        .eq("cliente_id", clienteId)
        .eq("azienda_id", aziendaId)
        .not("status","in","(annullato,stand_by)")
        .gte("data_ordine", inizioAnnoPrecedente)
        .lte("data_ordine", fineAnnoPrecedente);

      // Fetch contratto
      const { data: contratto } = await supabase
        .from("contratti_clienti")
        .select("*")
        .eq("cliente_id", clienteId)
        .eq("azienda_id", aziendaId)
        .eq("anno", annoCorrente)
        .maybeSingle();

      // Fetch promo fatte
      const { data: promoClienti } = await supabase
        .from("promo_clienti")
        .select("id, costo_stimato")
        .eq("cliente_id", clienteId)
        .gte("data_concessione", inizioAnno);

      // Fetch azienda nome
      const { data: azienda } = await supabase
        .from("aziende")
        .select("nome")
        .eq("id", aziendaId)
        .single();

      const fatturato2026 = (ordini2026 || []).reduce((sum, o) => sum + (o.totale || 0), 0);
      const fatturato2025 = (ordini2025 || []).reduce((sum, o) => sum + (o.totale || 0), 0);
      const numeroOrdini = (ordini2026 || []).length;
      const valoreMedioOrdine = numeroOrdini > 0 ? fatturato2026 / numeroOrdini : 0;
      
      const ultimoOrdine = ordini2026?.sort((a, b) => 
        new Date(b.data_ordine!).getTime() - new Date(a.data_ordine!).getTime()
      )[0]?.data_ordine || null;

      const differenzaPercentuale = fatturato2025 > 0 
        ? ((fatturato2026 - fatturato2025) / fatturato2025) * 100 
        : 0;

      const budgetPromoUsato = (promoClienti || []).reduce((sum, p) => sum + (p.costo_stimato || 0), 0);

      return {
        aziendaId,
        aziendaNome: azienda?.nome || "Azienda",
        fatturato2026,
        fatturato2025,
        differenzaPercentuale,
        numeroOrdini,
        valoreMedioOrdine,
        ultimoOrdine,
        haContratto: !!contratto,
        targetFatturato: contratto?.soglia_fatturato || 0,
        premioPercentuale: contratto?.percentuale_premio || 0,
        percentualeTarget: contratto?.soglia_fatturato 
          ? (fatturato2026 / contratto.soglia_fatturato) * 100 
          : 0,
        budgetPromoUsato,
        promoFatte: (promoClienti || []).length,
      };
    },
    enabled: !!user && !!clienteId && !!aziendaId,
  });
}
