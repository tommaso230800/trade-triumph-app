import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import {
  internalIdentity, isEmailLike, lockMinutesLeft, LOCK_WINDOW_MINUTES, MAX_IP_FAILURES, MAX_USER_FAILURES,
  normalizeUsername, validPassword,
} from './rules.ts';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('login'), username: z.string().trim().min(1).max(254), password: z.string().min(1).max(200) }),
  z.object({ action: z.literal('recover'), username: z.string().trim().min(1).max(254), redirectTo: z.string().url().max(500) }),
  z.object({
    action: z.literal('upsert_member'), username: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9._-]+$/),
    full_name: z.string().trim().min(2).max(120), password: z.string().min(1).max(200).optional(), link_user_id: z.string().uuid().optional(),
  }),
  z.object({ action: z.literal('reset_password'), user_id: z.string().uuid(), password: z.string().min(1).max(200) }),
]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const GENERIC_LOGIN_ERROR = 'Username o password non corretti.';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Metodo non consentito' }, 405);
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !anonKey || !serviceKey) return json({ error: 'Servizio di accesso non configurato.' }, 503);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'Richiesta non valida.' }, 400);
    const input = parsed.data;
    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null;
    const since = new Date(Date.now() - LOCK_WINDOW_MINUTES * 60_000).toISOString();

    if (input.action === 'login' || input.action === 'recover') {
      const norm = normalizeUsername(input.username);
      const [{ data: userFails }, { data: ipFails }] = await Promise.all([
        admin.from('login_attempts').select('created_at').eq('username_norm', norm).eq('success', false).gte('created_at', since),
        ip ? admin.from('login_attempts').select('created_at').eq('ip', ip).eq('success', false).gte('created_at', since) : Promise.resolve({ data: [] }),
      ]);
      const wait = Math.max(lockMinutesLeft(userFails ?? [], MAX_USER_FAILURES), lockMinutesLeft(ipFails ?? [], MAX_IP_FAILURES));
      if (wait > 0) return json({ error: `Troppi tentativi non riusciti. Riprova tra ${wait} minut${wait === 1 ? 'o' : 'i'}.`, locked: true, retryAfterMinutes: wait }, 429);

      // Resolve the sign-in identity server-side: usernames never expose emails to the browser.
      let email: string | null = null;
      let internal = false;
      if (isEmailLike(norm)) {
        email = norm;
      } else {
        const { data: member } = await admin.from('agency_members').select('user_id, internal_identity, active').eq('username_norm', norm).maybeSingle();
        if (member?.active) {
          const { data: authUser } = await admin.auth.admin.getUserById(member.user_id);
          email = authUser?.user?.email ?? null;
          internal = member.internal_identity;
        }
      }

      if (input.action === 'recover') {
        await admin.from('login_attempts').insert({ username_norm: norm, ip, success: false });
        if (email && !internal) {
          const anon = createClient(url, anonKey, { auth: { persistSession: false } });
          await anon.auth.resetPasswordForEmail(email, { redirectTo: input.redirectTo });
        }
        return json({
          ok: true,
          message: 'Se l’account ha un’email di recupero, riceverai un link per reimpostare la password. In alternativa chiedi al titolare dell’agenzia di impostarne una nuova dalle Impostazioni.',
        });
      }

      if (!email) {
        await admin.from('login_attempts').insert({ username_norm: norm, ip, success: false });
        return json({ error: GENERIC_LOGIN_ERROR }, 401);
      }
      const anon = createClient(url, anonKey, { auth: { persistSession: false } });
      const { data: session, error } = await anon.auth.signInWithPassword({ email, password: input.password });
      if (error || !session.session) {
        await admin.from('login_attempts').insert({ username_norm: norm, ip, success: false });
        const rate = error?.status === 429;
        return json({ error: rate ? 'Troppi tentativi. Attendi qualche minuto e riprova.' : GENERIC_LOGIN_ERROR }, rate ? 429 : 401);
      }
      await admin.from('login_attempts').insert({ username_norm: norm, ip, success: true });
      return json({ session: { access_token: session.session.access_token, refresh_token: session.session.refresh_token } });
    }

    // Management actions: only the agency owner or an admin who is an agency member.
    const authHeader = req.headers.get('Authorization') ?? '';
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: 'Accedi per gestire gli utenti.' }, 401);
    const [{ data: callerMember }, { data: isAdmin }] = await Promise.all([
      admin.from('agency_members').select('is_owner, active').eq('user_id', user.id).maybeSingle(),
      admin.rpc('is_admin', { _user_id: user.id }),
    ]);
    if (!callerMember?.active || (!callerMember.is_owner && !isAdmin)) return json({ error: 'Solo il titolare dell’agenzia può gestire gli utenti.' }, 403);

    if (input.action === 'reset_password') {
      const invalid = validPassword(input.password);
      if (invalid) return json({ error: invalid }, 400);
      const { data: target } = await admin.from('agency_members').select('user_id').eq('user_id', input.user_id).maybeSingle();
      if (!target) return json({ error: 'Utente non appartenente all’agenzia.' }, 404);
      const { error } = await admin.auth.admin.updateUserById(input.user_id, { password: input.password });
      if (error) return json({ error: 'Impossibile aggiornare la password.', details: error.message }, 400);
      return json({ ok: true });
    }

    // upsert_member
    if (input.password) {
      const invalid = validPassword(input.password);
      if (invalid) return json({ error: invalid }, 400);
    }
    const norm = normalizeUsername(input.username);
    const { data: byName } = await admin.from('agency_members').select('*').eq('username_norm', norm).maybeSingle();
    let userId = input.link_user_id ?? byName?.user_id ?? null;
    if (byName && input.link_user_id && byName.user_id !== input.link_user_id) {
      return json({ error: 'Username già assegnato a un altro account.' }, 409);
    }
    let internal = byName?.internal_identity ?? false;
    let created = false;
    if (userId) {
      const { data: existing, error } = await admin.auth.admin.getUserById(userId);
      if (error || !existing?.user) return json({ error: 'Account da collegare non trovato.' }, 404);
      if (!byName) internal = false;
      if (input.password) {
        const { error: pwError } = await admin.auth.admin.updateUserById(userId, { password: input.password, user_metadata: { ...existing.user.user_metadata, full_name: input.full_name, username: input.username } });
        if (pwError) return json({ error: 'Impossibile impostare la password.', details: pwError.message }, 400);
      }
    } else {
      if (!input.password) return json({ error: 'Serve una password iniziale per il nuovo account.' }, 400);
      const { data: createdUser, error } = await admin.auth.admin.createUser({
        email: internalIdentity(input.username), password: input.password, email_confirm: true,
        user_metadata: { full_name: input.full_name, username: input.username },
      });
      if (error || !createdUser.user) return json({ error: 'Impossibile creare l’account.', details: error?.message }, 400);
      userId = createdUser.user.id;
      internal = true;
      created = true;
    }
    const { error: memberError } = await admin.from('agency_members').upsert({
      user_id: userId, username: input.username, full_name: input.full_name, internal_identity: internal, active: true, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (memberError) return json({ error: 'Impossibile registrare il membro dell’agenzia.', details: memberError.message }, 400);
    await admin.from('profiles').update({ full_name: input.full_name }).eq('id', userId);
    return json({ ok: true, user_id: userId, created });
  } catch (error) {
    console.error('agency-auth error:', error);
    return json({ error: 'Accesso temporaneamente non disponibile. Riprova.' }, 500);
  }
});
