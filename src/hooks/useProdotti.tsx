import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Prodotto = {
  id: string;
  azienda_id: string;
  user_id: string;
  nome: string;
  codice: string | null;
  prezzo_listino: number;
  costo_acquisto: number;
  quantita_pezzi: number;
  pezzi_per_cartone: number;
  strati: number;
  cartoni_per_strato: number;
  immagine_url: string | null;
  formato: string | null;
  sc1_default: number;
  sc2_default: number;
  sc3_default: number;
  brand_id: string | null;
  /** Accisa: scelta dell'agente; importo in € a bottiglia (pezzo). */
  ha_accisa?: boolean;
  accisa_pezzo?: number | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export function useProdotti(aziendaId?: string) {
  return useQuery({
    queryKey: ["prodotti", aziendaId],
    queryFn: async () => {
      let query = supabase
        .from("prodotti")
        .select("*")
        .is("deleted_at", null)
        .order("nome", { ascending: true }).order('id');

      if (aziendaId) {
        query = query.eq("azienda_id", aziendaId);
      }

      const all: Prodotto[]=[];
      for(let from=0;;from+=1000){const {data,error}=await query.range(from,from+999);if(error)throw error;all.push(...(data || []) as Prodotto[]);if(!data || data.length<1000)return all;}
    },
  });
}

export function useCreateProdotto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prodotto: Omit<Prodotto, "id" | "user_id" | "created_at" | "updated_at" | "deleted_at" | "immagine_url" | "formato" | "sc1_default" | "sc2_default" | "sc3_default" | "brand_id" | "costo_acquisto" | "ha_accisa" | "accisa_pezzo"> & {
      ha_accisa?: boolean;
      accisa_pezzo?: number | null;
      immagine_url?: string | null;
      formato?: string | null;
      sc1_default?: number;
      sc2_default?: number;
      sc3_default?: number;
      brand_id?: string | null;
      costo_acquisto?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("prodotti")
        .insert({ 
          ...prodotto, 
          user_id: user?.id,
          formato: prodotto.formato ?? null,
          sc1_default: prodotto.sc1_default ?? 0,
          sc2_default: prodotto.sc2_default ?? 0,
          sc3_default: prodotto.sc3_default ?? 0,
          brand_id: prodotto.brand_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prodotti"] });
      toast.success("Prodotto aggiunto!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

export function useUpdateProdotto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Prodotto> & { id: string }) => {
      const { error } = await supabase
        .from("prodotti")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prodotti"] });
      toast.success("Prodotto aggiornato!");
    },
    onError: (error) => {
      toast.error("Errore: " + error.message);
    },
  });
}

/**
 * Eliminazione di un prodotto = spostamento nel cestino (deleted_at), mai
 * cancellazione fisica: le righe degli ordini storici restano intatte.
 *
 * - Idempotente: aggiorna solo se il prodotto non è già nel cestino, quindi un
 *   doppio tocco o una richiesta ripetuta non fa danni (prima un secondo DELETE
 *   sullo stesso prodotto diventava una cancellazione definitiva in cascata).
 * - Ottimistica: la riga sparisce subito da tutte le liste; se il server
 *   rifiuta, le liste vengono ripristinate.
 * - Il messaggio di successo compare solo dopo la conferma del server.
 */
export function useDeleteProdotto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("prodotti")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .is("deleted_at", null)
        .select("id");
      if (error) throw error;
      return { id, giaEliminato: !data || data.length === 0 };
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["prodotti"] });
      const snapshot = queryClient.getQueriesData<Prodotto[]>({ queryKey: ["prodotti"] });
      for (const [key, list] of snapshot) {
        if (Array.isArray(list)) queryClient.setQueryData<Prodotto[]>(key, list.filter((p) => p.id !== id));
      }
      return { snapshot };
    },
    onError: (error, _id, ctx) => {
      for (const [key, list] of ctx?.snapshot ?? []) queryClient.setQueryData(key, list);
      toast.error("Prodotto non eliminato", {
        description: error instanceof Error ? error.message : "Controlla la connessione e riprova.",
      });
    },
    onSuccess: ({ id, giaEliminato }) => {
      if (giaEliminato) return; // già nel cestino (doppio tocco): nessun secondo messaggio
      toast.success("Prodotto spostato nel cestino", {
        description: "Gli ordini che lo contengono non cambiano.",
        action: {
          label: "Annulla",
          onClick: async () => {
            const { error } = await supabase.from("prodotti").update({ deleted_at: null }).eq("id", id);
            if (error) toast.error("Ripristino non riuscito", { description: error.message });
            else toast.success("Prodotto ripristinato");
            queryClient.invalidateQueries({ queryKey: ["prodotti"] });
          },
        },
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["prodotti"] });
    },
  });
}
