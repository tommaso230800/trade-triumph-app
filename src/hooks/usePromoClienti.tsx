import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface PromoCliente {
  id: string;
  user_id: string;
  cliente_id: string;
  data_concessione: string;
  tipo_promo: string;
  valore: number;
  descrizione: string | null;
  costo_stimato: number;
  quantita_cartoni: number;
  quantita_pezzi: number;
  prodotto_nome: string | null;
  contropartita: string | null;
  note: string | null;
  created_at: string;
}

// Hook per ottenere le promo di un cliente
export function usePromoCliente(clienteId?: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["promo_clienti", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      
      const { data, error } = await supabase
        .from("promo_clienti")
        .select("*")
        .eq("cliente_id", clienteId)
        .order("data_concessione", { ascending: false });
      
      if (error) throw error;
      return data as PromoCliente[];
    },
    enabled: !!user && !!clienteId,
  });
}

// Hook per ottenere tutte le promo dell'anno corrente
export function usePromoAnnoCorrente(clienteId?: string) {
  const { user } = useAuth();
  const annoCorrente = new Date().getFullYear();
  
  return useQuery({
    queryKey: ["promo_anno_corrente", clienteId, annoCorrente],
    queryFn: async () => {
      if (!clienteId) return { promo: [], costoTotale: 0, count: 0 };
      
      const inizioAnno = `${annoCorrente}-01-01`;
      const fineAnno = `${annoCorrente}-12-31`;
      
      const { data, error } = await supabase
        .from("promo_clienti")
        .select("*")
        .eq("cliente_id", clienteId)
        .gte("data_concessione", inizioAnno)
        .lte("data_concessione", fineAnno)
        .order("data_concessione", { ascending: false });
      
      if (error) throw error;
      
      const promo = data as PromoCliente[];
      const costoTotale = promo.reduce((acc, p) => acc + (p.costo_stimato || 0), 0);
      
      return { promo, costoTotale, count: promo.length };
    },
    enabled: !!user && !!clienteId,
  });
}

// Hook per salvare una nuova promo
export function useSavePromoCliente() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (promo: Omit<PromoCliente, "id" | "user_id" | "created_at">) => {
      const { data, error } = await supabase
        .from("promo_clienti")
        .insert({ ...promo, user_id: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["promo_clienti", variables.cliente_id] });
      queryClient.invalidateQueries({ queryKey: ["promo_anno_corrente", variables.cliente_id] });
      queryClient.invalidateQueries({ queryKey: ["clienti"] });
      queryClient.invalidateQueries({ queryKey: ["cliente", variables.cliente_id] });
      toast.success("Promo registrata!");
    },
    onError: (error) => {
      toast.error("Errore nel salvataggio: " + error.message);
    },
  });
}

// Hook per eliminare una promo
export function useDeletePromoCliente() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, clienteId }: { id: string; clienteId: string }) => {
      const { error } = await supabase
        .from("promo_clienti")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return clienteId;
    },
    onSuccess: (clienteId) => {
      queryClient.invalidateQueries({ queryKey: ["promo_clienti", clienteId] });
      queryClient.invalidateQueries({ queryKey: ["promo_anno_corrente", clienteId] });
      toast.success("Promo eliminata!");
    },
  });
}

// Calcolo impatto promo
export interface CalcoloImpatto {
  costoPromo: number;
  costoPerPezzo: number;
  impattoPercentuale: number;
  marginePrima: number;
  margineDopo: number;
  budgetDisponibile: number;
  budgetResiduo: number;
  status: "ok" | "attenzione" | "non_concedibile";
  messaggioStatus: string;
  promoMassimaConcedibile: number;
  suggerimentoAlternativa: string | null;
}

export function calcolaImpattoPromo(params: {
  fatturatoCliente: number;
  budgetPromoPercentuale: number;
  costoPromoGiaConcesse: number;
  scontoMaxPolicy: number;
  tipoPromo: string;
  valore: number;
  quantitaPezzi: number;
  prezzoListino: number;
  costoAcquisto?: number;
}): CalcoloImpatto {
  const {
    fatturatoCliente,
    budgetPromoPercentuale,
    costoPromoGiaConcesse,
    scontoMaxPolicy,
    tipoPromo,
    valore,
    quantitaPezzi,
    prezzoListino,
    costoAcquisto,
  } = params;

  // Calcola budget disponibile
  const budgetDisponibile = (fatturatoCliente * budgetPromoPercentuale) / 100;
  const budgetResiduo = budgetDisponibile - costoPromoGiaConcesse;

  // Calcola costo della promo richiesta
  let costoPromo = 0;
  let costoPerPezzo = 0;

  switch (tipoPromo) {
    case "sconto_percentuale":
      costoPerPezzo = prezzoListino * (valore / 100);
      costoPromo = costoPerPezzo * quantitaPezzi;
      break;
    case "sconto_euro":
      costoPerPezzo = valore;
      costoPromo = valore * quantitaPezzi;
      break;
    case "omaggio":
      // valore = pezzi omaggio
      costoPromo = (costoAcquisto || prezzoListino * 0.6) * valore;
      costoPerPezzo = costoPromo / quantitaPezzi;
      break;
    case "materiale":
      costoPromo = valore;
      costoPerPezzo = valore / quantitaPezzi;
      break;
    case "dilazione":
      // stima 2% del valore per mese extra
      costoPromo = (prezzoListino * quantitaPezzi) * 0.02 * (valore / 30);
      costoPerPezzo = costoPromo / quantitaPezzi;
      break;
  }

  // Calcola impatto percentuale
  const impattoPercentuale = fatturatoCliente > 0 ? (costoPromo / fatturatoCliente) * 100 : 0;

  // Calcola margini
  const costo = costoAcquisto || prezzoListino * 0.6;
  const marginePrima = ((prezzoListino - costo) / prezzoListino) * 100;
  const prezzoEffettivo = prezzoListino - costoPerPezzo;
  const margineDopo = ((prezzoEffettivo - costo) / prezzoEffettivo) * 100;

  // Determina status
  let status: "ok" | "attenzione" | "non_concedibile";
  let messaggioStatus: string;
  
  const budgetDopoPromo = budgetResiduo - costoPromo;
  const scontoEffettivo = (costoPerPezzo / prezzoListino) * 100;

  if (scontoEffettivo > scontoMaxPolicy) {
    status = "non_concedibile";
    messaggioStatus = `Supera policy aziendale (max ${scontoMaxPolicy}%)`;
  } else if (budgetDopoPromo < 0) {
    status = "non_concedibile";
    messaggioStatus = `Budget esaurito (sfori di €${Math.abs(budgetDopoPromo).toFixed(2)})`;
  } else if (budgetDopoPromo < budgetDisponibile * 0.2) {
    status = "attenzione";
    messaggioStatus = `Attenzione: rimane solo €${budgetDopoPromo.toFixed(2)} di budget`;
  } else {
    status = "ok";
    messaggioStatus = `OK - Budget residuo: €${budgetDopoPromo.toFixed(2)}`;
  }

  // Calcola promo massima concedibile
  const promoMassimaConcedibile = Math.min(
    budgetResiduo,
    (scontoMaxPolicy / 100) * prezzoListino * quantitaPezzi
  );

  // Suggerimento alternativa
  let suggerimentoAlternativa: string | null = null;
  if (status === "non_concedibile" || status === "attenzione") {
    if (tipoPromo === "sconto_percentuale" || tipoPromo === "sconto_euro") {
      const omaggioEquivalente = Math.floor(costoPromo / (costo || 1));
      suggerimentoAlternativa = `Invece di sconto, offri ${omaggioEquivalente} pezzi omaggio (stesso valore, percezione maggiore)`;
    } else {
      suggerimentoAlternativa = `Riduci valore a €${promoMassimaConcedibile.toFixed(2)} per rientrare nel budget`;
    }
  }

  return {
    costoPromo,
    costoPerPezzo,
    impattoPercentuale,
    marginePrima,
    margineDopo,
    budgetDisponibile,
    budgetResiduo: budgetResiduo - costoPromo,
    status,
    messaggioStatus,
    promoMassimaConcedibile,
    suggerimentoAlternativa,
  };
}

// Convertitore sconto <-> omaggio
export function convertiScontoOmaggio(params: {
  tipo: "sconto_to_omaggio" | "omaggio_to_sconto";
  valore: number;
  prezzoListino: number;
  costoAcquisto: number;
  quantitaPezzi: number;
  pezziPerCartone: number;
}) {
  const { tipo, valore, prezzoListino, costoAcquisto, quantitaPezzi, pezziPerCartone } = params;
  
  if (tipo === "sconto_to_omaggio") {
    // Sconto % -> pezzi omaggio equivalenti
    const valoreScontoTotale = (valore / 100) * prezzoListino * quantitaPezzi;
    const pezziOmaggio = Math.round(valoreScontoTotale / costoAcquisto);
    const cartoniOmaggio = Math.floor(pezziOmaggio / pezziPerCartone);
    
    // Calcola formule tipo 10+1
    const rapporto = Math.round(quantitaPezzi / pezziOmaggio);
    const formula = `${rapporto}+1`;
    
    return {
      pezziOmaggio,
      cartoniOmaggio,
      formula,
      costoPerAzienda: pezziOmaggio * costoAcquisto,
      costoScontoEquivalente: valoreScontoTotale,
      convenienza: pezziOmaggio * costoAcquisto < valoreScontoTotale ? "omaggio" : "sconto",
    };
  } else {
    // Pezzi omaggio -> sconto % equivalente
    const valoreOmaggi = valore * costoAcquisto;
    const scontoPercentuale = (valoreOmaggi / (prezzoListino * quantitaPezzi)) * 100;
    
    return {
      scontoPercentuale: scontoPercentuale.toFixed(2),
      scontoEuro: (valoreOmaggi / quantitaPezzi).toFixed(3),
      costoPerAzienda: valoreOmaggi,
      costoScontoEquivalente: (scontoPercentuale / 100) * prezzoListino * quantitaPezzi,
      convenienza: valoreOmaggi < (scontoPercentuale / 100) * prezzoListino * quantitaPezzi ? "omaggio" : "sconto",
    };
  }
}

// Break-even promo
export function calcolaBreakEvenPromo(params: {
  prezzoListino: number;
  costoAcquisto: number;
  scontoPercentuale?: number;
  pezziOmaggio?: number;
  quantitaBaseCartoni: number;
  pezziPerCartone: number;
}) {
  const { prezzoListino, costoAcquisto, scontoPercentuale, pezziOmaggio, quantitaBaseCartoni, pezziPerCartone } = params;
  
  const quantitaBase = quantitaBaseCartoni * pezziPerCartone;
  const margineUnitario = prezzoListino - costoAcquisto;
  const margineBaseTotale = margineUnitario * quantitaBase;
  
  if (scontoPercentuale) {
    // Con sconto: quanto devo vendere per avere stesso margine totale?
    const prezzoScontato = prezzoListino * (1 - scontoPercentuale / 100);
    const margineConSconto = prezzoScontato - costoAcquisto;
    const quantitaNecessaria = Math.ceil(margineBaseTotale / margineConSconto);
    const cartoniNecessari = Math.ceil(quantitaNecessaria / pezziPerCartone);
    
    return {
      quantitaPezzi: quantitaNecessaria,
      quantitaCartoni: cartoniNecessari,
      incrementoNecessario: quantitaNecessaria - quantitaBase,
      incrementoPercentuale: ((quantitaNecessaria - quantitaBase) / quantitaBase) * 100,
      messaggio: `Per mantenere lo stesso margine con ${scontoPercentuale}% di sconto, servono almeno ${cartoniNecessari} cartoni (+${cartoniNecessari - quantitaBaseCartoni})`,
    };
  } else if (pezziOmaggio) {
    // Con omaggio: quanto devo vendere?
    const costoOmaggi = pezziOmaggio * costoAcquisto;
    const margineNecessario = margineBaseTotale + costoOmaggi;
    const quantitaNecessaria = Math.ceil(margineNecessario / margineUnitario);
    const cartoniNecessari = Math.ceil(quantitaNecessaria / pezziPerCartone);
    
    return {
      quantitaPezzi: quantitaNecessaria,
      quantitaCartoni: cartoniNecessari,
      incrementoNecessario: quantitaNecessaria - quantitaBase,
      incrementoPercentuale: ((quantitaNecessaria - quantitaBase) / quantitaBase) * 100,
      messaggio: `Per compensare ${pezziOmaggio} pezzi omaggio, servono almeno ${cartoniNecessari} cartoni (+${cartoniNecessari - quantitaBaseCartoni})`,
    };
  }
  
  return null;
}

// Scoring cliente
export function calcolaScoringCliente(params: {
  fatturato: number;
  fatturatoTarget: number;
  nPromo: number;
  crescitaPercentuale: number;
}) {
  const { fatturato, fatturatoTarget, nPromo, crescitaPercentuale } = params;
  
  const percentualeTarget = fatturatoTarget > 0 ? (fatturato / fatturatoTarget) * 100 : 0;
  
  let status: "verde" | "giallo" | "rosso";
  let strategia: string;
  let descrizione: string;
  
  if (percentualeTarget >= 100) {
    status = "verde";
    descrizione = "Cliente sopra target";
    strategia = "Proteggi margine - non concedere sconti extra";
  } else if (percentualeTarget >= 70) {
    status = "giallo";
    descrizione = `Cliente al ${percentualeTarget.toFixed(0)}% del target`;
    strategia = crescitaPercentuale > 0 
      ? "In crescita - spingi volume con promo mirata"
      : "Stagnante - riattiva con offerta aggressiva";
  } else {
    status = "rosso";
    descrizione = `Cliente sotto potenziale (${percentualeTarget.toFixed(0)}% target)`;
    strategia = "Recupera spazio - proponi pacchetto volume + visibilità";
  }
  
  // Valuta promo già concesse
  if (nPromo >= 4) {
    strategia += " ⚠️ Troppe promo - chiedi contropartita";
  }
  
  return {
    status,
    descrizione,
    strategia,
    percentualeTarget,
    promoGiaConcesse: nPromo,
  };
}
