import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { authenticateCronRequest } from '../_shared/cron-auth.ts';
import { dispatchPending } from '../_shared/pushDispatch.ts';
import { FINESTRA_ORE, promemoriaDaNotificare, promemoriaMessage, type PromemoriaRow } from '../_shared/promemoriaAlerts.ts';

const JOB = 'controllo_promemoria';

/**
 * Controllo programmato (ogni 5 minuti): i promemoria "da fare" arrivati all'ora
 * indicata diventano una notifica push per il solo proprietario del promemoria.
 * Stesso canale e stesse regole anti-duplicato degli avvisi riordino.
 */
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

  const now = new Date();
  const { data: run } = await admin.from('notifiche_sistema_log').insert({ job: JOB, status: 'in_corso', details: { avvio: trigger, ora: now.toISOString() } }).select('id').single();
  try {
    const from = new Date(now.getTime() - FINESTRA_ORE * 3_600_000).toISOString();
    const { data, error } = await admin
      .from('ai_promemoria')
      .select('id,user_id,titolo,descrizione,data_promemoria,cliente_id,stato')
      .eq('stato', 'da_fare')
      .lte('data_promemoria', now.toISOString())
      .gt('data_promemoria', from)
      .limit(1000);
    if (error) throw new Error(`Lettura promemoria: ${error.message}`);
    const due = promemoriaDaNotificare((data ?? []) as PromemoriaRow[], now);

    const clienteIds = [...new Set(due.map((p) => p.cliente_id).filter((id): id is string => !!id))];
    const cName = new Map<string, string>();
    if (clienteIds.length) {
      const { data: clienti } = await admin.from('clienti').select('id,nome').in('id', clienteIds);
      for (const c of (clienti ?? []) as { id: string; nome: string }[]) cName.set(c.id, c.nome);
    }

    let nuove = 0;
    for (const p of due) {
      const cliente = p.cliente_id ? cName.get(p.cliente_id) ?? null : null;
      const msg = promemoriaMessage(p, cliente);
      const { data: created, error: qErr } = await admin.rpc('enqueue_notifica', {
        p_event_key: p.event_key, p_categoria: 'promemoria', p_recipients: [p.user_id],
        p_titolo: msg.titolo, p_testo: msg.testo, p_link: '/promemoria',
        p_ordine_id: null, p_cliente_id: p.cliente_id, p_azienda_id: null,
        p_cliente_nome: cliente, p_azienda_nome: null, p_importo: null,
        p_metadata: { promemoria_id: p.id, data_promemoria: p.data_promemoria },
        p_push_mode: p.push_mode,
      });
      if (qErr) throw new Error(`Promemoria ${p.id}: ${qErr.message}`);
      nuove += Number(created ?? 0);
    }
    const dispatch = await dispatchPending(admin, 300);
    const details = { avvio: trigger, ora: now.toISOString(), in_scadenza: due.length, nuove_notifiche: nuove, invio: dispatch };
    await admin.from('notifiche_sistema_log').update({ status: 'ok', finished_at: new Date().toISOString(), details }).eq('id', run?.id);
    return json(details);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('promemoria-alerts failed:', message);
    await admin.from('notifiche_sistema_log').update({ status: 'errore', finished_at: new Date().toISOString(), error: message }).eq('id', run?.id);
    return json({ error: 'Controllo promemoria non riuscito.', details: message }, 500);
  }
});
