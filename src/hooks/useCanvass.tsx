import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Canvass = {
  id: string;
  user_id: string;
  azienda_id: string;
  nome: string;
  descrizione: string | null;
  tipo: "sconto_percentuale" | "prezzo_fisso" | "premio_fine_anno";
  valore: number;
  data_inizio: string;
  data_fine: string;
  attivo: boolean;
  tutti_clienti: boolean;
  cartoni_omaggio: number;
  cartoni_acquisto: number;
  created_at: string;
  updated_at: string;
  azienda?: {
    nome: string;
    logo_url: string | null;
  };
  canvass_clienti?: {
    cliente_id: string;
    clienti: {
      nome: string;
      azienda: string | null;
    };
  }[];
  canvass_prodotti?: {
    prodotto_id: string;
    valore_override: number | null;
    prodotti: {
      nome: string;
      codice: string | null;
    };
  }[];
};

export type ContrattoCliente = {
  id: string;
  user_id: string;
  cliente_id: string | null;
  azienda_id: string;
  anno: number;
  percentuale_premio: number;
  soglia_fatturato: number;
  note: string | null;
  consorzio: string | null;
  is_consorzio: boolean;
  created_at: string;
  updated_at: string;
  clienti?: {
    nome: string;
    azienda: string | null;
    fatturato: number;
    consorzio: string | null;
  } | null;
  aziende?: {
    nome: string;
  };
};

export function useCanvass() {
  return useQuery({
    queryKey: ["canvass"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canvass")
        .select(`
          *,
          azienda:aziende(nome, logo_url),
          canvass_clienti(cliente_id, clienti(nome, azienda)),
          canvass_prodotti(prodotto_id, valore_override, prodotti(nome, codice))
        `)
        .order("data_inizio", { ascending: true });

      if (error) throw error;
      return data as Canvass[];
    },
  });
}

export function useCanvassAttive() {
  return useQuery({
    queryKey: ["canvass", "attive"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("canvass")
        .select(`
          *,
          azienda:aziende(nome, logo_url),
          canvass_clienti(cliente_id, clienti(nome, azienda)),
          canvass_prodotti(prodotto_id, valore_override, prodotti(nome, codice))
        `)
        .eq("attivo", true)
        .lte("data_inizio", today)
        .gte("data_fine", today)
        .order("data_fine", { ascending: true });

      if (error) throw error;
      return data as Canvass[];
    },
  });
}

export function useCreateCanvass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      canvass,
      clienti_ids,
      prodotti,
    }: {
      canvass: Omit<Canvass, "id" | "user_id" | "created_at" | "updated_at" | "azienda" | "canvass_clienti" | "canvass_prodotti">;
      clienti_ids?: string[];
      prodotti?: { prodotto_id: string; valore_override?: number }[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: newCanvass, error } = await supabase
        .from("canvass")
        .insert({ ...canvass, user_id: user?.id })
        .select()
        .single();
      
      if (error) throw error;

      // Aggiungi clienti specifici
      if (clienti_ids && clienti_ids.length > 0) {
        const { error: clientiError } = await supabase
          .from("canvass_clienti")
          .insert(clienti_ids.map(cliente_id => ({
            canvass_id: newCanvass.id,
            cliente_id,
            user_id: user?.id,
          })));
        if (clientiError) throw clientiError;
      }

      // Aggiungi prodotti specifici
      if (prodotti && prodotti.length > 0) {
        const { error: prodottiError } = await supabase
          .from("canvass_prodotti")
          .insert(prodotti.map(p => ({
            canvass_id: newCanvass.id,
            prodotto_id: p.prodotto_id,
            valore_override: p.valore_override || null,
            user_id: user?.id,
          })));
        if (prodottiError) throw prodottiError;
      }

      return newCanvass;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["canvass"] });
      toast.success("Promozione creata!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useUpdateCanvass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      canvass,
      clienti_ids,
      prodotti,
    }: {
      id: string;
      canvass: Partial<Omit<Canvass, "id" | "user_id" | "created_at" | "updated_at" | "azienda" | "canvass_clienti" | "canvass_prodotti">>;
      clienti_ids?: string[];
      prodotti?: { prodotto_id: string; valore_override?: number }[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("canvass")
        .update(canvass)
        .eq("id", id);
      
      if (error) throw error;

      // Aggiorna clienti
      if (clienti_ids !== undefined) {
        await supabase.from("canvass_clienti").delete().eq("canvass_id", id);
        if (clienti_ids.length > 0) {
          const { error: clientiError } = await supabase
            .from("canvass_clienti")
            .insert(clienti_ids.map(cliente_id => ({
              canvass_id: id,
              cliente_id,
              user_id: user?.id,
            })));
          if (clientiError) throw clientiError;
        }
      }

      // Aggiorna prodotti
      if (prodotti !== undefined) {
        await supabase.from("canvass_prodotti").delete().eq("canvass_id", id);
        if (prodotti.length > 0) {
          const { error: prodottiError } = await supabase
            .from("canvass_prodotti")
            .insert(prodotti.map(p => ({
              canvass_id: id,
              prodotto_id: p.prodotto_id,
              valore_override: p.valore_override || null,
              user_id: user?.id,
            })));
          if (prodottiError) throw prodottiError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["canvass"] });
      toast.success("Promozione aggiornata!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useDeleteCanvass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("canvass").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["canvass"] });
      toast.success("Promozione eliminata!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

// Contratti clienti
export function useContrattiClienti() {
  return useQuery({
    queryKey: ["contratti_clienti"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratti_clienti")
        .select(`
          *,
          clienti(nome, azienda, fatturato, consorzio),
          aziende(nome)
        `)
        .order("anno", { ascending: false });

      if (error) throw error;
      return data as ContrattoCliente[];
    },
  });
}

export function useCreateContrattoCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contratto: Omit<ContrattoCliente, "id" | "user_id" | "created_at" | "updated_at" | "clienti" | "aziende">) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("contratti_clienti")
        .insert({ ...contratto, user_id: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratti_clienti"] });
      toast.success("Contratto creato!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useUpdateContrattoCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContrattoCliente> & { id: string }) => {
      const { error } = await supabase
        .from("contratti_clienti")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratti_clienti"] });
      toast.success("Contratto aggiornato!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useDeleteContrattoCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contratti_clienti").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratti_clienti"] });
      toast.success("Contratto eliminato!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}
