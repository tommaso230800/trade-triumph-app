import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_ordini",
  title: "Elenco ordini",
  description:
    "Elenca gli ordini del CRM con filtri per stato, cliente, azienda e periodo. Include totale, provvigione prevista e stato provvigione.",
  inputSchema: {
    stato: z
      .enum(["in_attesa", "spedito", "completato", "annullato", "stand_by"])
      .optional()
      .describe("Filtra per stato dell'ordine."),
    cliente_id: z.string().uuid().optional().describe("UUID del cliente."),
    azienda_id: z.string().uuid().optional().describe("UUID dell'azienda."),
    da_data: z.string().optional().describe("Data ordine minima, formato AAAA-MM-GG."),
    a_data: z.string().optional().describe("Data ordine massima, formato AAAA-MM-GG."),
    limit: z.number().int().min(1).max(100).optional().describe("Numero massimo di risultati (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ stato, cliente_id, azienda_id, da_data, a_data, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non autenticato." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("ordini")
      .select(
        "id, codice, data_ordine, data_conferma, status, totale, sconto, provvigione_prevista, provvigione_stato, note, clienti(id, nome, citta), aziende(id, nome)",
      )
      .is("deleted_at", null)
      .order("data_ordine", { ascending: false })
      .limit(limit ?? 25);

    if (stato) query = query.eq("status", stato);
    if (cliente_id) query = query.eq("cliente_id", cliente_id);
    if (azienda_id) query = query.eq("azienda_id", azienda_id);
    if (da_data) query = query.gte("data_ordine", da_data);
    if (a_data) query = query.lte("data_ordine", a_data);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { ordini: data ?? [] },
    };
  },
});
