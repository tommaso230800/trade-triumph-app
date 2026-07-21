import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  computePriceControl,
  computeRFM,
  simulateMonthClose,
  type RigaOrdineIC,
  type OrdineIC,
} from "@/lib/commercialIntelligenceEngine";

export function useCommercialIntelligence(aziendaFilter?: string) {
  return useQuery({
    queryKey: ["commercial-intelligence", aziendaFilter || "all"],
    queryFn: async () => {
      // Ordini
      let oq = supabase
        .from("ordini")
        .select("id, cliente_id, azienda_id, data_ordine, totale, status, provvigione_prevista");
      if (aziendaFilter && aziendaFilter !== "all") oq = oq.eq("azienda_id", aziendaFilter);
      const { data: ordini, error: oe } = await oq;
      if (oe) throw oe;

      const ordiniIC: OrdineIC[] = (ordini || []).map((o: any) => ({
        id: o.id,
        cliente_id: o.cliente_id,
        azienda_id: o.azienda_id,
        data_ordine: o.data_ordine,
        totale: Number(o.totale || 0),
        status: o.status,
        provvigione_prevista: Number(o.provvigione_prevista || 0),
      }));

      const ordineDate = new Map<string, string>();
      const ordineCliente = new Map<string, string>();
      const ordineAzienda = new Map<string, string>();
      for (const o of ordiniIC) {
        if (o.data_ordine) ordineDate.set(o.id, o.data_ordine);
        if (o.cliente_id) ordineCliente.set(o.id, o.cliente_id);
        if (o.azienda_id) ordineAzienda.set(o.id, o.azienda_id);
      }

      // Righe
      const { data: righe, error: re } = await supabase
        .from("ordini_righe")
        .select(
          "ordine_id, prodotto_id, quantita_pezzi, quantita_cartoni, prezzo_unitario, sc1, sc2, sc3, is_omaggio, prodotti(nome, codice, prezzo_listino)"
        );
      if (re) throw re;

      const righeIC: RigaOrdineIC[] = (righe || [])
        .filter((r: any) => ordineDate.has(r.ordine_id))
        .map((r: any) => ({
          ordine_id: r.ordine_id,
          prodotto_id: r.prodotto_id,
          quantita_pezzi: Number(r.quantita_pezzi || 0),
          quantita_cartoni: Number(r.quantita_cartoni || 0),
          prezzo_unitario: Number(r.prezzo_unitario || 0),
          sc1: Number(r.sc1 || 0),
          sc2: Number(r.sc2 || 0),
          sc3: Number(r.sc3 || 0),
          is_omaggio: !!r.is_omaggio,
          data_ordine: ordineDate.get(r.ordine_id)!,
          cliente_id: ordineCliente.get(r.ordine_id) || "",
          azienda_id: ordineAzienda.get(r.ordine_id) || "",
          prezzo_listino: r.prodotti?.prezzo_listino ?? null,
        }));

      // Prodotti/clienti/aziende lookup
      const [{ data: prodotti }, { data: clienti }, { data: aziende }] = await Promise.all([
        supabase.from("prodotti").select("id, nome, codice, prezzo_listino, azienda_id"),
        supabase.from("clienti").select("id, nome, azienda, citta, provincia"),
        supabase.from("aziende").select("id, nome"),
      ]);

      const prodMap = new Map<string, any>((prodotti || []).map((p: any) => [p.id, p]));
      const cliMap = new Map<string, any>((clienti || []).map((c: any) => [c.id, c]));
      const aziMap = new Map<string, any>((aziende || []).map((a: any) => [a.id, a]));

      const priceCtrl = computePriceControl(righeIC);
      const rfm = computeRFM(ordiniIC);
      const monthSim = simulateMonthClose(ordiniIC);

      return {
        priceCtrl,
        rfm,
        monthSim,
        prodMap,
        cliMap,
        aziMap,
        aziende: aziende || [],
        ordiniIC,
        righeIC,
      };
    },
    staleTime: 60_000,
  });
}

