// Web Push delivery queue shared by every notification producer.
// Each device is sent independently: one unreachable device never blocks the others.
import webpush from 'npm:web-push@3.6.7';

const MAX_ATTEMPTS = 5;
const SEND_TIMEOUT_MS = 10_000;

type Delivery = { id: string; notifica_id: string; dispositivo_id: string; attempts: number; receipt_token: string };

export interface DispatchResult { claimed: number; accettate: number; fallite: number; scadute: number; riprova: number; annullate: number }

function vapid() {
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:agenziamazzigroup@gmail.com';
  if (!publicKey || !privateKey) throw new Error('Chiavi notifiche push non configurate');
  return { publicKey, privateKey, subject };
}

export function retryDelayMinutes(attempts: number): number {
  return Math.min(60, Math.max(1, attempts * attempts));
}

/** Classifies a push-service response: accepted, expired subscription, retryable or permanent failure. */
export function classifyPushStatus(status: number): 'accettata' | 'scaduta' | 'riprova' | 'fallita' {
  if (status >= 200 && status < 300) return 'accettata';
  if (status === 404 || status === 410) return 'scaduta';
  if (status === 429 || status >= 500) return 'riprova';
  return 'fallita';
}

// deno-lint-ignore no-explicit-any
export async function dispatchPending(admin: any, limit = 100): Promise<DispatchResult> {
  const result: DispatchResult = { claimed: 0, accettate: 0, fallite: 0, scadute: 0, riprova: 0, annullate: 0 };
  const { data: claimed, error } = await admin.rpc('claim_push_consegne', { p_limit: limit });
  if (error) throw new Error(`Coda notifiche non disponibile: ${error.message}`);
  const deliveries = (claimed ?? []) as Delivery[];
  result.claimed = deliveries.length;
  if (!deliveries.length) return result;

  const keys = vapid();
  const notificaIds = [...new Set(deliveries.map(d => d.notifica_id))];
  const deviceIds = [...new Set(deliveries.map(d => d.dispositivo_id))];
  const [{ data: notifiche, error: nErr }, { data: devices, error: dErr }] = await Promise.all([
    admin.from('notifiche').select('id,categoria,titolo,testo,link,event_key,ordine_id,created_at').in('id', notificaIds),
    admin.from('push_dispositivi').select('id,endpoint,p256dh,auth_key,enabled,failure_count').in('id', deviceIds),
  ]);
  if (nErr || dErr) throw new Error(`Lettura notifiche non riuscita: ${(nErr ?? dErr).message}`);
  // deno-lint-ignore no-explicit-any
  const nById = new Map<string, any>((notifiche ?? []).map((n: any) => [n.id, n]));
  // deno-lint-ignore no-explicit-any
  const dById = new Map<string, any>((devices ?? []).map((d: any) => [d.id, d]));

  // A new-order event is withdrawn if the order was removed before delivery.
  const orderIds = [...new Set((notifiche ?? []).filter((n: { categoria: string; ordine_id: string | null }) => n.categoria === 'nuovo_ordine' && n.ordine_id).map((n: { ordine_id: string }) => n.ordine_id))];
  const liveOrders = new Set<string>();
  if (orderIds.length) {
    const { data: ords } = await admin.from('ordini').select('id').in('id', orderIds).is('deleted_at', null);
    for (const o of ords ?? []) liveOrders.add(o.id);
  }
  const receiptUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/push-receipt`;

  const now = () => new Date().toISOString();
  await Promise.allSettled(deliveries.map(async (d) => {
    const n = nById.get(d.notifica_id);
    const dev = dById.get(d.dispositivo_id);
    if (!n || !dev || !dev.enabled || (n.categoria === 'nuovo_ordine' && n.ordine_id && !liveOrders.has(n.ordine_id))) {
      await admin.from('notifiche_consegne').update({ status: 'annullata', error: !dev?.enabled ? 'Dispositivo disattivato' : 'Evento non più valido', updated_at: now() }).eq('id', d.id);
      result.annullate++;
      return;
    }
    const payload = JSON.stringify({
      title: n.titolo, body: n.testo, url: n.link || '/notifiche', tag: n.event_key,
      delivery: d.id, token: d.receipt_token, receipt: receiptUrl,
    });
    let status = 0; let detail = '';
    try {
      const req = webpush.generateRequestDetails(
        { endpoint: dev.endpoint, keys: { p256dh: dev.p256dh, auth: dev.auth_key } }, payload,
        { vapidDetails: keys, TTL: n.categoria === 'riordino' ? 86400 : 43200, urgency: n.categoria === 'riordino' ? 'normal' : 'high' },
      );
      const res = await fetch(req.endpoint, { method: req.method, headers: req.headers, body: req.body, signal: AbortSignal.timeout(SEND_TIMEOUT_MS) });
      status = res.status;
      detail = status >= 300 ? (await res.text()).slice(0, 300) : '';
    } catch (e) {
      detail = e instanceof Error ? e.message : String(e);
    }
    const outcome = status ? classifyPushStatus(status) : 'riprova';
    if (outcome === 'accettata') {
      await admin.from('notifiche_consegne').update({ status: 'accettata', http_status: status, accepted_at: now(), error: null, updated_at: now() }).eq('id', d.id);
      await admin.from('push_dispositivi').update({ last_accepted_at: now(), failure_count: 0, last_error: null }).eq('id', dev.id);
      result.accettate++;
    } else if (outcome === 'scaduta') {
      await admin.from('notifiche_consegne').update({ status: 'scaduta', http_status: status, error: 'Iscrizione del dispositivo scaduta', updated_at: now() }).eq('id', d.id);
      await admin.from('push_dispositivi').update({ enabled: false, disabled_reason: 'Iscrizione scaduta: riattiva le notifiche su questo dispositivo', last_error: `HTTP ${status}`, last_error_at: now() }).eq('id', dev.id);
      result.scadute++;
    } else if (outcome === 'riprova' && d.attempts < MAX_ATTEMPTS) {
      const next = new Date(Date.now() + retryDelayMinutes(d.attempts) * 60_000).toISOString();
      await admin.from('notifiche_consegne').update({ status: 'in_coda', http_status: status || null, error: detail || 'Servizio push non raggiungibile', next_attempt_at: next, updated_at: now() }).eq('id', d.id);
      await admin.from('push_dispositivi').update({ last_error: detail || `HTTP ${status}`, last_error_at: now(), failure_count: (dev.failure_count ?? 0) + 1 }).eq('id', dev.id);
      result.riprova++;
    } else {
      await admin.from('notifiche_consegne').update({ status: 'fallita', http_status: status || null, error: detail || `HTTP ${status}`, updated_at: now() }).eq('id', d.id);
      await admin.from('push_dispositivi').update({ last_error: detail || `HTTP ${status}`, last_error_at: now(), failure_count: (dev.failure_count ?? 0) + 1 }).eq('id', dev.id);
      result.fallite++;
    }
  }));
  return result;
}
