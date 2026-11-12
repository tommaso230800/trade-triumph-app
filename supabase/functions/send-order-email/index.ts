import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { ORDER_EMAIL_SELECT, orderEmailVersion } from '../_shared/orderEmailSnapshot.ts';
import { encodeUtf8Base64, foldBase64, decodePdfBase64 } from './encoding.ts';
import { resolveDataOwner } from '../_shared/agency.ts';
import { dispatchPending } from '../_shared/pushDispatch.ts';
import { AGENCY_SENDER, allowedMailboxes, requiredSenderFor } from './senders.ts';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_mail/gmail/v1';
const email = z.string().email().max(254).refine(v => !/[\r\n]/.test(v));
const mailbox = z.enum(['agenzia', 'personale']).default('agenzia');
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('snapshot'), orderId: z.string().uuid() }),
  z.object({ action: z.literal('pdf'), sendId: z.string().uuid() }),
  z.object({ action: z.literal('send'), mailbox, orderId: z.string().uuid(), attemptId: z.string().uuid(), version: z.string().length(64),
    to: z.array(email).min(1).max(50), cc: z.array(email).max(50), subject: z.string().trim().min(1).max(998).refine(v => !/[\r\n]/.test(v)),
    body: z.string().min(1).max(100000), senderName: z.string().max(200).refine(v => !/[\r\n<>]/.test(v)), replyTo: z.union([email, z.literal('')]),
    pdf: z.string().min(8).max(16000000).regex(/^[A-Za-z0-9+/]+={0,2}$/), filename: z.string().regex(/^Proforma_[A-Za-z0-9_-]+\.pdf$/).max(150)
  })
]);
const b64 = encodeUtf8Base64;
const header = (value: string) => `=?UTF-8?B?${b64(value)}?=`;
const fold = foldBase64;

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (req.method !== 'POST') return json({ error: 'Metodo non consentito' }, 405);
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'Accedi per inviare ordini.' }, 401);
    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return json({ error: 'Sessione scaduta. Accedi nuovamente.' }, 401);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'Controlla destinatari, oggetto e allegato.' }, 400);
    const input = parsed.data;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const ownerId = await resolveDataOwner(admin, user.id);
    if (input.action === 'pdf') {
      const { data: row, error } = await client.from('order_email_sends').select('pdf_path').eq('id', input.sendId).eq('user_id', ownerId).single();
      if (error || !row) return json({ error: 'Invio non trovato.' }, 404);
      const { data, error: signedError } = await admin.storage.from('documenti').createSignedUrl(row.pdf_path, 300);
      if (signedError) return json({ error: 'Copia del PDF non disponibile.' }, 500);
      return json({ url: data.signedUrl });
    }
    const { data: order, error: orderError } = await client.from('ordini').select(ORDER_EMAIL_SELECT).eq('id', input.orderId).eq('user_id', ownerId).single();
    if (orderError || !order) return json({ error: 'Ordine non trovato o non autorizzato.' }, 404);
    const version = await orderEmailVersion(order);
    const gatewayKey = Deno.env.get('LOVABLE_API_KEY');
    // Each linked Gmail connection is identified by its real address, never by its position.
    const keys = ['AGENCY_GOOGLE_MAIL_API_KEY', 'GOOGLE_MAIL_API_KEY_1', 'GOOGLE_MAIL_API_KEY_2', 'GOOGLE_MAIL_API_KEY']
      .map((name) => Deno.env.get(name)).filter((v, i, all): v is string => !!v && all.indexOf(v) === i);
    if (!gatewayKey || keys.length === 0) return json({ error: 'Collega Gmail per inviare gli ordini.' }, 503);
    const { data: member } = await admin.from('agency_members').select('username').eq('user_id', user.id).eq('active', true).maybeSingle();
    const options = allowedMailboxes(member?.username);
    const linked = new Map<string, Record<string, string>>();
    let lastFailure: { status: number; details: string } | null = null;
    for (const connectionKey of keys) {
      const candidateHeaders = { Authorization: `Bearer ${gatewayKey}`, 'X-Connection-Api-Key': connectionKey, 'Content-Type': 'application/json' };
      const profile = await fetch(`${GATEWAY_URL}/users/me/profile`, { headers: candidateHeaders });
      if (!profile.ok) {
        lastFailure = { status: profile.status, details: await profile.text() };
        console.error(`Gmail profile [${lastFailure.status}]: ${lastFailure.details}`);
        continue;
      }
      const address = String((await profile.json()).emailAddress ?? '').toLowerCase();
      if (address && !linked.has(address)) linked.set(address, candidateHeaders);
    }
    if (linked.size === 0) {
      return json({ error: 'Gmail non disponibile. Verifica il collegamento.', status: lastFailure?.status, details: lastFailure?.details }, lastFailure?.status ?? 503);
    }
    const mailboxes = options.map(m => ({ ...m, available: linked.has(m.email) }));
    if (input.action === 'snapshot') {
      const agency = mailboxes[0];
      return json({ order, version, mailboxes, senderEmail: agency.available ? agency.email : [...linked.keys()][0], requiredSender: AGENCY_SENDER, senderAuthorised: mailboxes.some(m => m.available) });
    }
    const required = requiredSenderFor(member?.username, input.mailbox);
    if (!required) return json({ error: 'Il tuo profilo può inviare gli ordini solo dalla casella dell’agenzia.' }, 403);
    const headers = linked.get(required);
    if (!headers) return json({ error: `La casella ${required} non è collegata. Nessuna email inviata.`, requiredSender: required }, 412);
    const sender = { emailAddress: required };
    // A stable attempt ID is claimed before any call that can send mail.
    const { data: existing } = await admin.from('order_email_sends').select('*').eq('id', input.attemptId).eq('user_id', ownerId).maybeSingle();
    if (existing) return json({ send: existing, duplicate: true });
    if (version !== input.version) return json({ error: 'L’ordine è stato modificato. Chiudi e riapri la composizione per aggiornare il PDF.' }, 409);
    const bytes = decodePdfBase64(input.pdf);
    if (new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-' || bytes.length > 12000000) return json({ error: 'Il PDF non è valido o supera 12 MB.' }, 400);
    const path = `${ownerId}/order-email/${input.attemptId}/${input.filename}`;
    const { data: send, error: claimError } = await admin.from('order_email_sends').insert({
      id: input.attemptId, user_id: ownerId, sent_by: user.id, ordine_id: order.id, to_addresses: input.to, cc_addresses: input.cc,
      subject: input.subject, body: input.body, sender_name: input.senderName, reply_to: input.replyTo,
      pdf_path: path, pdf_filename: input.filename, order_version: version, status: 'sending', sender_email: required
    }).select().single();
    if (claimError) {
      if (claimError.code === '23505') {
        const { data: duplicate } = await admin.from('order_email_sends').select('*').eq('id', input.attemptId).eq('user_id', ownerId).single();
        return json({ send: duplicate, duplicate: true });
      }
      return json({ error: 'Impossibile registrare l’invio. Nessuna email inviata.' }, 500);
    }
    const { error: uploadError } = await admin.storage.from('documenti').upload(path, bytes, { contentType: 'application/pdf', upsert: false });
    if (uploadError) {
      const message = 'Impossibile conservare il PDF. Nessuna email inviata.';
      await admin.from('order_email_sends').update({ status: 'error', error_message: message }).eq('id', send.id);
      return json({ error: message, send: { ...send, status: 'error', error_message: message } }, 500);
    }
    const boundary = `order_${input.attemptId}`;
    const mime = [
      `From: ${input.senderName ? `${header(input.senderName)} ` : ''}<${sender.emailAddress}>`,
      `To: ${input.to.join(', ')}`, ...(input.cc.length ? [`Cc: ${input.cc.join(', ')}`] : []),
      ...(input.replyTo ? [`Reply-To: ${input.replyTo}`] : []), `Subject: ${header(input.subject)}`,
      `Message-ID: <${input.attemptId}@${sender.emailAddress.split('@')[1]}>`, 'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`, '',
      `--${boundary}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', fold(b64(input.body)),
      `--${boundary}`, `Content-Type: application/pdf; name="${input.filename}"`, `Content-Disposition: attachment; filename="${input.filename}"`,
      'Content-Transfer-Encoding: base64', '', fold(input.pdf), `--${boundary}--`, ''
    ].join('\r\n');
    try {
      const response = await fetch(`${GATEWAY_URL}/users/me/messages/send`, { method: 'POST', headers, body: JSON.stringify({ raw: b64(mime).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }) });
      if (!response.ok) {
        const details = await response.text();
        console.error(`Gmail send [${response.status}]: ${details}`);
        // 5xx responses may occur after acceptance: do not offer a blind retry.
        const uncertain = response.status >= 500;
        const message = uncertain ? 'Esito non confermato: controlla Posta inviata in Gmail prima di reinviare.' : 'Gmail ha rifiutato l’invio. Controlla il collegamento e riprova.';
        await admin.from('order_email_sends').update({ status: uncertain ? 'sending' : 'error', error_message: message }).eq('id', send.id);
        return json({ error: message, status: response.status, details, send: { ...send, status: uncertain ? 'sending' : 'error', error_message: message } }, response.status);
      }
      const result = await response.json();
      if (!result.id) throw new Error('Gmail non ha confermato l’identificativo del messaggio');
      const sentAt = new Date().toISOString();
      const { error: saveError } = await admin.from('order_email_sends').update({ status: 'sent', sent_at: sentAt, provider_message_id: result.id }).eq('id', send.id);
      if (saveError) return json({ error: 'Email accettata da Gmail, ma storico non aggiornato. Non ripetere l’invio.', send: { ...send, status: 'sending', error_message: 'Accettata da Gmail; aggiornamento storico da verificare.' } }, 202);
      // The database queues the "order sent" notification on this status change; deliver it without waiting.
      const pushing = dispatchPending(admin, 50).catch((e) => console.error('push dispatch after send failed:', e));
      // deno-lint-ignore no-explicit-any
      (globalThis as any).EdgeRuntime?.waitUntil?.(pushing);
      return json({ send: { ...send, status: 'sent', sent_at: sentAt, provider_message_id: result.id } });
    } catch (error) {
      console.error('Gmail send outcome uncertain:', error);
      const message = 'Esito non confermato: controlla Posta inviata in Gmail prima di reinviare.';
      await admin.from('order_email_sends').update({ error_message: message }).eq('id', send.id);
      return json({ error: message, send: { ...send, error_message: message } }, 202);
    }
  } catch (error) {
    console.error('Order email error:', error);
    return json({ error: 'Operazione non riuscita. Il contenuto della composizione è conservato.' }, 500);
  }
});