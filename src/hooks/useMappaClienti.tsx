import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type StatoCommerciale = "attivo" | "a_rischio" | "inattivo" | "senza_ordini";

export type ClienteMappa = {
  id: string;
  nome: string;
  indirizzo: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
  telefono: string | null;
  consorzio: string | null;
  lat: number;
  lng: number;
  fatturato: number;
  ordiniCount: number;
  ultimoOrdine: string | null;
  giorniUltimoOrdine: number | null;
  ultimaVisita: string | null;
  giorniUltimaVisita: number | null;
  aziende: string[];
  aziendeIds: string[];
  insoluto: number;
  stato: StatoCommerciale;
};

const ESCLUSI = ["annullato", "stand_by"];

function giorniDa(data: string | null): number | null {
  if (!data) return null;
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

/** Dati geografici + intelligence commerciale per la mappa clienti. */
export function useMappaClienti() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["mappa-clienti", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const [clientiRes, ordiniRes, aziendeRes, visiteRes, scadenzeRes] = await Promise.all([
        supabase
          .from("clienti")
          .select(
            "id, nome, indirizzo, cap, citta, provincia, telefono, consorzio, latitudine, longitudine, fatturato, ordini_count",
          )
          .is("deleted_at", null),
        supabase
          .from("ordini")
          .select("cliente_id, azienda_id, data_ordine, totale, status")
          .is("deleted_at", null),
        supabase.from("aziende").select("id, nome").is("deleted_at", null),
        supabase.from("client_visits").select("client_id, data_visita"),
        supabase
          .from("scadenziario_fatture")
          .select("cliente_id, importo, data_scadenza, stato"),
      ]);

      const err =
        clientiRes.error || ordiniRes.error || aziendeRes.error || visiteRes.error || scadenzeRes.error;
      if (err) throw new Error(err.message);

      return {
        clienti: clientiRes.data ?? [],
        ordini: (ordiniRes.data ?? []).filter((o) => !ESCLUSI.includes(String(o.status))),
        aziende: aziendeRes.data ?? [],
        visite: visiteRes.data ?? [],
        scadenze: scadenzeRes.data ?? [],
      };
    },
  });

  const clienti = useMemo<ClienteMappa[]>(() => {
    const d = query.data;
    if (!d) return [];

    const nomeAzienda = new Map(d.aziende.map((a) => [a.id, a.nome]));
    const perCliente = new Map<
      string,
      { ultimo: string | null; aziende: Set<string>; aziendeIds: Set<string>; count: number }
    >();

    for (const o of d.ordini) {
      if (!o.cliente_id) continue;
      const cur =
        perCliente.get(o.cliente_id) ??
        { ultimo: null as string | null, aziende: new Set<string>(), aziendeIds: new Set<string>(), count: 0 };
      cur.count += 1;
      if (o.data_ordine && (!cur.ultimo || o.data_ordine > cur.ultimo)) cur.ultimo = o.data_ordine;
      if (o.azienda_id) {
        cur.aziendeIds.add(o.azienda_id);
        const n = nomeAzienda.get(o.azienda_id);
        if (n) cur.aziende.add(n);
      }
      perCliente.set(o.cliente_id, cur);
    }

    const ultimaVisita = new Map<string, string>();
    for (const v of d.visite) {
      if (!v.client_id || !v.data_visita) continue;
      const cur = ultimaVisita.get(v.client_id);
      if (!cur || v.data_visita > cur) ultimaVisita.set(v.client_id, v.data_visita);
    }

    const oggi = new Date().toISOString().slice(0, 10);
    const insoluti = new Map<string, number>();
    for (const s of d.scadenze) {
      if (!s.cliente_id) continue;
      const incassata = String(s.stato ?? "").toLowerCase().includes("incass");
      if (incassata) continue;
      if (!s.data_scadenza || s.data_scadenza >= oggi) continue;
      insoluti.set(s.cliente_id, (insoluti.get(s.cliente_id) ?? 0) + Number(s.importo ?? 0));
    }

    return d.clienti
      .filter((c) => c.latitudine !== null && c.longitudine !== null)
      .map((c) => {
        const agg = perCliente.get(c.id);
        const giorni = giorniDa(agg?.ultimo ?? null);
        const visita = ultimaVisita.get(c.id) ?? null;
        let stato: StatoCommerciale = "senza_ordini";
        if (giorni !== null) {
          stato = giorni > 180 ? "inattivo" : giorni > 90 ? "a_rischio" : "attivo";
        }
        return {
          id: c.id,
          nome: c.nome,
          indirizzo: c.indirizzo,
          cap: c.cap,
          citta: c.citta,
          provincia: c.provincia,
          telefono: c.telefono,
          consorzio: c.consorzio,
          lat: Number(c.latitudine),
          lng: Number(c.longitudine),
          fatturato: Number(c.fatturato ?? 0),
          ordiniCount: agg?.count ?? Number(c.ordini_count ?? 0),
          ultimoOrdine: agg?.ultimo ?? null,
          giorniUltimoOrdine: giorni,
          ultimaVisita: visita,
          giorniUltimaVisita: giorniDa(visita),
          aziende: agg ? Array.from(agg.aziende).sort() : [],
          aziendeIds: agg ? Array.from(agg.aziendeIds) : [],
          insoluto: insoluti.get(c.id) ?? 0,
          stato,
        };
      });
  }, [query.data]);

  const senzaCoordinate = useMemo(() => {
    const d = query.data;
    if (!d) return 0;
    return d.clienti.filter(
      (c) => (c.latitudine === null || c.longitudine === null) && (c.indirizzo || c.citta),
    ).length;
  }, [query.data]);

  return { ...query, clienti, senzaCoordinate };
}

/** Distanza in km fra due coordinate (formula dell'emisenoverso). */
export function distanzaKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
