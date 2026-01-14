import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Deal {
  id: string;
  user_id: string;
  client_id: string;
  company_id: string | null;
  title: string;
  status: "open" | "won" | "lost";
  goal: string | null;
  estimated_value: number;
  probability: number;
  next_action_date: string | null;
  next_action_note: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  cliente?: {
    id: string;
    nome: string;
    azienda: string | null;
    fatturato: number | null;
  };
  azienda?: {
    id: string;
    nome: string;
  };
}

export interface DealMessage {
  id: string;
  user_id: string;
  deal_id: string;
  type: "whatsapp" | "email" | "call_script";
  content: string;
  created_at: string;
}

export function useDeals(statusFilter?: Deal["status"] | "tutti") {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["deals", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("deals")
        .select(`
          *,
          cliente:clienti(id, nome, azienda, fatturato),
          azienda:aziende(id, nome)
        `)
        .order("next_action_date", { ascending: true, nullsFirst: false });

      if (statusFilter && statusFilter !== "tutti") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Deal[];
    },
    enabled: !!user,
  });
}

export function useDeal(id?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["deal", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select(`
          *,
          cliente:clienti(id, nome, azienda, fatturato, email, telefono, tipologia_cliente, consorzio),
          azienda:aziende(id, nome, settore)
        `)
        .eq("id", id!)
        .single();

      if (error) throw error;
      return data as Deal;
    },
    enabled: !!user && !!id,
  });
}

export function useClientDeals(clientId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["client_deals", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select(`
          *,
          azienda:aziende(id, nome)
        `)
        .eq("client_id", clientId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Deal[];
    },
    enabled: !!user && !!clientId,
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (deal: Omit<Deal, "id" | "user_id" | "created_at" | "updated_at" | "cliente" | "azienda">) => {
      const { data, error } = await supabase
        .from("deals")
        .insert({ ...deal, user_id: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["client_deals"] });
      toast.success("Trattativa creata");
    },
    onError: () => {
      toast.error("Errore nella creazione della trattativa");
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Deal> & { id: string }) => {
      const { error } = await supabase
        .from("deals")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["deal"] });
      queryClient.invalidateQueries({ queryKey: ["client_deals"] });
      toast.success("Trattativa aggiornata");
    },
    onError: () => {
      toast.error("Errore nell'aggiornamento della trattativa");
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["client_deals"] });
      toast.success("Trattativa eliminata");
    },
  });
}

// Deal Messages
export function useDealMessages(dealId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["deal_messages", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_messages")
        .select("*")
        .eq("deal_id", dealId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DealMessage[];
    },
    enabled: !!user && !!dealId,
  });
}

export function useCreateDealMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (message: Omit<DealMessage, "id" | "user_id" | "created_at">) => {
      const { data, error } = await supabase
        .from("deal_messages")
        .insert({ ...message, user_id: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal_messages"] });
      toast.success("Messaggio salvato");
    },
  });
}
