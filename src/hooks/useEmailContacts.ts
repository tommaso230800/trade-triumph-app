import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { EmailContact } from "@/lib/recipients";
import { isValidEmail, normalizeEmail } from "@/lib/recipients";

const KEY = ["aziende-email-contatti"];

/** Shared address book of every company (small table: loaded once). */
export function useEmailContacts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...KEY, user?.id],
    enabled: !!user,
    queryFn: async (): Promise<EmailContact[]> => {
      const { data, error } = await supabase
        .from("aziende_email_contatti")
        .select("id, azienda_id, nome, email, ruolo, default_to, default_cc")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type ContactInput = { azienda_id: string; nome: string; email: string; ruolo?: string | null; default_to?: boolean; default_cc?: boolean };

function friendly(error: { code?: string; message: string }) {
  if (error.code === "23505") return new Error("Questo indirizzo è già nella rubrica dell’azienda.");
  if (error.code === "23514") return new Error("Controlla l’indirizzo email: non è valido.");
  return new Error("Salvataggio del contatto non riuscito. Riprova.");
}

export function useSaveEmailContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ContactInput & { id?: string }) => {
      const email = normalizeEmail(input.email);
      if (!isValidEmail(email)) throw new Error("Inserisci un indirizzo email valido.");
      if (!input.nome.trim()) throw new Error("Inserisci un nome o una descrizione.");
      const row = { azienda_id: input.azienda_id, nome: input.nome.trim(), email, ruolo: input.ruolo?.trim() || null, default_to: !!input.default_to, default_cc: !!input.default_cc && !input.default_to };
      const { data, error } = input.id
        ? await supabase.from("aziende_email_contatti").update(row).eq("id", input.id).select().single()
        : await supabase.from("aziende_email_contatti").insert(row).select().single();
      if (error) throw friendly(error);
      return data as EmailContact;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteEmailContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("aziende_email_contatti").delete().eq("id", id);
      if (error) throw new Error("Eliminazione non riuscita. Riprova.");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
