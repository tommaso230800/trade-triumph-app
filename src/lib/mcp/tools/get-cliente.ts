import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_cliente",
  title: "Scheda cliente",
  description:
    "Restituisce la scheda completa di un cliente: anagrafica, fatturato, ultimi ordini e note commerciali.",
  inputSchema: {
    cliente_id: z.string().uuid().describe("UUID del cliente."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ cliente_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non autenticato." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);

    const { data: cliente, error } = await supabase
      .from("clienti")
      .select("*")
      .eq("id", cliente_id)
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!cliente) {
      return { content: [{ type: "text", text: "Cliente non trovato." }], isError: true };
    }

    const [{ data: ordini }, { data: note }] = await Promise.all([
      supabase
        .from("ordini")
        .select("id, codice, data_ordine, status, totale, provvigione_prevista, aziende(nome)")
        .eq("cliente_id", cliente_id)
        .is("deleted_at", null)
        .order("data_ordine", { ascending: false })
        .limit(10),
      supabase
        .from("notes")
        .select("id, titolo, contenuto, categoria, priorita, created_at")
        .eq("cliente_id", cliente_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const payload = { cliente, ultimi_ordini: ordini ?? [], note: note ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
