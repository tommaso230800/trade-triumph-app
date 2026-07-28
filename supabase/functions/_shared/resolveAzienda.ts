// Risolve il nome azienda estratto da un documento a un azienda_id del CRM.
// Solo lettura: nessuna scrittura, nessuna creazione automatica di aziende.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { similarity } from "./orderMatchEngine.ts";

export type AziendaMatch = {
  azienda_id: string | null;
  nome_azienda: string | null;
  confidence: number; // 0..1
  candidati: { azienda_id: string; nome: string; score: number }[];
};

const SOGLIA_MATCH_SICURO = 0.6;

export async function resolveAzienda(
  admin: SupabaseClient,
  userId: string,
  aziendaNomeEstratto: string | null
): Promise<AziendaMatch> {
  if (!aziendaNomeEstratto) {
    return { azienda_id: null, nome_azienda: null, confidence: 0, candidati: [] };
  }

  const { data: aziende, error } = await admin
    .from("aziende")
    .select("id, nome")
    .eq("user_id", userId);
  if (error) throw error;
  if (!aziende || aziende.length === 0) {
    return { azienda_id: null, nome_azienda: aziendaNomeEstratto, confidence: 0, candidati: [] };
  }

  const scored = aziende
    .map((a) => ({ azienda_id: a.id as string, nome: a.nome as string, score: similarity(a.nome, aziendaNomeEstratto) }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const secondBest = scored[1];

  // Ambiguo se il migliore non supera la soglia, o se il secondo è troppo vicino al primo.
  const ambiguo = !best || best.score < SOGLIA_MATCH_SICURO || (secondBest && best.score - secondBest.score < 0.1);

  return {
    azienda_id: ambiguo ? null : best.azienda_id,
    nome_azienda: aziendaNomeEstratto,
    confidence: best?.score ?? 0,
    candidati: scored.slice(0, 5),
  };
}
