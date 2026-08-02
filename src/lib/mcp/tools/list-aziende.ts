import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_aziende",
  title: "Elenco aziende",
  description:
    "Elenca le aziende mandanti con settore, provvigione percentuale e sconti di default.",
  inputSchema: {
    search: z.string().trim().optional().describe("Testo da cercare nel nome dell'azienda."),
    limit: z.number().int().min(1).max(100).optional().describe("Numero massimo di risultati (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non autenticato." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("aziende")
      .select(
        "id, nome, settore, citta, status, provvigione_percentuale, default_sc1, default_sc2, default_sc3, prodotti, email, telefono",
      )
      .is("deleted_at", null)
      .order("nome")
      .limit(limit ?? 50);

    if (search) query = query.ilike("nome", `%${search}%`);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { aziende: data ?? [] },
    };
  },
});
