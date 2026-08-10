import { useMemo } from "react";
import { useOrdini } from "@/hooks/useOrdini";
import { useAziende } from "@/hooks/useAziende";
import { useClienti } from "@/hooks/useClienti";
import { useScadenziario, ScadenziarioFattura } from "@/hooks/useScadenziario";
import { useMovimentiProvvigione } from "@/hooks/useRiconciliazione";

export type PeriodoFilter =
  | { tipo: "mese"; year: number; month: number }
  | { tipo: "trimestre"; year: number; quarter: 1 | 2 | 3 | 4 }
  | { tipo: "anno"; year: number }
  | { tipo: "tutti" };

export interface ProvvigioniFilters {
  aziendaId: string | "tutte";
  clienteId: string | "tutti";
  periodo: PeriodoFilter;
  search?: string;
}

export interface ProvvigioneRow {
  id: string;
  source: "ordine" | "fattura" | "movimento";
  data: string; // ISO
  numero: string;
  aziendaId: string | null;
  aziendaNome: string;
  clienteId: string | null;
  clienteNome: string;
  imponibile: number;
  sconto: number;
  netto: number;
  percentualeProvv: number;
  provvigioneMaturata: number;
  provvigionePagata: number;
  statoProvvigione: "da_pagare" | "pagata" | "parziale" | "contestazione" | "scaduta";
  dataPrevistaPagamento: string | null;
  dataEffettivaPagamento: string | null;
  giorniRitardo: number;
  metodoPagamento: string | null;
  note: string | null;
  scadenziarioId?: string;
  ordineId?: string;
  trimestrePagamento: number | null;
  annoPagamento: number | null;
}

const inPeriodo = (dateStr: string, p: PeriodoFilter): boolean => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  if (p.tipo === "tutti") return true;
  if (d.getFullYear() !== p.year) return false;
  if (p.tipo === "anno") return true;
  if (p.tipo === "mese") return d.getMonth() === p.month;
  if (p.tipo === "trimestre") {
    const q = Math.floor(d.getMonth() / 3) + 1;
    return q === p.quarter;
  }
  return true;
};

const diffDays = (a: Date, b: Date) =>
  Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));

export function useProvvigioniAnalytics(filters: ProvvigioniFilters) {
  const { data: ordini } = useOrdini();
  const { data: aziende } = useAziende();
  const { data: clienti } = useClienti();
  const { fattureIncassate, fattureScadute } = useScadenziario();
  const { data: movimenti } = useMovimentiProvvigione();

  // Row unificate: ogni riga = una potenziale provvigione (da ordine o da fattura scadenziario)
  const allRows = useMemo<ProvvigioneRow[]>(() => {
    if (!ordini || !aziende) return [];

    const aziendaById = new Map(aziende.map((a) => [a.id, a]));

    const fromOrdini: ProvvigioneRow[] = ordini
      .filter((o) => o.status !== "annullato" && o.status !== "stand_by")
      .map((o) => {
        const azienda = o.azienda_id ? aziendaById.get(o.azienda_id) : null;
        const pct = azienda?.provvigione_percentuale || 0;
        const totale = Number(o.totale) || 0;
        const provv = totale * (pct / 100);
        const stato = o.stato_provvigione || (o.provvigione_pagata ? "pagata" : "da_pagare");
        const importoRegistrato = Number(o.importo_provvigione_pagata) || 0;
        const provvPagata = stato === "pagata" || o.provvigione_pagata
          ? (importoRegistrato || provv)
          : stato === "parziale"
          ? importoRegistrato
          : 0;
        const baseDate = new Date(o.data_ordine || o.created_at);
        const ritardo = stato === "scaduta" && !isNaN(baseDate.getTime())
          ? Math.max(0, diffDays(new Date(), baseDate))
          : 0;
        return {
          id: `ord-${o.id}`,
          ordineId: o.id,
          source: "ordine" as const,
          // Stessa catena di fallback di metricsEngine.orderDate: data_ordine,
          // poi data_conferma, infine created_at. Prima mancava data_conferma:
          // un ordine con data_ordine nullo finiva nel mese sbagliato rispetto
          // a come lo bucketizzano KPI/Dashboard.
          data: o.data_ordine || o.data_conferma || o.created_at,
          numero: o.codice,
          aziendaId: o.azienda_id,
          aziendaNome: azienda?.nome || "—",
          clienteId: o.cliente_id,
          clienteNome: o.clienti?.nome || "—",
          imponibile: totale,
          sconto: Number(o.sconto) || 0,
          netto: totale,
          percentualeProvv: pct,
          provvigioneMaturata: provv,
          provvigionePagata: provvPagata,
          statoProvvigione: stato as any,
          dataPrevistaPagamento: stato === "scaduta" ? (o.data_ordine || o.created_at) : null,
          dataEffettivaPagamento: o.data_incasso_provvigione,
          giorniRitardo: ritardo,
          metodoPagamento: o.metodo_pagamento_provvigione,
          note: o.note_provvigione || o.note,
          trimestrePagamento: (o as any).trimestre_pagamento ?? null,
          annoPagamento: (o as any).anno_pagamento ?? null,
        };
      });

    const allFatture = [...fattureIncassate, ...fattureScadute];
    const fromFatture: ProvvigioneRow[] = allFatture.map((f: ScadenziarioFattura) => {
      const stato = f.stato_provvigione || (f.provvigione_incassata ? "pagata" : "da_pagare");
      const provvMaturata = Number(f.provvigione_calcolata) || 0;
      const importoRegistrato = Number(f.importo_provvigione_pagata) || 0;
      const provvPagata = stato === "pagata" || f.provvigione_incassata
        ? (importoRegistrato || provvMaturata)
        : stato === "parziale"
        ? importoRegistrato
        : 0;
      const scadenza = f.data_scadenza ? new Date(f.data_scadenza) : null;
      const pagamento = f.data_incasso_provvigione ? new Date(f.data_incasso_provvigione) : null;
      const ritardo =
        stato === "pagata" && scadenza && pagamento
          ? Math.max(0, diffDays(pagamento, scadenza))
          : scadenza && stato !== "pagata"
          ? Math.max(0, diffDays(new Date(), scadenza))
          : 0;
      return {
        id: `sc-${f.id}`,
        scadenziarioId: f.id,
        source: "fattura" as const,
        data: f.data_incasso || f.data_fattura,
        numero: f.numero_fattura,
        aziendaId: f.azienda_id,
        aziendaNome: f.azienda_nome,
        clienteId: f.cliente_id,
        clienteNome: f.cliente_nome,
        imponibile: Number(f.importo) || 0,
        sconto: 0,
        netto: Number(f.importo) || 0,
        percentualeProvv: Number(f.percentuale_provvigione) || 0,
        provvigioneMaturata: provvMaturata,
        provvigionePagata: provvPagata,
        statoProvvigione: stato as any,
        dataPrevistaPagamento: f.data_scadenza,
        dataEffettivaPagamento: f.data_incasso_provvigione,
        giorniRitardo: ritardo,
        metodoPagamento: f.metodo_pagamento_provvigione,
        note: f.note_provvigione,
        trimestrePagamento: (f as any).trimestre_pagamento ?? null,
        annoPagamento: (f as any).anno_pagamento ?? null,
      };
    });

    const fromMovimenti: ProvvigioneRow[] = (movimenti || []).map((m: any) => {
      const azienda = m.azienda_id ? aziendaById.get(m.azienda_id) : null;
      const importo = Number(m.importo) || 0;
      const stato = (m.stato || "pagata") as any;
      return {
        id: `mv-${m.id}`,
        source: "movimento" as const,
        data: m.data_pagamento || m.created_at,
        numero: (m.tipo || "movimento").toUpperCase(),
        aziendaId: m.azienda_id,
        aziendaNome: azienda?.nome || m.aziende?.nome || "—",
        clienteId: null,
        clienteNome: m.descrizione || "Movimento provvigionale",
        imponibile: 0,
        sconto: 0,
        netto: 0,
        percentualeProvv: 0,
        provvigioneMaturata: importo,
        provvigionePagata: stato === "pagata" ? importo : stato === "parziale" ? importo : 0,
        statoProvvigione: stato,
        dataPrevistaPagamento: null,
        dataEffettivaPagamento: m.data_pagamento,
        giorniRitardo: 0,
        metodoPagamento: m.metodo_pagamento,
        note: m.note,
        trimestrePagamento: m.trimestre_pagamento ?? (m.data_pagamento ? Math.floor(new Date(m.data_pagamento).getMonth() / 3) + 1 : null),
        annoPagamento: m.anno_pagamento ?? (m.data_pagamento ? new Date(m.data_pagamento).getFullYear() : null),
      };
    });

    return [...fromOrdini, ...fromFatture, ...fromMovimenti].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    );
  }, [ordini, aziende, fattureIncassate, fattureScadute, movimenti]);

  const filteredRows = useMemo(() => {
    const term = (filters.search || "").trim().toLowerCase();
    return allRows.filter((r) => {
      if (filters.aziendaId !== "tutte" && r.aziendaId !== filters.aziendaId) return false;
      if (filters.clienteId !== "tutti" && r.clienteId !== filters.clienteId) return false;
      if (!inPeriodo(r.data, filters.periodo)) return false;
      if (term) {
        const hay = `${r.numero} ${r.aziendaNome} ${r.clienteNome} ${r.note || ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [allRows, filters]);

  // KPI
  const kpi = useMemo(() => {
    const provvigioniMaturate = filteredRows.reduce((s, r) => s + r.provvigioneMaturata, 0);
    const provvigioniLiquidate = filteredRows
      .filter((r) => r.statoProvvigione === "pagata" || r.statoProvvigione === "parziale")
      .reduce((s, r) => s + r.provvigionePagata, 0);
    const provvigioniDaIncassare = provvigioniMaturate - provvigioniLiquidate;
    const fatturato = filteredRows.reduce((s, r) => s + r.netto, 0);
    const nOrdini = filteredRows.length;
    const ticketMedio = nOrdini > 0 ? fatturato / nOrdini : 0;
    const pctMediaProvv = fatturato > 0 ? (provvigioniMaturate / fatturato) * 100 : 0;

    // MoM / YoY su tutte le righe
    const now = new Date();
    const mese = now.getMonth();
    const anno = now.getFullYear();
    const sumProvv = (y: number, m: number) =>
      allRows
        .filter((r) => {
          const d = new Date(r.data);
          return d.getFullYear() === y && d.getMonth() === m;
        })
        .reduce((s, r) => s + r.provvigioneMaturata, 0);

    const provvMese = sumProvv(anno, mese);
    const provvMesePrec = sumProvv(mese === 0 ? anno - 1 : anno, mese === 0 ? 11 : mese - 1);
    const provvMeseAnnoPrec = sumProvv(anno - 1, mese);

    const growthMoM = provvMesePrec > 0 ? ((provvMese - provvMesePrec) / provvMesePrec) * 100 : 0;
    const growthYoY = provvMeseAnnoPrec > 0 ? ((provvMese - provvMeseAnnoPrec) / provvMeseAnnoPrec) * 100 : 0;

    // Obiettivo mensile: media ultimi 12 mesi
    const ultimi12: number[] = [];
    for (let i = 1; i <= 12; i++) {
      const d = new Date(anno, mese - i, 1);
      ultimi12.push(sumProvv(d.getFullYear(), d.getMonth()));
    }
    const obiettivoMensile = ultimi12.filter((v) => v > 0).length
      ? ultimi12.reduce((a, b) => a + b, 0) / 12
      : 0;
    const completamentoObiettivo = obiettivoMensile > 0 ? (provvMese / obiettivoMensile) * 100 : 0;

    return {
      provvigioniMaturate,
      provvigioniLiquidate,
      provvigioniDaIncassare,
      fatturato,
      nOrdini,
      ticketMedio,
      pctMediaProvv,
      growthMoM,
      growthYoY,
      provvMese,
      provvMesePrec,
      provvMeseAnnoPrec,
      obiettivoMensile,
      completamentoObiettivo,
    };
  }, [filteredRows, allRows]);

  // Liquidato per trimestre di PAGAMENTO (indipendente dalla data ordine)
  const perTrimestrePagamento = useMemo(() => {
    const trims: Record<number, { trimestre: number; liquidato: number; conteggio: number }> = {
      1: { trimestre: 1, liquidato: 0, conteggio: 0 },
      2: { trimestre: 2, liquidato: 0, conteggio: 0 },
      3: { trimestre: 3, liquidato: 0, conteggio: 0 },
      4: { trimestre: 4, liquidato: 0, conteggio: 0 },
    };
    filteredRows.forEach((r) => {
      if (!r.trimestrePagamento) return;
      if (r.statoProvvigione !== "pagata" && r.statoProvvigione !== "parziale") return;
      const t = trims[r.trimestrePagamento];
      if (!t) return;
      t.liquidato += r.provvigionePagata;
      t.conteggio += 1;
    });
    return [trims[1], trims[2], trims[3], trims[4]];
  }, [filteredRows]);



  // Conto Economico Personale
  const contoEconomico = useMemo(() => {
    const now = new Date();
    const oggi = now.toISOString().slice(0, 10);
    const anno = now.getFullYear();
    const mese = now.getMonth();
    const giornoDelMese = now.getDate();
    const ultimoGiorno = new Date(anno, mese + 1, 0).getDate();

    const sameYearAziendaFilter = (r: ProvvigioneRow) =>
      filters.aziendaId === "tutte" || r.aziendaId === filters.aziendaId;

    const rowsFiltered = allRows.filter(sameYearAziendaFilter);

    const guadagnoOggi = rowsFiltered
      .filter((r) => r.data.startsWith(oggi))
      .reduce((s, r) => s + r.provvigioneMaturata, 0);

    const meseRows = rowsFiltered.filter((r) => {
      const d = new Date(r.data);
      return d.getFullYear() === anno && d.getMonth() === mese;
    });
    const guadagnoMese = meseRows.reduce((s, r) => s + r.provvigioneMaturata, 0);

    const annoRows = rowsFiltered.filter((r) => new Date(r.data).getFullYear() === anno);
    const guadagnoAnno = annoRows.reduce((s, r) => s + r.provvigioneMaturata, 0);

    const mediaGiornaliera = guadagnoMese / Math.max(1, giornoDelMese);
    const previsioneFineMese = mediaGiornaliera * ultimoGiorno;

    return {
      guadagnoOggi,
      guadagnoMese,
      guadagnoAnno,
      mediaGiornaliera,
      previsioneFineMese,
      giornoDelMese,
      ultimoGiorno,
    };
  }, [allRows, filters.aziendaId]);

  // Serie storica 24 mesi
  const serieMensile = useMemo(() => {
    const now = new Date();
    const arr: { mese: string; provvigioni: number; fatturato: number }[] = [];
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("it-IT", { month: "short", year: "2-digit" });
      const rows = allRows.filter((r) => {
        if (filters.aziendaId !== "tutte" && r.aziendaId !== filters.aziendaId) return false;
        return r.data.startsWith(key);
      });
      arr.push({
        mese: label,
        provvigioni: rows.reduce((s, r) => s + r.provvigioneMaturata, 0),
        fatturato: rows.reduce((s, r) => s + r.netto, 0),
      });
    }
    return arr;
  }, [allRows, filters.aziendaId]);

  // Ripartizione per azienda (nel periodo filtrato)
  const perAzienda = useMemo(() => {
    const map = new Map<string, { nome: string; fatturato: number; provvigioni: number; ordini: number; clienti: Set<string> }>();
    filteredRows.forEach((r) => {
      const key = r.aziendaId || "n-a";
      if (!map.has(key)) map.set(key, { nome: r.aziendaNome, fatturato: 0, provvigioni: 0, ordini: 0, clienti: new Set() });
      const v = map.get(key)!;
      v.fatturato += r.netto;
      v.provvigioni += r.provvigioneMaturata;
      v.ordini += 1;
      if (r.clienteId) v.clienti.add(r.clienteId);
    });
    const totale = Array.from(map.values()).reduce((s, v) => s + v.provvigioni, 0);
    return Array.from(map.entries()).map(([id, v]) => ({
      id,
      nome: v.nome,
      fatturato: v.fatturato,
      provvigioni: v.provvigioni,
      ordini: v.ordini,
      clienti: v.clienti.size,
      mediaOrdine: v.ordini > 0 ? v.fatturato / v.ordini : 0,
      incidenza: totale > 0 ? (v.provvigioni / totale) * 100 : 0,
    })).sort((a, b) => b.provvigioni - a.provvigioni);
  }, [filteredRows]);

  // Ripartizione per cliente
  const perCliente = useMemo(() => {
    const map = new Map<string, { nome: string; fatturato: number; provvigioni: number; ordini: number; ultimo: string }>();
    filteredRows.forEach((r) => {
      const key = r.clienteId || `n-${r.clienteNome}`;
      if (!map.has(key)) map.set(key, { nome: r.clienteNome, fatturato: 0, provvigioni: 0, ordini: 0, ultimo: r.data });
      const v = map.get(key)!;
      v.fatturato += r.netto;
      v.provvigioni += r.provvigioneMaturata;
      v.ordini += 1;
      if (new Date(r.data) > new Date(v.ultimo)) v.ultimo = r.data;
    });
    const now = new Date();
    return Array.from(map.entries()).map(([id, v]) => {
      const giorniInattivo = Math.floor((now.getTime() - new Date(v.ultimo).getTime()) / (1000 * 60 * 60 * 24));
      return {
        id,
        nome: v.nome,
        fatturato: v.fatturato,
        provvigioni: v.provvigioni,
        ordini: v.ordini,
        mediaOrdine: v.ordini > 0 ? v.fatturato / v.ordini : 0,
        ultimoOrdine: v.ultimo,
        giorniInattivo,
      };
    }).sort((a, b) => b.fatturato - a.fatturato);
  }, [filteredRows]);

  // Heatmap mese × anno con media annuale e classificazione basso/medio/alto
  const heatmap = useMemo(() => {
    const anni = new Set<number>();
    allRows.forEach((r) => {
      if (filters.aziendaId !== "tutte" && r.aziendaId !== filters.aziendaId) return;
      anni.add(new Date(r.data).getFullYear());
    });
    const anniArr = Array.from(anni).sort((a, b) => b - a).slice(0, 4);
    return anniArr.map((anno) => {
      const mesi = Array.from({ length: 12 }, (_, m) =>
        allRows
          .filter((r) => {
            if (filters.aziendaId !== "tutte" && r.aziendaId !== filters.aziendaId) return false;
            const d = new Date(r.data);
            return d.getFullYear() === anno && d.getMonth() === m;
          })
          .reduce((s, r) => s + r.provvigioneMaturata, 0)
      );
      const fatturato = Array.from({ length: 12 }, (_, m) =>
        allRows
          .filter((r) => {
            if (filters.aziendaId !== "tutte" && r.aziendaId !== filters.aziendaId) return false;
            const d = new Date(r.data);
            return d.getFullYear() === anno && d.getMonth() === m;
          })
          .reduce((s, r) => s + r.netto, 0)
      );
      const attivi = mesi.filter((v) => v > 0);
      const media = attivi.length ? attivi.reduce((a, b) => a + b, 0) / attivi.length : 0;
      return { anno, mesi, fatturato, media };
    });
  }, [allRows, filters.aziendaId]);

  // Dettaglio completo mese × anno (per pannello laterale)
  const getMonthlyDetail = (anno: number, mese: number) => {
    const inMese = (r: ProvvigioneRow) => {
      if (filters.aziendaId !== "tutte" && r.aziendaId !== filters.aziendaId) return false;
      const d = new Date(r.data);
      return d.getFullYear() === anno && d.getMonth() === mese;
    };
    const rows = allRows.filter(inMese);
    const provvigioniMaturate = rows.reduce((s, r) => s + r.provvigioneMaturata, 0);
    const provvigioniPagate = rows.filter((r) => r.statoProvvigione === "pagata" || r.statoProvvigione === "parziale").reduce((s, r) => s + r.provvigionePagata, 0);
    const provvigioniNonPagate = rows.filter((r) => r.statoProvvigione === "da_pagare").reduce((s, r) => s + r.provvigioneMaturata, 0);
    const provvigioniScadute = rows.filter((r) => r.statoProvvigione === "scaduta").reduce((s, r) => s + r.provvigioneMaturata, 0);
    const provvigioniContestazione = rows.filter((r) => r.statoProvvigione === "contestazione").reduce((s, r) => s + r.provvigioneMaturata, 0);
    const provvigioniInRitardo = rows.filter((r) => r.giorniRitardo > 0 && r.statoProvvigione !== "pagata").reduce((s, r) => s + r.provvigioneMaturata, 0);
    const fatturato = rows.reduce((s, r) => s + r.netto, 0);
    const fatture = rows.filter((r) => r.source === "fattura").length;
    const nOrdini = rows.length;
    const ticketMedio = nOrdini > 0 ? fatturato / nOrdini : 0;
    const pctMediaProvv = fatturato > 0 ? (provvigioniMaturate / fatturato) * 100 : 0;

    // Ripartizione per azienda
    const perAziendaMap = new Map<string, { nome: string; provvigioni: number; fatturato: number; ordini: number }>();
    rows.forEach((r) => {
      const k = r.aziendaId || `n-${r.aziendaNome}`;
      if (!perAziendaMap.has(k)) perAziendaMap.set(k, { nome: r.aziendaNome, provvigioni: 0, fatturato: 0, ordini: 0 });
      const v = perAziendaMap.get(k)!;
      v.provvigioni += r.provvigioneMaturata;
      v.fatturato += r.netto;
      v.ordini += 1;
    });
    const aziendeMese = Array.from(perAziendaMap.values());
    const miglioreAzienda = [...aziendeMese].sort((a, b) => b.fatturato - a.fatturato)[0] || null;
    const aziendaTopProvv = [...aziendeMese].sort((a, b) => b.provvigioni - a.provvigioni)[0] || null;

    // Ripartizione per cliente
    const perClienteMap = new Map<string, { nome: string; provvigioni: number; fatturato: number; ordini: number }>();
    rows.forEach((r) => {
      const k = r.clienteId || `n-${r.clienteNome}`;
      if (!perClienteMap.has(k)) perClienteMap.set(k, { nome: r.clienteNome, provvigioni: 0, fatturato: 0, ordini: 0 });
      const v = perClienteMap.get(k)!;
      v.provvigioni += r.provvigioneMaturata;
      v.fatturato += r.netto;
      v.ordini += 1;
    });
    const clientiMese = Array.from(perClienteMap.values());
    const miglioreCliente = [...clientiMese].sort((a, b) => b.provvigioni - a.provvigioni)[0] || null;
    const clienteTopFatturato = [...clientiMese].sort((a, b) => b.fatturato - a.fatturato)[0] || null;

    // Ripartizione per stato
    const perStato = [
      { stato: "Pagata", key: "pagata", value: rows.filter((r) => r.statoProvvigione === "pagata").reduce((s, r) => s + r.provvigioneMaturata, 0) },
      { stato: "Non pagata", key: "da_pagare", value: provvigioniNonPagate },
      { stato: "Scaduta", key: "scaduta", value: provvigioniScadute },
      { stato: "Parziale", key: "parziale", value: rows.filter((r) => r.statoProvvigione === "parziale").reduce((s, r) => s + r.provvigioneMaturata, 0) },
      { stato: "Contestazione", key: "contestazione", value: provvigioniContestazione },
    ].filter((s) => s.value > 0);

    // Andamento giornaliero
    const giorniInMese = new Date(anno, mese + 1, 0).getDate();
    const giornaliero = Array.from({ length: giorniInMese }, (_, i) => {
      const g = i + 1;
      const key = `${anno}-${String(mese + 1).padStart(2, "0")}-${String(g).padStart(2, "0")}`;
      const daily = rows.filter((r) => r.data.startsWith(key));
      return {
        giorno: String(g),
        provvigioni: daily.reduce((s, r) => s + r.provvigioneMaturata, 0),
        fatturato: daily.reduce((s, r) => s + r.netto, 0),
      };
    });
    const giorniTop = [...giornaliero].sort((a, b) => b.fatturato - a.fatturato).slice(0, 3).filter((g) => g.fatturato > 0);

    // MoM e YoY
    const sumProv = (y: number, m: number) =>
      allRows
        .filter((r) => {
          if (filters.aziendaId !== "tutte" && r.aziendaId !== filters.aziendaId) return false;
          const d = new Date(r.data);
          return d.getFullYear() === y && d.getMonth() === m;
        })
        .reduce((s, r) => s + r.provvigioneMaturata, 0);
    const prev = sumProv(mese === 0 ? anno - 1 : anno, mese === 0 ? 11 : mese - 1);
    const prevY = sumProv(anno - 1, mese);
    const growthMoM = prev > 0 ? ((provvigioniMaturate - prev) / prev) * 100 : null;
    const growthYoY = prevY > 0 ? ((provvigioniMaturate - prevY) / prevY) * 100 : null;

    return {
      anno, mese,
      provvigioniMaturate, provvigioniPagate, provvigioniNonPagate, provvigioniScadute, provvigioniContestazione, provvigioniInRitardo,
      fatturato, fatture, nOrdini, ticketMedio, pctMediaProvv,
      miglioreAzienda, aziendaTopProvv, miglioreCliente, clienteTopFatturato,
      aziendeMese: aziendeMese.sort((a, b) => b.provvigioni - a.provvigioni).slice(0, 8),
      perStato, giornaliero, giorniTop,
      growthMoM, growthYoY,
    };
  };


  // Andamento giornaliero mese corrente + previsione
  const seriaGiornaliera = useMemo(() => {
    const now = new Date();
    const anno = now.getFullYear();
    const mese = now.getMonth();
    const ultimoGiorno = new Date(anno, mese + 1, 0).getDate();
    let cumul = 0;
    return Array.from({ length: ultimoGiorno }, (_, i) => {
      const giorno = i + 1;
      const key = `${anno}-${String(mese + 1).padStart(2, "0")}-${String(giorno).padStart(2, "0")}`;
      const val = allRows
        .filter((r) => {
          if (filters.aziendaId !== "tutte" && r.aziendaId !== filters.aziendaId) return false;
          return r.data.startsWith(key);
        })
        .reduce((s, r) => s + r.provvigioneMaturata, 0);
      if (giorno <= now.getDate()) cumul += val;
      return {
        giorno: String(giorno),
        valore: giorno <= now.getDate() ? val : null,
        cumulato: giorno <= now.getDate() ? cumul : null,
      };
    });
  }, [allRows, filters.aziendaId]);

  return {
    allRows,
    filteredRows,
    kpi,
    contoEconomico,
    serieMensile,
    perAzienda,
    perCliente,
    heatmap,
    getMonthlyDetail,
    seriaGiornaliera,
    aziende,
    clienti,
    perTrimestrePagamento,
  };
}
