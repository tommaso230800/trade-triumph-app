import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { ORDER_EMAIL_SELECT, orderEmailVersion } from '../_shared/orderEmailSnapshot.ts';
import { encodeUtf8Base64, foldBase64, decodePdfBase64 } from './encoding.ts';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_mail/gmail/v1';
const email = z.string().email().max(254).refine(v => !/[\r\n]/.test(v));
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('snapshot'), orderId: z.string().uuid() }),
  z.object({ action: z.literal('pdf'), sendId: z.string().uuid() }),
  z.object({ action: z.literal('send'), orderId: z.string().uuid(), attemptId: z.string().uuid(), version: z.string().length(64),
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
    if (input.action === 'pdf') {
      const { data: row, error } = await client.from('order_email_sends').select('pdf_path').eq('id', input.sendId).eq('user_id', user.id).single();
      if (error || !row) return json({ error: 'Invio non trovato.' }, 404);
      const { data, error: signedError } = await admin.storage.from('documenti').createSignedUrl(row.pdf_path, 300);
      if (signedError) return json({ error: 'Copia del PDF non disponibile.' }, 500);
      return json({ url: data.signedUrl });
    }
    const { data: order, error: orderError } = await client.from('ordini').select(ORDER_EMAIL_SELECT).eq('id', input.orderId).eq('user_id', user.id).single();
    if (orderError || !order) return json({ error: 'Ordine non trovato o non autorizzato.' }, 404);
    const version = await orderEmailVersion(order);
    const gatewayKey = Deno.env.get('LOVABLE_API_KEY');
    const connectionKey = Deno.env.get('GOOGLE_MAIL_API_KEY');
    if (!gatewayKey || !connectionKey) return json({ error: 'Collega Gmail per inviare gli ordini.' }, 503);
    const headers = { Authorization: `Bearer ${gatewayKey}`, 'X-Connection-Api-Key': connectionKey, 'Content-Type': 'application/json' };
    const profile = await fetch(`${GATEWAY_URL}/users/me/profile`, { headers });
    if (!profile.ok) {
      const details = await profile.text();
      console.error(`Gmail profile [${profile.status}]: ${details}`);
      return json({ error: 'Gmail non disponibile. Verifica il collegamento.', status: profile.status, details }, profile.status);
    }
    const sender = await profile.json();
    if (!sender.emailAddress) return json({ error: 'Mittente Gmail non disponibile.' }, 502);
    if (input.action === 'snapshot') return json({ order, version, senderEmail: sender.emailAddress });
    // A stable attempt ID is claimed before any call that can send mail.
    const { data: existing } = await admin.from('order_email_sends').select('*').eq('id', input.attemptId).eq('user_id', user.id).maybeSingle();
    if (existing) return json({ send: existing, duplicate: true });
    if (version !== input.version) return json({ error: 'L’ordine è stato modificato. Chiudi e riapri la composizione per aggiornare il PDF.' }, 409);
    const bytes = decodePdfBase64(input.pdf);
    if (new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-' || bytes.length > 12000000) return json({ error: 'Il PDF non è valido o supera 12 MB.' }, 400);
    const path = `${user.id}/order-email/${input.attemptId}/${input.filename}`;
    const { data: send, error: claimError } = await admin.from('order_email_sends').insert({
      id: input.attemptId, user_id: user.id, ordine_id: order.id, to_addresses: input.to, cc_addresses: input.cc,
      subject: input.subject, body: input.body, sender_name: input.senderName, reply_to: input.replyTo,
      pdf_path: path, pdf_filename: input.filename, order_version: version, status: 'sending'
    }).select().single();
    if (claimError) {
      if (claimError.code === '23505') {
        const { data: duplicate } = await admin.from('order_email_sends').select('*').eq('id', input.attemptId).eq('user_id', user.id).single();
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