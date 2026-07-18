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
  esito_economico: string | null;
  azione_consigliata: string | null;
  motivo: string | null;
  score_breakdown: any;
  crm_only: boolean;
  verificata: boolean;
  verificata_at: string | null;
  verificata_by: string | null;
  verificata_note: string | null;
  ordine_snapshot: any;
  pagata?: boolean;
  pagata_at?: string | null;
  pagata_importo?: number | null;
  pagamento_target_type?: string | null;
  pagamento_target_id?: string | null;
  riconciliazione_pagamento_id?: string | null;
  stato_verifica?: string | null;
  provvigione_attesa?: number | null;
  cross_estratto_candidates?: any;
  created_at: string;
  updated_at: string;
};

export const STATO_VERIFICA_LABEL: Record<string, string> = {
  da_verificare: "Da verificare",
  non_fatturato: "Non ancora fatturato",
  liquidato_altrove: "Liquidato in altro trimestre",
  non_provvigionale: "Non provvigionale",
  annullato: "Ordine annullato",
  contestazione_aperta: "Contestazione aperta",
  contestato: "Contestato all'azienda",
  recuperato: "Recuperato",
  chiuso: "Chiuso con motivazione",
};


// ---------- Labels ----------

export const MATCH_STATUS_LABEL: Record<string, string> = {
  esatta: "Abbinamento esatto",
  esatta_confermata: "Abbinamento confermato",
  probabile: "Abbinamento probabile",
  multipli: "Più ordini compatibili",
  mancante_crm: "Nessun ordine trovato nel CRM",
  mancante_pdf: "Ordine CRM assente nel PDF",
  straordinaria: "Movimento straordinario",
  bonus: "Bonus / Premio",
  ignorata: "Ignorata",
  da_verificare: "Da verificare",
  verificata: "Verificata manualmente",
};

export const ESITO_LABEL: Record<string, string> = {
  corretto: "Importi corretti",
  diff_imponibile: "Imponibile differente",
  diff_aliquota: "Aliquota differente",
  diff_provvigione: "Provvigione differente",
  diff_multiple: "Più differenze",
  dati_insufficienti: "Dati insufficienti",
  non_riconosciuta: "Provvigione attesa non riconosciuta",
  extra: "Provvigione ricevuta ma non nel CRM",
};

export const AZIONE_LABEL: Record<string, string> = {
  nessuna: "Nessuna azione",
  verifica: "Verifica abbinamento",
  collega: "Collega ordine",
  crea_ordine: "Crea ordine dal PDF",
  classifica: "Classifica movimento",
  contesta: "Contesta differenza",
  completa_dati: "Completa i dati",
};

// ---------- Queries ----------

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
        .order("crm_only", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as EstrattoRiga[];
    },
    enabled: !!estrattoId,
  });
}

// ---------- Upload ----------

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

      const path = `${user.id}/${Date.now()}_${input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage
        .from("estratti-provvigioni")
        .upload(path, input.file, { contentType: input.file.type || "application/pdf", upsert: false });
      if (upErr) throw upErr;

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estratto_righe"] });
      qc.invalidateQueries({ queryKey: ["estratti_provvigioni"] });
    },
    onError: (e: any) => toast.error("Errore: " + (e?.message || "")),
  });
}

export function useMarkVerificata() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, nota }: { id: string; nota?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("estratti_provvigioni_righe").update({
        verificata: true,
        verificata_at: new Date().toISOString(),
        verificata_by: user?.id ?? null,
        verificata_note: nota ?? null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estratto_righe"] });
      toast.success("Riga contrassegnata come verificata");
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

// ---------- Matching helpers ----------

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

type ScorePart = { label: string; pts: number };

export function scoreOrdine(riga: EstrattoRiga, o: OrdineLite): { score: number; parts: ScorePart[] } {
  const parts: ScorePart[] = [];
  let score = 0;

  const cliSim = Math.max(
    similarity(riga.cliente_nome || "", o.cliente_nome || ""),
    similarity(riga.cliente_nome || "", o.cliente_azienda || ""),
  );
  if (cliSim >= 0.9) { score += 40; parts.push({ label: "Cliente coincidente", pts: 40 }); }
  else if (cliSim >= 0.6) { score += 25; parts.push({ label: "Cliente molto simile", pts: 25 }); }
  else if (cliSim >= 0.3) { score += 10; parts.push({ label: "Cliente parzialmente simile", pts: 10 }); }

  if (riga.imponibile != null && o.totale) {
    const diff = Math.abs(riga.imponibile - o.totale);
    const rel = diff / Math.max(1, o.totale);
    if (rel < 0.005) { score += 35; parts.push({ label: "Imponibile coincidente", pts: 35 }); }
    else if (rel < 0.02) { score += 25; parts.push({ label: "Imponibile molto simile", pts: 25 }); }
    else if (rel < 0.05) { score += 12; parts.push({ label: `Imponibile differente di ${diff.toFixed(2)} €`, pts: 12 }); }
    else parts.push({ label: `Imponibile molto diverso (Δ ${diff.toFixed(2)} €)`, pts: 0 });
  }

  if (riga.numero_ordine && o.codice && normalizeName(riga.numero_ordine) === normalizeName(o.codice)) {
    score += 40;
    parts.push({ label: "Numero ordine coincidente", pts: 40 });
  }

  if (riga.data_riga && o.data_ordine) {
    const dd = Math.abs(new Date(riga.data_riga).getTime() - new Date(o.data_ordine).getTime()) / (1000 * 3600 * 24);
    if (dd < 5) { score += 15; parts.push({ label: `Date molto vicine (${Math.round(dd)}g)`, pts: 15 }); }
    else if (dd < 15) { score += 10; parts.push({ label: `Date vicine (${Math.round(dd)}g)`, pts: 10 }); }
    else if (dd < 45) { score += 5; parts.push({ label: `Date entro un mese (${Math.round(dd)}g)`, pts: 5 }); }
    else parts.push({ label: `Date lontane (${Math.round(dd)}g)`, pts: 0 });
  }

  return { score: Math.min(100, Math.round(score)), parts };
}

export function findMatches(riga: EstrattoRiga, ordini: OrdineLite[], aziendaId: string | null) {
  return ordini
    .filter((o) => !aziendaId || o.azienda_id === aziendaId)
    .map((o) => {
      const { score, parts } = scoreOrdine(riga, o);
      return { ordine: o, score, parts };
    })
    .filter((c) => c.score >= 20)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

// ---------- Economic evaluation ----------

function computeEsito(pdfImp: number | null, pdfAliq: number | null, pdfProv: number | null,
                     crmImp: number | null, crmAliq: number | null): { esito: string; diffProv: number | null; motivo: string } {
  if (pdfImp == null || crmImp == null) {
    return { esito: "dati_insufficienti", diffProv: null, motivo: "Dati economici non completi." };
  }
  const dImp = Math.abs(pdfImp - crmImp);
  const relImp = dImp / Math.max(1, crmImp);
  const impDiff = relImp >= 0.005;
  const aliqDiff = pdfAliq != null && crmAliq != null && Math.abs(pdfAliq - crmAliq) > 0.001;
  const crmProv = crmImp * ((crmAliq ?? pdfAliq ?? 0) / 100);
  const diffProv = (pdfProv ?? 0) - crmProv;

  const flags = [impDiff, aliqDiff].filter(Boolean).length;
  let esito = "corretto";
  const motivi: string[] = [];
  if (flags >= 2) esito = "diff_multiple";
  else if (impDiff) { esito = "diff_imponibile"; motivi.push(`Imponibile differente di ${dImp.toFixed(2)} €`); }
  else if (aliqDiff) { esito = "diff_aliquota"; motivi.push(`Aliquota PDF ${pdfAliq}%, CRM ${crmAliq}%`); }
  else if (Math.abs(diffProv) > 0.01) { esito = "diff_provvigione"; motivi.push(`Provvigione differente di ${diffProv.toFixed(2)} €`); }
  else motivi.push("Cliente, importo e aliquota coincidono.");

  return { esito, diffProv, motivo: motivi.join(" ") };
}

// ---------- Matching engine ----------

export function useRunMatching() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ estrattoId, aziendaId }: { estrattoId: string; aziendaId: string | null }) => {
      const { data: righeAll } = await supabase
        .from("estratti_provvigioni_righe")
        .select("*")
        .eq("estratto_id", estrattoId);
      if (!righeAll) return { updated: 0, phantomAdded: 0, kept: 0 };

      // Load ordini + azienda for CRM-side sweep
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

      let updated = 0, kept = 0;
      const linkedOrderIds = new Set<string>();

      for (const r of righeAll as EstrattoRiga[]) {
        if (r.verificata) { kept++; if (r.ordine_id) linkedOrderIds.add(r.ordine_id); continue; }
        if (r.crm_only) continue; // rebuilt below

        // Straordinari
        if (r.tipo_movimento && r.tipo_movimento !== "ordinaria") {
          await supabase.from("estratti_provvigioni_righe").update({
            match_status: "straordinaria",
            match_score: 100,
            esito_economico: "corretto",
            azione_consigliata: "classifica",
            motivo: `Movimento ${r.tipo_movimento}. Nessun ordine da collegare.`,
            score_breakdown: null,
            ordine_id: null,
            ordine_snapshot: null,
          }).eq("id", r.id);
          updated++;
          continue;
        }

        const candidates = findMatches(r, ordiniLite, aziendaId);
        const top = candidates[0];
        let status = "mancante_crm";
        let ordineId: string | null = null;
        let score = top?.score ?? 0;
        let snapshot: any = null;
        let esitoInfo = { esito: "dati_insufficienti", diffProv: null as number | null, motivo: "" };
        let azione = "verifica";
        let motivo = "";

        if (top && top.score >= 85 && candidates.filter((c) => c.score >= 75).length === 1) {
          status = "esatta";
          ordineId = top.ordine.id;
          snapshot = { id: top.ordine.id, codice: top.ordine.codice, data: top.ordine.data_ordine, totale: top.ordine.totale, cliente: top.ordine.cliente_nome };
          esitoInfo = computeEsito(r.imponibile, r.aliquota, r.provvigione, top.ordine.totale, r.aliquota);
          azione = esitoInfo.esito === "corretto" ? "nessuna" : "contesta";
          motivo = esitoInfo.motivo || "Cliente e importo coincidono con un ordine del CRM.";
          linkedOrderIds.add(ordineId);
        } else if (top && top.score >= 60) {
          status = candidates.filter((c) => c.score >= 55).length > 1 ? "multipli" : "probabile";
          motivo = status === "multipli"
            ? `Trovati ${candidates.length} ordini con caratteristiche simili.`
            : `Miglior candidato: ordine ${top.ordine.codice}. ${top.parts.map((p) => p.label).join(", ")}.`;
          azione = "verifica";
          esitoInfo = { esito: "dati_insufficienti", diffProv: null, motivo: "" };
        } else {
          status = "mancante_crm";
          motivo = top
            ? `Nessun candidato attendibile (miglior punteggio ${top.score}%). Possibile ordine dimenticato nel CRM.`
            : `Nessun ordine dello stesso cliente trovato nel periodo.`;
          esitoInfo = { esito: "extra", diffProv: r.provvigione, motivo: "Provvigione ricevuta ma non registrata nel CRM." };
          azione = "collega";
        }

        await supabase.from("estratti_provvigioni_righe").update({
          match_status: status,
          match_score: score,
          ordine_id: ordineId,
          ordine_snapshot: snapshot,
          match_candidates: candidates.map((c) => ({
            id: c.ordine.id, score: c.score, codice: c.ordine.codice,
            cliente: c.ordine.cliente_nome, totale: c.ordine.totale, data: c.ordine.data_ordine,
            parts: c.parts,
          })),
          score_breakdown: top ? top.parts : null,
          esito_economico: esitoInfo.esito,
          azione_consigliata: azione,
          motivo,
        }).eq("id", r.id);
        updated++;
      }

      // Rebuild CRM-only phantom rows (ordini nel CRM ma non nel PDF)
      // Remove old crm_only rows that are NOT verified
      await supabase.from("estratti_provvigioni_righe")
        .delete()
        .eq("estratto_id", estrattoId)
        .eq("crm_only", true)
        .eq("verificata", false);

      // Determine estratto period
      const { data: est } = await supabase.from("estratti_provvigioni")
        .select("user_id, anno, trimestre, azienda_id")
        .eq("id", estrattoId).single();

      let phantomAdded = 0;
      if (est) {
        const qStart = new Date(est.anno, (est.trimestre - 1) * 3, 1);
        const qEnd = new Date(est.anno, est.trimestre * 3, 0);
        const missing = ordiniLite.filter((o) => {
          if (!o.data_ordine) return false;
          const d = new Date(o.data_ordine);
          if (d < qStart || d > qEnd) return false;
          return !linkedOrderIds.has(o.id);
        });

        // Also skip ordini already linked in verified rows (already added to linkedOrderIds)
        if (missing.length > 0) {
          const rows = missing.map((o) => ({
            user_id: est.user_id,
            estratto_id: estrattoId,
            ordine_id: o.id,
            cliente_nome: o.cliente_nome,
            numero_ordine: o.codice,
            data_riga: o.data_ordine,
            imponibile: o.totale,
            aliquota: null,
            provvigione: null,
            tipo_movimento: "ordinaria",
            crm_only: true,
            match_status: "mancante_pdf",
            match_score: 100,
            esito_economico: "non_riconosciuta",
            azione_consigliata: "contesta",
            motivo: "Ordine presente nel CRM ma assente nell'estratto provvigionale.",
            ordine_snapshot: { id: o.id, codice: o.codice, data: o.data_ordine, totale: o.totale, cliente: o.cliente_nome },
          }));
          const { error } = await supabase.from("estratti_provvigioni_righe").insert(rows);
          if (!error) phantomAdded = rows.length;
        }
      }

      await supabase.from("estratti_provvigioni").update({ stato: "riconciliato_parzialmente" }).eq("id", estrattoId);

      return { updated, phantomAdded, kept };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["estratto_righe"] });
      qc.invalidateQueries({ queryKey: ["estratti_provvigioni"] });
      toast.success(`Riconciliazione: ${res.updated} righe aggiornate, ${res.phantomAdded} ordini mancanti nel PDF, ${res.kept} verificate mantenute.`);
    },
    onError: (e: any) => toast.error("Errore matching: " + (e?.message || "")),
  });
}

export function useLinkOrdine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rigaId, ordineId }: { rigaId: string; ordineId: string | null }) => {
      let snapshot: any = null;
      if (ordineId) {
        const { data: o } = await supabase.from("ordini")
          .select("id, codice, data_ordine, totale, clienti(nome)")
          .eq("id", ordineId).single();
        if (o) snapshot = { id: o.id, codice: o.codice, data: o.data_ordine, totale: o.totale, cliente: (o as any).clienti?.nome };
      }
      const { error } = await supabase.from("estratti_provvigioni_righe").update({
        ordine_id: ordineId,
        match_status: ordineId ? "esatta_confermata" : "da_verificare",
        match_score: ordineId ? 100 : 0,
        ordine_snapshot: snapshot,
        esito_economico: ordineId ? "corretto" : null,
        azione_consigliata: "nessuna",
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

// ---------- Confirm payment (idempotent) ----------

export type ConfirmPagamentoInput = {
  estratto: EstrattoDoc;
  righeIds: string[];
  data_pagamento: string; // YYYY-MM-DD
  importo_totale: number;
  metodo_pagamento: string;
  riferimento_pagamento?: string;
  note?: string;
  tipo_pagamento: "completo" | "parziale";
  ripartizione?: Record<string, number>; // riga_id -> importo pagato
  forceRepay?: boolean; // permette di ri-registrare provvigioni già pagate
};

export type ConfirmPagamentoResult = {
  pagamentoId: string;
  righeAggiornate: number;
  ordiniPagate: number;
  scadenzePagate: number;
  movimentiCreati: number;
  righeGiaPagate: number;
  righeParziali: number;
  aziendaId: string | null;
  anno: number;
  trimestre: number;
};

export function useConfirmPagamento() {
  const qc = useQueryClient();
  return useMutation<ConfirmPagamentoResult, Error, ConfirmPagamentoInput>({
    mutationFn: async (input) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");

      const { data: righe, error: rErr } = await supabase
        .from("estratti_provvigioni_righe")
        .select("*")
        .in("id", input.righeIds);
      if (rErr) throw rErr;
      if (!righe || righe.length === 0) throw new Error("Nessuna riga selezionata");

      // Crea header pagamento
      const { data: pagamento, error: pErr } = await supabase
        .from("riconciliazioni_pagamenti")
        .insert({
          user_id: user.id,
          estratto_id: input.estratto.id,
          data_pagamento: input.data_pagamento,
          importo_totale: input.importo_totale,
          metodo_pagamento: input.metodo_pagamento,
          riferimento_pagamento: input.riferimento_pagamento || null,
          note: input.note || null,
          tipo_pagamento: input.tipo_pagamento,
          num_righe: righe.length,
          righe_ids: input.righeIds,
        })
        .select()
        .single();
      if (pErr) throw pErr;

      let ordiniPagate = 0, scadenzePagate = 0, movimentiCreati = 0, righeGiaPagate = 0, righeParziali = 0;

      const shareFor = (r: any) => {
        if (input.tipo_pagamento === "parziale" && input.ripartizione && input.ripartizione[r.id] != null) {
          return Number(input.ripartizione[r.id]) || 0;
        }
        return Number(r.provvigione) || 0;
      };

      for (const r of righe as any[]) {
        const importoRiga = shareFor(r);
        const isParziale = input.tipo_pagamento === "parziale" && importoRiga > 0 && importoRiga + 0.01 < (Number(r.provvigione) || 0);
        const nuovoStato = importoRiga <= 0 ? "da_pagare" : isParziale ? "parziale" : "pagata";
        if (isParziale) righeParziali++;

        let targetType: string | null = null;
        let targetId: string | null = null;

        // ORDINE COLLEGATO
        if (r.ordine_id) {
          const { data: ord } = await supabase.from("ordini")
            .select("id, stato_provvigione, riconciliazione_pagamento_id")
            .eq("id", r.ordine_id).single();
          if (ord?.stato_provvigione === "pagata" && ord.riconciliazione_pagamento_id && !input.forceRepay) {
            righeGiaPagate++;
          } else {
            await supabase.from("ordini").update({
              stato_provvigione: nuovoStato,
              provvigione_pagata: nuovoStato === "pagata",
              importo_provvigione_pagata: importoRiga,
              data_incasso_provvigione: input.data_pagamento,
              metodo_pagamento_provvigione: input.metodo_pagamento,
              riferimento_pagamento_provvigione: input.riferimento_pagamento || null,
              note_provvigione: input.note || r.note || null,
              estratto_riga_id: r.id,
              riconciliazione_pagamento_id: pagamento.id,
            }).eq("id", r.ordine_id);
            ordiniPagate++;
            targetType = "ordine";
            targetId = r.ordine_id;
          }
        } else if (r.match_status === "bonus" || r.match_status === "straordinaria" || (r.tipo_movimento && r.tipo_movimento !== "ordinaria")) {
          // MOVIMENTO AUTONOMO (bonus/conguaglio/rettifica/storno)
          const importoMov = (r.tipo_movimento === "storno" || r.tipo_movimento === "nota_credito")
            ? -Math.abs(importoRiga)
            : importoRiga;
          const { data: existing } = await supabase.from("movimenti_provvigione")
            .select("id").eq("estratto_riga_id", r.id).maybeSingle();
          let movId: string;
          if (existing?.id) {
            await supabase.from("movimenti_provvigione").update({
              importo: importoMov,
              stato: nuovoStato,
              data_pagamento: input.data_pagamento,
              metodo_pagamento: input.metodo_pagamento,
              riferimento_pagamento: input.riferimento_pagamento || null,
              note: input.note || r.note || null,
              riconciliazione_id: pagamento.id,
            }).eq("id", existing.id);
            movId = existing.id;
            righeGiaPagate++;
          } else {
            const { data: mv, error: mErr } = await supabase.from("movimenti_provvigione").insert({
              user_id: user.id,
              azienda_id: input.estratto.azienda_id,
              anno: input.estratto.anno,
              trimestre: input.estratto.trimestre,
              tipo: r.tipo_movimento || "bonus",
              descrizione: r.descrizione || r.cliente_nome || "Movimento provvigionale",
              importo: importoMov,
              stato: nuovoStato,
              data_pagamento: input.data_pagamento,
              metodo_pagamento: input.metodo_pagamento,
              riferimento_pagamento: input.riferimento_pagamento || null,
              note: input.note || r.note || null,
              estratto_id: input.estratto.id,
              estratto_riga_id: r.id,
              riconciliazione_id: pagamento.id,
            }).select().single();
            if (mErr) throw mErr;
            movId = mv.id;
            movimentiCreati++;
          }
          targetType = "movimento";
          targetId = movId;
        } else {
          // Nessun ordine e non è un movimento speciale → salva come bonus provvigionale generico
          const { data: existing } = await supabase.from("movimenti_provvigione")
            .select("id").eq("estratto_riga_id", r.id).maybeSingle();
          if (existing?.id) {
            await supabase.from("movimenti_provvigione").update({
              importo: importoRiga,
              stato: nuovoStato,
              data_pagamento: input.data_pagamento,
              metodo_pagamento: input.metodo_pagamento,
              riferimento_pagamento: input.riferimento_pagamento || null,
              riconciliazione_id: pagamento.id,
            }).eq("id", existing.id);
            targetId = existing.id;
            righeGiaPagate++;
          } else {
            const { data: mv, error: mErr } = await supabase.from("movimenti_provvigione").insert({
              user_id: user.id,
              azienda_id: input.estratto.azienda_id,
              anno: input.estratto.anno,
              trimestre: input.estratto.trimestre,
              tipo: "extra_pdf",
              descrizione: `${r.cliente_nome || "—"} · ${r.numero_fattura || r.numero_ordine || "s/riferimento"}`,
              importo: importoRiga,
              stato: nuovoStato,
              data_pagamento: input.data_pagamento,
              metodo_pagamento: input.metodo_pagamento,
              riferimento_pagamento: input.riferimento_pagamento || null,
              note: input.note || r.note || null,
              estratto_id: input.estratto.id,
              estratto_riga_id: r.id,
              riconciliazione_id: pagamento.id,
            }).select().single();
            if (mErr) throw mErr;
            targetId = mv.id;
            movimentiCreati++;
          }
          targetType = "movimento";
        }

        // Aggiorna riga estratto
        await supabase.from("estratti_provvigioni_righe").update({
          pagata: !isParziale && importoRiga > 0,
          pagata_at: new Date().toISOString(),
          pagata_importo: importoRiga,
          pagamento_target_type: targetType,
          pagamento_target_id: targetId,
          riconciliazione_pagamento_id: pagamento.id,
          match_status: "verificata",
          verificata: true,
          verificata_at: new Date().toISOString(),
          verificata_by: user.id,
        }).eq("id", r.id);
      }

      // Aggiorna stato estratto
      const { data: tutteRighe } = await supabase.from("estratti_provvigioni_righe")
        .select("pagata, crm_only, match_status")
        .eq("estratto_id", input.estratto.id);
      const nonPagate = (tutteRighe || []).filter((x: any) => !x.pagata && !x.crm_only);
      const anomalie = (tutteRighe || []).filter((x: any) => x.crm_only || x.match_status === "mancante_crm" || x.match_status === "multipli");
      let statoEstratto = "pagamento_registrato";
      if (nonPagate.length === 0 && anomalie.length === 0) statoEstratto = "riconciliato_pagato";
      else if (nonPagate.length === 0 && anomalie.length > 0) statoEstratto = "pagato_con_anomalie";
      else if (input.tipo_pagamento === "parziale") statoEstratto = "pagamento_parziale";
      await supabase.from("estratti_provvigioni").update({ stato: statoEstratto }).eq("id", input.estratto.id);

      return {
        pagamentoId: pagamento.id,
        righeAggiornate: righe.length,
        ordiniPagate,
        scadenzePagate,
        movimentiCreati,
        righeGiaPagate,
        righeParziali,
        aziendaId: input.estratto.azienda_id,
        anno: input.estratto.anno,
        trimestre: input.estratto.trimestre,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estratto_righe"] });
      qc.invalidateQueries({ queryKey: ["estratti_provvigioni"] });
      qc.invalidateQueries({ queryKey: ["ordini"] });
      qc.invalidateQueries({ queryKey: ["scadenziario"] });
      qc.invalidateQueries({ queryKey: ["movimenti_provvigione"] });
      qc.invalidateQueries({ queryKey: ["riconciliazioni_pagamenti"] });
      toast.success("Pagamento registrato");
    },
    onError: (e: any) => toast.error("Errore salvataggio pagamento: " + (e?.message || "")),
  });
}

export function useMovimentiProvvigione() {
  return useQuery({
    queryKey: ["movimenti_provvigione"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimenti_provvigione")
        .select("*, aziende(nome), estratti_provvigioni(file_name, anno, trimestre)")
        .order("data_pagamento", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useRiconciliazioniPagamenti(estrattoId?: string) {
  return useQuery({
    queryKey: ["riconciliazioni_pagamenti", estrattoId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("riconciliazioni_pagamenti").select("*").order("created_at", { ascending: false });
      if (estrattoId) q = q.eq("estratto_id", estrattoId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

