// Pure helpers for the scheduled reminder check (shared with app tests).

export interface PromemoriaRow {
  id: string;
  user_id: string;
  titolo: string;
  descrizione: string | null;
  data_promemoria: string;
  cliente_id: string | null;
  stato: string;
}

/** Window in which a due reminder is still notified; older ones are not pushed at all. */
export const FINESTRA_ORE = 24;
/** Reminders overdue by more than this go to the notification centre without a push (e.g. first run). */
export const PUSH_ENTRO_MINUTI = 120;

/**
 * One notification per reminder time: postponing a reminder ("ricordamelo di nuovo")
 * changes data_promemoria and therefore produces a new key and a new push.
 */
export const promemoriaEventKey = (p: Pick<PromemoriaRow, 'id' | 'data_promemoria'>) =>
  `promemoria:${p.id}:${new Date(p.data_promemoria).toISOString()}`;

export function promemoriaDaNotificare(rows: PromemoriaRow[], now: Date) {
  const t = now.getTime();
  const min = t - FINESTRA_ORE * 3_600_000;
  return rows
    .filter((p) => p.stato === 'da_fare')
    .filter((p) => {
      const when = new Date(p.data_promemoria).getTime();
      return Number.isFinite(when) && when <= t && when > min;
    })
    .map((p) => ({
      ...p,
      event_key: promemoriaEventKey(p),
      push_mode: t - new Date(p.data_promemoria).getTime() <= PUSH_ENTRO_MINUTI * 60_000 ? 'push' as const : 'silenzioso' as const,
    }));
}

export function promemoriaMessage(p: Pick<PromemoriaRow, 'titolo' | 'descrizione'>, clienteNome?: string | null) {
  const titolo = clienteNome ? `Promemoria · ${clienteNome}` : 'Promemoria';
  const note = (p.descrizione ?? '').trim();
  const testo = note ? `${p.titolo.trim()} — ${note}` : p.titolo.trim();
  return { titolo, testo: testo.length > 240 ? `${testo.slice(0, 237)}…` : testo };
}
