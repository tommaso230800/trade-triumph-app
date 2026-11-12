import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { authenticateCronRequest } from '../_shared/cron-auth.ts';
import { dispatchPending } from '../_shared/pushDispatch.ts';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('flush') }),
  z.object({ action: z.literal('test'), dispositivoId: z.string().uuid().optional() }),
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (req.method !== 'POST') return json({ error: 'Metodo non consentito' }, 405);
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  try {
    const isCron = authenticateCronRequest(req) === null;
    let userId: string | null = null;
    if (!isCron) {
      const auth = req.headers.get('Authorization');
      if (!auth) return json({ error: 'Accedi per continuare.' }, 401);
      const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: auth } } });
      const { data: { user }, error } = await client.auth.getUser();
      if (error || !user) return json({ error: 'Sessione scaduta. Accedi nuovamente.' }, 401);
      userId = user.id;
    }
    const parsed = schema.safeParse(await req.json().catch(() => ({ action: 'flush' })));
    if (!parsed.success) return json({ error: 'Richiesta non valida.' }, 400);
    const input = parsed.data;

    if (input.action === 'test') {
      if (!userId) return json({ error: 'La prova richiede un utente.' }, 400);
      if (input.dispositivoId) {
        const { data: dev } = await admin.from('push_dispositivi').select('id,enabled').eq('id', input.dispositivoId).eq('user_id', userId).maybeSingle();
        if (!dev) return json({ error: 'Dispositivo non trovato.' }, 404);
        if (!dev.enabled) return json({ error: 'Notifiche disattivate su questo dispositivo.' }, 409);
      }
      const at = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date());
      const eventKey = `test:${crypto.randomUUID()}`;
      const { error } = await admin.rpc('enqueue_notifica', {
        p_event_key: eventKey, p_categoria: 'test', p_recipients: [userId],
        p_titolo: 'Notifica di prova', p_testo: `Le notifiche funzionano su questo dispositivo (${at}).`, p_link: '/notifiche',
        p_ordine_id: null, p_cliente_id: null, p_azienda_id: null, p_cliente_nome: null, p_azienda_nome: null, p_importo: null,
        p_metadata: input.dispositivoId ? { solo_dispositivo: input.dispositivoId } : {}, p_push_mode: 'push',
      });
      if (error) throw new Error(error.message);
      const result = await dispatchPending(admin, 200);
      const { data: notifica } = await admin.from('notifiche').select('id').eq('event_key', eventKey).eq('recipient_id', userId).single();
      const { data: deliveries } = await admin.from('notifiche_consegne').select('id,dispositivo_id,status,http_status,error').eq('notifica_id', notifica?.id);
      return json({ result, deliveries: deliveries ?? [] });
    }

    const result = await dispatchPending(admin, 200);
    if (isCron && result.claimed > 0) {
      await admin.from('notifiche_sistema_log').insert({ job: 'invio_push', status: result.fallite ? 'errore' : 'ok', finished_at: new Date().toISOString(), details: result, error: result.fallite ? `${result.fallite} invii non riusciti` : null });
    }
    return json({ result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('push-dispatch failed:', message);
    await admin.from('notifiche_sistema_log').insert({ job: 'invio_push', status: 'errore', finished_at: new Date().toISOString(), error: message });
    return json({ error: 'Invio notifiche non riuscito.', details: message }, 500);
  }
});
