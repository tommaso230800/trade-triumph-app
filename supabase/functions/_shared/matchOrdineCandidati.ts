// Cerca, tra gli ordini CRM esistenti, quale corrisponde a un documento di
// conferma appena estratto. Solo lettura.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type CandidatoOrdine = {
  ordine_id: string;
  codice: string;
  data_ordine: string | null;
  totale: number;
  score: number;
};

export type EsitoRicercaOrdine =
  | { esito: "trovato"; candidato: CandidatoOrdine }
  | { esito: "ambiguo"; candidati: CandidatoOrdine[] }
  | { esito: "non_trovato" };

function addDays(dateIso: string, days: number): string {
  const d = new Date(dateIso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function cercaOrdineCandidato(
  admin: SupabaseClient,
  params: {
    userId: string;
    aziendaId: string | null;
    clienteId: string | null;
    dataDocumento: string; // YYYY-MM-DD, data email o data ordine nel documento
    imponibileTotale: number;
    giorniFinestra: number;
    tolleranzaEuro: number;
  }
): Promise<EsitoRicercaOrdine> {
  const { userId, aziendaId, clienteId, dataDocumento, imponibileTotale, giorniFinestra, tolleranzaEuro } = params;

  // Serve almeno azienda o cliente per non fare una ricerca a strascico su tutti gli ordini.
  if (!aziendaId && !clienteId) return { esito: "non_trovato" };

  const dataMin = addDays(dataDocumento, -giorniFinestra);
  const dataMax = addDays(dataDocumento, giorniFinestra);

  let query = admin
    .from("ordini")
    .select("id, codice, data_ordine, totale, status")
    .eq("user_id", userId)
    .neq("status", "annullato")
    .gte("data_ordine", dataMin)
    .lte("data_ordine", dataMax);

  if (aziendaId) query = query.eq("azienda_id", aziendaId);
  if (clienteId) query = query.eq("cliente_id", clienteId);

  const { data: ordini, error } = await query;
  if (error) throw error;
  if (!ordini || ordini.length === 0) return { esito: "non_trovato" };

  // Punteggio: vicinanza del totale (imponibile_totale del documento vs totale ordine).
  // Tolleranza larga qui (è solo per il ranking dei candidati, non per validare
  // le righe - quello lo fa confrontaOrdine con la tolleranza stretta in centesimi).
  const scored: CandidatoOrdine[] = ordini.map((o) => {
    const delta = Math.abs(Number(o.totale) - imponibileTotale);
    const base = Math.max(Number(o.totale), imponibileTotale, 1);
    const vicinanza = 1 - Math.min(1, delta / base);
    return {
      ordine_id: o.id,
      codice: o.codice,
      data_ordine: o.data_ordine,
      totale: Number(o.totale),
      score: vicinanza,
    };
  }).sort((a, b) => b.score - a.score);

  const migliore = scored[0];
  const secondoMigliore = scored[1];

  const totaleCombacia = Math.abs(migliore.totale - imponibileTotale) <= tolleranzaEuro;
  const unicoCandidatoForte =
    totaleCombacia && (!secondoMigliore || migliore.score - secondoMigliore.score > 0.05);

  if (scored.length === 1 && totaleCombacia) {
    return { esito: "trovato", candidato: migliore };
  }
  if (unicoCandidatoForte) {
    return { esito: "trovato", candidato: migliore };
  }
  if (scored.length > 1) {
    return { esito: "ambiguo", candidati: scored.slice(0, 8) };
  }
  return { esito: "non_trovato" };
}
