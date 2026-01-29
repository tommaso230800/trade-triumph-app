import { useMemo } from "react";
import { differenceInDays, parseISO, subMonths } from "date-fns";

export type ClientStatusSemaforo = "verde" | "giallo" | "rosso";
export type ClientRiskLevel = "normale" | "attenzione" | "rischio";

export interface ClientStatusData {
  semaforo: ClientStatusSemaforo;
  riskLevel: ClientRiskLevel;
  label: string;
  descrizione: string;
  giorniSenzaOrdine: number;
  crescitaPercentuale: number;
  obiettivoProposto: string;
  allarmeRischio: boolean;
  motiviRischio: string[];
}

interface ClientStatusParams {
  fatturato2026: number;
  fatturato2025: number;
  ultimoOrdine: string | null;
  frequenzaOrdini: number;
  nPromoFatte: number;
  trend3M?: number;
}

// Soglie aggressive come richiesto
const SOGLIE = {
  crescitaVerde: 5, // +5% = verde
  crescitaGiallo: -5, // tra -5% e +5% = giallo
  giorniSenzaOrdineRosso: 45, // 45+ giorni = rosso
  giorniSenzaOrdineGiallo: 30, // 30-45 giorni = giallo
  giorniRischioPerdita: 60, // 60+ giorni = a rischio perdita
  caloRischioso: -15, // -15% = forte calo
  mesiFermoPromo: 3, // 3+ mesi senza promo = segnalazione
};

export function calcolaStatoCliente(params: ClientStatusParams): ClientStatusData {
  const {
    fatturato2026,
    fatturato2025,
    ultimoOrdine,
    frequenzaOrdini,
    nPromoFatte,
    trend3M = 0,
  } = params;

  // Calcola giorni senza ordine
  const giorniSenzaOrdine = ultimoOrdine 
    ? differenceInDays(new Date(), parseISO(ultimoOrdine))
    : 999;

  // Calcola crescita percentuale
  const crescitaPercentuale = fatturato2025 > 0 
    ? ((fatturato2026 - fatturato2025) / fatturato2025) * 100
    : fatturato2026 > 0 ? 100 : 0;

  // Determina semaforo
  let semaforo: ClientStatusSemaforo;
  let label: string;
  let descrizione: string;

  if (giorniSenzaOrdine >= SOGLIE.giorniSenzaOrdineRosso) {
    semaforo = "rosso";
    label = "Cliente FERMO";
    descrizione = `Non ordina da ${giorniSenzaOrdine} giorni`;
  } else if (crescitaPercentuale >= SOGLIE.crescitaVerde) {
    semaforo = "verde";
    label = "Cliente in CRESCITA";
    descrizione = `+${crescitaPercentuale.toFixed(1)}% vs 2025`;
  } else if (crescitaPercentuale <= SOGLIE.crescitaGiallo) {
    semaforo = "rosso";
    label = "Cliente in CALO";
    descrizione = `${crescitaPercentuale.toFixed(1)}% vs 2025`;
  } else {
    semaforo = "giallo";
    label = "Cliente STABILE";
    descrizione = `${crescitaPercentuale >= 0 ? "+" : ""}${crescitaPercentuale.toFixed(1)}% vs 2025`;
  }

  // Override per giorni senza ordine (anche se in crescita)
  if (giorniSenzaOrdine >= SOGLIE.giorniSenzaOrdineGiallo && semaforo === "verde") {
    semaforo = "giallo";
    descrizione += ` | ${giorniSenzaOrdine}gg senza ordine`;
  }

  // Determina obiettivo proposto
  let obiettivoProposto: string;
  if (giorniSenzaOrdine >= SOGLIE.giorniRischioPerdita) {
    obiettivoProposto = "Riattivazione cliente";
  } else if (crescitaPercentuale <= SOGLIE.crescitaGiallo) {
    obiettivoProposto = "Aumento scontrino";
  } else if (semaforo === "giallo") {
    obiettivoProposto = "Inserimento prodotto nuovo";
  } else {
    obiettivoProposto = "Promo / Espositori";
  }

  // Calcola rischio perdita
  const motiviRischio: string[] = [];
  if (giorniSenzaOrdine >= SOGLIE.giorniRischioPerdita) {
    motiviRischio.push(`Non ordina da ${giorniSenzaOrdine} giorni`);
  }
  if (crescitaPercentuale <= SOGLIE.caloRischioso) {
    motiviRischio.push(`Fatturato in forte calo (${crescitaPercentuale.toFixed(1)}%)`);
  }
  if (nPromoFatte === 0 && fatturato2025 > 0) {
    motiviRischio.push("Nessuna promo fatta quest'anno");
  }

  const allarmeRischio = motiviRischio.length >= 2 || giorniSenzaOrdine >= SOGLIE.giorniRischioPerdita;

  const riskLevel: ClientRiskLevel = allarmeRischio 
    ? "rischio" 
    : motiviRischio.length > 0 
      ? "attenzione" 
      : "normale";

  return {
    semaforo,
    riskLevel,
    label,
    descrizione,
    giorniSenzaOrdine,
    crescitaPercentuale,
    obiettivoProposto,
    allarmeRischio,
    motiviRischio,
  };
}

export function useClientStatus(params: ClientStatusParams) {
  return useMemo(() => calcolaStatoCliente(params), [
    params.fatturato2026,
    params.fatturato2025,
    params.ultimoOrdine,
    params.frequenzaOrdini,
    params.nPromoFatte,
    params.trend3M,
  ]);
}
