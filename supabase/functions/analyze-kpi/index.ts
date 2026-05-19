import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { snapshot } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY non configurata");

    const systemPrompt = `Sei un coach commerciale per un agente di vendita food/beverage in Italia.
Analizzi dati di vendita reali (YoY). Rispondi SEMPRE in italiano e SOLO con JSON valido secondo lo schema:
{
  "sintesi": "2-3 frasi sul trend generale",
  "azioni": [
    {
      "priorita": "alta"|"media"|"bassa",
      "tipo": "recupero"|"crescita"|"rischio"|"opportunita",
      "titolo": "max 8 parole",
      "descrizione": "1-2 frasi operative",
      "target_nome": "nome cliente/prodotto/azienda",
      "target_tipo": "cliente"|"prodotto"|"azienda"|"brand"
    }
  ]
}
Massimo 6 azioni, concrete e specifiche. Niente testo fuori dal JSON.`;

    const userPrompt = `Snapshot KPI anno ${snapshot.yearCurr} vs ${snapshot.yearPrev}:
Fatturato: ${snapshot.fattCurr.toFixed(0)}€ vs ${snapshot.fattPrev.toFixed(0)}€ (${snapshot.deltaPct.toFixed(1)}%)

TOP CLIENTI IN CRESCITA:
${snapshot.topGrowers.map((g: any) => `- ${g.nome}: ${g.prev.toFixed(0)}€ → ${g.curr.toFixed(0)}€ (+${g.deltaPct.toFixed(0)}%)`).join("\n") || "—"}

TOP CLIENTI IN CALO:
${snapshot.topDecliners.map((g: any) => `- ${g.nome}: ${g.prev.toFixed(0)}€ → ${g.curr.toFixed(0)}€ (${g.deltaPct.toFixed(0)}%)`).join("\n") || "—"}

CLIENTI PERSI (no ordini quest'anno):
${snapshot.lostClienti.map((g: any) => `- ${g.nome}: era ${g.prev.toFixed(0)}€`).join("\n") || "—"}

PRODOTTI IN CALO:
${snapshot.decliningProducts.map((g: any) => `- ${g.nome}: ${g.prev.toFixed(0)}€ → ${g.curr.toFixed(0)}€`).join("\n") || "—"}

PRODOTTI EMERGENTI (nuovi):
${snapshot.newProducts.map((g: any) => `- ${g.nome}: ${g.curr.toFixed(0)}€`).join("\n") || "—"}

Genera azioni commerciali concrete.`;

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
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429)
        return new Response(JSON.stringify({ error: "Limite di richieste raggiunto, riprova tra poco." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402)
        return new Response(JSON.stringify({ error: "Crediti AI esauriti, aggiungi credito al workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const text = await response.text();
      throw new Error(`AI Gateway: ${response.status} ${text}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { sintesi: content, azioni: [] }; }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("analyze-kpi error:", e);
    return new Response(JSON.stringify({ error: e.message || "Errore sconosciuto" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
