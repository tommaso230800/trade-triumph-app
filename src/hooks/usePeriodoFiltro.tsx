import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  defaultPeriodo,
  loadPeriodo,
  savePeriodo,
  type PeriodoFiltro,
} from "@/lib/periodFilter";

/**
 * Stato condiviso del filtro Periodo (anno o mese).
 * Predefinito: anno corrente. La scelta esplicita e' persistita in
 * localStorage e resta attiva navigando tra Ordini e Analytics.
 */
export function usePeriodoFiltro() {
  const [periodo, setPeriodoState] = useState<PeriodoFiltro>(() => loadPeriodo());

  const setPeriodo = useCallback((p: PeriodoFiltro) => {
    savePeriodo(p);
    setPeriodoState(p);
  }, []);

  const resetPeriodo = useCallback(() => {
    const d = defaultPeriodo();
    savePeriodo(d);
    setPeriodoState(d);
  }, []);

  return { periodo, setPeriodo, resetPeriodo };
}

/**
 * Primo anno con ordini presenti in archivio: serve a generare le opzioni
 * del selettore coprendo tutto lo storico, senza anni vuoti a caso.
 */
export function usePrimoAnnoOrdini() {
  return useQuery({
    queryKey: ["primo_anno_ordini"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordini")
        .select("data_ordine")
        .not("data_ordine", "is", null)
        .order("data_ordine", { ascending: true })
        .limit(1);
      if (error) throw error;
      const raw = data?.[0]?.data_ordine as string | undefined;
      const y = raw ? Number(raw.slice(0, 4)) : NaN;
      return Number.isFinite(y) ? y : new Date().getFullYear();
    },
  });
}
