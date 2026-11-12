import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Reads the readable message returned by the agency-auth function. */
async function readError(error: unknown, fallback: string): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.error) return String(body.error);
    } catch {
      /* ignore */
    }
  }
  return fallback;
}

/** Signs in with username (case-insensitive) or email; the backend resolves the identity. */
export async function signInWithUsername(username: string, password: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke("agency-auth", {
    body: { action: "login", username: username.trim(), password },
  });
  if (error) return { error: await readError(error, "Accesso non riuscito. Controlla la connessione e riprova.") };
  if (!data?.session?.access_token) return { error: "Accesso non riuscito. Riprova." };
  const { error: sessionError } = await supabase.auth.setSession(data.session);
  if (sessionError) return { error: "Sessione non valida. Riprova ad accedere." };
  return { error: null };
}

export async function requestPasswordRecovery(username: string): Promise<{ message: string | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("agency-auth", {
    body: { action: "recover", username: username.trim(), redirectTo: `${window.location.origin}/reset-password` },
  });
  if (error) return { message: null, error: await readError(error, "Richiesta non riuscita. Riprova.") };
  return { message: String(data?.message ?? ""), error: null };
}

/** Owner-only: sets a new password for an agency member. */
export async function resetMemberPassword(userId: string, password: string): Promise<{ error: string | null }> {
  const { error } = await supabase.functions.invoke("agency-auth", {
    body: { action: "reset_password", user_id: userId, password },
  });
  if (error) return { error: await readError(error, "Impossibile aggiornare la password.") };
  return { error: null };
}

/** Changes the signed-in user's password after checking the current one. */
export async function changeOwnPassword(email: string, currentPassword: string, newPassword: string): Promise<{ error: string | null }> {
  const check = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (check.error) return { error: "La password attuale non è corretta." };
  const { error } = await supabase.auth.updateUser({ password: newPassword, current_password: currentPassword } as never);
  if (error) {
    if (/weak|pwned|leaked/i.test(error.message)) return { error: "Questa password è troppo debole o compare in elenchi di password violate. Scegline un'altra." };
    if (/same/i.test(error.message)) return { error: "La nuova password deve essere diversa da quella attuale." };
    return { error: "Impossibile aggiornare la password. Riprova." };
  }
  return { error: null };
}

export function passwordProblem(password: string, confirm: string): string | null {
  if (password.length < 8) return "La password deve avere almeno 8 caratteri.";
  if (password.length > 72) return "La password può avere al massimo 72 caratteri.";
  if (password !== confirm) return "Le due password non coincidono.";
  return null;
}
