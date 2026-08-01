import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CustomerProductPrice = {
  id: string;
  user_id: string;
  customer_id: string;
  company_id: string;
  product_id: string;
  custom_price: number;
  valid_from: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export function useCustomerProductPrices(customerId?: string, companyId?: string) {
  return useQuery({
    queryKey: ["customer_product_prices", customerId, companyId],
    queryFn: async () => {
      let query = supabase.from("customer_product_prices").select("*");
      if (customerId) query = query.eq("customer_id", customerId);
      if (companyId) query = query.eq("company_id", companyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as CustomerProductPrice[];
    },
    enabled: !!customerId,
  });
}

export function useUpsertCustomerProductPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      customer_id: string;
      company_id: string;
      product_id: string;
      custom_price: number;
      valid_from?: string | null;
      note?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("customer_product_prices")
        .upsert({ ...input, user_id: user?.id }, { onConflict: "customer_id,company_id,product_id" })
        .select()
        .single();
      if (error) throw error;
      return data as CustomerProductPrice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer_product_prices"] });
      toast.success("Prezzo cliente salvato");
    },
    onError: (error: Error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useDeleteCustomerProductPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customer_product_prices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer_product_prices"] });
      toast.success("Prezzo riservato rimosso, torna al listino standard");
    },
    onError: (error: Error) => {
      toast.error("Errore: " + error.message);
    },
  });
}
