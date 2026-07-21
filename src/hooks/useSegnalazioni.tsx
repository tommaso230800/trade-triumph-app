import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SegnalazioneTipo = "reclamo" | "nota_credito";
export type SegnalazioneStato =
  | "da_gestire" | "in_lavorazione" | "richiesta" | "sollecitata"
  | "approvata" | "emessa" | "ricevuta" | "chiusa" | "respinta";
export type SegnalazionePriorita = "bassa" | "media" | "alta" | "urgente";

export type Segnalazione = {
  id: string;
  user_id: string;
  tipo: SegnalazioneTipo;
  stato: SegnalazioneStato;
  priorita: SegnalazionePriorita;
  oggetto: string;
  descrizione: string | null;
  causa: string | null;
  importo_richiesto: number;
  importo_riconosciuto: number;
  cliente_id: string | null;
  azienda_id: string | null;
  ordine_id: string | null;
  documento_id: string | null;
  responsabile: string | null;
  scadenza: string | null;
  data_apertura: string;
  data_risoluzione: string | null;
  soluzione: string | null;
  numero_nota_credito: string | null;
  data_emissione_nc: string | null;
  meta: any;
  created_at: string;
  updated_at: string;
  clienti?: { nome: string | null } | null;
  aziende?: { nome: string | null } | null;
  ordini?: { codice: string | null } | null;
};

export type SegnalazioneEvento = {
  id: string;
  segnalazione_id: string;
  user_id: string;
  tipo_evento: "nota" | "email" | "telefonata" | "sollecito" | "cambio_stato" | "allegato" | "sistema";
  descrizione: string | null;
  stato_precedente: string | null;
  stato_nuovo: string | null;
  documento_id: string | null;
  meta: any;
  created_at: string;
};

export function useSegnalazioni(filtro?: { tipo?: SegnalazioneTipo; stato?: SegnalazioneStato | "aperte" | "tutte" }) {
  return useQuery({
    queryKey: ["segnalazioni", filtro],
    queryFn: async () => {
      let q = supabase
        .from("segnalazioni")
        .select("*, clienti(nome), aziende(nome), ordini(codice)")
        .order("created_at", { ascending: false });
      if (filtro?.tipo) q = q.eq("tipo", filtro.tipo);
      if (filtro?.stato && filtro.stato !== "aperte" && filtro.stato !== "tutte") q = q.eq("stato", filtro.stato);
      if (filtro?.stato === "aperte") q = q.not("stato", "in", "(chiusa,respinta)");
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Segnalazione[];
    },
  });
}

export function useSegnalazione(id?: string) {
  return useQuery({
    queryKey: ["segnalazione", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("segnalazioni")
        .select("*, clienti(nome), aziende(nome), ordini(codice, data_ordine, totale)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as any as Segnalazione | null;
    },
    enabled: !!id,
  });
}

export function useSegnalazioneEventi(id?: string) {
  return useQuery({
    queryKey: ["segnalazione_eventi", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("segnalazioni_eventi")
        .select("*")
        .eq("segnalazione_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as SegnalazioneEvento[];
    },
    enabled: !!id,
  });
}

export function useCreaSegnalazione() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Segnalazione> & { tipo: SegnalazioneTipo; oggetto: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");
      const { data, error } = await supabase
        .from("segnalazioni")
        .insert({
          user_id: user.id,
          tipo: input.tipo,
          oggetto: input.oggetto,
          stato: input.stato ?? "da_gestire",
          priorita: input.priorita ?? "media",
          descrizione: input.descrizione ?? null,
          causa: input.causa ?? null,
          importo_richiesto: input.importo_richiesto ?? 0,
          importo_riconosciuto: input.importo_riconosciuto ?? 0,
          cliente_id: input.cliente_id ?? null,
          azienda_id: input.azienda_id ?? null,
          ordine_id: input.ordine_id ?? null,
          documento_id: input.documento_id ?? null,
          responsabile: input.responsabile ?? null,
          scadenza: input.scadenza ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      // evento di sistema
      await supabase.from("segnalazioni_eventi").insert({
        segnalazione_id: data.id,
        user_id: user.id,
        tipo_evento: "sistema",
        descrizione: "Pratica aperta",
        stato_nuovo: data.stato,
      });
      return data as Segnalazione;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["segnalazioni"] });
      toast.success("Pratica creata");
    },
    onError: (e: any) => toast.error("Errore: " + e.message),
  });
}

export function useAggiornaSegnalazione() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<Segnalazione>; motivo?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");
      const { data: prev } = await supabase.from("segnalazioni").select("stato").eq("id", input.id).maybeSingle();
      const { data, error } = await supabase
        .from("segnalazioni")
        .update(input.patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      if (input.patch.stato && prev?.stato !== input.patch.stato) {
        await supabase.from("segnalazioni_eventi").insert({
          segnalazione_id: input.id,
          user_id: user.id,
          tipo_evento: "cambio_stato",
          descrizione: input.motivo ?? null,
          stato_precedente: prev?.stato ?? null,
          stato_nuovo: input.patch.stato,
        });
      }
      return data as Segnalazione;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["segnalazioni"] });
      qc.invalidateQueries({ queryKey: ["segnalazione", v.id] });
      qc.invalidateQueries({ queryKey: ["segnalazione_eventi", v.id] });
      toast.success("Aggiornata");
    },
    onError: (e: any) => toast.error("Errore: " + e.message),
  });
}

export function useAggiungiEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      segnalazione_id: string;
      tipo_evento: SegnalazioneEvento["tipo_evento"];
      descrizione?: string | null;
      documento_id?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");
      const { data, error } = await supabase
        .from("segnalazioni_eventi")
        .insert({
          segnalazione_id: input.segnalazione_id,
          user_id: user.id,
          tipo_evento: input.tipo_evento,
          descrizione: input.descrizione ?? null,
          documento_id: input.documento_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as SegnalazioneEvento;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["segnalazione_eventi", v.segnalazione_id] });
    },
    onError: (e: any) => toast.error("Errore: " + e.message),
  });
}

export function useEliminaSegnalazione() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("segnalazioni").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["segnalazioni"] });
      toast.success("Pratica eliminata");
    },
    onError: (e: any) => toast.error("Errore: " + e.message),
  });
}

export const STATO_LABEL: Record<SegnalazioneStato, string> = {
  da_gestire: "Da gestire",
  in_lavorazione: "In lavorazione",
  richiesta: "Richiesta",
  sollecitata: "Sollecitata",
  approvata: "Approvata",
  emessa: "Emessa",
  ricevuta: "Ricevuta",
  chiusa: "Chiusa",
  respinta: "Respinta",
};

export const STATO_COLOR: Record<SegnalazioneStato, string> = {
  da_gestire: "bg-muted text-foreground border-border",
  in_lavorazione: "bg-primary/15 text-primary border-primary/30",
  richiesta: "bg-warning/15 text-warning border-warning/30",
  sollecitata: "bg-destructive/15 text-destructive border-destructive/30",
  approvata: "bg-success/15 text-success border-success/30",
  emessa: "bg-success/15 text-success border-success/30",
  ricevuta: "bg-success/15 text-success border-success/30",
  chiusa: "bg-muted text-muted-foreground border-border",
  respinta: "bg-destructive/15 text-destructive border-destructive/30",
};

export const PRIORITA_COLOR: Record<SegnalazionePriorita, string> = {
  bassa: "bg-muted text-muted-foreground border-border",
  media: "bg-primary/15 text-primary border-primary/30",
  alta: "bg-warning/15 text-warning border-warning/30",
  urgente: "bg-destructive/15 text-destructive border-destructive/30",
};
