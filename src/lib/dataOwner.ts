import { supabase } from "@/integrations/supabase/client";

/**
 * I dati condivisi dell'agenzia sono intestati a un unico "titolare dati"
 * (trigger agency_assign_data_owner). Le letture filtrate per user_id devono
 * usare QUEL id, non quello dell'account collegato: altrimenti i colleghi
 * vedono sezioni vuote (es. Scadenziario, Riconciliazione). Per utenti fuori
 * agenzia la funzione restituisce l'id stesso.
 */
const cache = new Map<string, Promise<string>>();

export function getDataOwnerId(userId: string): Promise<string> {
  let p = cache.get(userId);
  if (!p) {
    p = (async () => {
      const { data, error } = await supabase.rpc("agency_data_owner", { _uid: userId });
      if (error || !data) {
        cache.delete(userId);
        // Senza risposta si usa l'account stesso: comportamento precedente, mai dati altrui.
        return userId;
      }
      return data as string;
    })();
    cache.set(userId, p);
  }
  return p;
}
