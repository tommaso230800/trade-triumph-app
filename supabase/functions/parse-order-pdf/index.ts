import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64 } = await req.json();
    
    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: "PDF base64 data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Sei un assistente specializzato nell'estrazione di dati da ordini PDF italiani.
Analizza il documento PDF e estrai le seguenti informazioni in formato JSON:

{
  "data_ordine": "YYYY-MM-DD", // data dell'ordine se presente
  "cliente_nome": "nome del cliente se presente",
  "azienda_nome": "nome dell'azienda fornitrice se presente",
  "sconto_percentuale": 0, // sconto % applicato sull'ordine
  "sconto_merce": 0, // sconto merce in euro
  "tipo_pagamento": "tipo di pagamento se presente",
  "imponibile_totale": 0, // totale imponibile in euro (senza IVA)
  "note": "eventuali note",
  "righe": [
    {
      "codice_prodotto": "codice articolo",
      "nome_prodotto": "descrizione prodotto",
      "quantita_pezzi": 0,
      "quantita_cartoni": 0,
      "prezzo_unitario": 0, // prezzo per pezzo in euro
      "importo_riga": 0 // importo totale della riga
    }
  ]
}

REGOLE IMPORTANTI:
- Estrai SOLO i dati presenti nel documento
- I prezzi devono essere numeri (es: 12.50 non "12,50€")
- Le date devono essere in formato YYYY-MM-DD
- Se un campo non è presente, usa null
- Cerca codici prodotto (es: ART001, COD-123, etc.)
- L'imponibile_totale è il totale senza IVA
- Restituisci SOLO il JSON, senza spiegazioni`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              {
                type: "text",
                text: "Analizza questo ordine PDF ed estrai i dati in formato JSON:"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit superato, riprova tra poco." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crediti esauriti, aggiungi crediti al workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Errore AI gateway" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Nessuna risposta dall'AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse JSON from response (handle markdown code blocks)
    let parsedData;
    try {
      let jsonString = content;
      // Remove markdown code blocks if present
      if (jsonString.includes("```json")) {
        jsonString = jsonString.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      } else if (jsonString.includes("```")) {
        jsonString = jsonString.replace(/```\n?/g, "");
      }
      parsedData = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", content);
      return new Response(
        JSON.stringify({ error: "Errore nel parsing della risposta AI", raw: content }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: parsedData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Parse order PDF error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Errore sconosciuto" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
