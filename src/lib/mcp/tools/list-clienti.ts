import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_clienti",
  title: "Elenco clienti",
  description:
    "Cerca i clienti del CRM per nome, città o consorzio. Restituisce fatturato, numero ordini e contatti.",
  inputSchema: {
    search: z.string().trim().optional().describe("Testo da cercare nel nome del cliente."),
    citta: z.string().trim().optional().describe("Filtra per città."),
    consorzio: z.string().trim().optional().describe("Filtra per consorzio (es. ADAT, CBF)."),
    limit: z.number().int().min(1).max(100).optional().describe("Numero massimo di risultati (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, citta, consorzio, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non autenticato." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("clienti")
      .select(
        "id, nome, citta, provincia, consorzio, status, fatturato, fatturato_2025, ordini_count, telefono, email, partita_iva",
      )
      .is("deleted_at", null)
      .order("fatturato", { ascending: false })
      .limit(limit ?? 25);

    if (search) query = query.ilike("nome", `%${search}%`);
    if (citta) query = query.ilike("citta", `%${citta}%`);
    if (consorzio) query = query.ilike("consorzio", `%${consorzio}%`);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { clienti: data ?? [] },
    };
  },
});
