import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface PriceIncrease {
  id: string;
  user_id: string;
  created_at: string;
  effective_date: string;
  company_id: string;
  product_id: string | null;
  category: string | null;
  increase_type: "percent" | "fixed";
  increase_value: number;
  reason: string | null;
  notes: string | null;
  azienda?: {
    id: string;
    nome: string;
  };
  prodotto?: {
    id: string;
    nome: string;
  } | null;
}

export interface IncreaseAction {
  id: string;
  user_id: string;
  price_increase_id: string;
  deal_id: string | null;
  client_id: string;
  status: "todo" | "contacted" | "agreed" | "refused";
  planned_contact_date: string | null;
  outcome_note: string | null;
  created_at: string;
  updated_at: string;
  price_increase?: PriceIncrease;
  cliente?: {
    id: string;
    nome: string;
  };
}

// Hook per recuperare tutti gli aumenti
export function usePriceIncreases(companyId?: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["price_increases", companyId],
    queryFn: async () => {
      let query = supabase
        .from("price_increases")
        .select(`
          *,
          azienda:aziende (id, nome),
          prodotto:prodotti (id, nome)
        `)
        .order("effective_date", { ascending: false });
      
      if (companyId) {
        query = query.eq("company_id", companyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as PriceIncrease[];
    },
    enabled: !!user,
  });
}

// Hook per aumenti attivi/imminenti per una specifica azienda
export function useActivePriceIncreases(companyId?: string) {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ["active_price_increases", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from("price_increases")
        .select(`
          *,
          azienda:aziende (id, nome),
          prodotto:prodotti (id, nome)
        `)
        .eq("company_id", companyId)
        .gte("effective_date", today)
        .order("effective_date", { ascending: true });
      
      if (error) throw error;
      return data as PriceIncrease[];
    },
    enabled: !!user && !!companyId,
  });
}

// Hook per creare un aumento
export function useCreatePriceIncrease() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (increase: Omit<PriceIncrease, "id" | "user_id" | "created_at" | "azienda" | "prodotto">) => {
      const { data, error } = await supabase
        .from("price_increases")
        .insert({ ...increase, user_id: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price_increases"] });
      queryClient.invalidateQueries({ queryKey: ["active_price_increases"] });
      toast.success("Aumento registrato");
    },
    onError: () => {
      toast.error("Errore nella registrazione dell'aumento");
    },
  });
}

// Hook per eliminare un aumento
export function useDeletePriceIncrease() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("price_increases")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price_increases"] });
      queryClient.invalidateQueries({ queryKey: ["active_price_increases"] });
      toast.success("Aumento eliminato");
    },
  });
}

// Hook per le azioni su un aumento
export function useIncreaseActions(priceIncreaseId?: string, dealId?: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["increase_actions", priceIncreaseId, dealId],
    queryFn: async () => {
      let query = supabase
        .from("increase_actions")
        .select(`
          *,
          price_increase:price_increases (
            id, effective_date, increase_type, increase_value, reason,
            azienda:aziende (id, nome),
            prodotto:prodotti (id, nome)
          ),
          cliente:clienti (id, nome)
        `)
        .order("created_at", { ascending: false });
      
      if (priceIncreaseId) {
        query = query.eq("price_increase_id", priceIncreaseId);
      }
      
      if (dealId) {
        query = query.eq("deal_id", dealId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as IncreaseAction[];
    },
    enabled: !!user && (!!priceIncreaseId || !!dealId),
  });
}

// Hook per creare un'azione di gestione aumento
export function useCreateIncreaseAction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (action: Omit<IncreaseAction, "id" | "user_id" | "created_at" | "updated_at" | "price_increase" | "cliente">) => {
      const { data, error } = await supabase
        .from("increase_actions")
        .insert({ ...action, user_id: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["increase_actions"] });
      toast.success("Azione aumento salvata");
    },
    onError: () => {
      toast.error("Errore nel salvataggio dell'azione");
    },
  });
}

// Hook per aggiornare un'azione
export function useUpdateIncreaseAction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<IncreaseAction> & { id: string }) => {
      const { error } = await supabase
        .from("increase_actions")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["increase_actions"] });
      toast.success("Azione aggiornata");
    },
  });
}
