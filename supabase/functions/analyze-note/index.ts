// Assistente AI - analyze a free-form note and propose structured actions.
// NO database writes: the client applies actions only after user confirmation.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NamedRef = { id: string; nome: string };

interface RequestBody {
  note: string;
  clienti?: NamedRef[];
  aziende?: NamedRef[];
}

const SYSTEM = `Sei un assistente per un agente di commercio HO.RE.CA.
Analizzi una nota libera scritta o dettata dall'agente dopo una visita, telefonata o comunicazione con un cliente,
ed estrai in italiano un risultato strutturato + un elenco di azioni da proporre all'utente.
Non inventare clienti o aziende: se un nome è ambiguo o assente, lascia gli id null e compila i campi *_nome_suggerito.
Rispondi SOLO chiamando il tool 'proponi_azioni' con dati puliti.`;

const TOOL = {
  type: "function",
  function: {
    name: "proponi_azioni",
    description: "Restituisce l'analisi strutturata della nota e le azioni proposte.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        cliente_id: { type: ["string", "null"] },
        cliente_nome_suggerito: { type: ["string", "null"] },
        azienda_id: { type: ["string", "null"] },
        azienda_nome_suggerita: { type: ["string", "null"] },
        tipo_attivita: {
          type: "string",
          enum: [
            "visita_cliente", "telefonata", "ordine", "preventivo",
            "consegna", "reclamo", "incasso", "presentazione_prodotto",
            "follow_up", "altro",
          ],
        },
        data_attivita: { type: "string", description: "ISO 8601" },
        riepilogo: { type: "string" },
        priorita: { type: "string", enum: ["bassa", "media", "alta", "urgente"] },
        prossima_azione: { type: ["string", "null"] },
        data_promemoria: { type: ["string", "null"], description: "ISO 8601 datetime" },
        stato: { type: "string", enum: ["da_fare", "in_corso", "completata", "annullata"] },
        bozza_comunicazione: { type: ["string", "null"] },
        informazioni_mancanti: { type: "array", items: { type: "string" } },
        azioni_proposte: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              tipo: { type: "string", enum: ["crea_visita", "crea_promemoria", "salva_bozza"] },
              descrizione: { type: "string" },
              payload: { type: "object", additionalProperties: true },
            },
            required: ["tipo", "descrizione", "payload"],
          },
        },
      },
      required: [
        "tipo_attivita", "data_attivita", "riepilogo", "priorita",
        "stato", "informazioni_mancanti", "azioni_proposte",
      ],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const body = (await req.json()) as RequestBody;
    if (!body?.note || body.note.trim().length < 5) {
      return new Response(JSON.stringify({ error: "Nota vuota o troppo corta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientiList = (body.clienti ?? []).slice(0, 300)
      .map((c) => `- ${c.nome} [id:${c.id}]`).join("\n");
    const aziendeList = (body.aziende ?? []).slice(0, 100)
      .map((a) => `- ${a.nome} [id:${a.id}]`).join("\n");

    const userPrompt = `NOTA DELL'AGENTE:
"""${body.note}"""

CLIENTI DISPONIBILI (usa l'id se il nome corrisponde in modo chiaro, anche se abbreviato):
${clientiList || "(nessuno)"}

AZIENDE MANDANTI DISPONIBILI:
${aziendeList || "(nessuna)"}

Data e ora attuali: ${new Date().toISOString()}
Se la nota indica "domani" o simili, calcola la data corretta a partire da adesso.
Genera anche una bozza professionale di comunicazione se pertinente.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "proponi_azioni" } },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Troppe richieste, riprova tra poco." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "Errore analisi AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) {
      return new Response(JSON.stringify({ error: "Nessun risultato dall'AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(call.function.arguments);
    } catch {
      return new Response(JSON.stringify({ error: "Risposta AI non valida" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-note error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
