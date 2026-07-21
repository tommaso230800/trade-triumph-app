// Classify a document using Lovable AI (Gemini). Best-effort, updates
// documenti.classificazione_ai / suggerimenti_ai / tipo when confident.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const TIPI = [
  "ordine_originale","conferma_ordine","fattura","nota_credito","contratto",
  "listino","accordo_provv","promo","email","estratto_provv","altro",
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { documento_id } = await req.json();
    if (!documento_id) {
      return new Response(JSON.stringify({ error: "documento_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: doc, error } = await admin.from("documenti").select("*").eq("id", documento_id).single();
    if (error || !doc) throw error ?? new Error("documento non trovato");

    // Prompt con solo metadati + filename (rapido, no OCR pesante)
    const prompt = `Classifica il documento commerciale HORECA in una di queste categorie: ${TIPI.join(", ")}.
Rispondi in JSON con { "tipo": "<categoria>", "confidence": 0..1, "suggerimenti": ["azione1", "azione2"] }.

Nome file: ${doc.nome_file}
Mime: ${doc.mime_type ?? "?"}
Entità collegata: ${doc.entita}${doc.entita_id ? " (id " + doc.entita_id + ")" : ""}
Note utente: ${doc.note ?? "-"}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Rispondi SOLO con JSON valido." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const body = await aiRes.text();
      return new Response(JSON.stringify({ error: "AI error", status: aiRes.status, details: body }), {
        status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { raw: content }; }

    const tipo = TIPI.includes(parsed.tipo) ? parsed.tipo : null;
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : null;

    const updates: any = {
      classificazione_ai: { tipo, confidence, model: "google/gemini-3-flash-preview", at: new Date().toISOString() },
      suggerimenti_ai: parsed.suggerimenti ?? null,
    };
    // aggiorna tipo solo se non era già impostato manualmente e confidence >= 0.7
    if (tipo && (doc.tipo === "altro") && (confidence ?? 0) >= 0.7) {
      updates.tipo = tipo;
    }

    await admin.from("documenti").update(updates).eq("id", documento_id);

    return new Response(JSON.stringify({ ok: true, tipo, confidence, suggerimenti: parsed.suggerimenti ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
