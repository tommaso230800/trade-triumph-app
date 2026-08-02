import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_canvass_promo",
  title: "Canvass e promozioni",
  description:
    "Elenca i canvass e le promozioni caricati nel CRM, con periodo di validità, sconti e prodotti coinvolti.",
  inputSchema: {
    azienda_id: z.string().uuid().optional().describe("UUID dell'azienda."),
    solo_attive: z
      .boolean()
      .optional()
      .describe("Se true restituisce solo le iniziative valide alla data odierna."),
    limit: z.number().int().min(1).max(100).optional().describe("Numero massimo di risultati (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ azienda_id, solo_attive, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non autenticato." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const oggi = new Date().toISOString().slice(0, 10);

    let query = supabase
      .from("canvass")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);

    if (azienda_id) query = query.eq("azienda_id", azienda_id);
    if (solo_attive) query = query.lte("data_inizio", oggi).gte("data_fine", oggi);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { canvass: data ?? [] },
    };
  },
});
