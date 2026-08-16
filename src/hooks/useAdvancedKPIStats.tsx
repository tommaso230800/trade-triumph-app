import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { allocateRevenueByRiga, orderDate, isCounted, type OrdineLike } from "@/lib/metricsEngine";
import { toLocalISODate } from "@/lib/periodRange";


export type AdvancedKPIFilters = {
  clienteIds: string[];
  aziendaIds: string[];
  brandIds: string[];
  startDate: Date | null;
  endDate: Date | null;
};

export type BrandKPI = {
  id: string;
  name: string;
  azienda_nome: string | null;
  fatturato_totale: number;
  ordini_count: number;
  quantita_venduta: number;
};

export type ClienteKPI = {
  id: string;
  nome: string;
  azienda: string | null;
  consorzio: string | null;
  citta: string | null;
  fatturato: number;
  fatturato_2025: number | null;
  ordini_count: number;
  cartoni_totali: number;
  pezzi_totali: number;
  perAzienda: { aziendaId: string; aziendaNome: string; fatturato: number }[];
};

export type ProdottoKPI = {
  id: string;
  nome: string;
  azienda_nome: string;
  brand_nome: string | null;
  prezzo_listino: number;
  quantita_venduta: number;
  cartoni_venduti: number;
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
  cartoni_venduti: number;
};

export function useAdvancedKPIStats(filters: AdvancedKPIFilters) {
  return useQuery({
    queryKey: ["advanced_kpi_stats", filters],
    queryFn: async () => {
      // Fetch all clients
      const { data: clienti, error: clientiError } = await supabase
        .from("clienti")
        .select("*")
        .order("fatturato", { ascending: false });

      if (clientiError) throw clientiError;

      // Fetch all companies
      const { data: aziende, error: aziendeError } = await supabase
        .from("aziende")
        .select("*");

      if (aziendeError) throw aziendeError;

      // Fetch all brands
      const { data: brands, error: brandsError } = await supabase
        .from("brands")
        .select("*, aziende(nome)");

      if (brandsError) throw brandsError;

      // Fetch all products
      const { data: prodotti, error: prodottiError } = await supabase
        .from("prodotti")
        .select("*, aziende(nome), brands(name)");

      if (prodottiError) throw prodottiError;

      // Build orders query with filters
      let ordiniQuery = supabase
        .from("ordini")
        .select(`
          *,
          clienti (id, nome, consorzio, citta),
          aziende (id, nome, settore),
          ordini_righe (
            id,
            prodotto_id,
            quantita_pezzi,
            quantita_cartoni,
            prezzo_unitario,
            sc1,
            sc2,
            sc3,
            is_omaggio,
            prodotti (id, nome, pezzi_per_cartone, prezzo_listino, costo_acquisto, azienda_id, brand_id)
          )
        `)
        .not("status","in","(annullato,stand_by)")
        .order("data_ordine", { ascending: false });

      // Apply date filters
      if (filters.startDate) {
        ordiniQuery = ordiniQuery.gte("data_ordine", toLocalISODate(filters.startDate));
      }
      if (filters.endDate) {
        ordiniQuery = ordiniQuery.lte("data_ordine", toLocalISODate(filters.endDate));
      }


      // Apply client filter
      if (filters.clienteIds.length > 0) {
        ordiniQuery = ordiniQuery.in("cliente_id", filters.clienteIds);
      }

      // Apply company filter
      if (filters.aziendaIds.length > 0) {
        ordiniQuery = ordiniQuery.in("azienda_id", filters.aziendaIds);
      }

      const { data: ordiniRaw, error: ordiniError } = await ordiniQuery;

      if (ordiniError) throw ordiniError;

      // Further filter by brand if needed
      let ordini = ordiniRaw || [];
      
      if (filters.brandIds.length > 0) {
        // Filter orders that have at least one product with the selected brand
        ordini = ordini.filter((ordine) => {
          return ordine.ordini_righe?.some((riga: any) => 
            filters.brandIds.includes(riga.prodotti?.brand_id)
          );
        });
      }

      // Calculate totals
      let fatturatoTotale = 0;
      let ordiniTotali = ordini.length;
      let cartoniTotali = 0;
      let pezziTotali = 0;
      let costoAcquistoTotale = 0;  // somma costi acquisto pezzi venduti
      // Sconto medio (ponderato sul fatturato)
      let scontoNumeratore = 0;       // somma sconto% * totale
      let scontoMerceTotale = 0;      // somma sconto_merce €
      let scontoRigheNumeratore = 0;  // somma sconto cascata sc1/sc2/sc3 ponderato sul subtotale riga
      let subtotaleRigheTotale = 0;

      const clientiMap = new Map<string, ClienteKPI>();
      const aziendeMap = new Map<string, AziendaKPI>();
      const brandsMap = new Map<string, BrandKPI>();
      const prodottiMap = new Map<string, ProdottoKPI>();

      // Monthly trend
      const mesiNomi = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
      const ordiniPerMeseMap: Record<string, { fatturato: number; ordini: number; cartoni: number; pezzi: number; costoAcquisto: number }> = {};
      mesiNomi.forEach(m => {
        ordiniPerMeseMap[m] = { fatturato: 0, ordini: 0, cartoni: 0, pezzi: 0, costoAcquisto: 0 };
      });

      // Distribuzione ordini per stato (verificato ha priorità sullo status)
      let ordiniVerificati = 0;
      let ordiniInAttesa = 0;
      let ordiniAltri = 0;

      // Intensità riordini cliente×mese (top clienti per fatturato)
      const clienteMonthlyMap = new Map<string, number[]>();

      // Fatturato mese × azienda: alimenta le barre impilate della panoramica KPI.
      const mensilePerAziendaMap: Record<string, number>[] = Array.from({ length: 12 }, () => ({}));


      // Fatturato cliente diviso per azienda fornitrice (barra a segmenti
      // nella lista clienti): stessa riga ordine già letta, nessuna query in più.
      const clienteAziendaMap = new Map<string, Map<string, number>>();

      ordini.forEach((ordine) => {
        const totaleOrdine = Number(ordine.totale);
        fatturatoTotale += totaleOrdine;

        // Sconto globale ponderato + sconto merce
        const scontoOrdine = Number(ordine.sconto) || 0;
        scontoNumeratore += scontoOrdine * totaleOrdine;
        scontoMerceTotale += Number(ordine.sconto_merce) || 0;

        // Data di riferimento coerente col motore metriche
        const refDate = orderDate(ordine as OrdineLike) || ordine.data_ordine || ordine.created_at;
        const date = new Date(refDate);
        const meseIndex = date.getMonth();
        const mese = mesiNomi[meseIndex];
        ordiniPerMeseMap[mese].fatturato += totaleOrdine;
        ordiniPerMeseMap[mese].ordini += 1;

        // Fatturato mese × azienda (barre impilate per fornitore nel grafico KPI)
        if (ordine.azienda_id) {
          const perAzMese = mensilePerAziendaMap[meseIndex];
          perAzMese[ordine.azienda_id] = (perAzMese[ordine.azienda_id] || 0) + totaleOrdine;
        }


        // Distribuzione stato: verificato ha priorità, poi in_attesa, poi altri
        // (completato/spedito non ancora verificati). annullato/stand_by sono
        // già esclusi dalla query.
        if (ordine.verificato_conferma) ordiniVerificati += 1;
        else if (ordine.status === "in_attesa") ordiniInAttesa += 1;
        else ordiniAltri += 1;

        // Intensità riordini: conteggio ordini per cliente per mese
        if (ordine.cliente_id) {
          if (!clienteMonthlyMap.has(ordine.cliente_id)) {
            clienteMonthlyMap.set(ordine.cliente_id, new Array(12).fill(0));
          }
          clienteMonthlyMap.get(ordine.cliente_id)![meseIndex] += 1;
        }

        // Allocazione proporzionale del fatturato ordine sulle righe non-omaggio.
        // Così la somma per prodotto/brand riconcilia con `ordini.totale`.
        const alloc = allocateRevenueByRiga(ordine as OrdineLike);

        // Process each order line
        let ordineCartoni = 0;
        let ordinePezzi = 0;

        ordine.ordini_righe?.forEach((riga: any, rigaIdx: number) => {
          if (!riga.prodotti) return;

          // Skip if brand filter is active and product doesn't match
          if (filters.brandIds.length > 0 && !filters.brandIds.includes(riga.prodotti.brand_id)) {
            return;
          }

          const cartoni = riga.quantita_cartoni;
          const pezzi = riga.quantita_pezzi + cartoni * (riga.prodotti.pezzi_per_cartone || 1);
          const rigaFatturatoLordo = pezzi * Number(riga.prezzo_unitario);
          // Fatturato attribuito al prodotto/brand: allocazione proporzionale
          // dal motore metriche (== 0 per omaggi, riconcilia con ordini.totale).
          const rigaFatturato = alloc[rigaIdx] ?? 0;

          // Sconto cascata sc1/sc2/sc3 ponderato sul subtotale lordo (solo non-omaggio)
          if (!riga.is_omaggio) {
            const sc1 = Number(riga.sc1) || 0;
            const sc2 = Number(riga.sc2) || 0;
            const sc3 = Number(riga.sc3) || 0;
            const scontoCascata = (1 - (1 - sc1 / 100) * (1 - sc2 / 100) * (1 - sc3 / 100)) * 100;
            subtotaleRigheTotale += rigaFatturatoLordo;
            scontoRigheNumeratore += scontoCascata * rigaFatturatoLordo;
          }

          // Costo acquisto per calcolare margine reale (totale e per mese)
          const costoAcq = Number(riga.prodotti.costo_acquisto) || 0;
          costoAcquistoTotale += costoAcq * pezzi;
          ordiniPerMeseMap[mese].costoAcquisto += costoAcq * pezzi;

          ordineCartoni += cartoni;
          ordinePezzi += pezzi;

          // Product KPIs
          const prodottoId = riga.prodotto_id;
          const prodInfo = prodotti.find((p) => p.id === prodottoId);
          const brandInfo = brands.find((b) => b.id === riga.prodotti.brand_id);
          
          const existingProd = prodottiMap.get(prodottoId);
          if (existingProd) {
            existingProd.quantita_venduta += pezzi;
            existingProd.cartoni_venduti += cartoni;
            existingProd.fatturato_totale += rigaFatturato;
            existingProd.ordini_count += 1;
          } else {
            prodottiMap.set(prodottoId, {
              id: prodottoId,
              nome: riga.prodotti.nome,
              azienda_nome: prodInfo?.aziende?.nome || "N/A",
              brand_nome: brandInfo?.name || null,
              prezzo_listino: Number(riga.prodotti.prezzo_listino),
              quantita_venduta: pezzi,
              cartoni_venduti: cartoni,
              fatturato_totale: rigaFatturato,
              ordini_count: 1,
            });
          }

          // Brand KPIs
          if (riga.prodotti.brand_id) {
            const brandId = riga.prodotti.brand_id;
            const existingBrand = brandsMap.get(brandId);
            if (existingBrand) {
              existingBrand.fatturato_totale += rigaFatturato;
              existingBrand.ordini_count += 1;
              existingBrand.quantita_venduta += pezzi;
            } else {
              const brand = brands.find((b) => b.id === brandId);
              brandsMap.set(brandId, {
                id: brandId,
                name: brand?.name || "N/A",
                azienda_nome: brand?.aziende?.nome || null,
                fatturato_totale: rigaFatturato,
                ordini_count: 1,
                quantita_venduta: pezzi,
              });
            }
          }
        });

        cartoniTotali += ordineCartoni;
        pezziTotali += ordinePezzi;
        ordiniPerMeseMap[mese].cartoni += ordineCartoni;
        ordiniPerMeseMap[mese].pezzi += ordinePezzi;

        // Client KPIs
        const clienteId = ordine.cliente_id;
        if (clienteId) {
          const existingCliente = clientiMap.get(clienteId);
          if (existingCliente) {
            existingCliente.fatturato += totaleOrdine;
            existingCliente.ordini_count += 1;
            existingCliente.cartoni_totali += ordineCartoni;
            existingCliente.pezzi_totali += ordinePezzi;
          } else {
            const cliente = clienti.find((c) => c.id === clienteId);
            clientiMap.set(clienteId, {
              id: clienteId,
              nome: cliente?.nome || ordine.clienti?.nome || "N/A",
              azienda: cliente?.azienda || null,
              consorzio: cliente?.consorzio || null,
              citta: cliente?.citta || null,
              fatturato: totaleOrdine,
              fatturato_2025: cliente?.fatturato_2025 || null,
              ordini_count: 1,
              cartoni_totali: ordineCartoni,
              pezzi_totali: ordinePezzi,
              perAzienda: [],
            });
          }
        }

        // Company KPIs
        const aziendaId = ordine.azienda_id;
        if (aziendaId) {
          const existingAzienda = aziendeMap.get(aziendaId);
          if (existingAzienda) {
            existingAzienda.fatturato_totale += totaleOrdine;
            existingAzienda.ordini_count += 1;
            existingAzienda.prodotti_venduti += ordinePezzi;
            existingAzienda.cartoni_venduti += ordineCartoni;
          } else {
            const azienda = aziende.find((a) => a.id === aziendaId);
            aziendeMap.set(aziendaId, {
              id: aziendaId,
              nome: azienda?.nome || ordine.aziende?.nome || "N/A",
              settore: azienda?.settore || null,
              fatturato_totale: totaleOrdine,
              ordini_count: 1,
              prodotti_venduti: ordinePezzi,
              cartoni_venduti: ordineCartoni,
            });
          }
        }

        if (clienteId && aziendaId) {
          if (!clienteAziendaMap.has(clienteId)) clienteAziendaMap.set(clienteId, new Map());
          const perAziendaMap = clienteAziendaMap.get(clienteId)!;
          perAziendaMap.set(aziendaId, (perAziendaMap.get(aziendaId) || 0) + totaleOrdine);
        }
      });

      const scontrinoMedio = ordiniTotali > 0 ? fatturatoTotale / ordiniTotali : 0;
      const scontoMedio = fatturatoTotale > 0 ? scontoNumeratore / fatturatoTotale : 0;
      const scontoCascataMedio = subtotaleRigheTotale > 0 ? scontoRigheNumeratore / subtotaleRigheTotale : 0;
      const scontoMerceMedio = ordiniTotali > 0 ? scontoMerceTotale / ordiniTotali : 0;
      const utileLordo = fatturatoTotale - costoAcquistoTotale;
      const marginePercentuale = fatturatoTotale > 0 ? (utileLordo / fatturatoTotale) * 100 : 0;

      // Sort all KPI arrays by fatturato
      const clientiKPI = Array.from(clientiMap.values())
        .map((c) => {
          const perAziendaMap = clienteAziendaMap.get(c.id);
          const perAzienda = perAziendaMap
            ? Array.from(perAziendaMap.entries())
                .map(([aziendaId, fatturato]) => ({
                  aziendaId,
                  aziendaNome: aziende.find((a) => a.id === aziendaId)?.nome || "N/A",
                  fatturato,
                }))
                .sort((a, b) => b.fatturato - a.fatturato)
            : [];
          return { ...c, perAzienda };
        })
        .sort((a, b) => b.fatturato - a.fatturato);
      const aziendeKPI = Array.from(aziendeMap.values()).sort((a, b) => b.fatturato_totale - a.fatturato_totale);
      const brandsKPI = Array.from(brandsMap.values()).sort((a, b) => b.fatturato_totale - a.fatturato_totale);
      const prodottiKPI = Array.from(prodottiMap.values()).sort((a, b) => b.fatturato_totale - a.fatturato_totale);

      // Top growers / decliners (vs fatturato_2025)
      const conConfronto = clientiKPI
        .filter((c) => (c.fatturato_2025 || 0) > 0)
        .map((c) => ({
          ...c,
          variazione_pct: ((c.fatturato - (c.fatturato_2025 || 0)) / (c.fatturato_2025 || 1)) * 100,
          variazione_eur: c.fatturato - (c.fatturato_2025 || 0),
        }));
      const topGrowers = [...conConfronto].sort((a, b) => b.variazione_pct - a.variazione_pct).slice(0, 5);
      const topDecliners = [...conConfronto].sort((a, b) => a.variazione_pct - b.variazione_pct).slice(0, 5);

      const ordiniPerMese = mesiNomi.map((mese) => {
        const m = ordiniPerMeseMap[mese];
        const utileMese = m.fatturato - m.costoAcquisto;
        return {
          mese,
          fatturato: m.fatturato,
          ordini: m.ordini,
          cartoni: m.cartoni,
          pezzi: m.pezzi,
          costoAcquisto: m.costoAcquisto,
          marginePct: m.fatturato > 0 ? (utileMese / m.fatturato) * 100 : 0,
        };
      });

      // Intensità riordini: solo i clienti coi fatturati più alti (coerente
      // col resto della pagina, ordinati come clientiKPI)
      const reorderHeatmap = clientiKPI.slice(0, 5).map((c) => ({
        clienteId: c.id,
        nome: c.nome,
        mesi: clienteMonthlyMap.get(c.id) || new Array(12).fill(0),
      }));

      const statusDistribuzione = {
        verificati: ordiniVerificati,
        inAttesa: ordiniInAttesa,
        altri: ordiniAltri,
      };

      // Trend vs periodo precedente
      let trendPercentage = 0;
      if (filters.startDate && filters.endDate) {
        const periodLength = filters.endDate.getTime() - filters.startDate.getTime();
        const previousEnd = new Date(filters.startDate.getTime() - 1);
        const previousStart = new Date(previousEnd.getTime() - periodLength);

        const { data: previousOrdini } = await supabase
          .from("ordini")
          .select("totale")
          .not("status","in","(annullato,stand_by)")
          .gte("data_ordine", previousStart.toISOString().split("T")[0])
          .lte("data_ordine", previousEnd.toISOString().split("T")[0]);

        const previousFatturato = (previousOrdini || []).reduce((sum, o) => sum + Number(o.totale), 0);
        if (previousFatturato > 0) {
          trendPercentage = ((fatturatoTotale - previousFatturato) / previousFatturato) * 100;
        }
      }

      // MoM (mese in corso vs mese precedente) - dai dati già caricati per mese
      const now = new Date();
      const currIdx = now.getMonth();
      const prevIdx = (currIdx + 11) % 12;
      const fattCurr = ordiniPerMeseMap[mesiNomi[currIdx]].fatturato;
      const fattPrev = ordiniPerMeseMap[mesiNomi[prevIdx]].fatturato;
      const mom = fattPrev > 0 ? ((fattCurr - fattPrev) / fattPrev) * 100 : 0;

      // YoY (stesso periodo anno scorso) - query dedicata
      let yoy = 0;
      let yoyPrevFatturato = 0;
      if (filters.startDate && filters.endDate) {
        const ys = new Date(filters.startDate); ys.setFullYear(ys.getFullYear() - 1);
        const ye = new Date(filters.endDate); ye.setFullYear(ye.getFullYear() - 1);
        const { data: yoyOrdini } = await supabase
          .from("ordini")
          .select("totale")
          .not("status","in","(annullato,stand_by)")
          .gte("data_ordine", ys.toISOString().split("T")[0])
          .lte("data_ordine", ye.toISOString().split("T")[0]);
        yoyPrevFatturato = (yoyOrdini || []).reduce((s, o) => s + Number(o.totale), 0);
        if (yoyPrevFatturato > 0) {
          yoy = ((fatturatoTotale - yoyPrevFatturato) / yoyPrevFatturato) * 100;
        }
      }

      return {
        fatturatoTotale,
        ordiniTotali,
        cartoniTotali,
        pezziTotali,
        scontrinoMedio,
        scontoMedio,
        scontoCascataMedio,
        scontoMerceMedio,
        costoAcquistoTotale,
        utileLordo,
        marginePercentuale,
        trendPercentage,
        mom,
        yoy,
        yoyPrevFatturato,
        clientiKPI,
        aziendeKPI,
        brandsKPI,
        prodottiKPI,
        topGrowers,
        topDecliners,
        ordiniPerMese,
        statusDistribuzione,
        reorderHeatmap,
        // Options for filters
        allClienti: clienti || [],
        allAziende: aziende || [],
        allBrands: brands || [],
      };
    },
  });
}
