/**
 * useReconciliationEngine — FASE 2, Step 2.3
 * -------------------------------------------
 * Hook che collega il motore puro `reconciliationEngine` ai dati Supabase
 * e persiste le allocazioni many-to-many su `riconciliazioni_allocazioni`.
 *
 * Uso tipico:
 *   const rec = useReconciliationEngine({ estrattoId });
 *   rec.result       // ReconciliationResult calcolato in memoria
 *   rec.saved        // allocazioni già persistite (DB)
 *   rec.persist()    // salva il risultato corrente su DB (replace-all per estratto)
 *   rec.clear()      // rimuove tutte le allocazioni dell'estratto
 */
import { useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  reconcile,
  type Allocazione,
  type EstrattoRiga,
  type OrdineForRec,
  type ReconciliationResult,
} from "@/lib/reconciliationEngine";

export type PersistedAllocazione = Allocazione & {
  id: string;
  user_id: string;
  manuale: boolean;
  note: string | null;
  created_at: string;
  updated_at: string;
};

type Options = {
  estrattoId?: string | null;
  /** Se true, considera tutti gli estratti dell'utente (KPI globali). */
  all?: boolean;
  /** Finestra temporale ordini (facoltativa). */
  from?: string | null;
  to?: string | null;
};

export function useReconciliationEngine(opts: Options = {}) {
  const { estrattoId, all, from, to } = opts;
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  // -------- Estratto/i --------
  const { data: estratti } = useQuery({
    queryKey: ["rec-engine", "estratti", userId, estrattoId ?? null, !!all],
    enabled: !!userId && (all || !!estrattoId),
    queryFn: async () => {
      let q = supabase
        .from("estratti_provvigioni")
        .select("id, azienda_id, anno, trimestre, data_documento")
        .eq("user_id", userId!);
      if (estrattoId && !all) q = q.eq("id", estrattoId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const estrattoIds = useMemo(() => (estratti ?? []).map((e) => e.id), [estratti]);
  const aziendaById = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const e of estratti ?? []) m.set(e.id, e.azienda_id ?? null);
    return m;
  }, [estratti]);

  // -------- Righe PDF --------
  const { data: righeDb } = useQuery({
    queryKey: ["rec-engine", "righe", userId, estrattoIds.join(",")],
    enabled: !!userId && estrattoIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estratti_provvigioni_righe")
        .select(
          "id, estratto_id, cliente_id, numero_ordine, data_riga, imponibile, provvigione, aliquota, tipo_movimento, descrizione"
        )
        .eq("user_id", userId!)
        .in("estratto_id", estrattoIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  // -------- Ordini --------
  const { data: ordiniDb } = useQuery({
    queryKey: ["rec-engine", "ordini", userId, from ?? null, to ?? null],
    enabled: !!userId,
    queryFn: async () => {
      let q = supabase
        .from("ordini")
        .select(
          "id, codice, cliente_id, azienda_id, data_ordine, data_conferma, created_at, status, totale, provvigione_prevista"
        )
        .eq("user_id", userId!);
      if (from) q = q.gte("data_ordine", from);
      if (to) q = q.lte("data_ordine", to);
      const { data, error } = await q.limit(5000);
      if (error) throw error;
      return data ?? [];
    },
  });

  // -------- Input per il motore --------
  const righeInput: EstrattoRiga[] = useMemo(() => {
    return (righeDb ?? []).map((r: any) => ({
      id: r.id,
      cliente_id: r.cliente_id,
      azienda_id: aziendaById.get(r.estratto_id) ?? null,
      ordine_codice_pdf: r.numero_ordine,
      imponibile_pdf: r.imponibile,
      provvigione_pdf: r.provvigione,
      aliquota_pdf: r.aliquota,
      data_documento: r.data_riga,
      descrizione: r.descrizione,
      tipo_movimento: r.tipo_movimento,
    }));
  }, [righeDb, aziendaById]);

  const ordiniInput: OrdineForRec[] = useMemo(
    () => (ordiniDb ?? []) as unknown as OrdineForRec[],
    [ordiniDb]
  );

  const result: ReconciliationResult | null = useMemo(() => {
    if (!righeDb || !ordiniDb) return null;
    return reconcile(righeInput, ordiniInput);
  }, [righeDb, ordiniDb, righeInput, ordiniInput]);

  // -------- Allocazioni salvate --------
  const { data: saved } = useQuery({
    queryKey: ["rec-engine", "allocazioni", userId, estrattoIds.join(",")],
    enabled: !!userId && estrattoIds.length > 0,
    queryFn: async () => {
      const rigaIds = (righeDb ?? []).map((r: any) => r.id);
      if (rigaIds.length === 0) return [] as PersistedAllocazione[];
      const { data, error } = await supabase
        .from("riconciliazioni_allocazioni")
        .select("*")
        .eq("user_id", userId!)
        .in("estratto_riga_id", rigaIds);
      if (error) throw error;
      return (data ?? []) as unknown as PersistedAllocazione[];
    },
  });

  // -------- Persist --------
  const persistMut = useMutation({
    mutationFn: async (params?: { manuale?: boolean }) => {
      if (!userId) throw new Error("Utente non autenticato");
      if (!result) throw new Error("Motore non pronto");
      const rigaIds = righeInput.map((r) => r.id);
      if (rigaIds.length === 0) return { inserted: 0 };

      // Strategia replace-all: rimuovo solo le allocazioni non manuali
      // dell'estratto corrente e reinserisco quelle calcolate.
      const { error: delErr } = await supabase
        .from("riconciliazioni_allocazioni")
        .delete()
        .eq("user_id", userId)
        .in("estratto_riga_id", rigaIds)
        .eq("manuale", false);
      if (delErr) throw delErr;

      const rows = result.allocazioni.map((a) => ({
        user_id: userId,
        estratto_riga_id: a.estratto_riga_id,
        ordine_id: a.ordine_id,
        quota_imponibile: a.quota_imponibile,
        quota_provvigione: a.quota_provvigione,
        percentuale: a.percentuale,
        tipo: a.tipo,
        confidence: a.confidence,
        manuale: params?.manuale ?? false,
        note: a.reasons?.length ? a.reasons.join(" • ") : null,
      }));

      if (rows.length === 0) return { inserted: 0 };
      const { error: insErr } = await supabase
        .from("riconciliazioni_allocazioni")
        .insert(rows);
      if (insErr) throw insErr;
      return { inserted: rows.length };
    },
    onSuccess: (r) => {
      toast({
        title: "Allocazioni salvate",
        description: `${r.inserted} allocazioni persistite.`,
      });
      qc.invalidateQueries({ queryKey: ["rec-engine", "allocazioni"] });
    },
    onError: (e: any) =>
      toast({
        title: "Errore salvataggio",
        description: e?.message ?? "Impossibile persistere le allocazioni",
        variant: "destructive",
      }),
  });

  const clearMut = useMutation({
    mutationFn: async (opts?: { includeManual?: boolean }) => {
      if (!userId) throw new Error("Utente non autenticato");
      const rigaIds = (righeDb ?? []).map((r: any) => r.id);
      if (rigaIds.length === 0) return { deleted: 0 };
      let q = supabase
        .from("riconciliazioni_allocazioni")
        .delete()
        .eq("user_id", userId)
        .in("estratto_riga_id", rigaIds);
      if (!opts?.includeManual) q = q.eq("manuale", false);
      const { error } = await q;
      if (error) throw error;
      return { deleted: rigaIds.length };
    },
    onSuccess: () => {
      toast({ title: "Allocazioni rimosse" });
      qc.invalidateQueries({ queryKey: ["rec-engine", "allocazioni"] });
    },
    onError: (e: any) =>
      toast({
        title: "Errore",
        description: e?.message ?? "Impossibile rimuovere le allocazioni",
        variant: "destructive",
      }),
  });

  const upsertManualMut = useMutation({
    mutationFn: async (a: Omit<Allocazione, "reasons"> & { note?: string | null; reasons?: string[] }) => {
      if (!userId) throw new Error("Utente non autenticato");
      const row = {
        user_id: userId,
        estratto_riga_id: a.estratto_riga_id,
        ordine_id: a.ordine_id,
        quota_imponibile: a.quota_imponibile,
        quota_provvigione: a.quota_provvigione,
        percentuale: a.percentuale,
        tipo: a.tipo,
        confidence: a.confidence,
        manuale: true,
        note: a.note ?? (a.reasons?.length ? a.reasons.join(" • ") : null),
      };
      const { error } = await supabase.from("riconciliazioni_allocazioni").insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Allocazione manuale salvata" });
      qc.invalidateQueries({ queryKey: ["rec-engine", "allocazioni"] });
    },
    onError: (e: any) =>
      toast({
        title: "Errore",
        description: e?.message ?? "Impossibile salvare",
        variant: "destructive",
      }),
  });

  const deleteAllocazioneMut = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error("Utente non autenticato");
      const { error } = await supabase
        .from("riconciliazioni_allocazioni")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rec-engine", "allocazioni"] });
    },
  });

  const isLoading = !righeDb || !ordiniDb;

  const persist = useCallback(
    (manuale?: boolean) => persistMut.mutateAsync({ manuale }),
    [persistMut]
  );
  const clear = useCallback(
    (includeManual?: boolean) => clearMut.mutateAsync({ includeManual }),
    [clearMut]
  );

  return {
    isLoading,
    result,
    saved: saved ?? [],
    persist,
    clear,
    isPersisting: persistMut.isPending,
    isClearing: clearMut.isPending,
    addManualAllocation: upsertManualMut.mutateAsync,
    deleteAllocation: deleteAllocazioneMut.mutateAsync,
  };
}
