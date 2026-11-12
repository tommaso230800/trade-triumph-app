import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { authenticateCronRequest } from '../_shared/cron-auth.ts';
import { todayRome } from '../_shared/reorder/rome.ts';
import { computeOwnerAlerts, reorderMessage, type OwnerOrder } from '../_shared/reorderAlerts.ts';
import { dispatchPending } from '../_shared/pushDispatch.ts';

const JOB = 'controllo_riordini';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (req.method !== 'POST') return json({ error: 'Metodo non consentito' }, 405);
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

  // Scheduled runs authenticate with the cron secret; manual runs require an admin session.
  let trigger = 'programmato';
  if (authenticateCronRequest(req) !== null) {
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'Accesso richiesto.' }, 401);
    const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await client.auth.getUser();
    if (!user) return json({ error: 'Sessione scaduta.' }, 401);
    const { data: isAdmin } = await admin.rpc('is_admin', { _user_id: user.id });
    if (!isAdmin) return json({ error: 'Riservato agli admin.' }, 403);
    trigger = 'manuale';
  }

  const today = todayRome();
  const { data: run } = await admin.from('notifiche_sistema_log').insert({ job: JOB, status: 'in_corso', details: { oggi: today, avvio: trigger } }).select('id').single();
  try {
    const { count: previousOk } = await admin.from('notifiche_sistema_log').select('id', { count: 'exact', head: true }).eq('job', JOB).eq('status', 'ok');
    // First ever run: pairs already late before the feature existed go to history without a push burst.
    const baseline = (previousOk ?? 0) === 0;

    const orders: OwnerOrder[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin.from('ordini').select('id,user_id,cliente_id,azienda_id,data_ordine,status,totale,deleted_at,note').is('deleted_at', null).order('id').range(from, from + 999);
      if (error) throw new Error(`Lettura ordini: ${error.message}`);
      orders.push(...(data as OwnerOrder[]));
      if (!data || data.length < 1000) break;
    }
    const byOwner = new Map<string, OwnerOrder[]>();
    for (const o of orders) byOwner.set(o.user_id, [...(byOwner.get(o.user_id) ?? []), o]);

    const { data: settings } = await admin.from('riordino_impostazioni').select('owner_id,tolleranza');
    const tolByOwner = new Map<string, number>((settings ?? []).map((s: { owner_id: string; tolleranza: number }) => [s.owner_id, s.tolleranza]));

    const [{ data: clienti }, { data: aziende }] = await Promise.all([
      admin.from('clienti').select('id,nome'), admin.from('aziende').select('id,nome'),
    ]);
    const cName = new Map<string, string>((clienti ?? []).map((c: { id: string; nome: string }) => [c.id, c.nome]));
    const aName = new Map<string, string>((aziende ?? []).map((a: { id: string; nome: string }) => [a.id, a.nome]));

    let coppie = 0, insufficienti = 0, inRitardo = 0, nuove = 0;
    for (const [owner, list] of byOwner) {
      const tol = tolByOwner.get(owner) ?? 6;
      const res = computeOwnerAlerts(owner, list, today, tol);
      coppie += res.pairs; insufficienti += res.insufficienti; inRitardo += res.alerts.length;
      if (!res.alerts.length) continue;
      const { data: recipients, error: rErr } = await admin.rpc('notifica_destinatari', { p_owner: owner });
      if (rErr) throw new Error(`Destinatari: ${rErr.message}`);
      for (const a of res.alerts) {
        const cliente = cName.get(a.cliente_id) ?? 'Cliente N/D';
        const azienda = aName.get(a.azienda_id) ?? 'Azienda N/D';
        const msg = reorderMessage(cliente, azienda, a);
        const { data: created, error } = await admin.rpc('enqueue_notifica', {
          p_event_key: a.event_key, p_categoria: 'riordino', p_recipients: recipients,
          p_titolo: msg.titolo, p_testo: msg.testo, p_link: `/riordino?cliente=${a.cliente_id}&azienda=${a.azienda_id}`,
          p_ordine_id: a.ultimo_ordine_id || null, p_cliente_id: a.cliente_id, p_azienda_id: a.azienda_id,
          p_cliente_nome: cliente, p_azienda_nome: azienda, p_importo: null,
          p_metadata: { ultimo_ordine: a.ultimo_ordine_data, prossimo_previsto: a.prossimo_riordino_previsto, giorni_ritardo: a.giorni_ritardo, frequenza: a.frequenza, tolleranza: a.tolleranza, controllo: today, iniziale: baseline },
          p_push_mode: baseline ? 'silenzioso' : 'push',
        });
        if (error) throw new Error(`Avviso ${cliente}/${azienda}: ${error.message}`);
        nuove += Number(created ?? 0);
      }
    }
    const dispatch = await dispatchPending(admin, 300);
    const details = { oggi: today, avvio: trigger, coppie, in_ritardo: inRitardo, dati_insufficienti: insufficienti, nuove_notifiche: nuove, iniziale_senza_push: baseline, invio: dispatch };
    await admin.from('notifiche_sistema_log').update({ status: 'ok', finished_at: new Date().toISOString(), details }).eq('id', run?.id);
    return json(details);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('reorder-alerts failed:', message);
    await admin.from('notifiche_sistema_log').update({ status: 'errore', finished_at: new Date().toISOString(), error: message }).eq('id', run?.id);
    return json({ error: 'Controllo riordini non riuscito.', details: message }, 500);
  }
});
