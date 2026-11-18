// Pure helpers for the scheduled reorder check; the cadence itself comes from the shared Riordino engine.
import { computeReorderPairs, type ReorderOrder } from './reorder/reorderPairs.ts';

export type OwnerOrder = ReorderOrder & { user_id: string };

export interface ReorderAlert {
  owner_id: string; cliente_id: string; azienda_id: string; ultimo_ordine_data: string; ultimo_ordine_id: string;
  prossimo_riordino_previsto: string | null; giorni_ritardo: number; frequenza: number | null; tolleranza: number;
  event_key: string;
}

export const itDate = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');

/** One alert key per client–company cycle: a new valid order starts a new cycle with a new last-order date. */
export const reorderEventKey = (clienteId: string, aziendaId: string, ultimoOrdine: string) =>
  `riordino:${clienteId}:${aziendaId}:${ultimoOrdine.slice(0, 10)}`;

export function computeOwnerAlerts(ownerId: string, orders: ReorderOrder[], today: string, tolleranza: number) {
  const pairs = computeReorderPairs(orders, today, tolleranza);
  const alerts: ReorderAlert[] = pairs.filter(p => p.da_ricontattare).map(p => ({
    owner_id: ownerId, cliente_id: p.cliente_id, azienda_id: p.azienda_id, ultimo_ordine_data: p.ultimo_ordine_data,
    ultimo_ordine_id: p.ultimo_ordine_id, prossimo_riordino_previsto: p.prossimo_riordino_previsto,
    giorni_ritardo: Math.max(1, p.giorni_ritardo), frequenza: p.media_giorni_riordino, tolleranza: p.tolleranza,
    event_key: reorderEventKey(p.cliente_id, p.azienda_id, p.ultimo_ordine_data),
  }));
  return { pairs: pairs.length, insufficienti: pairs.filter(p => p.storico_insufficiente).length, alerts };
}

export function reorderMessage(cliente: string, azienda: string, a: Pick<ReorderAlert, 'giorni_ritardo' | 'ultimo_ordine_data'>) {
  return {
    titolo: `Riordino in ritardo · ${cliente} · ${azienda}`,
    testo: `${cliente} ha superato di ${a.giorni_ritardo} ${a.giorni_ritardo === 1 ? 'giorno' : 'giorni'} la data prevista per il riordino con ${azienda}${azienda.endsWith('.') ? '' : '.'} Ultimo ordine: ${itDate(a.ultimo_ordine_data)}.`,
  };
}

/** Ora (0–23) a Roma, per l'invio del riepilogo giornaliero. */
export const romeHour = (now: Date = new Date()) =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour: '2-digit', hour12: false }).format(now)) % 24;

/** Il riepilogo parte dalle 8 (ora di Roma), una sola volta al giorno per destinatari. */
export const DIGEST_DALLE_ORE = 8;
export const reorderDigestKey = (ownerId: string, today: string) => `riordino_riepilogo:${ownerId}:${today}`;

/**
 * Riepilogo giornaliero dei clienti in ritardo sul riordino: una notifica con
 * il numero e i casi più in ritardo, così l'avviso arriva ogni mattina finché
 * il cliente non riordina (gli avvisi singoli restano uno per ciclo).
 */
export function reorderDigestMessage(items: Array<{ cliente: string; azienda: string; giorni_ritardo: number }>) {
  const ordinati = [...items].sort((a, b) => b.giorni_ritardo - a.giorni_ritardo);
  const n = ordinati.length;
  const primi = ordinati.slice(0, 3).map((i) => `${i.cliente} · ${i.azienda} (${i.giorni_ritardo} gg)`);
  const altri = n - primi.length;
  return {
    titolo: `Riordini in ritardo: ${n} ${n === 1 ? 'cliente' : 'clienti'}`,
    testo: `${primi.join('; ')}${altri > 0 ? ` e altri ${altri}` : ''}.`,
  };
}
