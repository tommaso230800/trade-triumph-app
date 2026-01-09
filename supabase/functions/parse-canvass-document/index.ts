import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContrattoObbiettivo {
  soglia_fatturato: number;
  percentuale_premio: number;
  descrizione?: string;
}

interface PromozioneEstratta {
  nome: string;
  tipo: "sconto_percentuale" | "prezzo_fisso" | "premio_fine_anno";
  valore: number;
  data_inizio?: string;
  data_fine?: string;
  prodotti?: string[];
  cartoni_omaggio?: number;
  cartoni_acquisto?: number;
  periodi?: { data_inizio: string; data_fine: string }[];
}

interface ParsedCanvassResult {
  tipo: "contratto" | "promozione" | "misto";
  cliente_nome?: string;
  consorzio?: string;
  azienda_nome?: string;
  anno?: number;
  // Per contratti con obbiettivi multipli
  obbiettivi?: ContrattoObbiettivo[];
  // Fallback singolo obbiettivo
  percentuale_premio?: number;
  soglia_fatturato?: number;
  // Promozioni (può essere array per documenti misti)
  promozioni?: PromozioneEstratta[];
  // Fallback singola promozione (retrocompatibilità)
  promozione?: PromozioneEstratta;
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

Analizza il documento con intelligenza. Può essere:
1. Un CONTRATTO PREMIO FINE ANNO - accordo annuale con soglie di fatturato e premi percentuali
2. Una PROMOZIONE/CANVASS - sconto temporaneo su prodotti specifici
3. Un DOCUMENTO MISTO - contiene sia contratto che promozioni, o più obbiettivi

IMPORTANTE: I contratti premio spesso hanno:
- Obbiettivi multipli con soglie crescenti (es. +3% sopra 10.000€, +4% sopra 20.000€)
- Riferimenti a promozioni incluse nel periodo contrattuale
- Periodi di validità multipli per le promozioni (es. Marzo, Giugno, Ottobre)

Restituisci un JSON con questa struttura:

{
  "tipo": "contratto" | "promozione" | "misto",
  "cliente_nome": "nome esatto del cliente se presente (usa nomi dalla lista)",
  "consorzio": "nome del consorzio se il contratto è per un consorzio",
  "azienda_nome": "nome esatto dell'azienda fornitrice (usa nomi dalla lista)",
  "anno": 2024,
  
  "obbiettivi": [
    {
      "soglia_fatturato": 10000,
      "percentuale_premio": 3,
      "descrizione": "Primo scaglione"
    },
    {
      "soglia_fatturato": 20000,
      "percentuale_premio": 4,
      "descrizione": "Secondo scaglione"
    }
  ],
  
  "percentuale_premio": 3.5,
  "soglia_fatturato": 10000,
  
  "promozioni": [
    {
      "nome": "Promo Estate",
      "tipo": "sconto_percentuale",
      "valore": 10,
      "data_inizio": "2024-06-01",
      "data_fine": "2024-06-30",
      "prodotti": ["nome prodotto 1"],
      "cartoni_omaggio": 0,
      "cartoni_acquisto": 0,
      "periodi": [
        { "data_inizio": "2024-03-01", "data_fine": "2024-03-31" },
        { "data_inizio": "2024-06-01", "data_fine": "2024-06-30" }
      ]
    }
  ],
  
  "promozione": {
    "nome": "Nome della promozione",
    "tipo": "sconto_percentuale" | "prezzo_fisso" | "premio_fine_anno",
    "valore": 10,
    "data_inizio": "2024-01-01",
    "data_fine": "2024-12-31",
    "prodotti": ["nome prodotto 1", "nome prodotto 2"],
    "cartoni_omaggio": 1,
    "cartoni_acquisto": 10,
    "periodi": [
      { "data_inizio": "2024-03-01", "data_fine": "2024-03-31" },
      { "data_inizio": "2024-06-01", "data_fine": "2024-06-30" }
    ]
  },
  
  "note": "eventuali note aggiuntive estratte dal documento",
  "confidence": 0.95
}

REGOLE INTELLIGENTI:
1. Se il documento contiene SOLO un contratto premio annuale, usa tipo="contratto"
2. Se contiene SOLO promozioni/canvass, usa tipo="promozione"
3. Se contiene ENTRAMBI (es. contratto con promozioni incluse), usa tipo="misto"

4. Per contratti con OBBIETTIVI MULTIPLI/SCAGLIONI:
   - Popola l'array "obbiettivi" con tutte le soglie e premi trovati
   - Usa anche percentuale_premio e soglia_fatturato per il primo/principale obbiettivo

5. Per promozioni MULTIPLE nello stesso documento:
   - Popola l'array "promozioni" con tutte le promozioni trovate
   - Usa anche "promozione" per la prima/principale (retrocompatibilità)

6. Per promozioni con PERIODI MULTIPLI (es. valida a Marzo, Giugno, Ottobre):
   - Usa data_inizio e data_fine per il primo periodo
   - Usa l'array "periodi" per tutti i periodi aggiuntivi

7. Per promozioni "prendi X paghi Y" o "cartoni omaggio", usa cartoni_omaggio e cartoni_acquisto

8. Usa i nomi ESATTI di clienti, aziende e prodotti dalla lista fornita quando possibile
9. Se non riesci a identificare qualcosa, usa null
10. Imposta confidence da 0 a 1 in base a quanto sei sicuro dell'interpretazione

Rispondi SOLO con il JSON, senza markdown o testo aggiuntivo.`;

    const userContent = [
      {
        type: "text",
        text: "Analizza questo documento commerciale ed estrai TUTTE le informazioni su contratti, obbiettivi, promozioni e periodi. Sii intelligente nell'identificare se è un contratto premio, una promozione, o entrambi:"
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
