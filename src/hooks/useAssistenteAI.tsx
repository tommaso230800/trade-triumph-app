import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type TipoAttivita =
  | "visita_cliente" | "telefonata" | "ordine" | "preventivo"
  | "consegna" | "reclamo" | "incasso" | "presentazione_prodotto"
  | "follow_up" | "altro";

export type Priorita = "bassa" | "media" | "alta" | "urgente";
export type StatoAttivita = "da_fare" | "in_corso" | "completata" | "annullata";

export interface AzioneProposta {
  tipo: "crea_visita" | "crea_promemoria" | "salva_bozza";
  descrizione: string;
  payload: Record<string, unknown>;
}

export interface RisultatoAnalisi {
  cliente_id: string | null;
  cliente_nome_suggerito: string | null;
  azienda_id: string | null;
  azienda_nome_suggerita: string | null;
  tipo_attivita: TipoAttivita;
  data_attivita: string;
  riepilogo: string;
  priorita: Priorita;
  prossima_azione: string | null;
  data_promemoria: string | null;
  stato: StatoAttivita;
  bozza_comunicazione: string | null;
  informazioni_mancanti: string[];
  azioni_proposte: AzioneProposta[];
}

export function useAnalizzaNota() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (note: string): Promise<{ risultato: RisultatoAnalisi; logId: string }> => {
      const [{ data: clienti }, { data: aziende }] = await Promise.all([
        supabase.from("clienti").select("id,nome").order("nome").limit(300),
        supabase.from("aziende").select("id,nome").order("nome").limit(100),
      ]);

      const { data, error } = await supabase.functions.invoke("analyze-note", {
        body: { note, clienti: clienti ?? [], aziende: aziende ?? [] },
      });
      if (error) throw new Error(error.message || "Errore analisi");
      if ((data as any)?.error) throw new Error((data as any).error);

      const risultato = data as RisultatoAnalisi;

      const { data: log, error: logErr } = await supabase
        .from("ai_activity_log")
        .insert({
          user_id: user?.id,
          input_originale: note,
          risultato_analisi: risultato as any,
          azioni_proposte: risultato.azioni_proposte as any,
          stato: "analizzato",
        })
        .select("id")
        .single();
      if (logErr) throw logErr;
      return { risultato, logId: log.id };
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export interface ConfermaPayload {
  logId: string;
  risultato: RisultatoAnalisi;
  azioni: AzioneProposta[];
}

export function useConfermaAzioni() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ logId, risultato, azioni }: ConfermaPayload) => {
      let attivitaId: string | null = null;
      const eseguite: any[] = [];

      const azVisita = azioni.find((a) => a.tipo === "crea_visita");
      if (azVisita) {
        const { data, error } = await supabase
          .from("ai_attivita")
          .insert({
            user_id: user?.id,
            cliente_id: risultato.cliente_id,
            azienda_id: risultato.azienda_id,
            data_attivita: risultato.data_attivita,
            tipo_attivita: risultato.tipo_attivita,
            riepilogo: risultato.riepilogo,
            priorita: risultato.priorita,
            stato: risultato.stato,
            prossima_azione: risultato.prossima_azione,
          })
          .select("id")
          .single();
        if (error) throw error;
        attivitaId = data.id;
        eseguite.push({ tipo: "crea_visita", id: data.id });
      }

      const azProm = azioni.find((a) => a.tipo === "crea_promemoria");
      if (azProm && risultato.data_promemoria) {
        const { data, error } = await supabase
          .from("ai_promemoria")
          .insert({
            user_id: user?.id,
            cliente_id: risultato.cliente_id,
            azienda_id: risultato.azienda_id,
            attivita_id: attivitaId,
            titolo: risultato.prossima_azione || "Promemoria",
            descrizione: azProm.descrizione,
            data_promemoria: risultato.data_promemoria,
            priorita: risultato.priorita,
            stato: "da_fare",
          })
          .select("id")
          .single();
        if (error) throw error;
        eseguite.push({ tipo: "crea_promemoria", id: data.id });
      }

      const azBozza = azioni.find((a) => a.tipo === "salva_bozza");
      if (azBozza) {
        eseguite.push({ tipo: "salva_bozza", testo: risultato.bozza_comunicazione });
      }

      await supabase
        .from("ai_activity_log")
        .update({
          azioni_confermate: eseguite as any,
          stato: azioni.length === risultato.azioni_proposte.length ? "confermato" : "parziale",
        })
        .eq("id", logId);

      return eseguite;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai_activity_log"] });
      qc.invalidateQueries({ queryKey: ["ai_attivita"] });
      qc.invalidateQueries({ queryKey: ["ai_promemoria"] });
      toast.success("Azioni confermate e salvate");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAttivitaRecenti() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ai_activity_log", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
