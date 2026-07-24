import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Legacy result shape (still supported by callers of the old flow)
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

// New structured row shape for the AI import preview
interface RigaEstratta {
  prodotto_testo: string;
  codice_prodotto?: string | null;
  formato?: string | null;
  prodotto_id?: string | null;
  prodotto_match_confidence?: number;
  candidati_prodotti?: { id: string; nome: string; codice?: string | null; score: number }[];
  tipologia:
    | "sconto_percentuale"
    | "prezzo_promozionale"
    | "prezzo_netto"
    | "x_piu_y"
    | "cartoni_omaggio"
    | "sconto_cartone"
    | "sconto_pallet"
    | "contributo_fisso"
    | "premio_sell_in"
    | "premio_sell_out"
    | "incentivo_quantita"
    | "bonus_carburante"
    | "materiale_promozionale"
    | "canvass_obiettivo"
    | "altro";
  valore?: number | null;
  prezzo_promozionale?: number | null;
  sconto_percentuale?: number | null;
  quantita_minima?: number | null;
  cartoni_acquisto?: number | null;
  cartoni_omaggio?: number | null;
  omaggio_descrizione?: string | null;
  data_inizio?: string | null;
  data_fine?: string | null;
  clienti_target?: string | null;
  note?: string | null;
  warnings?: string[];
}

interface AiExtractionResult {
  tipo_suggerito: "canvass" | "promozione" | "misto";
  azienda_nome?: string | null;
  periodo_generale?: { data_inizio?: string | null; data_fine?: string | null };
  note_generali?: string | null;
  righe: RigaEstratta[];
  warnings_globali?: string[];
  confidence: number;
  // Legacy fields kept for the older automatic-import flow
  cliente_nome?: string;
  consorzio?: string;
  anno?: number;
  obbiettivi?: { soglia_fatturato: number; percentuale_premio: number; descrizione?: string }[];
  percentuale_premio?: number;
  soglia_fatturato?: number;
  promozioni?: PromozioneEstratta[];
  promozione?: PromozioneEstratta;
  note?: string;
}

function normalize(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenScore(a: string, b: string) {
  const ta = new Set(normalize(a).split(" ").filter((t) => t.length > 1));
  const tb = new Set(normalize(b).split(" ").filter((t) => t.length > 1));
  if (!ta.size || !tb.size) return 0;
  let common = 0;
  ta.forEach((t) => tb.has(t) && common++);
  return common / Math.max(ta.size, tb.size);
}

function findProductCandidates(
  query: string,
  code: string | null | undefined,
  prodotti: { id: string; nome: string; codice?: string | null }[],
) {
  const scored = prodotti.map((p) => {
    let score = 0;
    if (code && p.codice && normalize(code) === normalize(p.codice)) score = 1;
    else {
      const nameScore = tokenScore(query, p.nome);
      const codeScore = code && p.codice ? tokenScore(code, p.codice) : 0;
      score = Math.max(nameScore, codeScore);
    }
    return { id: p.id, nome: p.nome, codice: p.codice ?? null, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.filter((s) => s.score > 0.15).slice(0, 5);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      file_base64,
      file_type,
      text_input,
      azienda_id,
      azienda_nome,
      clienti,
      aziende,
      prodotti,
    } = body;

    if (!file_base64 && !text_input) {
      return new Response(JSON.stringify({ error: "Fornisci un file o del testo da analizzare" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY non configurata");

    const prodottiList =
      (prodotti || [])
        .map((p: any) => `- ${p.nome}${p.codice ? ` [cod ${p.codice}]` : ""}${p.formato ? ` (${p.formato})` : ""}`)
        .join("\n") || "Nessun prodotto";
    const clientiList =
      (clienti || []).slice(0, 200).map((c: any) => `- ${c.nome}${c.consorzio ? ` [${c.consorzio}]` : ""}`).join("\n") || "Nessun cliente";

    const systemPrompt = `Sei un assistente specializzato nell'analisi di documenti commerciali (canvass, promozioni, listini, circolari) per agenti HORECA.
${azienda_nome ? `AZIENDA DI RIFERIMENTO GIÀ SELEZIONATA: ${azienda_nome}` : ""}

CATALOGO PRODOTTI DELL'AZIENDA:
${prodottiList}

CLIENTI DISPONIBILI (usa nomi esatti se citati):
${clientiList}

Devi estrarre TUTTE le condizioni commerciali presenti nel documento in righe strutturate.
Ogni riga rappresenta una condizione applicata a un prodotto (o categoria/generico).

Restituisci SOLO JSON in questo formato:
{
  "tipo_suggerito": "canvass" | "promozione" | "misto",
  "azienda_nome": "${azienda_nome || ""}",
  "periodo_generale": { "data_inizio": "YYYY-MM-DD" | null, "data_fine": "YYYY-MM-DD" | null },
  "note_generali": "testo o null",
  "warnings_globali": ["avvisi generali"],
  "confidence": 0.0-1.0,
  "righe": [
    {
      "prodotto_testo": "nome del prodotto come scritto nel documento",
      "codice_prodotto": "codice se presente o null",
      "formato": "es 6x1L o null",
      "tipologia": "sconto_percentuale | prezzo_promozionale | prezzo_netto | x_piu_y | cartoni_omaggio | sconto_cartone | sconto_pallet | contributo_fisso | premio_sell_in | premio_sell_out | incentivo_quantita | bonus_carburante | materiale_promozionale | canvass_obiettivo | altro",
      "valore": null,
      "prezzo_promozionale": null,
      "sconto_percentuale": null,
      "quantita_minima": null,
      "cartoni_acquisto": null,
      "cartoni_omaggio": null,
      "omaggio_descrizione": null,
      "data_inizio": null,
      "data_fine": null,
      "clienti_target": null,
      "note": null,
      "warnings": []
    }
  ]
}

REGOLE:
1. Estrai UNA riga per ogni condizione (es. "80+4 su X" = 1 riga tipologia "x_piu_y" con cartoni_acquisto=80, cartoni_omaggio=4).
2. "Borgofulvia Extra Dry 80+4 omaggio - prezzo 1,85€" ⇒ 1 riga: prodotto_testo="Borgofulvia Extra Dry", tipologia="x_piu_y", prezzo_promozionale=1.85, cartoni_acquisto=80, cartoni_omaggio=4.
3. Se il documento indica solo uno sconto% ⇒ tipologia="sconto_percentuale", sconto_percentuale=numero.
4. Se prezzo netto/promo ⇒ tipologia="prezzo_promozionale" o "prezzo_netto", prezzo_promozionale=numero.
5. Se ci sono OMAGGI in materiale (frigo, espositori, gadget) ⇒ tipologia="materiale_promozionale", omaggio_descrizione=descrizione.
6. Se il documento è un CANVASS con obiettivi/scaglioni ⇒ tipologia="canvass_obiettivo", quantita_minima o valore = soglia, note = premio.
7. NON INVENTARE valori: se un dato non è presente lascia null.
8. Aggiungi in "warnings" della riga se il prodotto non è chiaro o se la condizione è ambigua.
9. Usa date ISO YYYY-MM-DD.
10. Se non c'è nessuna condizione promozionale ma solo obiettivi ⇒ tipo_suggerito="canvass". Se solo prezzi/omaggi ⇒ "promozione".
11. Rispondi SOLO col JSON, senza markdown.`;

    const userContent: any[] = [
      {
        type: "text",
        text: text_input
          ? `Analizza il seguente testo commerciale ed estrai tutte le righe:\n\n${text_input}`
          : "Analizza questo documento commerciale ed estrai tutte le righe di condizioni:",
      },
    ];
    if (file_base64) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: file_base64.startsWith("data:") ? file_base64 : `data:${file_type};base64,${file_base64}`,
        },
      });
    }

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
          { role: "user", content: userContent },
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
    if (!content) throw new Error("Nessuna risposta dall'AI");

    let parsed: AiExtractionResult;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI response:", e, content);
      throw new Error("Impossibile interpretare la risposta AI");
    }

    // Post-process: attach product candidates per row against provided catalog
    if (Array.isArray(parsed.righe) && Array.isArray(prodotti)) {
      parsed.righe = parsed.righe.map((r) => {
        const candidati = findProductCandidates(r.prodotto_testo || "", r.codice_prodotto, prodotti);
        const best = candidati[0];
        const auto = best && best.score >= 0.7 ? best : null;
        return {
          ...r,
          candidati_prodotti: candidati,
          prodotto_id: auto ? auto.id : null,
          prodotto_match_confidence: best?.score ?? 0,
          warnings: [
            ...(r.warnings || []),
            ...(!auto ? ["Prodotto non riconosciuto con certezza. Seleziona il prodotto corretto."] : []),
          ],
        };
      });
    }

    // Also fabricate legacy fields to keep the old auto-import call site working
    if (!parsed.promozioni && Array.isArray(parsed.righe)) {
      parsed.promozioni = parsed.righe
        .filter((r) => r.tipologia !== "canvass_obiettivo" && r.tipologia !== "materiale_promozionale")
        .map((r) => ({
          nome: r.prodotto_testo || "Promozione",
          tipo:
            r.tipologia === "sconto_percentuale"
              ? "sconto_percentuale"
              : r.prezzo_promozionale != null
                ? "prezzo_fisso"
                : "sconto_percentuale",
          valore: r.sconto_percentuale ?? r.prezzo_promozionale ?? r.valore ?? 0,
          data_inizio: r.data_inizio ?? parsed.periodo_generale?.data_inizio ?? undefined,
          data_fine: r.data_fine ?? parsed.periodo_generale?.data_fine ?? undefined,
          prodotti: r.prodotto_testo ? [r.prodotto_testo] : [],
          cartoni_omaggio: r.cartoni_omaggio ?? 0,
          cartoni_acquisto: r.cartoni_acquisto ?? 0,
        }));
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
