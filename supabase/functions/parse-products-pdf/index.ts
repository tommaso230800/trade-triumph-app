import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "product-imports";
const CHUNK_PAGES = 4;
const MAX_ATTEMPTS = 3;
const TIME_BUDGET_MS = 40_000;
const AI_TIMEOUT_MS = 55_000;
const MAX_PDF_BYTES = 50 * 1024 * 1024;

type ChunkStatus = {
  from: number; // 1-based, inclusive
  to: number; // 1-based, inclusive
  status: "pending" | "done" | "failed";
  attempts: number;
  products: number;
  error?: string;
};

const SYSTEM_PROMPT = `Sei un assistente specializzato nell'estrazione di listini prodotti da PDF italiani del settore alimentare e bevande.
Analizza le pagine del listino ed estrai TUTTI i prodotti in formato JSON:

{
  "prodotti": [
    {
      "codice": "codice articolo/SKU (stringa, conserva eventuali zeri iniziali)",
      "nome": "nome/descrizione prodotto (ricostruisci descrizioni su più righe)",
      "formato": "formato/confezione (es: 75 cl, 1 kg, 6x75cl)",
      "unita_misura": "unità di misura se indicata",
      "marca": "marca/brand se indicata",
      "pezzi_per_cartone": 0,
      "cartoni_per_strato": 0,
      "strati": 0,
      "cartoni_per_pallet": 0,
      "pezzi_per_pallet": 0,
      "prezzo_listino": 0,
      "costo_acquisto": 0,
      "prezzo_vendita": 0,
      "prezzo_riferimento": "pezzo|bottiglia|cartone|kg|altro",
      "iva": 0,
      "sconti": "sconti e condizioni commerciali se indicati",
      "pagina": 1,
      "campi_mancanti": ["elenco campi assenti nel documento"],
      "ambigui": ["elenco valori incerti con motivazione"]
    }
  ]
}

REGOLE IMPORTANTI:
- Estrai TUTTI i prodotti, comprese le tabelle che continuano dalla pagina precedente e le intestazioni ripetute non sono prodotti.
- Gestisci celle unite e informazioni condivise fra più righe: applica il valore condiviso a ogni prodotto della sezione.
- Mantieni DISTINTI prodotti con formati o confezioni differenti: sono varianti separate.
- I prezzi devono essere numeri decimali con il punto (es: 12.50, non "12,50€").
- Riporta SOLO dati presenti nel documento o calcolabili con certezza. Se calcoli un valore (es: cartoni_per_pallet = cartoni_per_strato × strati), lascia comunque visibili i dati di partenza nei rispettivi campi.
- Se un dato non è presente, usa null (non inventarlo) ed elencalo in "campi_mancanti". Se un valore è incerto, riportalo ma elencalo in "ambigui".
- "pagina" è il numero della pagina ALL'INTERNO di questo estratto (1 = prima pagina che vedi), dove compare il prodotto.
- Il codice prodotto è una STRINGA: conserva gli zeri iniziali (es: "00123").
- prezzo_riferimento indica a cosa si riferisce il prezzo: pezzo, bottiglia, cartone, chilogrammo o altra unità.
- Restituisci SOLO il JSON, senza spiegazioni.`;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const step = 8192;
  for (let i = 0; i < bytes.length; i += step) {
    bin += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(bin);
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function callAI(pdfBase64: string, apiKey: string, pageCount: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Questo estratto contiene ${pageCount} pagine di un listino. Estrai TUTTI i prodotti in formato JSON, indicando per ciascuno la pagina dell'estratto in cui compare.`,
              },
              { type: "image_url", image_url: { url: `data:application/pdf;base64,${pdfBase64}` } },
            ],
          },
        ],
      }),
    });
  } finally {
    clearTimeout(timer);
  }
}

function extractJson(content: string): { prodotti?: Record<string, unknown>[] } {
  let s = content.trim();
  if (s.includes("```")) s = s.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Risposta AI senza JSON");
  return JSON.parse(s.slice(start, end + 1));
}

async function processChunk(
  pdf: PDFDocument,
  chunk: ChunkStatus,
  apiKey: string,
): Promise<Record<string, unknown>[]> {
  const sub = await PDFDocument.create();
  const pages = await sub.copyPages(pdf, Array.from({ length: chunk.to - chunk.from + 1 }, (_, i) => chunk.from - 1 + i));
  for (const p of pages) sub.addPage(p);
  const subBytes = await sub.save();
  const response = await callAI(bytesToBase64(subBytes), apiKey, pages.length);

  if (response.status === 429) throw new Error("Rate limit AI: riprova tra poco");
  if (response.status === 402) throw new Error("Crediti AI esauriti");
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI gateway ${response.status}: ${text.slice(0, 200)}`);
  }
  const aiResponse = await response.json();
  const content = aiResponse.choices?.[0]?.message?.content;
  if (!content) throw new Error("Risposta AI vuota");
  const parsed = extractJson(content);
  const prodotti = Array.isArray(parsed.prodotti) ? parsed.prodotti : [];
  // Normalizza la pagina: relativa all'estratto → assoluta nel documento
  return prodotti.map((p) => {
    const rel = Number(p.pagina);
    const page = Number.isFinite(rel) && rel >= 1 ? chunk.from + Math.min(rel, pages.length) - 1 : chunk.from;
    return { ...p, pagina: page };
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY non configurata");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return jsonResponse({ error: "Non autenticato" }, 401);
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const action = String(body.action ?? "");

    if (action === "start") {
      const { pdfBase64, aziendaId, fileName } = body;
      if (!pdfBase64 || !aziendaId) return jsonResponse({ error: "pdfBase64 e aziendaId obbligatori" }, 400);
      const bytes = base64ToBytes(String(pdfBase64));
      if (bytes.length > MAX_PDF_BYTES) return jsonResponse({ error: "Il PDF supera il limite di 50 MB" }, 400);

      let pdf: PDFDocument;
      try {
        pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      } catch {
        return jsonResponse({ error: "PDF non leggibile o protetto da password" }, 400);
      }
      const totalPages = pdf.getPageCount();
      if (totalPages < 1) return jsonResponse({ error: "Il PDF non contiene pagine" }, 400);

      const jobId = crypto.randomUUID();
      const storagePath = `${user.id}/${jobId}.pdf`;
      const { error: upError } = await admin.storage.from(BUCKET).upload(storagePath, bytes, {
        contentType: "application/pdf",
        upsert: true,
      });
      if (upError) throw new Error(`Salvataggio PDF fallito: ${upError.message}`);

      const chunks: ChunkStatus[] = [];
      for (let from = 1; from <= totalPages; from += CHUNK_PAGES) {
        chunks.push({ from, to: Math.min(from + CHUNK_PAGES - 1, totalPages), status: "pending", attempts: 0, products: 0 });
      }
      const { error: insError } = await admin.from("product_import_jobs").insert({
        id: jobId,
        user_id: user.id,
        azienda_id: aziendaId,
        file_name: String(fileName ?? "listino.pdf"),
        storage_path: storagePath,
        total_pages: totalPages,
        chunk_status: chunks,
        status: "pending",
      });
      if (insError) throw new Error(`Creazione lavoro fallita: ${insError.message}`);
      return jsonResponse({ success: true, jobId, totalPages, chunks: chunks.length });
    }

    if (action === "status" || action === "process") {
      const jobId = String(body.jobId ?? "");
      if (!jobId) return jsonResponse({ error: "jobId obbligatorio" }, 400);
      const { data: job, error: jobError } = await admin.from("product_import_jobs").select("*").eq("id", jobId).single();
      if (jobError || !job) return jsonResponse({ error: "Lavoro non trovato" }, 404);
      if (job.user_id !== user.id) {
        const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
        if (!roles?.length) return jsonResponse({ error: "Non autorizzato" }, 403);
      }

      const chunks = (job.chunk_status ?? []) as ChunkStatus[];

      if (action === "process" && job.status !== "done") {
        const startedAt = Date.now();
        const { data: fileData, error: dlError } = await admin.storage.from(BUCKET).download(job.storage_path);
        if (dlError || !fileData) throw new Error(`PDF non trovato nello storage: ${dlError?.message ?? ""}`);
        const pdf = await PDFDocument.load(await fileData.arrayBuffer(), { ignoreEncryption: true });

        await admin.from("product_import_jobs").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", jobId);

        for (const chunk of chunks) {
          if (chunk.status === "done") continue;
          if (chunk.status === "failed" && chunk.attempts >= MAX_ATTEMPTS) continue;
          if (Date.now() - startedAt > TIME_BUDGET_MS) break;

          chunk.attempts += 1;
          try {
            const prodotti = await processChunk(pdf, chunk, LOVABLE_API_KEY);
            const rows = [];
            for (const p of prodotti) {
              const hash = await sha256(`${p.codice ?? ""}|${p.nome ?? ""}|${p.formato ?? ""}|${p.prezzo_listino ?? ""}`);
              rows.push({
                job_id: jobId,
                user_id: user.id,
                azienda_id: job.azienda_id,
                page: Number(p.pagina) || chunk.from,
                data: p,
                row_hash: hash,
              });
            }
            if (rows.length) {
              // Idempotente: salta righe già salvate per questo lavoro (ripresa dopo errore)
              const hashes = rows.map((r) => r.row_hash);
              const { data: existing } = await admin.from("product_import_rows").select("row_hash").eq("job_id", jobId).in("row_hash", hashes);
              const existingSet = new Set((existing ?? []).map((e: { row_hash: string }) => e.row_hash));
              const fresh = rows.filter((r) => !existingSet.has(r.row_hash));
              if (fresh.length) {
                const { error: rowsError } = await admin.from("product_import_rows").insert(fresh);
                if (rowsError) throw new Error(`Salvataggio righe fallito: ${rowsError.message}`);
              }
            }
            chunk.status = "done";
            chunk.products = prodotti.length;
            delete chunk.error;
          } catch (err) {
            chunk.status = "failed";
            chunk.error = err instanceof Error ? err.message : "Errore sconosciuto";
            console.error(`Blocco ${chunk.from}-${chunk.to} fallito (tentativo ${chunk.attempts}):`, chunk.error);
          }
          // Salva l'avanzamento dopo OGNI blocco: la ripresa parte da qui
          const allSettled = chunks.every((c) => c.status === "done" || (c.status === "failed" && c.attempts >= MAX_ATTEMPTS));
          await admin.from("product_import_jobs").update({
            chunk_status: chunks,
            status: allSettled ? "done" : "processing",
            updated_at: new Date().toISOString(),
          }).eq("id", jobId);
        }
      }

      const done = chunks.filter((c) => c.status === "done");
      const failed = chunks.filter((c) => c.status === "failed" && c.attempts >= MAX_ATTEMPTS);
      const processedPages = done.reduce((acc, c) => acc + (c.to - c.from + 1), 0);
      const failedPages = failed.reduce((acc, c) => acc + (c.to - c.from + 1), 0);
      const settled = chunks.every((c) => c.status === "done" || (c.status === "failed" && c.attempts >= MAX_ATTEMPTS));
      const { count } = await admin.from("product_import_rows").select("id", { count: "exact", head: true }).eq("job_id", jobId);

      return jsonResponse({
        success: true,
        status: settled ? "done" : "processing",
        totalPages: job.total_pages,
        processedPages,
        failedPages,
        unreadableRanges: failed.map((c) => ({ from: c.from, to: c.to, error: c.error ?? "" })),
        products: count ?? 0,
        chunks: chunks.length,
        doneChunks: done.length,
      });
    }

    return jsonResponse({ error: "Azione non valida" }, 400);
  } catch (error) {
    console.error("parse-products-pdf error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Errore sconosciuto" }, 500);
  }
});
