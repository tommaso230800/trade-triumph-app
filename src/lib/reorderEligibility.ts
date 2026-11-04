import { todayRome } from './commercialProposal';

export interface ReorderSourceOrder {
  id: string; cliente_id: string | null; azienda_id: string | null;
  data_ordine: string | null; status: string; note?: string | null;
  deleted_at?: string | null; is_test?: boolean; duplicate_of?: string | null;
}

/** Provenance, not revenue or missing lines, determines chronology validity. */
export function reorderExclusion(o: ReorderSourceOrder, today = todayRome()): string | null {
  if (o.deleted_at) return 'Ordine eliminato';
  if (['annullato', 'bozza', 'draft', 'da_confermare', 'stand_by'].includes(o.status)) return `Stato escluso: ${o.status}`;
  if (o.is_test) return 'Ordine di prova dichiarato';
  if (o.duplicate_of) return `Duplicato dichiarato di ${o.duplicate_of}`;
  if (o.note?.trim() === 'Storico 2025 ricostruito') return 'Ripartizione fatturato 2025: data e acquisto non documentati';
  if (!o.cliente_id || !o.azienda_id) return 'Cliente o mandante mancanti';
  if (!o.data_ordine || !/^\d{4}-\d{2}-\d{2}$/.test(o.data_ordine.slice(0, 10))) return 'Data commerciale mancante o non valida';
  const date = o.data_ordine.slice(0, 10);
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return 'Data commerciale non valida';
  if (date > today) return 'Data commerciale futura';
  return null;
}