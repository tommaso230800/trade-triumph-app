import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type Comunicazione = {
  id: string;
  cliente_id: string | null;
  canale: string;
  template: string | null;
  oggetto: string | null;
  contenuto: string | null;
  destinatario: string | null;
  stato: string;
  inviata_at: string;
};

export const TEMPLATES = [
  { id: "sollecito", nome: "Sollecito pagamento", oggetto: "Sollecito fattura scaduta", corpo: "Buongiorno {{cliente}},\nle ricordiamo che risulta ancora aperta la fattura {{fattura}}.\nRestiamo in attesa di riscontro.\nCordialmente." },
  { id: "offerta", nome: "Offerta commerciale", oggetto: "Nuova offerta per te", corpo: "Buongiorno {{cliente}},\nabbiamo attivato una promozione dedicata su {{prodotto}}.\nContattaci per maggiori dettagli." },
  { id: "follow_up", nome: "Follow-up post visita", oggetto: "A seguito della nostra visita", corpo: "Buongiorno {{cliente}},\nla ringraziamo per l'incontro. Restiamo a disposizione per confermare l'ordine discusso.\nA presto." },
  { id: "benvenuto", nome: "Benvenuto", oggetto: "Benvenuto tra i nostri clienti", corpo: "Buongiorno {{cliente}},\nbenvenuto! Sono il tuo referente commerciale. Non esitare a contattarmi." },
  { id: "riordino", nome: "Promemoria riordino", oggetto: "È il momento di riordinare", corpo: "Buongiorno {{cliente}},\nsecondo i nostri dati potrebbe essere il momento di riordinare {{prodotto}}.\nRimango a disposizione." },
];

export function renderTemplate(text: string, vars: Record<string, string>) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

export function useComunicazioniCliente(clienteId?: string) {
  return useQuery({
    queryKey: ["comunicazioni", clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("comunicazioni_log")
        .select("*")
        .eq("cliente_id", clienteId!)
        .order("inviata_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Comunicazione[];
    },
  });
}

export function useLogComunicazione() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: Omit<Comunicazione, "id" | "inviata_at" | "stato"> & { stato?: string }) => {
      const { error } = await (supabase as any).from("comunicazioni_log").insert({
        ...c,
        user_id: user!.id,
        stato: c.stato ?? "inviato",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comunicazione registrata");
      qc.invalidateQueries({ queryKey: ["comunicazioni"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}
