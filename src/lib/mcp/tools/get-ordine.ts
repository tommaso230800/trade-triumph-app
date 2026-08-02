import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_ordine",
  title: "Dettaglio ordine",
  description:
    "Restituisce un singolo ordine con tutte le righe: prodotto, quantità in cartoni e pezzi, prezzo, sconti a cascata e omaggi.",
  inputSchema: {
    ordine_id: z.string().uuid().describe("UUID dell'ordine."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ ordine_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non autenticato." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);

    const { data: ordine, error } = await supabase
      .from("ordini")
      .select("*, clienti(id, nome, citta, partita_iva), aziende(id, nome)")
      .eq("id", ordine_id)
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!ordine) {
      return { content: [{ type: "text", text: "Ordine non trovato." }], isError: true };
    }

    const { data: righe, error: righeError } = await supabase
      .from("ordini_righe")
      .select("*, prodotti(id, nome, codice, formato, pezzi_per_cartone)")
      .eq("ordine_id", ordine_id);

    if (righeError) {
      return { content: [{ type: "text", text: righeError.message }], isError: true };
    }

    const payload = { ordine, righe: righe ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
