import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { differenceInDays, parseISO, format, startOfYear, subDays } from "date-fns";

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

      const oggi = new Date();
      const annoCorrente = oggi.getFullYear();
      const annoPrecedente = annoCorrente - 1;
      const inizioAnnoCorrente = `${annoCorrente}-01-01`;
      const inizioAnnoPrecedente = `${annoPrecedente}-01-01`;
      const fineAnnoPrecedente = `${annoPrecedente}-12-31`;

      // Fetch tutti gli ordini per calcolare periodicità (ultimi 2 anni)
      const dueAnniFA = subDays(oggi, 730);
      const { data: tuttiOrdini, error: ordiniError } = await supabase
        .from("ordini")
        .select("id, data_ordine, totale, prodotti")
        .eq("cliente_id", clienteId)
        .eq("azienda_id", aziendaId)
        .not("status","in","(annullato,stand_by)")
        .gte("data_ordine", format(dueAnniFA, "yyyy-MM-dd"))
        .order("data_ordine", { ascending: true });

      if (ordiniError) throw ordiniError;

      // Separa ordini per anno
      const ordiniAnnoCorrente = (tuttiOrdini || []).filter(
        o => o.data_ordine && o.data_ordine >= inizioAnnoCorrente
      );
      const ordiniAnnoPrecedente = (tuttiOrdini || []).filter(
        o => o.data_ordine && o.data_ordine >= inizioAnnoPrecedente && o.data_ordine <= fineAnnoPrecedente
      );

      // Calcola intervalli tra ordini
      const intervalliOrdini: number[] = [];
      const ordiniOrdinati = [...(tuttiOrdini || [])].sort(
        (a, b) => new Date(a.data_ordine!).getTime() - new Date(b.data_ordine!).getTime()
      );

      for (let i = 1; i < ordiniOrdinati.length; i++) {
        const dataPrec = parseISO(ordiniOrdinati[i - 1].data_ordine!);
        const dataCorr = parseISO(ordiniOrdinati[i].data_ordine!);
        const giorni = differenceInDays(dataCorr, dataPrec);
        if (giorni > 0 && giorni < 180) { // Ignora intervalli anomali
          intervalliOrdini.push(giorni);
        }
      }

      // Calcola periodicità media
      const periodicitaMediaGiorni = intervalliOrdini.length > 0
        ? Math.round(intervalliOrdini.reduce((a, b) => a + b, 0) / intervalliOrdini.length)
        : 0;

      const stdDevPeriodicita = calcStdDev(intervalliOrdini);

      // Stima rotazione = periodicità media (le scorte durano quanto l'intervallo medio)
      const stimaRotazioneGiorni = periodicitaMediaGiorni;

      // Ultimo ordine
      const ultimoOrdine = ordiniOrdinati.length > 0 
        ? ordiniOrdinati[ordiniOrdinati.length - 1].data_ordine 
        : null;

      // Giorni dall'ultimo ordine
      const giorniDalUltimoOrdine = ultimoOrdine 
        ? differenceInDays(oggi, parseISO(ultimoOrdine))
        : 999;

      // Soglia alert: periodicità + 7 giorni
      const sogliaAlertGiorni = periodicitaMediaGiorni > 0 ? periodicitaMediaGiorni + 7 : 45;

      // Controllo fuori ciclo
      const fuoriCicloRiordino = giorniDalUltimoOrdine > sogliaAlertGiorni;
      const giorniFuoriCiclo = fuoriCicloRiordino ? giorniDalUltimoOrdine - sogliaAlertGiorni : 0;

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
      } else if (giorniDalUltimoOrdine > sogliaAlertGiorni - 3) {
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
