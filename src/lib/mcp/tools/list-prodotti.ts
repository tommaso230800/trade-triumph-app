import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_prodotti",
  title: "Catalogo prodotti",
  description:
    "Cerca i prodotti a catalogo per nome, codice o azienda. Restituisce formato, pezzi per cartone, prezzo di listino e sconti di default.",
  inputSchema: {
    search: z.string().trim().optional().describe("Testo da cercare nel nome del prodotto."),
    codice: z.string().trim().optional().describe("Codice prodotto (anche parziale)."),
    azienda_id: z.string().uuid().optional().describe("UUID dell'azienda produttrice."),
    limit: z.number().int().min(1).max(100).optional().describe("Numero massimo di risultati (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, codice, azienda_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non autenticato." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("prodotti")
      .select(
        "id, nome, codice, formato, pezzi_per_cartone, prezzo_listino, costo_acquisto, sc1_default, sc2_default, sc3_default, azienda_id, aziende(id, nome)",
      )
      .is("deleted_at", null)
      .order("nome")
      .limit(limit ?? 50);

    if (search) query = query.ilike("nome", `%${search}%`);
    if (codice) query = query.ilike("codice", `%${codice}%`);
    if (azienda_id) query = query.eq("azienda_id", azienda_id);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { prodotti: data ?? [] },
    };
  },
});
