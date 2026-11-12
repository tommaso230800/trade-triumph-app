// Called by the service worker when a push is shown or tapped: proves real receipt on the device.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const schema = z.object({ delivery: z.string().uuid(), token: z.string().uuid(), evento: z.enum(['ricevuta', 'aperta']) });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  if (req.method !== 'POST') return json({ error: 'Metodo non consentito' }, 405);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: 'Richiesta non valida' }, 400);
  const { delivery, token, evento } = parsed.data;
  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const { data: row } = await admin.from('notifiche_consegne').select('id,dispositivo_id,received_at,clicked_at').eq('id', delivery).eq('receipt_token', token).maybeSingle();
  if (!row) return json({ ok: false }, 404);
  const now = new Date().toISOString();
  const patch: Record<string, string> = { updated_at: now };
  if (!row.received_at) patch.received_at = now;
  if (evento === 'aperta' && !row.clicked_at) patch.clicked_at = now;
  await admin.from('notifiche_consegne').update(patch).eq('id', row.id);
  await admin.from('push_dispositivi').update({ last_received_at: now }).eq('id', row.dispositivo_id);
  return json({ ok: true });
});
