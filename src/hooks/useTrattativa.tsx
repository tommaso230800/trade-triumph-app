import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface TemplateTrattativa {
  id: string;
  user_id: string;
  nome: string;
  tipologia_cliente: string;
  obiettivo_default: string;
  sconto_max_percentuale: number | null;
  omaggio_default: string | null;
  extra_default: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoricoTrattativa {
  id: string;
  user_id: string;
  cliente_id: string | null;
  cliente_nome: string;
  tipologia_cliente: string;
  prodotto_nome: string;
  prezzo_listino: number;
  costo_acquisto: number | null;
  margine_target: number | null;
  pezzi_per_cartone: number;
  quantita_cartoni: number;
  quantita_pezzi: number;
  sconto_richiesto: number | null;
  obiettivo: string;
  carta_scelta: string | null;
  esito: string | null;
  note: string | null;
  dati_carte: any;
  created_at: string;
}

// Hook per template
export function useTemplateTrattativa() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["template_trattativa"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("template_trattativa")
        .select("*")
        .order("nome");
      
      if (error) throw error;
      return data as TemplateTrattativa[];
    },
    enabled: !!user,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (template: Omit<TemplateTrattativa, "id" | "user_id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("template_trattativa")
        .insert({ ...template, user_id: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template_trattativa"] });
      toast.success("Template salvato");
    },
    onError: () => {
      toast.error("Errore nel salvataggio del template");
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("template_trattativa")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template_trattativa"] });
      toast.success("Template eliminato");
    },
  });
}

// Hook per storico
export function useStoricoTrattative() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["storico_trattative"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("storico_trattative")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as StoricoTrattativa[];
    },
    enabled: !!user,
  });
}

export function useSaveTrattativa() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (trattativa: Omit<StoricoTrattativa, "id" | "user_id" | "created_at">) => {
      const { data, error } = await supabase
        .from("storico_trattative")
        .insert({ ...trattativa, user_id: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storico_trattative"] });
      toast.success("Trattativa salvata nello storico");
    },
  });
}

export function useUpdateTrattativaEsito() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, carta_scelta, esito, note }: { id: string; carta_scelta?: string; esito?: string; note?: string }) => {
      const { error } = await supabase
        .from("storico_trattative")
        .update({ carta_scelta, esito, note })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storico_trattative"] });
      toast.success("Esito aggiornato");
    },
  });
}
