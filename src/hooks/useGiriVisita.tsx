import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Visita = {
  id: string;
  user_id: string;
  giro_id: string;
  cliente_id: string;
  ordine_visita: number;
  orario_previsto: string | null;
  orario_effettivo: string | null;
  esito: "completata" | "ordine" | "no_interesse" | "ripassare" | "assente" | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  clienti?: {
    id: string;
    nome: string;
    azienda: string | null;
    indirizzo: string | null;
    citta: string | null;
    telefono: string | null;
    fatturato: number;
    status: string;
  };
};

export type GiroVisita = {
  id: string;
  user_id: string;
  data: string;
  nome: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  visite?: Visita[];
};

export function useGiriVisita(dataFilter?: string) {
  return useQuery({
    queryKey: ["giri_visita", dataFilter],
    queryFn: async () => {
      let query = supabase
        .from("giri_visita")
        .select(`
          *,
          visite (
            *,
            clienti (id, nome, azienda, indirizzo, citta, telefono, fatturato, status)
          )
        `)
        .order("data", { ascending: false });

      if (dataFilter) {
        query = query.eq("data", dataFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Sort visite by ordine_visita
      return (data as GiroVisita[]).map(giro => ({
        ...giro,
        visite: giro.visite?.sort((a, b) => a.ordine_visita - b.ordine_visita)
      }));
    },
  });
}

export function useGiroVisita(id?: string) {
  return useQuery({
    queryKey: ["giro_visita", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("giri_visita")
        .select(`
          *,
          visite (
            *,
            clienti (id, nome, azienda, indirizzo, citta, telefono, fatturato, status)
          )
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      
      // Sort visite by ordine_visita
      const giroData = data as any;
      return {
        ...giroData,
        visite: giroData.visite?.sort((a: any, b: any) => a.ordine_visita - b.ordine_visita)
      } as GiroVisita;
    },
    enabled: !!id,
  });
}

export function useCreateGiroVisita() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      giro, 
      clienti_ids 
    }: { 
      giro: { data: string; nome?: string; note?: string };
      clienti_ids: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create giro
      const { data: newGiro, error } = await supabase
        .from("giri_visita")
        .insert({ ...giro, user_id: user?.id })
        .select()
        .single();
      
      if (error) throw error;

      // Add visite
      if (clienti_ids.length > 0) {
        const { error: visiteError } = await supabase
          .from("visite")
          .insert(clienti_ids.map((cliente_id, index) => ({
            giro_id: newGiro.id,
            cliente_id,
            ordine_visita: index,
            user_id: user?.id,
          })));
        if (visiteError) throw visiteError;
      }

      return newGiro;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["giri_visita"] });
      toast.success("Giro visita creato!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useUpdateGiroVisita() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      giro,
      clienti_ids
    }: { 
      id: string;
      giro?: { nome?: string; note?: string };
      clienti_ids?: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (giro) {
        const { error } = await supabase
          .from("giri_visita")
          .update(giro)
          .eq("id", id);
        if (error) throw error;
      }

      if (clienti_ids !== undefined) {
        // Delete existing visite and recreate
        await supabase.from("visite").delete().eq("giro_id", id);
        
        if (clienti_ids.length > 0) {
          const { error: visiteError } = await supabase
            .from("visite")
            .insert(clienti_ids.map((cliente_id, index) => ({
              giro_id: id,
              cliente_id,
              ordine_visita: index,
              user_id: user?.id,
            })));
          if (visiteError) throw visiteError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["giri_visita"] });
      toast.success("Giro visita aggiornato!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useDeleteGiroVisita() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("giri_visita").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["giri_visita"] });
      toast.success("Giro visita eliminato!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useUpdateVisita() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      ...updates 
    }: { 
      id: string;
      esito?: Visita["esito"];
      note?: string | null;
      orario_effettivo?: string | null;
      ordine_visita?: number;
    }) => {
      const { error } = await supabase
        .from("visite")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["giri_visita"] });
      queryClient.invalidateQueries({ queryKey: ["giro_visita"] });
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useClienteUltimoOrdine(clienteId?: string) {
  return useQuery({
    queryKey: ["cliente_ultimo_ordine", clienteId],
    queryFn: async () => {
      if (!clienteId) return null;
      const { data, error } = await supabase
        .from("ordini")
        .select("id, codice, totale, data_ordine, aziende(nome)")
        .eq("cliente_id", clienteId)
        .order("data_ordine", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clienteId,
  });
}