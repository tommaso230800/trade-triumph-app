import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type ClienteMap = {
  id: string;
  nome: string;
  indirizzo: string | null;
  citta: string | null;
  latitudine: number | null;
  longitudine: number | null;
  zona: string | null;
  priorita: string | null;
  fatturato: number | null;
};

export function useClientiMappa() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["clienti-mappa", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ClienteMap[]> => {
      const { data, error } = await (supabase as any)
        .from("clienti")
        .select("id, nome, indirizzo, citta, latitudine, longitudine, zona, priorita, fatturato, deleted_at")
        .is("deleted_at", null);
      if (error) throw error;
      return (data ?? []) as ClienteMap[];
    },
  });
}

// Geocoding via Nominatim (OpenStreetMap) — no key required, use responsibly
export async function geocodeAddress(query: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const r = await fetch(url, { headers: { "Accept-Language": "it" } });
    if (!r.ok) return null;
    const arr = await r.json();
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return { lat: parseFloat(arr[0].lat), lon: parseFloat(arr[0].lon) };
  } catch {
    return null;
  }
}

export function useGeocodeMissing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clienti: ClienteMap[]) => {
      const missing = clienti.filter((c) => (c.indirizzo || c.citta) && (c.latitudine === null || c.longitudine === null));
      let done = 0;
      for (const c of missing.slice(0, 20)) {
        const q = [c.indirizzo, c.citta, "Italia"].filter(Boolean).join(", ");
        const res = await geocodeAddress(q);
        if (res) {
          await (supabase as any).from("clienti")
            .update({ latitudine: res.lat, longitudine: res.lon, geocoded_at: new Date().toISOString() })
            .eq("id", c.id);
          done++;
        }
        await new Promise((r) => setTimeout(r, 1100)); // rispetta rate limit Nominatim
      }
      return done;
    },
    onSuccess: (n) => {
      toast.success(`Geocodificati ${n} clienti`);
      qc.invalidateQueries({ queryKey: ["clienti-mappa"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// Nearest-neighbor route optimization
export function optimizeRoute(points: ClienteMap[], startLat: number, startLon: number): ClienteMap[] {
  const remaining = points.filter((p) => p.latitudine !== null && p.longitudine !== null);
  const route: ClienteMap[] = [];
  let curLat = startLat;
  let curLon = startLon;
  while (remaining.length) {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const dLat = remaining[i].latitudine! - curLat;
      const dLon = remaining[i].longitudine! - curLon;
      const d = dLat * dLat + dLon * dLon;
      if (d < bestD) { bestD = d; best = i; }
    }
    const next = remaining.splice(best, 1)[0];
    route.push(next);
    curLat = next.latitudine!;
    curLon = next.longitudine!;
  }
  return route;
}
