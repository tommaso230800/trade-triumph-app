import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `Sei un assistente specializzato nell'estrazione di dati da ordini commerciali italiani esportati da Excel.
Ricevi il contenuto testuale (CSV / tab-separated) di uno o più fogli Excel di un ordine.
Identifica automaticamente intestazioni, colonne (codice, descrizione, quantità pezzi, quantità cartoni, prezzo, importo) anche se sono in posizioni diverse o con nomi diversi (es: "Cod.", "Articolo", "Qt", "Q.tà", "Pz", "Cart", "Cartoni", "Prezzo", "P.U.", "Importo", "Tot").

Restituisci ESATTAMENTE questo JSON:
{
  "data_ordine": "YYYY-MM-DD" | null,
  "cliente_nome": string | null,
  "azienda_nome": string | null,
  "sconto_percentuale": number,
  "sconto_merce": number,
  "tipo_pagamento": string | null,
  "imponibile_totale": number,
  "note": string | null,
  "righe": [
    {
      "codice_prodotto": string | null,
      "nome_prodotto": string,
      "quantita_pezzi": number,
      "quantita_cartoni": number,
      "prezzo_unitario": number,
      "importo_riga": number,
      "is_omaggio": boolean
    }
  ]
}

REGOLE:
- Numeri come number (12.50, non "12,50€"). Converti virgole decimali italiane in punti.
- Date in YYYY-MM-DD.
- Ignora righe di intestazione, totali, righe vuote.
- IMPORTANTE: NON includere righe con quantità totale 0 (sia pezzi che cartoni a 0). Saltale completamente.
- IMPORTANTE: rileva prodotti OMAGGIO / GRATIS FATTURA. Indicatori: sigla "GF" o "G.F." nel codice/descrizione, parole "OMAGGIO", "GRATIS", "FREE", "CAMPIONE", oppure colonna dedicata "Om"/"Omaggio"/"GF" con quantità, oppure prezzo 0 con quantità > 0. Per queste righe imposta is_omaggio=true e prezzo_unitario=0.
- Se manca quantità cartoni ma c'è quantità pezzi (o viceversa), inseriscine almeno uno coerente.
- Se non riesci a determinare un campo opzionale, usa null o 0.
- Restituisci SOLO JSON valido, niente testo prima/dopo, niente markdown.`;

async function callAI(sheetText: string, apiKey: string, maxRetries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Ecco il contenuto del file Excel dell'ordine. Estrai i dati strutturati:\n\n${sheetText}`,
            },
          ],
        }),
      });

      if (response.ok || response.status === 429 || response.status === 402) return response;

      if (response.status >= 500 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, attempt * 2000));
        continue;
      }
      return response;
    } catch (err) {
      console.error(`Tentativo ${attempt} fallito:`, err);
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, attempt * 2000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Tutti i tentativi falliti");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sheetText } = await req.json();
    if (!sheetText || typeof sheetText !== "string") {
      return new Response(JSON.stringify({ error: "sheetText is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY non configurata");

    // Tronca testo molto lungo
    const truncated = sheetText.length > 60000 ? sheetText.slice(0, 60000) : sheetText;

    const response = await callAI(truncated, LOVABLE_API_KEY);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit superato, riprova tra poco." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Servizio AI non disponibile, riprova." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(JSON.stringify({ error: "Nessuna risposta dall'AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsedData;
    try {
      let s = content.trim();
      if (s.includes("```json")) s = s.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      else if (s.includes("```")) s = s.replace(/```\n?/g, "");
      // estrae primo blocco JSON
      const start = s.indexOf("{");
      const end = s.lastIndexOf("}");
      if (start >= 0 && end > start) s = s.slice(start, end + 1);
      parsedData = JSON.parse(s);
    } catch (e) {
      console.error("JSON parse error:", e, "content:", content);
      return new Response(JSON.stringify({ error: "Errore parsing risposta AI", raw: content }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data: parsedData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("parse-order-excel error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Errore sconosciuto" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
