import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `Sei un assistente esperto di ordini commerciali italiani (food & beverage).
Ricevi UN documento (PDF, immagine di ordine scritto a mano, o testo da Excel).
Devi:
1) Capire che tipo di documento è (campo document_type):
   - "order" = un ordine vero
   - "price_list" = un listino prezzi
   - "promo" = una promozione/canvass
   - "note" = nota commerciale
   - "attachment" = altro/allegato non parsabile
2) Se è un order, capire se contiene UNO o PIU' ordini distinti (clienti diversi nello stesso file). Restituirne un array.
3) Per OGNI ordine restituire prodotti, quantita in CARTONI, prezzi PER CARTONE, sconti, omaggi, condizioni pagamento, cliente e azienda fornitrice.

RESTITUISCI SOLO QUESTO JSON, niente testo prima/dopo, niente markdown:
{
  "document_type": "order" | "price_list" | "promo" | "note" | "attachment",
  "global_notes": string | null,
  "orders": [
    {
      "data_ordine": "YYYY-MM-DD" | null,
      "cliente_nome": string | null,
      "azienda_nome": string | null,
      "tipo_pagamento": string | null,
      "sconto_pagamento_percentuale": number,
      "sconto_merce": number,
      "imponibile_totale": number,
      "note": string | null,
      "warnings": string[],
      "righe": [
        {
          "codice_prodotto": string | null,
          "nome_prodotto": string,
          "quantita_cartoni": number,
          "pezzi_per_cartone": number,
          "prezzo_per_cartone": number,
          "sc1": number, "sc2": number, "sc3": number,
          "is_omaggio": boolean,
          "importo_riga": number,
          "confidence": "high" | "medium" | "low",
          "warning": string | null,
          "unita_originale": "cartoni" | "pezzi" | "pallet" | "confezioni" | "sconosciuta"
        }
      ]
    }
  ]
}

REGOLE CRITICHE:
- Quantita SEMPRE in CARTONI. Se nel file e' scritto "pallet" o "pezzi", converti se possibile e segnala con warning + unita_originale.
- Prezzi SEMPRE per CARTONE.
- Riconosci omaggi: sigle GF, G.F., parole OMAGGIO/GRATIS/FREE/CAMPIONE, prezzo 0 con quantita >0 -> is_omaggio=true, prezzo_per_cartone=0.
- Per ogni riga assegna confidence:
  * "high" se prodotto + quantita + prezzo sono chiari
  * "medium" se c'e' qualche ambiguita
  * "low" se sei incerto (scrittura a mano poco leggibile, prezzo mancante, unita ambigua)
- Se manca un prezzo, mettilo a 0 e confidence=low con warning esplicito.
- Se rilevi piu' ordini con clienti diversi nello stesso documento, separali in elementi distinti dell'array "orders".
- Se non e' un ordine, restituisci "orders": [] e document_type appropriato.
- Numeri come number (12.50 non "12,50€"). Virgola decimale italiana -> punto.
- Date YYYY-MM-DD.`;

async function callAI(parts: any[], apiKey: string, model = "google/gemini-2.5-pro"): Promise<Response> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: parts },
          ],
        }),
      });
      if (response.ok || response.status === 429 || response.status === 402) return response;
      if (response.status >= 500 && attempt < 3) {
        await new Promise((r) => setTimeout(r, attempt * 2000));
        continue;
      }
      return response;
    } catch (e) {
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, attempt * 2000));
        continue;
      }
      throw e;
    }
  }
  throw new Error("Tutti i tentativi falliti");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { fileBase64, mimeType, sheetText, fileName } = body as {
      fileBase64?: string;
      mimeType?: string;
      sheetText?: string;
      fileName?: string;
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY non configurata");

    let parts: any[];
    if (sheetText) {
      const truncated = sheetText.length > 60000 ? sheetText.slice(0, 60000) : sheetText;
      parts = [{
        type: "text",
        text: `File: ${fileName || "excel"}\nContenuto Excel (CSV/tab):\n\n${truncated}\n\nEstrai gli ordini secondo lo schema.`,
      }];
    } else if (fileBase64 && mimeType) {
      parts = [
        { type: "text", text: `File: ${fileName || "documento"}. Analizza e estrai gli ordini.` },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
      ];
    } else {
      return new Response(JSON.stringify({ error: "Devi fornire fileBase64+mimeType oppure sheetText" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await callAI(parts, LOVABLE_API_KEY);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit superato, riprova tra poco." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Servizio AI non disponibile, riprova." }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(JSON.stringify({ error: "Nessuna risposta dall'AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed;
    try {
      let s = content.trim();
      if (s.includes("```json")) s = s.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      else if (s.includes("```")) s = s.replace(/```\n?/g, "");
      const start = s.indexOf("{");
      const end = s.lastIndexOf("}");
      if (start >= 0 && end > start) s = s.slice(start, end + 1);
      parsed = JSON.parse(s);
    } catch (e) {
      console.error("JSON parse error:", e, content);
      return new Response(JSON.stringify({ error: "Errore parsing risposta AI", raw: content }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("parse-order-multi error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Errore sconosciuto" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
