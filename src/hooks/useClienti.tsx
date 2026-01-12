import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Cliente = {
  id: string;
  user_id: string;
  nome: string;
  azienda: string | null;
  email: string | null;
  telefono: string | null;
  fatturato: number;
  ordini_count: number;
  status: "premium" | "standard" | "nuovo";
  partita_iva: string | null;
  indirizzo: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
  codice_sdi: string | null;
  pec: string | null;
  email_aggiuntive: string[] | null;
  consorzio: string | null;
  tipologia_cliente: string | null;
  fatturato_target: number | null;
  budget_promo_percentuale: number | null;
  sconto_max_policy: number | null;
  n_promo_concesse: number | null;
  costo_promo_totale: number | null;
  condizioni_attive: string[] | null;
  created_at: string;
};

export function useClienti(searchTerm?: string, statusFilter?: Cliente["status"] | "tutti") {
  return useQuery({
    queryKey: ["clienti", searchTerm, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("clienti")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`nome.ilike.%${searchTerm}%,azienda.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      if (statusFilter && statusFilter !== "tutti") {
        query = query.eq("status", statusFilter as Cliente["status"]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Cliente[];
    },
  });
}

export function useCreateCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cliente: Omit<Cliente, "id" | "user_id" | "created_at">) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("clienti")
        .insert({ ...cliente, user_id: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clienti"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Cliente aggiunto con successo!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useUpdateCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Cliente> & { id: string }) => {
      const { error } = await supabase
        .from("clienti")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clienti"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Cliente aggiornato!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useDeleteCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clienti").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clienti"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Cliente eliminato!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useCliente(id?: string) {
  return useQuery({
    queryKey: ["cliente", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("clienti")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Cliente;
    },
    enabled: !!id,
  });
}

export function useClienteOrdini(clienteId?: string) {
  return useQuery({
    queryKey: ["cliente_ordini", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase
        .from("ordini")
        .select(`
          *,
          aziende (nome),
          ordini_righe (
            id,
            prodotto_id,
            quantita_pezzi,
            quantita_cartoni,
            prezzo_unitario,
            prodotti (nome)
          )
        `)
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clienteId,
  });
}
