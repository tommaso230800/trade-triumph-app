import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { ProformaData } from '@/components/ordini/ProformaDialog';

export async function invokeOrderEmail(body: unknown) {
  const { data, error } = await supabase.functions.invoke('send-order-email', { body });
  if (error) {
    const details = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
    let message = 'Operazione non riuscita. Riprova.';
    try { message = JSON.parse(details).error || message; } catch { /* Non-JSON errors stay out of user copy. */ }
    throw new Error(message);
  }
  return data;
}
export async function loadOrderEmailSnapshot(orderId: string): Promise<{ data: ProformaData; version: string; senderEmail: string }> {
  const result = await invokeOrderEmail({ action: 'snapshot', orderId });
  const o = result.order;
  const c = o.clienti;
  const a = o.aziende;
  return { version: result.version, senderEmail: result.senderEmail, data: {
    ordine_id: o.id, azienda_id: o.azienda_id, codice: o.codice || `ORD-${o.id.slice(0, 8)}`, created_at: o.created_at, data_ordine: o.data_ordine,
    cliente_nome: c?.nome || 'N/D', cliente_indirizzo: c?.indirizzo, cliente_citta: c?.citta, cliente_cap: c?.cap, cliente_piva: c?.partita_iva,
    azienda_nome: a?.nome || 'N/D', azienda_indirizzo: a?.indirizzo, azienda_citta: a?.citta,
    tipo_pagamento: o.tipo_pagamento || 'N/D', sconto: Number(o.sconto) || 0, sconto_merce: Number(o.sconto_merce) || 0, totale: Number(o.totale), note: o.note,
    righe: (o.ordini_righe || []).map((r: any) => ({ prodotto_codice: r.prodotti?.codice, prodotto_nome: r.prodotti?.nome || 'N/D', prodotto_brand: r.prodotti?.brands?.name,
      prezzo_unitario: Number(r.prezzo_unitario), quantita_pezzi: r.quantita_pezzi, quantita_cartoni: r.quantita_cartoni, pezzi_per_cartone: r.prodotti?.pezzi_per_cartone || 1,
      sc1: Number(r.sc1) || 0, sc2: Number(r.sc2) || 0, sc3: Number(r.sc3) || 0, is_omaggio: !!r.is_omaggio }))
  } };
}