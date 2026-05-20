import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const systemPrompt = `Sei un assistente esperto di ordini commerciali italiani (food & beverage).
Ricevi UN documento (PDF, immagine di ordine scritto a mano, o testo da Excel).
Devi:
1) Capire che tipo di documento e' (campo document_type):
   - "order" = un ordine vero
   - "price_list" = un listino prezzi
   - "promo" = una promozione/canvass
   - "note" = nota commerciale
   - "attachment" = altro/allegato non parsabile
2) Se e' un order, capire se contiene UNO o PIU' ordini distinti (clienti diversi nello stesso file). Restituirne un array.
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

REGOLE CRITICHE GENERALI:
- Quantita SEMPRE in CARTONI. Prezzi SEMPRE per CARTONE.
- Riconosci omaggi: GF, G.F., OMAGGIO/GRATIS/FREE/CAMPIONE, oppure prezzo 0 con qta>0 -> is_omaggio=true, prezzo_per_cartone=0.
- Confidence per riga: "high"=tutto chiaro; "medium"=qualche ambiguita; "low"=incerto.
- Numeri come number (12.50 non "12,50€"). Virgola decimale italiana -> punto.
- Date YYYY-MM-DD.
- SCARTA righe dove quantita ordinata e' 0 (sia cartoni sia pezzi a 0). NON inserirle in "righe".
- Se non e' un ordine: "orders": [] e document_type appropriato.

REGOLE CRITICHE PER FILE EXCEL DI FORNITORI ITALIANI (es. Casoni, Mazzetti, ecc.):
Gli ordini Excel hanno solitamente UNA riga di intestazione colonne (es. riga 15 o 16) seguita dalle righe prodotto.
PRIMA cosa: trova la riga intestazione e mappa SEMANTICAMENTE le colonne. Le intestazioni tipiche:

  COLONNE QUANTITA (puo' essercene UNA o DUE distinte):
    - "CT" / "Cartoni" / "Cart." / "Colli"  => quantita_cartoni
    - "Bott" / "Bottiglie" / "Pezzi" / "Pz" / "Q.ta pz"  => quantita_pezzi totali ordinati
  Se ci sono ENTRAMBE: usa CT per quantita_cartoni, Bott/Pezzi per quantita_pezzi, e calcola pezzi_per_cartone = round(pezzi/cartoni).
  Se c'e' SOLO la colonna pezzi/bottiglie: cerca "imballo" o "ct x N pz" per pezzi_per_cartone, poi quantita_cartoni = pezzi / pezzi_per_cartone.
  Se c'e' SOLO la colonna cartoni: cerca "imballo" / "ct x N pz" / "conf." per pezzi_per_cartone.

  COLONNA IMBALLO/CONFEZIONE:
    - "imballo" / "Conf." / "Formato pack" con valori come "ct x 6 pz", "6x70cl", "20 pz" => estrai pezzi_per_cartone (numero pz per cartone).
    - Se non trovi nulla, default pezzi_per_cartone = 1 ma metti confidence=low con warning.

  COLONNA PREZZO:
    - "Listino", "Prezzo", "Prz" => di NORMA e' prezzo PER BOTTIGLIA/PEZZO, NON per cartone.
    - Eccezione: se vicino c'e' una nota tipo "LISTINO A CARTONE" / "prezzo a collo" => allora e' gia' per cartone.
    - Per ottenere prezzo_per_cartone: prezzo_per_cartone = prezzo_listino_bottiglia * pezzi_per_cartone (se listino e' per bottiglia).
    - Se trovi "Net in Fattura" o "Netto" e' il prezzo gia' scontato per bottiglia: in tal caso non sommare di nuovo gli sconti, usa quel netto * pezzi_per_cartone come prezzo_per_cartone e metti sc1/sc2/sc3 a 0.

  COLONNE SCONTO (possono essere 1, 2 o 3):
    - "Sconto Canale" / "Sc.Canale" / "Sc1" => sc1
    - "Extra Sconto" / "Sc.Extra" / "Sc2" => sc2
    - "Sconto Promo" / "Sc3" => sc3
    - I valori possono essere "30%" (gia' percentuale) oppure 0.3 (frazione) oppure 30. Normalizza SEMPRE in percentuale (30, non 0.3, non "30%").
    - Se vedi 0.3 in una colonna sconto, e' 30%, non 0.3%.

  COLONNE DA IGNORARE (non sono sconti applicati): "Grado", "Formato cl", "Cartoni x strato", "Strati x plt", "Accisa", "Contr.", "Tasse", "Imponibile", "Totale".

  CLIENTE: cerca celle "CLIENTE", "Rag. Sociale", "Ragione Sociale" nelle prime 15 righe -> cliente_nome.
  AZIENDA FORNITRICE: di solito in alto (nome stampato del produttore, es "CASONI FABBRICAZIONE LIQUORI S.p.A.") -> azienda_nome.
  PAGAMENTO: cerca "Pagamento" / "Modalita' pagamento" -> tipo_pagamento.

ESEMPIO DI INTERPRETAZIONE CORRETTA (template Casoni):
  Header riga: codice | articolo | CT | Bott | grado | formato cl | imballo | ... | Listino | Sconto Canale | Extra Sconto | ... | Net in Fattura | IMPONIBILE
  Riga: C01170018 | AMARO DEL CICLISTA ORIGINALE | 3 | 18 | 26 | 70 | ct x 6 pz | ... | 17 | 30% | 28% | ... | 10.50 | 188.99
  => quantita_cartoni=3, quantita_pezzi=18, pezzi_per_cartone=6 (perche' 18/3=6 e "ct x 6 pz" conferma),
     prezzo_per_cartone = 17 * 6 = 102 €/cartone (listino per bottiglia * pezzi),
     sc1=30, sc2=28, sc3=0, importo_riga ~ 102*3*0.7*0.72 = 154.22 (oppure usa IMPONIBILE se presente).
  Se invece ci sono colonne "Cart." e "Tot.Pz" entrambe presenti e prezzo gia' per cartone (es. proforma stampato), usa quei valori direttamente.

CONTROLLO FINALE: prima di restituire, verifica per ogni riga che:
  - quantita_cartoni > 0
  - quantita_cartoni * pezzi_per_cartone ~= quantita_pezzi (se hai entrambi)
  - prezzo_per_cartone coerente con prezzo per bottiglia * pezzi_per_cartone (se applicabile)
  Se qualcosa non torna, abbassa confidence e aggiungi warning esplicito.`;


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
