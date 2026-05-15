import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub;

    const { cliente_id, visit_date } = await req.json();
    if (!cliente_id) {
      return new Response(JSON.stringify({ error: "cliente_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Carica tutti i dati cliente in parallelo
    const [cliente, ordini, righe, competitor, prep, reports, notes, promo] = await Promise.all([
      supabase.from("clienti").select("*").eq("id", cliente_id).single(),
      supabase.from("ordini").select("*").eq("cliente_id", cliente_id).order("data_ordine", { ascending: false }).limit(50),
      supabase.from("ordini_righe").select("*, prodotti(nome, prezzo_listino), ordini!inner(cliente_id, data_ordine)").eq("ordini.cliente_id", cliente_id).limit(300),
      supabase.from("competitor_products").select("*").eq("cliente_id", cliente_id),
      supabase.from("visit_preparations").select("*").eq("cliente_id", cliente_id).order("created_at", { ascending: false }).limit(3),
      supabase.from("visit_reports").select("*").eq("cliente_id", cliente_id).order("data_visita", { ascending: false }).limit(5),
      supabase.from("client_notes").select("*").eq("client_id", cliente_id).order("created_at", { ascending: false }).limit(20),
      supabase.from("promo_clienti").select("*").eq("cliente_id", cliente_id).order("data_concessione", { ascending: false }).limit(20),
    ]);

    const ctx = {
      cliente: cliente.data,
      ultimi_ordini: ordini.data,
      righe_ordini: righe.data,
      competitor_products: competitor.data,
      preparazioni_precedenti: prep.data,
      report_visite_precedenti: reports.data,
      note: notes.data,
      promo_storiche: promo.data,
    };

    const systemPrompt = `Sei un esperto sales coach per agenti di commercio nel settore HORECA (bar, ristoranti, bevande). Analizza i dati del cliente e prepara una visita commerciale completa, pratica e orientata al risultato. Usa un tono diretto e operativo. Sfrutta SEMPRE i dati di concorrenza per costruire proposte mirate.`;

    const userPrompt = `Prepara la prossima visita commerciale per questo cliente. Dati completi (JSON):\n\n${JSON.stringify(ctx, null, 2)}\n\nGenera la preparazione strutturata usando lo strumento "save_visit_preparation".`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_visit_preparation",
            description: "Salva la preparazione visita strutturata",
            parameters: {
              type: "object",
              properties: {
                riepilogo_cliente: { type: "string", description: "Tipologia, potenziale, situazione attuale, rapporto, criticità" },
                storico_commerciale: { type: "string", description: "Ultimo ordine, prodotti abituali, in calo, da riordinare, mai inseriti, valore medio, frequenza, trend" },
                analisi_concorrenza: { type: "string", description: "Analisi prodotti concorrenti del cliente, prezzi, condizioni, alternative nostre, vantaggi" },
                obiettivo_visita: { type: "string", description: "Obiettivo principale e secondario, prodotti da proporre, quantità, valore target, strategia" },
                proposta_consigliata: { type: "string", description: "Proposta concreta: prodotti, prezzi, quantità, omaggi, materiale, condizioni, motivazione, alternativa" },
                argomenti_vendita: { type: "string", description: "Leve commerciali da usare: margine, prezzo, rotazione, qualità, novità, sell-out, servizio" },
                obiezioni_previste: { type: "string", description: "Possibili obiezioni e risposte commerciali concrete, una per riga" },
                domande_consigliate: { type: "string", description: "Domande utili da fare al cliente durante la visita" },
                prossima_azione: { type: "string", description: "Cosa provare a chiudere: ordine immediato, campioni, follow-up con data, prossima visita" },
                priorita: { type: "string", enum: ["alta", "media", "bassa"] },
                motivo_priorita: { type: "string" },
              },
              required: ["riepilogo_cliente", "storico_commerciale", "analisi_concorrenza", "obiettivo_visita", "proposta_consigliata", "argomenti_vendita", "obiezioni_previste", "domande_consigliate", "prossima_azione", "priorita", "motivo_priorita"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_visit_preparation" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Limite richieste superato, riprova tra poco." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No structured output from AI" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const parsed = JSON.parse(toolCall.function.arguments);

    const { data: saved, error: saveErr } = await supabase
      .from("visit_preparations")
      .insert({
        user_id: userId,
        cliente_id,
        visit_date: visit_date || null,
        status: "preparata",
        riepilogo_cliente: parsed.riepilogo_cliente,
        storico_commerciale: parsed.storico_commerciale,
        analisi_concorrenza: parsed.analisi_concorrenza,
        obiettivo_visita: parsed.obiettivo_visita,
        proposta_consigliata: parsed.proposta_consigliata,
        argomenti_vendita: parsed.argomenti_vendita,
        obiezioni_previste: parsed.obiezioni_previste,
        domande_consigliate: parsed.domande_consigliate,
        prossima_azione: parsed.prossima_azione,
        contenuto_completo: parsed,
      })
      .select()
      .single();

    if (saveErr) {
      console.error("save error", saveErr);
      return new Response(JSON.stringify({ error: saveErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ preparation: saved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("prepare-visit error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
