import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DateRange, ProductStatRow } from "@/lib/productStats";

export interface StatsFilters { azienda_id: string | null; cliente_id: string | null; prodotto_id: string | null }

const n = (v: unknown) => Number(v ?? 0) || 0;

/** Per-product totals computed in the database over the whole filtered selection. */
export function useProductStats(range: DateRange | null, f: StatsFilters) {
  return useQuery({
    queryKey: ["product-sales-stats", range, f],
    enabled: !!range,
    queryFn: async (): Promise<ProductStatRow[]> => {
      const { data, error } = await supabase.rpc("product_sales_stats", {
        p_from: range!.from, p_to: range!.to,
        p_azienda_id: f.azienda_id ?? undefined, p_cliente_id: f.cliente_id ?? undefined, p_prodotto_id: f.prodotto_id ?? undefined,
      });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        fatturato: n(r.fatturato), cartoni: n(r.cartoni), pezzi_sfusi: n(r.pezzi_sfusi), pezzi: n(r.pezzi),
        omaggio_cartoni: n(r.omaggio_cartoni), omaggio_pezzi: n(r.omaggio_pezzi), righe: n(r.righe), ordini: n(r.ordini),
        righe_senza_confezione: n(r.righe_senza_confezione),
      })) as ProductStatRow[];
    },
  });
}

export interface Coverage { ordini_inclusi: number; valore_ordini: number; ordini_con_righe: number; valore_con_righe: number; ordini_senza_righe: number; valore_senza_righe: number }

/** Value of the same order selection, split by whether product detail exists. */
export function useStatsCoverage(range: DateRange | null, f: Pick<StatsFilters, "azienda_id" | "cliente_id">) {
  return useQuery({
    queryKey: ["product-sales-coverage", range, f.azienda_id, f.cliente_id],
    enabled: !!range,
    queryFn: async (): Promise<Coverage> => {
      const { data, error } = await supabase.rpc("product_sales_coverage", {
        p_from: range!.from, p_to: range!.to, p_azienda_id: f.azienda_id ?? undefined, p_cliente_id: f.cliente_id ?? undefined,
      });
      if (error) throw error;
      const r: Record<string, unknown> = (data ?? [])[0] ?? {};
      return {
        ordini_inclusi: n(r.ordini_inclusi), valore_ordini: n(r.valore_ordini), ordini_con_righe: n(r.ordini_con_righe),
        valore_con_righe: n(r.valore_con_righe), ordini_senza_righe: n(r.ordini_senza_righe), valore_senza_righe: n(r.valore_senza_righe),
      };
    },
  });
}

export function useOrderYears() {
  return useQuery({
    queryKey: ["order-years"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("order_years");
      if (error) throw error;
      return (data ?? []).map((r) => ({ anno: n(r.anno), ordini: n(r.ordini), ordini_con_righe: n(r.ordini_con_righe) }));
    },
  });
}
