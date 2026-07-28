// Agente email ordini — ingestione IMAP delle 2 caselle Gmail.
//
// ATTENZIONE: questa funzione usa 2 librerie npm nuove (imapflow, mailparser)
// mai eseguite in questo ambiente Deno finora — non è stato possibile testarle
// qui (nessun runtime Deno né credenziali IMAP disponibili in fase di stesura).
// Prima di attivare il cron, invocarla manualmente con dry_run:true su UNA
// sola casella e verificare il report con attenzione, in particolare la forma
// esatta delle risposte di ImapFlow (fetchOne/search), che potrebbe richiedere
// piccoli aggiustamenti rispetto a questa prima stesura.
//
// Riusa, invariate: parse-order-multi, classify-document (chiamate via
// supabase.functions.invoke equivalente fetch diretto qui lato server).
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { ImapFlow } from "npm:imapflow@1";
import { simpleParser } from "npm:mailparser@3";
import { confrontaOrdine, type CRMRiga, type PDFRiga } from "../_shared/orderMatchEngine.ts";
import { resolveAzienda } from "../_shared/resolveAzienda.ts";
import { resolveCliente } from "../_shared/resolveCliente.ts";
import { cercaOrdineCandidato } from "../_shared/matchOrdineCandidati.ts";
import { xlsxBytesToSheetText } from "../_shared/xlsxToCsv.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Mailbox = { indirizzo: string; appPasswordEnv: string };

const MAILBOXES: Mailbox[] = [
  { indirizzo: "tommasosalti@gmail.com", appPasswordEnv: "GMAIL_APP_PASSWORD_1" },
  { indirizzo: "agenziamazzigroup@gmail.com", appPasswordEnv: "GMAIL_APP_PASSWORD_2" },
];

// Al primo giro (nessun watermark salvato) non processare tutta la storia
// della casella: guarda solo indietro di N giorni.
const BOOTSTRAP_LOOKBACK_DAYS = 30;

const ESTENSIONI_VALIDE = /\.(pdf|xlsx|xls)$/i;
const MIME_VALIDI = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function callFunction(supabaseUrl: string, serviceKey: string, name: string, body: unknown) {
  const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `${name} ha risposto ${res.status}`);
  return json;
}

type ContestoAllegato = {
  admin: SupabaseClient;
  supabaseUrl: string;
  serviceKey: string;
  userId: string;
  dryRun: boolean;
  tolleranzaEuro: number;
  giorniFinestra: number;
  mailbox: string;
  messageId: string;
  emailImportLogId: string | null; // null in dry-run
  dataRicezione: string | null;
};

async function processaAllegato(
  ctx: ContestoAllegato,
  allegato: { filename?: string; contentType: string; content: Uint8Array }
) {
  const nomeFile = allegato.filename || "allegato";
  const hash = await sha256Hex(allegato.content);
  const risultato: Record<string, unknown> = { nome_file: nomeFile, hash_sha256: hash };

  // Anti-duplicato sul CONTENUTO del file (a prescindere dall'email che lo contiene).
  const { data: docEsistente } = await ctx.admin
    .from("documenti")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("hash_sha256", hash)
    .maybeSingle();

  if (docEsistente) {
    risultato.esito = "ignorata_duplicato_contenuto";
    risultato.documento_id_esistente = docEsistente.id;
    return risultato;
  }

  let documentoId: string | null = null;
  if (!ctx.dryRun) {
    const path = `${ctx.userId}/generico/${crypto.randomUUID()}-${nomeFile.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: upErr } = await ctx.admin.storage.from("documenti").upload(path, allegato.content, {
      contentType: allegato.contentType,
      upsert: false,
    });
    if (upErr) throw upErr;

    const { data: docRow, error: insErr } = await ctx.admin
      .from("documenti")
      .insert({
        user_id: ctx.userId,
        entita: "generico",
        tipo: "altro",
        nome_file: nomeFile,
        storage_path: path,
        mime_type: allegato.contentType,
        dimensione: allegato.content.byteLength,
        hash_sha256: hash,
        note: `Da email ${ctx.mailbox} - ${ctx.messageId}`,
      })
      .select()
      .single();
    if (insErr) throw insErr;
    documentoId = docRow.id;
    risultato.documento_id = documentoId;

    // Best-effort, non blocca il resto se fallisce.
    await callFunction(ctx.supabaseUrl, ctx.serviceKey, "classify-document", { documento_id: documentoId }).catch(
      (e) => {
        risultato.classify_document_errore = e instanceof Error ? e.message : String(e);
      }
    );
  } else {
    risultato.nota = "dry-run: upload e classify-document saltati";
  }

  // Estrazione dati — parse-order-multi (riutilizzata, non modificata).
  const isExcel = /\.(xlsx|xls)$/i.test(nomeFile) || allegato.contentType.includes("spreadsheet") || allegato.contentType.includes("ms-excel");
  let parsedBody: Record<string, unknown>;
  if (isExcel) {
    const sheetText = xlsxBytesToSheetText(allegato.content);
    parsedBody = { sheetText, fileName: nomeFile };
  } else {
    const fileBase64 = btoa(String.fromCharCode(...allegato.content));
    parsedBody = { fileBase64, mimeType: allegato.contentType || "application/pdf", fileName: nomeFile };
  }

  const parseRes = await callFunction(ctx.supabaseUrl, ctx.serviceKey, "parse-order-multi", parsedBody);
  const parsedData = parseRes?.data as { document_type?: string; orders?: any[] } | undefined;
  risultato.document_type = parsedData?.document_type;

  if (!parsedData || parsedData.document_type !== "order" || !parsedData.orders?.length) {
    risultato.esito = "ignorata_non_ordine";
    return risultato;
  }

  // Tipicamente un solo ordine per documento; se ce ne sono più si processa il primo
  // e si segnala nel report (limite noto di questa prima versione).
  if (parsedData.orders.length > 1) {
    risultato.nota_multi_ordine = `${parsedData.orders.length} ordini nel documento, elaborato solo il primo`;
  }
  const ordineEstratto = parsedData.orders[0];

  const aziendaMatch = await resolveAzienda(ctx.admin, ctx.userId, ordineEstratto.azienda_nome ?? null);
  const clienteMatch = await resolveCliente(
    ctx.admin,
    ctx.userId,
    ordineEstratto.cliente_nome ?? null,
    aziendaMatch.azienda_id,
    !ctx.dryRun
  );
  risultato.azienda_match = aziendaMatch;
  risultato.cliente_match = clienteMatch;

  const dataDocumento = ordineEstratto.data_ordine || (ctx.dataRicezione ? ctx.dataRicezione.slice(0, 10) : new Date().toISOString().slice(0, 10));

  const ricerca = await cercaOrdineCandidato(ctx.admin, {
    userId: ctx.userId,
    aziendaId: aziendaMatch.azienda_id,
    clienteId: clienteMatch.cliente_id,
    dataDocumento,
    imponibileTotale: Number(ordineEstratto.imponibile_totale) || 0,
    giorniFinestra: ctx.giorniFinestra,
    tolleranzaEuro: ctx.tolleranzaEuro,
  });
  risultato.ricerca_ordine = ricerca;

  const pdfRighe: PDFRiga[] = (ordineEstratto.righe || []).map((r: any) => ({
    codice_prodotto: r.codice_prodotto ?? null,
    nome_prodotto: r.nome_prodotto ?? "",
    quantita_cartoni: Number(r.quantita_cartoni ?? 0),
    pezzi_per_cartone: Number(r.pezzi_per_cartone ?? 0),
    prezzo_per_cartone: Number(r.prezzo_per_cartone ?? 0),
    sc1: Number(r.sc1 ?? 0),
    sc2: Number(r.sc2 ?? 0),
    sc3: Number(r.sc3 ?? 0),
    is_omaggio: !!r.is_omaggio,
    importo_riga: Number(r.importo_riga ?? 0),
  }));

  if (ricerca.esito === "trovato") {
    risultato.caso = "A";
    const { data: righeCrm, error: righeErr } = await ctx.admin
      .from("ordini_righe")
      .select("id, prodotto_id, quantita_cartoni, quantita_pezzi, prezzo_unitario, sc1, sc2, sc3, is_omaggio, prodotti(nome, codice)")
      .eq("ordine_id", ricerca.candidato.ordine_id);
    if (righeErr) throw righeErr;

    const crmRighe: CRMRiga[] = (righeCrm || []).map((r: any) => ({
      id: r.id,
      prodotto_id: r.prodotto_id,
      prodotto_nome: r.prodotti?.nome ?? null,
      prodotto_codice: r.prodotti?.codice ?? null,
      quantita_cartoni: Number(r.quantita_cartoni ?? 0),
      quantita_pezzi: Number(r.quantita_pezzi ?? 0),
      prezzo_unitario: Number(r.prezzo_unitario ?? 0),
      sc1: Number(r.sc1 ?? 0),
      sc2: Number(r.sc2 ?? 0),
      sc3: Number(r.sc3 ?? 0),
      is_omaggio: !!r.is_omaggio,
    }));

    const esito = confrontaOrdine(crmRighe, pdfRighe);
    risultato.confronto = esito;

    if (!ctx.dryRun) {
      const { data: confermaRow, error: confErr } = await ctx.admin
        .from("ordini_conferme")
        .insert({
          user_id: ctx.userId,
          ordine_id: ricerca.candidato.ordine_id,
          documento_id: documentoId,
          nome_sorgente: nomeFile,
          esito: esito as any,
          score: esito.score,
          righe_ok: esito.righe_ok,
          righe_diff: esito.righe_diff,
          righe_mancanti: esito.righe_mancanti,
          righe_extra: esito.righe_extra,
          verificato_manualmente: false,
          fonte: "email",
          email_import_log_id: ctx.emailImportLogId,
        })
        .select()
        .single();
      if (confErr) throw confErr;
      risultato.ordini_conferme_id = confermaRow.id;

      await ctx.admin
        .from("email_import_log")
        .update({
          stato: "in_revisione",
          caso: "A",
          documento_id: documentoId,
          ordine_id: ricerca.candidato.ordine_id,
          ordini_conferme_id: confermaRow.id,
        })
        .eq("id", ctx.emailImportLogId);
    }
    risultato.esito = "in_revisione_caso_a";
    return risultato;
  }

  if (ricerca.esito === "ambiguo") {
    risultato.caso = null;
    if (!ctx.dryRun) {
      await ctx.admin
        .from("email_import_log")
        .update({
          stato: "ambiguo_scegli_ordine",
          documento_id: documentoId,
          dati_estratti: ordineEstratto,
          candidati_ordine_ids: ricerca.candidati.map((c) => c.ordine_id),
        })
        .eq("id", ctx.emailImportLogId);
    }
    risultato.esito = "ambiguo_scegli_ordine";
    return risultato;
  }

  // Nessun ordine CRM corrispondente -> Caso B (staging, mai in public.ordini).
  risultato.caso = "B";
  if (!ctx.dryRun) {
    const { data: proposta, error: propErr } = await ctx.admin
      .from("ordini_import_proposte")
      .insert({
        user_id: ctx.userId,
        email_import_log_id: ctx.emailImportLogId,
        documento_id: documentoId,
        azienda_id: aziendaMatch.azienda_id,
        cliente_id: clienteMatch.cliente_id,
        cliente_nome_estratto: ordineEstratto.cliente_nome ?? null,
        dati_estratti: ordineEstratto,
        note_matching: { azienda: aziendaMatch, cliente: clienteMatch },
      })
      .select()
      .single();
    if (propErr) throw propErr;
    risultato.ordini_import_proposte_id = proposta.id;

    await ctx.admin
      .from("email_import_log")
      .update({ stato: "in_revisione", caso: "B", documento_id: documentoId })
      .eq("id", ctx.emailImportLogId);
  }
  risultato.esito = "in_revisione_caso_b";
  return risultato;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userId = Deno.env.get("AGENTE_EMAIL_USER_ID");
    if (!userId) throw new Error("Secret AGENTE_EMAIL_USER_ID non configurato");

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: config } = await admin
      .from("email_agente_config")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    const tolleranzaEuro = Number(config?.tolleranza_imponibile_euro ?? 0.05);
    const giorniFinestra = Number(config?.giorni_finestra_matching ?? 10);

    const report: Record<string, unknown>[] = [];

    for (const mailbox of MAILBOXES) {
      const appPassword = Deno.env.get(mailbox.appPasswordEnv);
      if (!appPassword) {
        report.push({ mailbox: mailbox.indirizzo, errore: `Secret ${mailbox.appPasswordEnv} non configurato` });
        continue;
      }

      const client = new ImapFlow({
        host: "imap.gmail.com",
        port: 993,
        secure: true,
        auth: { user: mailbox.indirizzo, pass: appPassword },
        logger: false,
      });

      try {
        await client.connect();
        const lock = await client.getMailboxLock("INBOX");
        try {
          const { data: ultimoLog } = await admin
            .from("email_import_log")
            .select("imap_uid")
            .eq("user_id", userId)
            .eq("mailbox", mailbox.indirizzo)
            .order("imap_uid", { ascending: false })
            .limit(1)
            .maybeSingle();

          const searchCriteria = ultimoLog?.imap_uid
            ? { uid: `${ultimoLog.imap_uid + 1}:*` }
            : { since: new Date(Date.now() - BOOTSTRAP_LOOKBACK_DAYS * 86400000) };

          const uids = await client.search(searchCriteria, { uid: true });

          for (const uid of uids as number[]) {
            const msgReport: Record<string, unknown> = { mailbox: mailbox.indirizzo, imap_uid: uid };
            let emailImportLogId: string | null = null;
            try {
              const msg = await client.fetchOne(String(uid), { envelope: true, source: true }, { uid: true });
              const messageId = msg?.envelope?.messageId || `${mailbox.indirizzo}-uid-${uid}`;
              const oggetto = msg?.envelope?.subject ?? null;
              const mittente = msg?.envelope?.from?.[0]?.address ?? null;
              const dataRicezione = msg?.envelope?.date ? new Date(msg.envelope.date).toISOString() : null;
              Object.assign(msgReport, { message_id: messageId, oggetto, mittente, data_ricezione: dataRicezione });

              if (!dryRun) {
                const { data: esistente } = await admin
                  .from("email_import_log")
                  .select("id")
                  .eq("mailbox", mailbox.indirizzo)
                  .eq("message_id", messageId)
                  .maybeSingle();
                if (esistente) {
                  msgReport.esito = "già_processata";
                  report.push(msgReport);
                  continue;
                }

                const { data: logRow, error: logErr } = await admin
                  .from("email_import_log")
                  .insert({
                    user_id: userId,
                    mailbox: mailbox.indirizzo,
                    message_id: messageId,
                    imap_uid: uid,
                    oggetto,
                    mittente,
                    data_ricezione: dataRicezione,
                    stato: "ricevuta",
                  })
                  .select()
                  .single();
                if (logErr) throw logErr;
                emailImportLogId = logRow.id;
              }

              const parsed = await simpleParser(msg!.source as Uint8Array);
              const allegati = (parsed.attachments || []).filter(
                (a) => ESTENSIONI_VALIDE.test(a.filename || "") || MIME_VALIDI.has(a.contentType)
              );

              if (allegati.length === 0) {
                msgReport.esito = "ignorata_no_allegato";
                if (!dryRun && emailImportLogId) {
                  await admin.from("email_import_log").update({ stato: "ignorata_no_allegato" }).eq("id", emailImportLogId);
                }
                report.push(msgReport);
                continue;
              }

              msgReport.allegati = [];
              for (const allegato of allegati) {
                const esitoAllegato = await processaAllegato(
                  {
                    admin,
                    supabaseUrl: SUPABASE_URL,
                    serviceKey: SERVICE_KEY,
                    userId,
                    dryRun,
                    tolleranzaEuro,
                    giorniFinestra,
                    mailbox: mailbox.indirizzo,
                    messageId,
                    emailImportLogId,
                    dataRicezione,
                  },
                  { filename: allegato.filename, contentType: allegato.contentType, content: allegato.content }
                );
                (msgReport.allegati as unknown[]).push(esitoAllegato);
              }
            } catch (e) {
              const errore = e instanceof Error ? e.message : String(e);
              msgReport.errore = errore;
              if (!dryRun && emailImportLogId) {
                await admin.from("email_import_log").update({ stato: "errore", errore_messaggio: errore }).eq("id", emailImportLogId);
              }
            }
            report.push(msgReport);
          }
        } finally {
          lock.release();
        }
        await client.logout();
      } catch (e) {
        report.push({ mailbox: mailbox.indirizzo, errore: e instanceof Error ? e.message : String(e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, dry_run: dryRun, report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Errore sconosciuto" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
