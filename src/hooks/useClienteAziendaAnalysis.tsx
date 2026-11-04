import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { todayRome } from "@/lib/commercialProposal";
import { reorderExclusion } from "@/lib/reorderEligibility";
import { analyzePair } from "@/lib/reorderIntelligence";
import { getTolleranza } from "./useReorderIntelligence";

export interface OrdineStorico {
  id: string;
  data_ordine: string;
  totale: number;
  prodotti: number;
}

export interface AnalisiComportamentoAcquisti {
  // Periodicità ordini
  periodicitaMediaGiorni: number;
  stdDevPeriodicita: number;
  intervalliOrdini: number[];
  
  // Rotazione stimata
  stimaRotazioneGiorni: number;
  
  // Alert fuori ciclo
  giorniDalUltimoOrdine: number;
  sogliaAlertGiorni: number; // periodicità + 7
  fuoriCicloRiordino: boolean;
  giorniFuoriCiclo: number;
  
  // Dati ordini
  ultimoOrdine: string | null;
  ordiniAnnoCorrente: OrdineStorico[];
  ordiniAnnoPrecedente: OrdineStorico[];
  
  // Metriche fatturato
  fatturatoAnnoCorrente: number;
  fatturatoAnnoPrecedente: number;
  variazionePercentuale: number;
  numeroOrdiniAnnoCorrente: number;
  numeroOrdiniAnnoPrecedente: number;
  valoreMedioOrdine: number;
  
  // Analisi commerciale
  haContratto: boolean;
  targetFatturato: number;
  percentualeTargetRaggiunto: number;
  premioContratto: number;
  
  // Promo
  promoFatte: number;
  costoPromoTotale: number;
  budgetPromoPercentuale: number;
  budgetPromoDisponibile: number;
  budgetPromoUsato: number;
}

export interface ClienteAziendaAnalysisResult {
  clienteId: string;
  clienteNome: string;
  aziendaId: string;
  aziendaNome: string;
  analysis: AnalisiComportamentoAcquisti;
  alertMessage: string | null;
  riskLevel: "low" | "medium" | "high" | "critical";
}

// Calcola la deviazione standard
function calcStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
}

export function useClienteAziendaAnalysis(clienteId?: string, aziendaId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["cliente_azienda_analysis", clienteId, aziendaId],
    queryFn: async (): Promise<ClienteAziendaAnalysisResult | null> => {
      if (!clienteId || !aziendaId) return null;

      const today = todayRome();
      const oggi = new Date(`${today}T00:00:00`);
      const annoCorrente = oggi.getFullYear();
      const annoPrecedente = annoCorrente - 1;
      const inizioAnnoCorrente = `${annoCorrente}-01-01`;
      const inizioAnnoPrecedente = `${annoPrecedente}-01-01`;
      const fineAnnoPrecedente = `${annoPrecedente}-12-31`;

      // Financial totals retain their existing source; chronology has explicit eligibility.
      const tuttiOrdini = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from("ordini")
          .select("id, cliente_id, azienda_id, status, note, deleted_at, data_ordine, totale, prodotti")
          .eq("cliente_id", clienteId).eq("azienda_id", aziendaId)
          .not("status", "in", "(annullato,stand_by)")
          .order("id").range(from, from + 999);
        if (error) throw error;
        tuttiOrdini.push(...(data || []));
        if (!data || data.length < 1000) break;
      }

      // Separa ordini per anno
      const ordiniAnnoCorrente = (tuttiOrdini || []).filter(
        o => o.data_ordine && o.data_ordine >= inizioAnnoCorrente
      );
      const ordiniAnnoPrecedente = (tuttiOrdini || []).filter(
        o => o.data_ordine && o.data_ordine >= inizioAnnoPrecedente && o.data_ordine <= fineAnnoPrecedente
      );

      const valid = tuttiOrdini.filter(o => !reorderExclusion(o, today));
      const cadence = analyzePair(clienteId, aziendaId, valid.map(o => ({
        id:o.id, data_ordine:o.data_ordine || '', totale:Number(o.totale) || 0, cartoni:0, pezzi:0,
      })), [], {today, tolleranza:getTolleranza()});
      const intervalliOrdini = cadence.intervalli.map(iv=>iv.giorni);
      const periodicitaMediaGiorni = cadence.frequenza_operativa || 0;
      const stdDevPeriodicita = calcStdDev(intervalliOrdini);
      const stimaRotazioneGiorni = periodicitaMediaGiorni;
      const ultimoOrdine = cadence.ultimo_ordine || null;
      const giorniDalUltimoOrdine = cadence.giorni_da_ultimo;
      const sogliaAlertGiorni = cadence.previsione_affidabile
        ? Math.round(periodicitaMediaGiorni) + cadence.tolleranza : 0;
      const fuoriCicloRiordino = cadence.giorni_ritardo > 0;
      const giorniFuoriCiclo = cadence.giorni_ritardo;

      // Metriche fatturato
      const fatturatoAnnoCorrente = ordiniAnnoCorrente.reduce((sum, o) => sum + (o.totale || 0), 0);
      const fatturatoAnnoPrecedente = ordiniAnnoPrecedente.reduce((sum, o) => sum + (o.totale || 0), 0);
      const variazionePercentuale = fatturatoAnnoPrecedente > 0
        ? ((fatturatoAnnoCorrente - fatturatoAnnoPrecedente) / fatturatoAnnoPrecedente) * 100
        : 0;

      const numeroOrdiniAnnoCorrente = ordiniAnnoCorrente.length;
      const numeroOrdiniAnnoPrecedente = ordiniAnnoPrecedente.length;
      const valoreMedioOrdine = numeroOrdiniAnnoCorrente > 0 
        ? fatturatoAnnoCorrente / numeroOrdiniAnnoCorrente 
        : 0;

      // Fetch contratto
      const { data: contratto } = await supabase
        .from("contratti_clienti")
        .select("*")
        .eq("cliente_id", clienteId)
        .eq("azienda_id", aziendaId)
        .eq("anno", annoCorrente)
        .maybeSingle();

      const haContratto = !!contratto;
      const targetFatturato = contratto?.soglia_fatturato || 0;
      const percentualeTargetRaggiunto = targetFatturato > 0 
        ? (fatturatoAnnoCorrente / targetFatturato) * 100 
        : 0;
      const premioContratto = contratto?.percentuale_premio || 0;

      // Fetch promo fatte
      const { data: promoClienti } = await supabase
        .from("promo_clienti")
        .select("id, costo_stimato")
        .eq("cliente_id", clienteId)
        .gte("data_concessione", inizioAnnoCorrente);

      const promoFatte = (promoClienti || []).length;
      const costoPromoTotale = (promoClienti || []).reduce((sum, p) => sum + (p.costo_stimato || 0), 0);

      // Fetch cliente per budget promo
      const { data: cliente } = await supabase
        .from("clienti")
        .select("nome, budget_promo_percentuale")
        .eq("id", clienteId)
        .single();

      const budgetPromoPercentuale = cliente?.budget_promo_percentuale || 3;
      const budgetPromoDisponibile = (fatturatoAnnoCorrente * budgetPromoPercentuale) / 100;
      const budgetPromoUsato = costoPromoTotale;

      // Fetch azienda nome
      const { data: azienda } = await supabase
        .from("aziende")
        .select("nome")
        .eq("id", aziendaId)
        .single();

      // Calcola risk level
      let riskLevel: "low" | "medium" | "high" | "critical" = "low";
      let alertMessage: string | null = null;

      if (fuoriCicloRiordino && giorniFuoriCiclo > 14) {
        riskLevel = "critical";
        alertMessage = `⚠️ CRITICO: Cliente fuori ciclo da ${giorniFuoriCiclo} giorni! Rischio perdita.`;
      } else if (fuoriCicloRiordino) {
        riskLevel = "high";
        alertMessage = `⚠️ Cliente fuori ciclo di riordino da ${giorniFuoriCiclo} giorni.`;
      } else if (variazionePercentuale < -15) {
        riskLevel = "high";
        alertMessage = `📉 Calo fatturato significativo: ${variazionePercentuale.toFixed(1)}%`;
      } else if (variazionePercentuale < -5) {
        riskLevel = "medium";
        alertMessage = `📉 Fatturato in calo: ${variazionePercentuale.toFixed(1)}%`;
      } else if (cadence.previsione_affidabile && giorniDalUltimoOrdine > sogliaAlertGiorni - 3) {
        riskLevel = "medium";
        alertMessage = `⏰ Ordine in scadenza: ${sogliaAlertGiorni - giorniDalUltimoOrdine} giorni al fuori ciclo.`;
      }

      const analysis: AnalisiComportamentoAcquisti = {
        periodicitaMediaGiorni,
        stdDevPeriodicita,
        intervalliOrdini,
        stimaRotazioneGiorni,
        giorniDalUltimoOrdine,
        sogliaAlertGiorni,
        fuoriCicloRiordino,
        giorniFuoriCiclo,
        ultimoOrdine,
        ordiniAnnoCorrente,
        ordiniAnnoPrecedente,
        fatturatoAnnoCorrente,
        fatturatoAnnoPrecedente,
        variazionePercentuale,
        numeroOrdiniAnnoCorrente,
        numeroOrdiniAnnoPrecedente,
        valoreMedioOrdine,
        haContratto,
        targetFatturato,
        percentualeTargetRaggiunto,
        premioContratto,
        promoFatte,
        costoPromoTotale,
        budgetPromoPercentuale,
        budgetPromoDisponibile,
        budgetPromoUsato,
      };

      return {
        clienteId,
        clienteNome: cliente?.nome || "Cliente",
        aziendaId,
        aziendaNome: azienda?.nome || "Azienda",
        analysis,
        alertMessage,
        riskLevel,
      };
    },
    enabled: !!user && !!clienteId && !!aziendaId,
  });
}
