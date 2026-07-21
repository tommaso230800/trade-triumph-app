import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DocumentoTipo =
  | "ordine_originale"
  | "conferma_ordine"
  | "fattura"
  | "nota_credito"
  | "contratto"
  | "listino"
  | "accordo_provv"
  | "promo"
  | "email"
  | "estratto_provv"
  | "altro";

export type DocumentoEntita =
  | "ordine"
  | "cliente"
  | "azienda"
  | "provvigione"
  | "segnalazione"
  | "generico";

export type Documento = {
  id: string;
  user_id: string;
  entita: DocumentoEntita;
  entita_id: string | null;
  tipo: DocumentoTipo;
  nome_file: string;
  storage_path: string;
  mime_type: string | null;
  dimensione: number | null;
  hash_sha256: string | null;
  tags: string[] | null;
  note: string | null;
  classificazione_ai: any | null;
  suggerimenti_ai: any | null;
  verificato: boolean;
  created_at: string;
  updated_at: string;
};

export const TIPO_LABEL: Record<DocumentoTipo, string> = {
  ordine_originale: "Ordine originale",
  conferma_ordine: "Conferma d'ordine",
  fattura: "Fattura",
  nota_credito: "Nota di credito",
  contratto: "Contratto",
  listino: "Listino",
  accordo_provv: "Accordo provvigionale",
  promo: "Promozione",
  email: "Email",
  estratto_provv: "Estratto provvigioni",
  altro: "Altro",
};

export function useDocumenti(entita?: DocumentoEntita, entita_id?: string | null) {
  return useQuery({
    queryKey: ["documenti", entita, entita_id],
    queryFn: async () => {
      let q = supabase.from("documenti").select("*").order("created_at", { ascending: false });
      if (entita) q = q.eq("entita", entita);
      if (entita_id) q = q.eq("entita_id", entita_id);
      const { data, error } = await q;
      if (error) throw error;
      return data as Documento[];
    },
    enabled: entita !== undefined,
  });
}

async function sha256Hex(file: File): Promise<string | null> {
  try {
    const buf = await file.arrayBuffer();
    const hash = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}

export function useUploadDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      file: File;
      entita: DocumentoEntita;
      entita_id?: string | null;
      tipo?: DocumentoTipo;
      note?: string;
      tags?: string[];
      autoClassify?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");

      const ext = input.file.name.split(".").pop() || "bin";
      const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${input.entita}/${crypto.randomUUID()}-${safeName}`;

      const { error: upErr } = await supabase.storage
        .from("documenti")
        .upload(path, input.file, { contentType: input.file.type, upsert: false });
      if (upErr) throw upErr;

      const hash = await sha256Hex(input.file);

      const { data: row, error: insErr } = await supabase
        .from("documenti")
        .insert({
          user_id: user.id,
          entita: input.entita,
          entita_id: input.entita_id ?? null,
          tipo: input.tipo ?? "altro",
          nome_file: input.file.name,
          storage_path: path,
          mime_type: input.file.type || null,
          dimensione: input.file.size,
          hash_sha256: hash,
          tags: input.tags ?? [],
          note: input.note ?? null,
        })
        .select()
        .single();
      if (insErr) throw insErr;

      // Auto-classifica in background (best-effort)
      if (input.autoClassify !== false) {
        supabase.functions
          .invoke("classify-document", { body: { documento_id: row.id } })
          .catch(() => void 0);
      }
      return row as Documento;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["documenti"] });
      toast.success(`Documento "${v.file.name}" caricato`);
    },
    onError: (e: any) => toast.error("Errore upload: " + e.message),
  });
}

export function useUpdateDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Documento> & { id: string }) => {
      const { error } = await supabase.from("documenti").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documenti"] });
      toast.success("Documento aggiornato");
    },
    onError: (e: any) => toast.error("Errore: " + e.message),
  });
}

export function useDeleteDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: Documento) => {
      await supabase.storage.from("documenti").remove([doc.storage_path]);
      const { error } = await supabase.from("documenti").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documenti"] });
      toast.success("Documento eliminato");
    },
    onError: (e: any) => toast.error("Errore: " + e.message),
  });
}

export async function getDocumentoSignedUrl(storage_path: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from("documenti")
    .createSignedUrl(storage_path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
