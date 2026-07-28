// Risolve il nome cliente estratto da un documento a un cliente_id del CRM.
// Solo lettura di default; con persist=true (solo fuori da dry-run) salva un
// nuovo alias 'auto' in clienti_alias quando trova un match forte, così i
// prossimi documenti dello stesso fornitore per lo stesso cliente matchano
// all'istante.
//
// LIMITE NOTO: parse-order-multi (riutilizzata, non modificata) non estrae
// P.IVA o codice-cliente-aziendale dal documento — solo il nome testuale.
// Finché non si aggiunge un'estrazione dedicata, il matching su clienti_alias
// si basa solo su denominazione_alternativa (fuzzy), non su partita_iva.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { similarity } from "./orderMatchEngine.ts";

export type ClienteMatch = {
  cliente_id: string | null;
  nome_estratto: string | null;
  confidence: number;
  fonte: "alias" | "fuzzy" | "nessuno";
  candidati: { cliente_id: string; nome: string; score: number }[];
};

const SOGLIA_MATCH_SICURO = 0.6;

export async function resolveCliente(
  admin: SupabaseClient,
  userId: string,
  clienteNomeEstratto: string | null,
  aziendaId: string | null,
  persist: boolean
): Promise<ClienteMatch> {
  if (!clienteNomeEstratto) {
    return { cliente_id: null, nome_estratto: null, confidence: 0, fonte: "nessuno", candidati: [] };
  }

  // 1) Alias già noti per questa azienda
  if (aziendaId) {
    const { data: alias } = await admin
      .from("clienti_alias")
      .select("id, cliente_id, denominazione_alternativa, match_count, clienti(nome)")
      .eq("user_id", userId)
      .eq("azienda_id", aziendaId);

    if (alias && alias.length > 0) {
      const scored = alias
        .map((a: any) => ({
          alias_id: a.id as string,
          cliente_id: a.cliente_id as string,
          nome: a.denominazione_alternativa || a.clienti?.nome || "",
          match_count: (a.match_count as number) ?? 0,
          score: similarity(a.denominazione_alternativa || a.clienti?.nome || "", clienteNomeEstratto),
        }))
        .sort((a, b) => b.score - a.score);

      if (scored[0] && scored[0].score >= SOGLIA_MATCH_SICURO) {
        if (persist) {
          await admin
            .from("clienti_alias")
            .update({ match_count: scored[0].match_count + 1, ultimo_match: new Date().toISOString() })
            .eq("id", scored[0].alias_id);
        }
        return {
          cliente_id: scored[0].cliente_id,
          nome_estratto: clienteNomeEstratto,
          confidence: scored[0].score,
          fonte: "alias",
          candidati: scored.slice(0, 5),
        };
      }
    }
  }

  // 2) Fuzzy match diretto sui clienti
  const { data: clienti, error } = await admin.from("clienti").select("id, nome").eq("user_id", userId);
  if (error) throw error;
  if (!clienti || clienti.length === 0) {
    return { cliente_id: null, nome_estratto: clienteNomeEstratto, confidence: 0, fonte: "nessuno", candidati: [] };
  }

  const scored = clienti
    .map((c) => ({ cliente_id: c.id as string, nome: c.nome as string, score: similarity(c.nome, clienteNomeEstratto) }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const secondBest = scored[1];
  const ambiguo = !best || best.score < SOGLIA_MATCH_SICURO || (secondBest && best.score - secondBest.score < 0.1);

  if (!ambiguo && best) {
    if (persist && aziendaId) {
      await admin.from("clienti_alias").insert({
        user_id: userId,
        cliente_id: best.cliente_id,
        azienda_id: aziendaId,
        denominazione_alternativa: clienteNomeEstratto,
        source: "auto",
        match_count: 1,
        ultimo_match: new Date().toISOString(),
      });
    }
    return {
      cliente_id: best.cliente_id,
      nome_estratto: clienteNomeEstratto,
      confidence: best.score,
      fonte: "fuzzy",
      candidati: scored.slice(0, 5),
    };
  }

  // Nessun match affidabile: NON si inventa il cliente.
  return {
    cliente_id: null,
    nome_estratto: clienteNomeEstratto,
    confidence: best?.score ?? 0,
    fonte: "nessuno",
    candidati: scored.slice(0, 5),
  };
}
