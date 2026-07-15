import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EstrattoDoc = {
  id: string;
  user_id: string;
  azienda_id: string | null;
  anno: number;
  trimestre: number;
  tipo_documento: string;
  data_documento: string | null;
  data_pagamento: string | null;
  file_path: string | null;
  file_name: string | null;
  file_hash: string | null;
  totale_dichiarato: number;
  num_righe: number;
  stato: string;
  raw_extraction: any;
  note: string | null;
  created_at: string;
  updated_at: string;
  aziende?: { nome: string } | null;
};

export type EstrattoRiga = {
  id: string;
  user_id: string;
  estratto_id: string;
  ordine_id: string | null;
  cliente_id: string | null;
  cliente_nome: string | null;
  cliente_codice: string | null;
  numero_ordine: string | null;
  numero_fattura: string | null;
  data_riga: string | null;
  imponibile: number | null;
  aliquota: number | null;
  provvigione: number | null;
  tipo_movimento: string;
  descrizione: string | null;
  note: string | null;
  match_status: string;
  match_score: number;
  match_candidates: any;
  anomalia_stato: string | null;
  anomalia_note: string | null;
  correzioni: any;
  created_at: string;
  updated_at: string;
};

export function useEstratti() {
  return useQuery({
    queryKey: ["estratti_provvigioni"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estratti_provvigioni")
        .select("*, aziende(nome)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EstrattoDoc[];
    },
  });
}

export function useEstrattoRighe(estrattoId: string | null) {
  return useQuery({
    queryKey: ["estratto_righe", estrattoId],
    queryFn: async () => {
      if (!estrattoId) return [];
      const { data, error } = await supabase
        .from("estratti_provvigioni_righe")
        .select("*")
        .eq("estratto_id", estrattoId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as EstrattoRiga[];
    },
    enabled: !!estrattoId,
  });
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  return btoa(binary);
}

export function useUploadEstratto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      file: File;
      azienda_id: string | null;
      anno: number;
      trimestre: number;
      tipo_documento: string;
      data_documento: string | null;
      data_pagamento: string | null;
      forceDuplicate?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");

      const buf = await input.file.arrayBuffer();
      const hash = await sha256Hex(buf);

      if (!input.forceDuplicate) {
        const { data: existing } = await supabase
          .from("estratti_provvigioni")
          .select("id, file_name")
          .eq("user_id", user.id)
          .eq("file_hash", hash)
          .limit(1);
        if (existing && existing.length > 0) {
          const err: any = new Error("duplicato");
          err.code = "DUPLICATE";
          err.existingId = existing[0].id;
          err.existingName = existing[0].file_name;
          throw err;
        }
      }

      // Upload PDF
      const path = `${user.id}/${Date.now()}_${input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage
        .from("estratti-provvigioni")
        .upload(path, input.file, { contentType: input.file.type || "application/pdf", upsert: false });
      if (upErr) throw upErr;

      // Create estratto row
      const { data: est, error: insErr } = await supabase
        .from("estratti_provvigioni")
        .insert({
          user_id: user.id,
          azienda_id: input.azienda_id,
          anno: input.anno,
          trimestre: input.trimestre,
          tipo_documento: input.tipo_documento,
          data_documento: input.data_documento,
          data_pagamento: input.data_pagamento,
          file_path: path,
          file_name: input.file.name,
          file_hash: hash,
          stato: "in_analisi",
        })
        .select()
        .single();
      if (insErr) throw insErr;

      // Call edge function to parse
      const base64 = arrayBufferToBase64(buf);
      const { data: parseRes, error: fnErr } = await supabase.functions.invoke("parse-estratto-provvigioni", {
        body: {
          pdfBase64: base64,
          mimeType: input.file.type || "application/pdf",
          hintAnno: input.anno,
          hintTrimestre: input.trimestre,
        },
      });
      if (fnErr) {
        await supabase.from("estratti_provvigioni").update({ stato: "errore", note: fnErr.message }).eq("id", est.id);
        throw fnErr;
      }

      const extracted = parseRes?.data;
      const righe = Array.isArray(extracted?.righe) ? extracted.righe : [];

      // Insert righe (unmatched yet)
      if (righe.length > 0) {
        const rows = righe.map((r: any) => ({
          user_id: user.id,
          estratto_id: est.id,
          cliente_nome: r.cliente_nome ?? null,
          cliente_codice: r.cliente_codice ?? null,
          numero_ordine: r.numero_ordine ?? null,
          numero_fattura: r.numero_fattura ?? null,
          data_riga: r.data_riga ?? null,
          imponibile: typeof r.imponibile === "number" ? r.imponibile : null,
          aliquota: typeof r.aliquota === "number" ? r.aliquota : null,
          provvigione: typeof r.provvigione === "number" ? r.provvigione : null,
          tipo_movimento: r.tipo_movimento ?? "ordinaria",
          descrizione: r.descrizione ?? null,
          match_status: "da_verificare",
          match_score: 0,
        }));
        const { error: rErr } = await supabase.from("estratti_provvigioni_righe").insert(rows);
        if (rErr) throw rErr;
      }

      await supabase
        .from("estratti_provvigioni")
        .update({
          stato: "analizzato",
          raw_extraction: extracted,
          num_righe: righe.length,
          totale_dichiarato: typeof extracted?.totale_dichiarato === "number" ? extracted.totale_dichiarato : righe.reduce((s: number, r: any) => s + (Number(r.provvigione) || 0), 0),
        })
        .eq("id", est.id);

      return est.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estratti_provvigioni"] });
      toast.success("Estratto conto analizzato");
    },
    onError: (e: any) => {
      if (e?.code !== "DUPLICATE") toast.error("Errore: " + (e?.message || "sconosciuto"));
    },
  });
}

export function useUpdateRiga() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<EstrattoRiga> }) => {
      const { error } = await supabase.from("estratti_provvigioni_righe").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["estratto_righe"] });
      qc.invalidateQueries({ queryKey: ["estratti_provvigioni"] });
    },
    onError: (e: any) => toast.error("Errore: " + (e?.message || "")),
  });
}

export function useDeleteEstratto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: est } = await supabase.from("estratti_provvigioni").select("file_path").eq("id", id).single();
      if (est?.file_path) {
        await supabase.storage.from("estratti-provvigioni").remove([est.file_path]);
      }
      const { error } = await supabase.from("estratti_provvigioni").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estratti_provvigioni"] });
      toast.success("Estratto eliminato");
    },
    onError: (e: any) => toast.error("Errore: " + (e?.message || "")),
  });
}

export async function getEstrattoSignedUrl(path: string) {
  const { data, error } = await supabase.storage.from("estratti-provvigioni").createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

// Matching utilities
export function normalizeName(s: string | null | undefined) {
  return (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

export function similarity(a: string, b: string): number {
  const A = normalizeName(a), B = normalizeName(b);
  if (!A || !B) return 0;
  if (A === B) return 1;
  const tokensA = new Set(A.split(" ").filter((t) => t.length > 1));
  const tokensB = new Set(B.split(" ").filter((t) => t.length > 1));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let inter = 0;
  tokensA.forEach((t) => { if (tokensB.has(t)) inter++; });
  return inter / Math.max(tokensA.size, tokensB.size);
}

export type OrdineLite = {
  id: string;
  cliente_nome: string | null;
  cliente_azienda?: string | null;
  data_ordine: string | null;
  totale: number;
  codice: string;
  azienda_id: string | null;
};

export function findMatches(riga: EstrattoRiga, ordini: OrdineLite[], aziendaId: string | null) {
  const candidates = ordini
    .filter((o) => !aziendaId || o.azienda_id === aziendaId)
    .map((o) => {
      let score = 0;
      // Cliente
      const cliSim = Math.max(
        similarity(riga.cliente_nome || "", o.cliente_nome || ""),
        similarity(riga.cliente_nome || "", o.cliente_azienda || ""),
      );
      score += cliSim * 40;

      // Imponibile close
      if (riga.imponibile != null && o.totale) {
        const diff = Math.abs(riga.imponibile - o.totale);
        const rel = diff / Math.max(1, o.totale);
        if (rel < 0.005) score += 35;
        else if (rel < 0.02) score += 25;
        else if (rel < 0.05) score += 12;
      }

      // Numero ordine ↔ codice
      if (riga.numero_ordine && o.codice && normalizeName(riga.numero_ordine) === normalizeName(o.codice)) {
        score += 40;
      }

      // Data vicina
      if (riga.data_riga && o.data_ordine) {
        const dd = Math.abs(new Date(riga.data_riga).getTime() - new Date(o.data_ordine).getTime()) / (1000 * 3600 * 24);
        if (dd < 15) score += 10;
        else if (dd < 45) score += 5;
      }

      return { ordine: o, score: Math.min(100, Math.round(score)) };
    })
    .filter((c) => c.score >= 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return candidates;
}

export function useRunMatching() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ estrattoId, aziendaId }: { estrattoId: string; aziendaId: string | null }) => {
      const { data: righe } = await supabase
        .from("estratti_provvigioni_righe")
        .select("*")
        .eq("estratto_id", estrattoId);
      if (!righe) return;

      // Load ordini for this azienda
      let q = supabase.from("ordini").select("id, codice, data_ordine, totale, azienda_id, clienti(nome, azienda)");
      if (aziendaId) q = q.eq("azienda_id", aziendaId);
      const { data: ordini } = await q;
      const ordiniLite: OrdineLite[] = (ordini || []).map((o: any) => ({
        id: o.id,
        codice: o.codice,
        data_ordine: o.data_ordine,
        totale: Number(o.totale) || 0,
        azienda_id: o.azienda_id,
        cliente_nome: o.clienti?.nome ?? null,
        cliente_azienda: o.clienti?.azienda ?? null,
      }));

      for (const r of righe as EstrattoRiga[]) {
        // Skip already-locked matches confirmed by user
        if (r.match_status === "esatta_confermata" || r.match_status === "bonus" || r.match_status === "ignorata") continue;

        // If tipo_movimento non ordinaria → classify as bonus/straordinaria
        if (r.tipo_movimento && r.tipo_movimento !== "ordinaria") {
          await supabase.from("estratti_provvigioni_righe").update({
            match_status: "straordinaria",
            match_score: 100,
            match_candidates: null,
          }).eq("id", r.id);
          continue;
        }

        const candidates = findMatches(r, ordiniLite, aziendaId);
        let status = "mancante_crm";
        let ordineId: string | null = null;
        let score = candidates[0]?.score ?? 0;
        if (candidates.length === 1 && candidates[0].score >= 85) {
          status = "esatta";
          ordineId = candidates[0].ordine.id;
        } else if (candidates.length >= 1 && candidates[0].score >= 65) {
          status = "probabile";
        } else if (candidates.length > 1) {
          status = "multipli";
        }

        await supabase.from("estratti_provvigioni_righe").update({
          match_status: status,
          match_score: score,
          ordine_id: ordineId,
          match_candidates: candidates.map((c) => ({ id: c.ordine.id, score: c.score, codice: c.ordine.codice, cliente: c.ordine.cliente_nome, totale: c.ordine.totale, data: c.ordine.data_ordine })),
        }).eq("id", r.id);
      }

      // Update parent stato
      await supabase.from("estratti_provvigioni").update({ stato: "riconciliato_parzialmente" }).eq("id", estrattoId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estratto_righe"] });
      qc.invalidateQueries({ queryKey: ["estratti_provvigioni"] });
      toast.success("Riconciliazione completata");
    },
    onError: (e: any) => toast.error("Errore matching: " + (e?.message || "")),
  });
}

export function useLinkOrdine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rigaId, ordineId }: { rigaId: string; ordineId: string | null }) => {
      const { error } = await supabase.from("estratti_provvigioni_righe").update({
        ordine_id: ordineId,
        match_status: ordineId ? "esatta_confermata" : "da_verificare",
        match_score: ordineId ? 100 : 0,
      }).eq("id", rigaId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estratto_righe"] });
      toast.success("Collegamento aggiornato");
    },
    onError: (e: any) => toast.error("Errore: " + (e?.message || "")),
  });
}
