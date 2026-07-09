import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type StatoProvvigione = 'da_pagare' | 'pagata' | 'parziale' | 'contestazione' | 'scaduta';

export interface ScadenziarioFattura {
  id: string;
  user_id: string;
  cliente_id: string | null;
  azienda_id: string | null;
  cliente_nome: string;
  azienda_nome: string;
  numero_fattura: string;
  data_fattura: string;
  data_scadenza: string;
  importo: number;
  percentuale_provvigione: number;
  provvigione_calcolata: number;
  stato: 'scaduta' | 'incassata';
  data_incasso: string | null;
  trimestre_provvigione: string | null;
  provvigione_incassata: boolean;
  data_incasso_provvigione: string | null;
  stato_provvigione: StatoProvvigione;
  importo_provvigione_pagata: number;
  metodo_pagamento_provvigione: string | null;
  note_provvigione: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportFatturaData {
  cliente_nome: string;
  azienda_nome: string;
  numero_fattura: string;
  data_fattura: string;
  data_scadenza: string;
  importo: number;
  percentuale_provvigione: number;
}

const calculateTrimestre = (date: Date): string => {
  const month = date.getMonth() + 1;
  if (month >= 1 && month <= 3) return 'Q1';
  if (month >= 4 && month <= 6) return 'Q2';
  if (month >= 7 && month <= 9) return 'Q3';
  return 'Q4';
};

export const useScadenziario = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch fatture non incassate (scadenziario)
  const { data: fattureScadute = [], isLoading: loadingScadute } = useQuery({
    queryKey: ['scadenziario', 'scadute', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('scadenziario_fatture')
        .select('*')
        .eq('user_id', user.id)
        .eq('stato', 'scaduta')
        .order('data_scadenza', { ascending: true });
      
      if (error) throw error;
      return data as ScadenziarioFattura[];
    },
    enabled: !!user?.id,
  });

  // Fetch fatture incassate (provvigioni)
  const { data: fattureIncassate = [], isLoading: loadingIncassate } = useQuery({
    queryKey: ['scadenziario', 'incassate', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('scadenziario_fatture')
        .select('*')
        .eq('user_id', user.id)
        .eq('stato', 'incassata')
        .order('data_incasso', { ascending: false });
      
      if (error) throw error;
      return data as ScadenziarioFattura[];
    },
    enabled: !!user?.id,
  });

  // Import fatture mutation
  const importFatture = useMutation({
    mutationFn: async (fatture: ImportFatturaData[]) => {
      if (!user?.id) throw new Error('Utente non autenticato');

      const fattureToInsert = fatture.map(f => ({
        user_id: user.id,
        cliente_nome: f.cliente_nome,
        azienda_nome: f.azienda_nome,
        numero_fattura: f.numero_fattura,
        data_fattura: f.data_fattura,
        data_scadenza: f.data_scadenza,
        importo: f.importo,
        percentuale_provvigione: f.percentuale_provvigione,
        provvigione_calcolata: f.importo * (f.percentuale_provvigione / 100),
        stato: 'scaduta',
      }));

      const { data, error } = await supabase
        .from('scadenziario_fatture')
        .insert(fattureToInsert)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scadenziario'] });
      toast.success(`${data.length} fatture importate con successo`);
    },
    onError: (error) => {
      toast.error(`Errore durante l'importazione: ${error.message}`);
    },
  });

  // Segna come incassata mutation
  const segnaIncassata = useMutation({
    mutationFn: async ({ id, data_incasso }: { id: string; data_incasso: string }) => {
      const incassoDate = new Date(data_incasso);
      const trimestre = calculateTrimestre(incassoDate);
      const year = incassoDate.getFullYear();

      const { data, error } = await supabase
        .from('scadenziario_fatture')
        .update({
          stato: 'incassata',
          data_incasso,
          trimestre_provvigione: `${trimestre} ${year}`,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scadenziario'] });
      toast.success('Fattura segnata come incassata');
    },
    onError: (error) => {
      toast.error(`Errore: ${error.message}`);
    },
  });

  // Segna provvigione come incassata
  const segnaProvvigioneIncassata = useMutation({
    mutationFn: async ({ id, data_incasso_provvigione }: { id: string; data_incasso_provvigione: string }) => {
      const { data, error } = await supabase
        .from('scadenziario_fatture')
        .update({
          provvigione_incassata: true,
          data_incasso_provvigione,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scadenziario'] });
      toast.success('Provvigione segnata come incassata');
    },
    onError: (error) => {
      toast.error(`Errore: ${error.message}`);
    },
  });

  // Elimina fattura mutation
  const eliminaFattura = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scadenziario_fatture')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scadenziario'] });
      toast.success('Fattura eliminata');
    },
    onError: (error) => {
      toast.error(`Errore: ${error.message}`);
    },
  });

  // Aggiorna stato provvigione (nuovo sistema a 4 stati)
  const aggiornaStatoProvvigione = useMutation({
    mutationFn: async (input: {
      id: string;
      stato: StatoProvvigione;
      importo_pagato?: number;
      data_pagamento?: string | null;
      metodo?: string | null;
      note?: string | null;
    }) => {
      const updates: any = {
        stato_provvigione: input.stato,
        metodo_pagamento_provvigione: input.metodo ?? null,
        note_provvigione: input.note ?? null,
      };
      if (input.stato === 'pagata') {
        updates.provvigione_incassata = true;
        updates.data_incasso_provvigione = input.data_pagamento || new Date().toISOString().slice(0, 10);
        updates.importo_provvigione_pagata = input.importo_pagato ?? 0;
      } else if (input.stato === 'parziale') {
        updates.provvigione_incassata = false;
        updates.data_incasso_provvigione = input.data_pagamento || null;
        updates.importo_provvigione_pagata = input.importo_pagato ?? 0;
      } else {
        updates.provvigione_incassata = false;
        updates.data_incasso_provvigione = null;
        updates.importo_provvigione_pagata = 0;
      }
      const { error } = await supabase
        .from('scadenziario_fatture')
        .update(updates)
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scadenziario'] });
      toast.success('Stato provvigione aggiornato');
    },
    onError: (e) => toast.error(`Errore: ${e.message}`),
  });

  // Calcolo statistiche
  // Fatture incassate con provvigione ancora da riscuotere
  const provvigioniDaIncassare = fattureIncassate.filter(f => !f.provvigione_incassata);
  const provvigioniIncassate = fattureIncassate.filter(f => f.provvigione_incassata);
  const totaleProvvigioniDaIncassare = provvigioniDaIncassare.reduce((sum, f) => sum + Number(f.provvigione_calcolata), 0);
  const totaleProvvigioniIncassate = provvigioniIncassate.reduce((sum, f) => sum + Number(f.provvigione_calcolata), 0);
  const totaleScaduto = fattureScadute.reduce((sum, f) => sum + Number(f.importo), 0);
  const provvigionePotenziale = fattureScadute.reduce((sum, f) => sum + Number(f.provvigione_calcolata), 0);
  const totaleIncassato = fattureIncassate.reduce((sum, f) => sum + Number(f.importo), 0);
  const provvigioneMaturata = fattureIncassate.reduce((sum, f) => sum + Number(f.provvigione_calcolata), 0);

  return {
    fattureScadute,
    fattureIncassate,
    provvigioniDaIncassare,
    provvigioniIncassate,
    loadingScadute,
    loadingIncassate,
    importFatture,
    segnaIncassata,
    segnaProvvigioneIncassata,
    aggiornaStatoProvvigione,
    eliminaFattura,
    totaleScaduto,
    provvigionePotenziale,
    totaleIncassato,
    provvigioneMaturata,
    totaleProvvigioniDaIncassare,
    totaleProvvigioniIncassate,
  };
};
