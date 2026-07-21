// Motore di matching CRM ↔ documento (reclami / note credito)
// Dato un documento (nome file / testo estratto o campi manuali) prova a
// suggerire l'ordine, il cliente e l'azienda più probabili nel CRM.

import { supabase } from "@/integrations/supabase/client";

export type MatchCandidato = {
  ordine_id?: string | null;
  ordine_codice?: string | null;
  cliente_id?: string | null;
  cliente_nome?: string | null;
  azienda_id?: string | null;
  azienda_nome?: string | null;
  data_ordine?: string | null;
  totale?: number | null;
  score: number;          // 0..100
  motivi: string[];
};

export type MatchInput = {
  filename?: string | null;
  testo?: string | null;               // testo grezzo del PDF/note (facoltativo)
  cliente_hint?: string | null;        // ragione sociale sospetta
  azienda_hint?: string | null;
  ordine_codice_hint?: string | null;  // es. "ORD-2025-0123"
  importo_hint?: number | null;
  data_hint?: string | null;           // ISO
};

// -------- helpers ----------
function norm(s: string | null | undefined) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
function tokenSet(s: string) {
  return new Set(norm(s).split(" ").filter((t) => t.length >= 3));
}
function jaccard(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  a.forEach((t) => { if (b.has(t)) inter++; });
  return inter / (a.size + b.size - inter);
}

function estraiCodiceOrdine(testi: (string | null | undefined)[]) {
  const rx = /\bORD[-\s]?\d{4}[-\s]?\d{3,5}\b/i;
  for (const t of testi) {
    if (!t) continue;
    const m = t.match(rx);
    if (m) return m[0].toUpperCase().replace(/\s/g, "-");
  }
  return null;
}

function estraiImporto(testi: (string | null | undefined)[]) {
  const rx = /(?:€|eur|euro)\s*([0-9]{1,3}(?:[.\s][0-9]{3})*(?:[,.][0-9]{2})?)/i;
  for (const t of testi) {
    if (!t) continue;
    const m = t.match(rx);
    if (m) {
      const s = m[1].replace(/[.\s]/g, "").replace(",", ".");
      const n = parseFloat(s);
      if (!isNaN(n)) return n;
    }
  }
  return null;
}

// -------- main ----------
export async function trovaCandidatiSegnalazione(input: MatchInput, limit = 6): Promise<MatchCandidato[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const testi = [input.filename, input.testo];
  const codiceOrdine = input.ordine_codice_hint || estraiCodiceOrdine(testi);
  const importo = input.importo_hint ?? estraiImporto(testi);
  const clienteTok = tokenSet(input.cliente_hint || input.testo || input.filename || "");
  const aziendaTok = tokenSet(input.azienda_hint || input.testo || input.filename || "");

  const candidati: MatchCandidato[] = [];

  // 1) match diretto per codice ordine → punteggio massimo
  if (codiceOrdine) {
    const { data } = await supabase
      .from("ordini")
      .select("id, codice, cliente_id, azienda_id, data_ordine, totale, clienti(nome), aziende(nome)")
      .eq("user_id", user.id)
      .eq("codice", codiceOrdine)
      .maybeSingle();
    if (data) {
      candidati.push({
        ordine_id: data.id,
        ordine_codice: data.codice,
        cliente_id: data.cliente_id,
        cliente_nome: (data as any).clienti?.nome ?? null,
        azienda_id: data.azienda_id,
        azienda_nome: (data as any).aziende?.nome ?? null,
        data_ordine: data.data_ordine,
        totale: Number(data.totale ?? 0),
        score: 100,
        motivi: [`Codice ordine ${codiceOrdine} trovato nel documento`],
      });
    }
  }

  // 2) match fuzzy per cliente + importo + finestra data
  const dataRef = input.data_hint ? new Date(input.data_hint) : null;
  const daISO = dataRef ? new Date(dataRef.getTime() - 90 * 86400000).toISOString().slice(0, 10) : null;
  const aISO = dataRef ? new Date(dataRef.getTime() + 30 * 86400000).toISOString().slice(0, 10) : null;

  let q = supabase
    .from("ordini")
    .select("id, codice, cliente_id, azienda_id, data_ordine, totale, clienti(nome), aziende(nome)")
    .eq("user_id", user.id)
    .order("data_ordine", { ascending: false })
    .limit(120);
  if (daISO) q = q.gte("data_ordine", daISO);
  if (aISO) q = q.lte("data_ordine", aISO);
  const { data: ordini } = await q;

  for (const o of ordini || []) {
    if (candidati.some((c) => c.ordine_id === o.id)) continue;
    const nomeCliente = (o as any).clienti?.nome ?? "";
    const nomeAzienda = (o as any).aziende?.nome ?? "";
    const scoreCli = jaccard(tokenSet(nomeCliente), clienteTok);
    const scoreAz = jaccard(tokenSet(nomeAzienda), aziendaTok);
    let score = 0;
    const motivi: string[] = [];
    if (scoreCli >= 0.3) { score += Math.round(scoreCli * 50); motivi.push(`Cliente simile: "${nomeCliente}"`); }
    if (scoreAz >= 0.3) { score += Math.round(scoreAz * 25); motivi.push(`Azienda simile: "${nomeAzienda}"`); }
    if (importo != null && o.totale != null) {
      const delta = Math.abs(Number(o.totale) - importo) / Math.max(1, importo);
      if (delta <= 0.02) { score += 20; motivi.push(`Importo compatibile (Δ ${(delta*100).toFixed(1)}%)`); }
      else if (delta <= 0.1) { score += 10; motivi.push(`Importo vicino (Δ ${(delta*100).toFixed(1)}%)`); }
    }
    if (score >= 20) {
      candidati.push({
        ordine_id: o.id,
        ordine_codice: o.codice,
        cliente_id: o.cliente_id,
        cliente_nome: nomeCliente,
        azienda_id: o.azienda_id,
        azienda_nome: nomeAzienda,
        data_ordine: o.data_ordine,
        totale: Number(o.totale ?? 0),
        score: Math.min(99, score),
        motivi,
      });
    }
  }

  candidati.sort((a, b) => b.score - a.score);
  return candidati.slice(0, limit);
}
