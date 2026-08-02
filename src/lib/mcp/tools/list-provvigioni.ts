import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_provvigioni",
  title: "Provvigioni e scadenziario",
  description:
    "Elenca le fatture dello scadenziario con la relativa provvigione: stato provvigione, trimestre di competenza e di pagamento, importi.",
  inputSchema: {
    stato_provvigione: z
      .enum(["da_pagare", "pagata", "parziale", "contestazione", "scaduta"])
      .optional()
      .describe("Filtra per stato della provvigione."),
    azienda_id: z.string().uuid().optional().describe("UUID dell'azienda."),
    cliente_id: z.string().uuid().optional().describe("UUID del cliente."),
    anno_competenza: z.number().int().optional().describe("Anno di competenza (es. 2026)."),
    trimestre_competenza: z.number().int().min(1).max(4).optional().describe("Trimestre di competenza 1-4."),
    trimestre_pagamento: z.number().int().min(1).max(4).optional().describe("Trimestre di pagamento 1-4."),
    limit: z.number().int().min(1).max(200).optional().describe("Numero massimo di risultati (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non autenticato." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("scadenziario_fatture")
      .select(
        "id, numero_fattura, data_fattura, data_scadenza, importo, percentuale_provvigione, provvigione_calcolata, importo_provvigione_pagata, stato, stato_provvigione, anno_competenza, trimestre_competenza, anno_pagamento, trimestre_pagamento, azienda_nome, cliente_nome",
      )
      .order("data_scadenza", { ascending: false })
      .limit(input.limit ?? 50);

    if (input.stato_provvigione) query = query.eq("stato_provvigione", input.stato_provvigione);
    if (input.azienda_id) query = query.eq("azienda_id", input.azienda_id);
    if (input.cliente_id) query = query.eq("cliente_id", input.cliente_id);
    if (input.anno_competenza) query = query.eq("anno_competenza", input.anno_competenza);
    if (input.trimestre_competenza) query = query.eq("trimestre_competenza", input.trimestre_competenza);
    if (input.trimestre_pagamento) query = query.eq("trimestre_pagamento", input.trimestre_pagamento);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const righe = data ?? [];
    const totale = righe.reduce((acc, r) => acc + (Number(r.provvigione_calcolata) || 0), 0);
    const totalePagata = righe.reduce((acc, r) => acc + (Number(r.importo_provvigione_pagata) || 0), 0);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            totale_provvigioni: totale,
            totale_pagato: totalePagata,
            righe,
          }),
        },
      ],
      structuredContent: { totale_provvigioni: totale, totale_pagato: totalePagata, righe },
    };
  },
});
