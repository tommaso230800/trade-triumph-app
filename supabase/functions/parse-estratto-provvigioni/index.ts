import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Sei un assistente specializzato nell'estrazione di dati da estratti conto provvigionali PDF italiani inviati da aziende mandanti agli agenti di commercio.

Analizza il documento ed estrai i dati in formato JSON RIGOROSO.

REGOLE FONDAMENTALI:
- Restituisci SOLO JSON valido, senza testo aggiuntivo o markdown.
- Numeri come numeri (12.50, non "12,50 €"). Le date in formato YYYY-MM-DD.
- Riconosci valori negativi (storni, note di credito).
- NON importare subtotali e totali come righe: solo le singole voci di provvigione.
- Distingui il tipo_movimento: "ordinaria" (per singolo ordine/fattura), "bonus", "premio", "conguaglio", "storno", "nota_credito", "rettifica", "altro".
- Se un campo non è presente, restituisci null.

Struttura JSON attesa:
{
  "azienda_rilevata": "...",
  "anno_rilevato": 2026,
  "trimestre_rilevato": 1,
  "periodo_da": "YYYY-MM-DD",
  "periodo_a": "YYYY-MM-DD",
  "data_documento": "YYYY-MM-DD",
  "totale_dichiarato": 0,
  "affidabilita_globale": 0.0,
  "note_estrazione": "...",
  "righe": [
    {
      "cliente_nome": "...",
      "cliente_codice": "...",
      "numero_ordine": "...",
      "numero_fattura": "...",
      "data_riga": "YYYY-MM-DD",
      "imponibile": 0,
      "aliquota": 0,
      "provvigione": 0,
      "tipo_movimento": "ordinaria",
      "descrizione": "...",
      "affidabilita": 0.0
    }
  ]
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { pdfBase64, mimeType, hintAzienda, hintAnno, hintTrimestre } = await req.json();
    if (!pdfBase64) {
      return new Response(JSON.stringify({ error: "pdfBase64 richiesto" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY non configurata");

    const hint = `Suggerimenti dell'utente (usa solo come riferimento, priorità al PDF): azienda=${hintAzienda ?? "?"}, anno=${hintAnno ?? "?"}, trimestre=${hintTrimestre ?? "?"}.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: `${hint}\nEstrai in JSON tutte le righe di provvigione da questo estratto conto:` },
              { type: "file", file: { filename: "estratto.pdf", file_data: `data:${mimeType || "application/pdf"};base64,${pdfBase64}` } },
            ],
          },
        ],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit superato, riprova tra poco." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Servizio AI non disponibile." }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ai = await resp.json();
    let content: string = ai.choices?.[0]?.message?.content ?? "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    let parsed: any;
    try { parsed = JSON.parse(content); }
    catch (e) {
      console.error("JSON parse error", e, content);
      return new Response(JSON.stringify({ error: "Risposta AI non JSON", raw: content }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
