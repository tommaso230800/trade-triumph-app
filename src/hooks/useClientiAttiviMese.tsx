import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const toISO = (d: Date) => d.toISOString().split("T")[0];

// Clienti distinti con almeno un ordine (non annullato/stand-by) nel mese corrente.
export function useClientiAttiviMese() {
  return useQuery({
    queryKey: ["clienti_attivi_mese"],
    queryFn: async () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from("ordini")
        .select("cliente_id")
        .not("status", "in", "(annullato,stand_by)")
        .gte("data_ordine", toISO(start))
        .lte("data_ordine", toISO(end));

      if (error) throw error;

      const distinti = new Set((data || []).map((o) => o.cliente_id).filter(Boolean));
      return distinti.size;
    },
  });
}
