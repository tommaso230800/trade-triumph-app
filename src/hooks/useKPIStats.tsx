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

export type PeriodFilter = "tutti" | "mese" | "trimestre" | "anno";

export function useKPIStats(periodFilter: PeriodFilter = "tutti") {
  return useQuery({
    queryKey: ["kpi_stats", periodFilter],
    queryFn: async () => {
      // Calculate date range based on filter
      const now = new Date();
      let startDate: Date | null = null;
      
      switch (periodFilter) {
        case "mese":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "trimestre":
          const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
          startDate = new Date(now.getFullYear(), quarterMonth, 1);
          break;
        case "anno":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = null;
      }
      
      // Fetch all clients with their orders
      const { data: clienti, error: clientiError } = await supabase
        .from("clienti")
        .select("*")
        .order("fatturato", { ascending: false });

      if (clientiError) throw clientiError;

      // Fetch all orders with details - apply date filter
      let ordiniQuery = supabase
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
        .order("data_ordine", { ascending: false });
      
      if (startDate) {
        ordiniQuery = ordiniQuery.gte("data_ordine", startDate.toISOString().split("T")[0]);
      }

      const { data: ordiniRaw, error: ordiniError } = await ordiniQuery;

      if (ordiniError) throw ordiniError;
      
      // Filter out cancelled orders from all stats
      const ordini = (ordiniRaw || []).filter(o => o.status !== "annullato");

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

      // Calculate client KPIs - use orders from selected period, not static fatturato field
      const clientiKPI: ClienteKPI[] = clienti.map((cliente) => {
        const clienteOrdini = ordini.filter((o) => o.cliente_id === cliente.id);
        const fatturatoFromOrders = clienteOrdini.reduce((sum, o) => sum + Number(o.totale), 0);
        return {
          id: cliente.id,
          nome: cliente.nome,
          azienda: cliente.azienda,
          consorzio: cliente.consorzio,
          citta: cliente.citta,
          fatturato: fatturatoFromOrders, // Calculated from orders in period, not static field
          ordini_count: clienteOrdini.length, // Count from filtered orders
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

      // Monthly trend - ensure all 12 months in order
      const mesiNomi = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
      const ordiniPerMeseMap = ordini.reduce((acc, o) => {
        const date = new Date(o.data_ordine || o.created_at);
        const meseIndex = date.getMonth();
        const mese = mesiNomi[meseIndex];
        if (!acc[mese]) {
          acc[mese] = { fatturato: 0, ordini: 0 };
        }
        acc[mese].fatturato += Number(o.totale);
        acc[mese].ordini += 1;
        return acc;
      }, {} as Record<string, { fatturato: number; ordini: number }>);

      const ordiniPerMese = mesiNomi.map((mese) => ({
        mese,
        fatturato: ordiniPerMeseMap[mese]?.fatturato || 0,
        ordini: ordiniPerMeseMap[mese]?.ordini || 0,
      }));

      // Consorzio breakdown with aziende and clienti details
      type ClienteBreakdown = { cliente_id: string; cliente_nome: string; fatturato: number };
      type AziendaBreakdown = { azienda_nome: string; fatturato: number; clienti: Map<string, ClienteBreakdown> };
      const consorzioAziendeMap = new Map<string, Map<string, AziendaBreakdown>>();
      
      ordini.forEach((ordine) => {
        const cliente = clienti.find((c) => c.id === ordine.cliente_id);
        const consorzio = cliente?.consorzio || "Indipendente";
        const aziendaNome = ordine.aziende?.nome || "N/A";
        const aziendaId = ordine.azienda_id || "unknown";
        const clienteId = ordine.cliente_id || "unknown";
        const clienteNome = cliente?.nome || "N/A";
        
        if (!consorzioAziendeMap.has(consorzio)) {
          consorzioAziendeMap.set(consorzio, new Map());
        }
        const aziendeMap = consorzioAziendeMap.get(consorzio)!;
        
        if (!aziendeMap.has(aziendaId)) {
          aziendeMap.set(aziendaId, { azienda_nome: aziendaNome, fatturato: 0, clienti: new Map() });
        }
        
        const aziendaData = aziendeMap.get(aziendaId)!;
        aziendaData.fatturato += Number(ordine.totale);
        
        if (aziendaData.clienti.has(clienteId)) {
          aziendaData.clienti.get(clienteId)!.fatturato += Number(ordine.totale);
        } else {
          aziendaData.clienti.set(clienteId, { cliente_id: clienteId, cliente_nome: clienteNome, fatturato: Number(ordine.totale) });
        }
      });

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

      // Build consorzio with aziende and clienti breakdown
      const consorzioAziendeStats = Array.from(consorzioAziendeMap.entries()).map(([consorzio, aziendeMap]) => ({
        consorzio,
        aziende: Array.from(aziendeMap.values()).map((a) => ({
          azienda_nome: a.azienda_nome,
          fatturato: a.fatturato,
          clienti: Array.from(a.clienti.values()).sort((x, y) => y.fatturato - x.fatturato),
        })).sort((a, b) => b.fatturato - a.fatturato),
        fatturato_totale: Array.from(aziendeMap.values()).reduce((sum, a) => sum + a.fatturato, 0),
      })).sort((a, b) => b.fatturato_totale - a.fatturato_totale);

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
        consorzioAziendeStats,
        clientiTotali: clienti.length,
        prodottiTotali: prodotti.length,
        aziendeTotali: aziende.length,
      };
    },
  });
}
