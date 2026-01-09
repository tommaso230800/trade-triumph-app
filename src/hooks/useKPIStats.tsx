import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ClienteKPI = {
  id: string;
  nome: string;
  azienda: string | null;
  consorzio: string | null;
  citta: string | null;
  fatturato: number;
  ordini_count: number;
  status: string;
  ordini_dettaglio: {
    id: string;
    totale: number;
    prodotti: number;
    created_at: string;
    status: string;
  }[];
};

export type ProdottoKPI = {
  id: string;
  nome: string;
  azienda_nome: string;
  prezzo_listino: number;
  quantita_venduta: number;
  fatturato_totale: number;
  ordini_count: number;
};

export type AziendaKPI = {
  id: string;
  nome: string;
  settore: string | null;
  fatturato_totale: number;
  ordini_count: number;
  prodotti_venduti: number;
};

export function useKPIStats() {
  return useQuery({
    queryKey: ["kpi_stats"],
    queryFn: async () => {
      // Fetch all clients with their orders
      const { data: clienti, error: clientiError } = await supabase
        .from("clienti")
        .select("*")
        .order("fatturato", { ascending: false });

      if (clientiError) throw clientiError;

      // Fetch all orders with details
      const { data: ordini, error: ordiniError } = await supabase
        .from("ordini")
        .select(`
          *,
          clienti (id, nome),
          aziende (id, nome, settore),
          ordini_righe (
            id,
            prodotto_id,
            quantita_pezzi,
            quantita_cartoni,
            prezzo_unitario,
            prodotti (id, nome, pezzi_per_cartone, prezzo_listino, azienda_id)
          )
        `)
        .order("created_at", { ascending: false });

      if (ordiniError) throw ordiniError;

      // Fetch all products
      const { data: prodotti, error: prodottiError } = await supabase
        .from("prodotti")
        .select(`
          *,
          aziende (nome)
        `);

      if (prodottiError) throw prodottiError;

      // Fetch all companies
      const { data: aziende, error: aziendeError } = await supabase
        .from("aziende")
        .select("*");

      if (aziendeError) throw aziendeError;

      // Calculate client KPIs
      const clientiKPI: ClienteKPI[] = clienti.map((cliente) => {
        const clienteOrdini = ordini.filter((o) => o.cliente_id === cliente.id);
        return {
          id: cliente.id,
          nome: cliente.nome,
          azienda: cliente.azienda,
          consorzio: cliente.consorzio,
          citta: cliente.citta,
          fatturato: Number(cliente.fatturato),
          ordini_count: cliente.ordini_count,
          status: cliente.status,
          ordini_dettaglio: clienteOrdini.map((o) => ({
            id: o.id,
            totale: Number(o.totale),
            prodotti: o.prodotti,
            created_at: o.created_at,
            status: o.status,
          })),
        };
      });

      // Calculate product KPIs
      const prodottiMap = new Map<string, ProdottoKPI>();
      ordini.forEach((ordine) => {
        ordine.ordini_righe?.forEach((riga: any) => {
          if (!riga.prodotti) return;
          const prodottoId = riga.prodotto_id;
          const existing = prodottiMap.get(prodottoId);
          const pezziTotali = riga.quantita_pezzi + riga.quantita_cartoni * (riga.prodotti.pezzi_per_cartone || 1);
          const rigaFatturato = pezziTotali * Number(riga.prezzo_unitario);

          if (existing) {
            existing.quantita_venduta += pezziTotali;
            existing.fatturato_totale += rigaFatturato;
            existing.ordini_count += 1;
          } else {
            const prodotto = prodotti.find((p) => p.id === prodottoId);
            prodottiMap.set(prodottoId, {
              id: prodottoId,
              nome: riga.prodotti.nome,
              azienda_nome: prodotto?.aziende?.nome || "N/A",
              prezzo_listino: Number(riga.prodotti.prezzo_listino),
              quantita_venduta: pezziTotali,
              fatturato_totale: rigaFatturato,
              ordini_count: 1,
            });
          }
        });
      });
      const prodottiKPI = Array.from(prodottiMap.values()).sort(
        (a, b) => b.fatturato_totale - a.fatturato_totale
      );

      // Calculate company KPIs
      const aziendeKPI: AziendaKPI[] = aziende.map((azienda) => {
        const aziendaOrdini = ordini.filter((o) => o.azienda_id === azienda.id);
        const fatturato = aziendaOrdini.reduce((sum, o) => sum + Number(o.totale), 0);
        const prodottiVenduti = aziendaOrdini.reduce((sum, o) => {
          return sum + (o.ordini_righe?.reduce((s: number, r: any) => {
            return s + r.quantita_pezzi + r.quantita_cartoni * (r.prodotti?.pezzi_per_cartone || 1);
          }, 0) || 0);
        }, 0);

        return {
          id: azienda.id,
          nome: azienda.nome,
          settore: azienda.settore,
          fatturato_totale: fatturato,
          ordini_count: aziendaOrdini.length,
          prodotti_venduti: prodottiVenduti,
        };
      }).sort((a, b) => b.fatturato_totale - a.fatturato_totale);

      // Calculate general stats
      const fatturatoTotale = ordini.reduce((sum, o) => sum + Number(o.totale), 0);
      const ordiniTotali = ordini.length;
      const ordiniCompletati = ordini.filter((o) => o.status === "completato").length;
      const valoremedioOrdine = ordiniTotali > 0 ? fatturatoTotale / ordiniTotali : 0;
      const prezzoMedioProdotto = prodottiKPI.length > 0
        ? prodottiKPI.reduce((sum, p) => sum + p.prezzo_listino, 0) / prodottiKPI.length
        : 0;
      const prezzoMedioVendita = prodottiKPI.length > 0
        ? prodottiKPI.reduce((sum, p) => sum + (p.fatturato_totale / (p.quantita_venduta || 1)), 0) / prodottiKPI.length
        : 0;

      // Monthly trend
      const ordiniPerMese = ordini.reduce((acc, o) => {
        const mese = new Date(o.created_at).toLocaleString("it-IT", { month: "short" });
        const existing = acc.find((m) => m.mese === mese);
        if (existing) {
          existing.fatturato += Number(o.totale);
          existing.ordini += 1;
        } else {
          acc.push({ mese, fatturato: Number(o.totale), ordini: 1 });
        }
        return acc;
      }, [] as { mese: string; fatturato: number; ordini: number }[]);

      // Consorzio breakdown
      const consorzioStats = clienti.reduce((acc, c) => {
        const consorzio = c.consorzio || "Indipendente";
        const existing = acc.find((cs) => cs.consorzio === consorzio);
        if (existing) {
          existing.clienti += 1;
          existing.fatturato += Number(c.fatturato);
        } else {
          acc.push({ consorzio, clienti: 1, fatturato: Number(c.fatturato) });
        }
        return acc;
      }, [] as { consorzio: string; clienti: number; fatturato: number }[]);

      return {
        clientiKPI,
        prodottiKPI,
        aziendeKPI,
        fatturatoTotale,
        ordiniTotali,
        ordiniCompletati,
        valoremedioOrdine,
        prezzoMedioProdotto,
        prezzoMedioVendita,
        ordiniPerMese,
        consorzioStats,
        clientiTotali: clienti.length,
        prodottiTotali: prodotti.length,
        aziendeTotali: aziende.length,
      };
    },
  });
}
