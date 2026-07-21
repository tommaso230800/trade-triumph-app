import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type StatoConsegna = "da_consegnare" | "in_consegna" | "consegnata" | "parziale" | "problema";
export type ProblemaConsegna = "ritardo" | "rottura_stock" | "danneggiato" | "indirizzo_errato" | "rifiutato" | "altro";

export interface OrdineConsegna {
  id: string;
  codice: string;
  data_ordine: string | null;
  data_conferma: string | null;
  data_consegna_prevista: string | null;
  data_consegna_effettiva: string | null;
  stato_consegna: StatoConsegna;
  problema_consegna: ProblemaConsegna | null;
  note_consegna: string | null;
  destinazione_consegna: string | null;
  totale: number;
  status: string;
  clienti?: { nome: string; azienda: string | null } | null;
  aziende?: { nome: string } | null;
}

export function useConsegne() {
  return useQuery({
    queryKey: ["consegne"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ordini")
        .select(`
          id, codice, data_ordine, data_conferma,
          data_consegna_prevista, data_consegna_effettiva,
          stato_consegna, problema_consegna, note_consegna, destinazione_consegna,
          totale, status,
          clienti(nome, azienda),
          aziende(nome)
        `)
        .not("status", "in", "(annullato,stand_by)")
        .order("data_consegna_prevista", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []) as unknown as OrdineConsegna[];
    },
  });
}

export interface UpdateConsegnaInput {
  id: string;
  data_consegna_prevista?: string | null;
  data_consegna_effettiva?: string | null;
  stato_consegna?: StatoConsegna;
  problema_consegna?: ProblemaConsegna | null;
  note_consegna?: string | null;
  destinazione_consegna?: string | null;
}

export function useUpdateConsegna() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateConsegnaInput) => {
      const { id, ...rest } = input;
      const { error } = await supabase.from("ordini").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consegne"] });
      qc.invalidateQueries({ queryKey: ["ordini"] });
      toast.success("Consegna aggiornata");
    },
    onError: (e: any) => toast.error("Errore: " + e.message),
  });
}
