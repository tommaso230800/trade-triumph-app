import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ClienteAlias = {
  id: string;
  user_id: string;
  cliente_id: string;
  azienda_id: string | null;
  codice_cliente_aziendale: string | null;
  denominazione_alternativa: string | null;
  partita_iva: string | null;
  codice_fiscale: string | null;
  source: "manual" | "auto" | "import";
  match_count: number;
  ultimo_match: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  clienti?: { nome: string; azienda: string | null } | null;
  aziende?: { nome: string } | null;
};

export function useClientiAlias(aziendaId?: string) {
  return useQuery({
    queryKey: ["clienti_alias", aziendaId],
    queryFn: async () => {
      let q = supabase
        .from("clienti_alias")
        .select("*, clienti(nome, azienda), aziende(nome)")
        .order("updated_at", { ascending: false });
      if (aziendaId) q = q.eq("azienda_id", aziendaId);
      const { data, error } = await q;
      if (error) throw error;
      return data as ClienteAlias[];
    },
  });
}

export function useUpsertAlias() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ClienteAlias> & { cliente_id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");
      const payload: any = {
        user_id: user.id,
        cliente_id: input.cliente_id,
        azienda_id: input.azienda_id || null,
        codice_cliente_aziendale: input.codice_cliente_aziendale || null,
        denominazione_alternativa: input.denominazione_alternativa || null,
        partita_iva: input.partita_iva || null,
        codice_fiscale: input.codice_fiscale || null,
        source: input.source || "manual",
        note: input.note || null,
      };
      if (input.id) {
        const { error } = await supabase.from("clienti_alias").update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clienti_alias").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clienti_alias"] });
      toast.success("Alias salvato");
    },
    onError: (e: any) => toast.error("Errore: " + e.message),
  });
}

export function useDeleteAlias() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clienti_alias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clienti_alias"] });
      toast.success("Alias eliminato");
    },
    onError: (e: any) => toast.error("Errore: " + e.message),
  });
}
