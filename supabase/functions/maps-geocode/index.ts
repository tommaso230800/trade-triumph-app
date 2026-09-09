import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_maps';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autenticato' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) {
      return new Response(JSON.stringify({ error: 'Credenziali mappa non configurate' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: 'Non autenticato' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body?.limit) || 40, 1), 60);

    const { data: clienti, error } = await supabase
      .from('clienti')
      .select('id, nome, indirizzo, cap, citta, provincia')
      .is('deleted_at', null)
      .is('latitudine', null)
      .limit(limit);

    if (error) throw new Error(error.message);

    let geocodificati = 0;
    const falliti: string[] = [];

    for (const c of clienti ?? []) {
      const parts = [c.indirizzo, [c.cap, c.citta].filter(Boolean).join(' '), c.provincia, 'Italia']
        .filter((p) => p && String(p).trim().length > 0);
      if (parts.length <= 1) continue;
      const address = parts.join(', ');

      const res = await fetch(
        `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=it&language=it`,
        {
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY,
          },
        },
      );

      if (res.status === 403) {
        const details = (await res.json().catch(() => ({})))?.error?.details ?? [];
        const reason = details.find((d: { reason?: string }) => d.reason)?.reason;
        return new Response(
          JSON.stringify({ error: 'Chiave Google Maps non autorizzata', reason }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      if (!res.ok) {
        const text = await res.text();
        console.error(`Geocode fallito [${res.status}]: ${text}`);
        falliti.push(c.nome);
        continue;
      }

      const json = await res.json();
      const loc = json?.results?.[0]?.geometry?.location;
      if (!loc) {
        falliti.push(c.nome);
        continue;
      }

      const { error: upErr } = await supabase
        .from('clienti')
        .update({ latitudine: loc.lat, longitudine: loc.lng, geocoded_at: new Date().toISOString() })
        .eq('id', c.id);
      if (upErr) {
        console.error('Update coordinate fallito:', upErr.message);
        falliti.push(c.nome);
        continue;
      }
      geocodificati++;
    }

    return new Response(
      JSON.stringify({ geocodificati, falliti, restanti: Math.max((clienti?.length ?? 0) - geocodificati, 0) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Errore sconosciuto';
    console.error('maps-geocode:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
