// Webhook inbound email (Postmark Inbound Stream).
// Riceve le email inoltrate con allegati (conferme d'ordine / proforma),
// salva allegati e dati estratti, e tenta l'abbinamento con un ordine CRM.
// Risponde SEMPRE 200 al provider: gli errori restano in email_ingest.errore_testo.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { resolveAzienda } from "../_shared/resolveAzienda.ts";
import { resolveCliente } from "../_shared/resolveCliente.ts";
import { cercaOrdineCandidato } from "../_shared/matchOrdineCandidati.ts";
import { xlsxBytesToSheetText } from "../_shared/xlsxToCsv.ts";

const ESTENSIONI_VALIDE = /\.(pdf|xlsx|xls)$/i;
const MIME_VALIDI = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const TOLLERANZA_EURO = 0.05;
const GIORNI_FINESTRA = 10;

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function callFunction(url: string, key: string, name: string, body: unknown) {
  const res = await fetch(`${url}/functions/v1/${name}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `${name} ha risposto ${res.status}`);
  return json;
}

async function ownerUserId(admin: SupabaseClient): Promise<string | null> {
  const { data } = await admin
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  return (data?.user_id as string) ?? null;
}

type Allegato = { Name?: string; ContentType?: string; Content?: string; ContentLength?: number };

async function processaAllegato(
  admin: SupabaseClient,
  ctx: { url: string; key: string; userId: string; emailId: string; dataRicezione: string },
  allegato: Allegato,
) {
  const nomeFile = allegato.Name || "allegato";
  const contentType = allegato.ContentType || "application/octet-stream";
  const bytes = base64ToBytes(allegato.Content || "");

  const safe = nomeFile.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${ctx.userId}/email/${crypto.randomUUID()}-${safe}`;
  await admin.storage.from("documenti").upload(path, bytes, { contentType, upsert: false });

  const { data: allegatoRow } = await admin
    .from("email_allegati")
    .insert({
      email_id: ctx.emailId,
      file_name: nomeFile,
      content_type: contentType,
      file_size: bytes.byteLength,
      storage_path: path,
      stato: "in_elaborazione",
    })
    .select()
    .single();

  const allegatoId = allegatoRow?.id as string;

  try {
    const isExcel = /\.(xlsx|xls)$/i.test(nomeFile) || contentType.includes("spreadsheet") || contentType.includes("ms-excel");
    const parseBody = isExcel
      ? { sheetText: xlsxBytesToSheetText(bytes), fileName: nomeFile }
      : { fileBase64: bytesToBase64(bytes), mimeType: contentType || "application/pdf", fileName: nomeFile };

    const parseRes = await callFunction(ctx.url, ctx.key, "parse-order-multi", parseBody);
    const parsed = parseRes?.data as { document_type?: string; orders?: any[] } | undefined;

    if (!parsed || parsed.document_type !== "order" || !parsed.orders?.length) {
      await admin
        .from("email_allegati")
        .update({ stato: "non_ordine", parsed_data: parsed ?? null })
        .eq("id", allegatoId);
      return { allegatoId, ordineId: null as string | null, score: 0, motivo: "Documento non riconosciuto come ordine" };
    }

    const ordineEstratto = parsed.orders[0];
    const aziendaMatch = await resolveAzienda(admin, ctx.userId, ordineEstratto.azienda_nome ?? null);
    const clienteMatch = await resolveCliente(admin, ctx.userId, ordineEstratto.cliente_nome ?? null, aziendaMatch.azienda_id, true);

    const dataDocumento = ordineEstratto.data_ordine || ctx.dataRicezione.slice(0, 10);
    const ricerca = await cercaOrdineCandidato(admin, {
      userId: ctx.userId,
      aziendaId: aziendaMatch.azienda_id,
      clienteId: clienteMatch.cliente_id,
      dataDocumento,
      imponibileTotale: Number(ordineEstratto.imponibile_totale) || 0,
      giorniFinestra: GIORNI_FINESTRA,
      tolleranzaEuro: TOLLERANZA_EURO,
    });

    await admin
      .from("email_allegati")
      .update({
        stato: "elaborato",
        parsed_data: {
          ordine: ordineEstratto,
          azienda_match: aziendaMatch,
          cliente_match: clienteMatch,
          ricerca_ordine: ricerca,
        },
      })
      .eq("id", allegatoId);

    if (ricerca.esito === "trovato") {
      return {
        allegatoId,
        ordineId: ricerca.candidato.ordine_id,
        score: ricerca.candidato.score,
        motivo: `Abbinato all'ordine ${ricerca.candidato.codice}`,
      };
    }
    if (ricerca.esito === "ambiguo") {
      return { allegatoId, ordineId: null, score: 0.5, motivo: `${ricerca.candidati.length} ordini possibili: scegli tu` };
    }
    return { allegatoId, ordineId: null, score: 0, motivo: "Nessun ordine corrispondente trovato" };
  } catch (e) {
    const errore = e instanceof Error ? e.message : String(e);
    await admin.from("email_allegati").update({ stato: "errore", errore_testo: errore }).eq("id", allegatoId);
    return { allegatoId, ordineId: null, score: 0, motivo: `Errore: ${errore}` };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = Deno.env.get("INBOUND_EMAIL_TOKEN");
  const urlToken = new URL(req.url).searchParams.get("token");
  if (!token || urlToken !== token) {
    return new Response(JSON.stringify({ error: "Non autorizzato" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let emailId: string | null = null;
  try {
    const payload = await req.json();
    const messageId: string = payload?.MessageID || payload?.MessageId || crypto.randomUUID();

    const { data: esistente } = await admin
      .from("email_ingest")
      .select("id")
      .eq("message_id", messageId)
      .maybeSingle();
    if (esistente) {
      return new Response(JSON.stringify({ ok: true, duplicata: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = await ownerUserId(admin);
    const dataRicezione = payload?.Date ? new Date(payload.Date).toISOString() : new Date().toISOString();

    const { data: emailRow, error: emailErr } = await admin
      .from("email_ingest")
      .insert({
        message_id: messageId,
        from_email: payload?.From ?? payload?.FromFull?.Email ?? null,
        from_name: payload?.FromFull?.Name ?? null,
        to_email: payload?.To ?? null,
        subject: payload?.Subject ?? null,
        received_at: dataRicezione,
        body_text: (payload?.TextBody ?? "").slice(0, 20000) || null,
        stato: "in_elaborazione",
        user_id: userId,
      })
      .select()
      .single();
    if (emailErr) throw emailErr;
    emailId = emailRow.id as string;

    if (!userId) {
      await admin
        .from("email_ingest")
        .update({ stato: "errore", errore_testo: "Nessun utente amministratore configurato" })
        .eq("id", emailId);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const allegati: Allegato[] = (payload?.Attachments || []).filter(
      (a: Allegato) => ESTENSIONI_VALIDE.test(a.Name || "") || MIME_VALIDI.has(a.ContentType || ""),
    );

    if (allegati.length === 0) {
      await admin.from("email_ingest").update({ stato: "senza_allegati" }).eq("id", emailId);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let ordineId: string | null = null;
    let score = 0;
    const motivi: string[] = [];
    for (const allegato of allegati) {
      const esito = await processaAllegato(
        admin,
        { url: SUPABASE_URL, key: SERVICE_KEY, userId, emailId, dataRicezione },
        allegato,
      );
      motivi.push(`${allegato.Name}: ${esito.motivo}`);
      if (esito.ordineId && esito.score >= score) {
        ordineId = esito.ordineId;
        score = esito.score;
      }
    }

    await admin
      .from("email_ingest")
      .update({
        stato: ordineId ? "abbinata" : "da_rivedere",
        ordine_id: ordineId,
        match_score: score,
        match_motivo: motivi.join(" | "),
      })
      .eq("id", emailId);

    return new Response(JSON.stringify({ ok: true, ordine_id: ordineId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const errore = e instanceof Error ? e.message : String(e);
    if (emailId) {
      await admin.from("email_ingest").update({ stato: "errore", errore_testo: errore }).eq("id", emailId);
    }
    return new Response(JSON.stringify({ ok: true, errore }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
