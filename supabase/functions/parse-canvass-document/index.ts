import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParsedCanvassResult {
  tipo: "contratto" | "promozione";
  cliente_nome?: string;
  consorzio?: string;
  azienda_nome?: string;
  anno?: number;
  percentuale_premio?: number;
  soglia_fatturato?: number;
  promozione?: {
    nome: string;
    tipo: "sconto_percentuale" | "prezzo_fisso" | "premio_fine_anno";
    valore: number;
    data_inizio?: string;
    data_fine?: string;
    prodotti?: string[];
    cartoni_omaggio?: number;
    cartoni_acquisto?: number;
  };
  note?: string;
  confidence: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_base64, file_type, clienti, aziende, prodotti } = await req.json();

    if (!file_base64) {
      return new Response(JSON.stringify({ error: "Nessun file fornito" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY non configurata");
    }

    // Build context for the AI
    const clientiList = clienti?.map((c: any) => `- ${c.nome}${c.azienda ? ` (${c.azienda})` : ""}${c.consorzio ? ` [Consorzio: ${c.consorzio}]` : ""}`).join("\n") || "Nessun cliente";
    const aziendeList = aziende?.map((a: any) => `- ${a.nome}`).join("\n") || "Nessuna azienda";
    const prodottiList = prodotti?.map((p: any) => `- ${p.nome}${p.codice ? ` (${p.codice})` : ""}`).join("\n") || "Nessun prodotto";

    const systemPrompt = `Sei un assistente specializzato nell'analisi di documenti commerciali per agenti di commercio.
Devi analizzare immagini o PDF di contratti e promozioni (canvass) e estrarre le informazioni rilevanti.

CLIENTI DISPONIBILI:
${clientiList}

AZIENDE DISPONIBILI:
${aziendeList}

PRODOTTI DISPONIBILI:
${prodottiList}

Analizza il documento e restituisci un JSON con questa struttura:

{
  "tipo": "contratto" o "promozione",
  "cliente_nome": "nome esatto del cliente se presente",
  "consorzio": "nome del consorzio se il contratto è per un consorzio",
  "azienda_nome": "nome esatto dell'azienda fornitrice",
  "anno": 2024,
  "percentuale_premio": 3.5,
  "soglia_fatturato": 10000,
  "promozione": {
    "nome": "Nome della promozione",
    "tipo": "sconto_percentuale" | "prezzo_fisso" | "premio_fine_anno",
    "valore": 10,
    "data_inizio": "2024-01-01",
    "data_fine": "2024-12-31",
    "prodotti": ["nome prodotto 1", "nome prodotto 2"],
    "cartoni_omaggio": 1,
    "cartoni_acquisto": 10
  },
  "note": "eventuali note aggiuntive",
  "confidence": 0.95
}

REGOLE:
- Se è un contratto premio fine anno, imposta tipo="contratto" e includi percentuale_premio
- Se è una promozione/canvass, imposta tipo="promozione" e compila l'oggetto promozione
- Per promozioni "prendi X paghi Y" o "cartoni omaggio", usa cartoni_omaggio e cartoni_acquisto
- Se il contratto menziona un consorzio, tutti i clienti di quel consorzio ne beneficiano
- Usa i nomi ESATTI di clienti, aziende e prodotti dalla lista fornita
- Se non riesci a identificare qualcosa, usa null
- Imposta confidence da 0 a 1 in base a quanto sei sicuro dell'interpretazione

Rispondi SOLO con il JSON, senza markdown o testo aggiuntivo.`;

    const userContent = [
      {
        type: "text",
        text: "Analizza questo documento commerciale ed estrai le informazioni sul contratto o promozione:"
      },
      {
        type: "image_url",
        image_url: {
          url: file_base64.startsWith("data:") ? file_base64 : `data:${file_type};base64,${file_base64}`
        }
      }
    ];

    console.log("Calling Lovable AI to parse document...");

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
          { role: "user", content: userContent }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite richieste superato, riprova più tardi" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crediti esauriti, ricarica il tuo account" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Nessuna risposta dall'AI");
    }

    console.log("AI response:", content);

    // Parse the JSON response
    let parsed: ParsedCanvassResult;
    try {
      // Remove any markdown code blocks if present
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      throw new Error("Impossibile interpretare la risposta AI");
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in parse-canvass-document:", error);
    const errorMessage = error instanceof Error ? error.message : "Errore sconosciuto";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
