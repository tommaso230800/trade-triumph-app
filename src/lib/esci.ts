import { supabase } from "@/integrations/supabase/client";
import { currentSubscription } from "@/lib/webPush";

/**
 * Uscita dall'account: prima stacca questo dispositivo dalle notifiche
 * dell'account (finché la sessione è valida), poi chiude la sessione.
 * Così i promemoria personali non arrivano più su un telefono passato ad
 * un altro account; al nuovo accesso il dispositivo viene ricollegato.
 */
export async function esciDallAccount(): Promise<void> {
  try {
    const sub = await currentSubscription();
    if (sub) await supabase.rpc("unregister_push_device", { p_endpoint: sub.endpoint });
  } catch {
    /* rete assente o notifiche non attive: l'uscita prosegue comunque */
  }
  await supabase.auth.signOut();
}
