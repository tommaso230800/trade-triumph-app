import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_nota",
  title: "Crea nota commerciale",
  description:
    "Crea una nota commerciale nel CRM, opzionalmente collegata a un cliente o a un'azienda.",
  inputSchema: {
    titolo: z.string().trim().min(1).describe("Titolo della nota."),
    contenuto: z.string().trim().optional().describe("Testo della nota."),
    categoria: z
      .string()
      .trim()
      .optional()
      .describe("Categoria della nota (default: generale)."),
    priorita: z.enum(["alta", "media", "bassa"]).optional().describe("Priorità (default: media)."),
    cliente_id: z.string().uuid().optional().describe("UUID del cliente collegato."),
    azienda_id: z.string().uuid().optional().describe("UUID dell'azienda collegata."),
    data_promemoria: z.string().optional().describe("Data promemoria, formato AAAA-MM-GG."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non autenticato." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);

    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: ctx.getUserId(),
        titolo: input.titolo,
        contenuto: input.contenuto ?? null,
        categoria: input.categoria ?? "generale",
        priorita: input.priorita ?? "media",
        cliente_id: input.cliente_id ?? null,
        azienda_id: input.azienda_id ?? null,
        data_promemoria: input.data_promemoria ?? null,
      })
      .select()
      .single();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Nota creata: ${data.titolo}` }],
      structuredContent: { nota: data },
    };
  },
});
