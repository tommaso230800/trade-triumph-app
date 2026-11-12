import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type CategoriaNotifica = "nuovo_ordine" | "ordine_inviato" | "riordino" | "test";
export const CATEGORIE_PREFERENZE: Array<{ id: Exclude<CategoriaNotifica, "test">; label: string; help: string }> = [
  { id: "nuovo_ordine", label: "Nuovi ordini", help: "Quando un ordine viene salvato e confermato" },
  { id: "ordine_inviato", label: "Ordini inviati", help: "Quando l’invio all’azienda è accettato dal servizio email" },
  { id: "riordino", label: "Riordini in ritardo", help: "Una volta per ciclo cliente–azienda, al superamento della scadenza" },
];

export interface Notifica {
  id: string; categoria: CategoriaNotifica; titolo: string; testo: string; link: string | null;
  ordine_id: string | null; cliente_id: string | null; azienda_id: string | null;
  cliente_nome: string | null; azienda_nome: string | null; importo: number | null;
  metadata: Record<string, unknown>; push_mode: "push" | "silenzioso"; created_at: string; read_at: string | null;
}

export interface Dispositivo {
  id: string; nome: string | null; endpoint: string; enabled: boolean; disabled_reason: string | null; piattaforma: string | null;
  created_at: string; last_seen_at: string | null; last_accepted_at: string | null; last_received_at: string | null;
  last_error: string | null; last_error_at: string | null;
}

const LIST_KEY = "notifiche";

/** Live updates for the signed-in user's own notifications (new events and reads from other devices). */
export function useNotificheRealtime() {
  const { user } = useAuth();
  const qc = useQueryClient();
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifiche-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifiche", filter: `recipient_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: [LIST_KEY] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);
}

export function useNotifiche() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [LIST_KEY, "list", user?.id],
    enabled: !!user,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<Notifica[]> => {
      const { data, error } = await supabase.from("notifiche").select("*").eq("recipient_id", user!.id)
        .order("created_at", { ascending: false }).limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as Notifica[];
    },
  });
}

export function useUnreadCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [LIST_KEY, "unread", user?.id],
    enabled: !!user,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchInterval: 120_000,
    queryFn: async () => {
      const { count, error } = await supabase.from("notifiche").select("id", { count: "exact", head: true })
        .eq("recipient_id", user!.id).is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useMarkRead() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[] | "all") => {
      let q = supabase.from("notifiche").update({ read_at: new Date().toISOString() }).eq("recipient_id", user!.id).is("read_at", null);
      if (ids !== "all") { if (!ids.length) return; q = q.in("id", ids); }
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}

export function usePreferenze() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [LIST_KEY, "pref", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("notifiche_preferenze").select("categoria,enabled").eq("user_id", user!.id);
      if (error) throw error;
      const map: Record<string, boolean> = { nuovo_ordine: true, ordine_inviato: true, riordino: true };
      for (const r of data ?? []) map[r.categoria] = r.enabled;
      return map;
    },
  });
}

export function useSetPreferenza() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ categoria, enabled }: { categoria: string; enabled: boolean }) => {
      const { error } = await supabase.from("notifiche_preferenze")
        .upsert({ user_id: user!.id, categoria, enabled, updated_at: new Date().toISOString() }, { onConflict: "user_id,categoria" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [LIST_KEY, "pref"] }),
  });
}

export function useDispositivi() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [LIST_KEY, "devices", user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async (): Promise<Dispositivo[]> => {
      const { data, error } = await supabase.from("push_dispositivi")
        .select("id,nome,endpoint,enabled,disabled_reason,piattaforma,created_at,last_seen_at,last_accepted_at,last_received_at,last_error,last_error_at")
        .eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Dispositivo[];
    },
  });
}

export interface TestResult { deliveries: Array<{ id: string; dispositivo_id: string; status: string; http_status: number | null; error: string | null }> }

export function useSendTest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dispositivoId?: string): Promise<TestResult> => {
      const { data, error } = await supabase.functions.invoke("push-dispatch", { body: { action: "test", dispositivoId } });
      if (error) {
        const details = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
        throw new Error(details?.error ?? "Prova non inviata. Riprova.");
      }
      return data as TestResult;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [LIST_KEY] }),
  });
}
