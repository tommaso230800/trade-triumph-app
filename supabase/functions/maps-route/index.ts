import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_maps';

const Point = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
const BodySchema = z.object({
  origin: Point,
  stops: z.array(Point).min(1).max(24),
  ottimizza: z.boolean().optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autenticato' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { origin, stops, ottimizza } = parsed.data;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) {
      return new Response(JSON.stringify({ error: 'Credenziali mappa non configurate' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const waypoint = (p: { lat: number; lng: number }) => ({
      location: { latLng: { latitude: p.lat, longitude: p.lng } },
    });
    const destination = stops[stops.length - 1];
    const intermediates = stops.slice(0, -1).map(waypoint);

    const res = await fetch(`${GATEWAY_URL}/routes/directions/v2:computeRoutes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY,
        'Content-Type': 'application/json',
        'X-Goog-FieldMask':
          'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.duration,routes.legs.distanceMeters,routes.optimizedIntermediateWaypointIndex',
      },
      body: JSON.stringify({
        origin: waypoint(origin),
        destination: waypoint(destination),
        intermediates,
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        optimizeWaypointOrder: !!ottimizza && intermediates.length > 0,
        languageCode: 'it-IT',
        units: 'METRIC',
      }),
    });

    if (res.status === 403) {
      const details = (await res.json().catch(() => ({})))?.error?.details ?? [];
      const reason = details.find((d: { reason?: string }) => d.reason)?.reason;
      return new Response(JSON.stringify({ error: 'Chiave Google Maps non autorizzata', reason }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!res.ok) {
      const details = await res.text();
      console.error(`Routes API [${res.status}]: ${details}`);
      return new Response(JSON.stringify({ error: 'Calcolo percorso fallito', status: res.status, details }), {
        status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const json = await res.json();
    const route = json?.routes?.[0];
    if (!route) {
      return new Response(JSON.stringify({ error: 'Nessun percorso trovato' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = {
      polyline: route.polyline?.encodedPolyline ?? null,
      distanzaMetri: route.distanceMeters ?? 0,
      durataSecondi: Number(String(route.duration ?? '0s').replace('s', '')),
      tratte: (route.legs ?? []).map((l: { distanceMeters?: number; duration?: string }) => ({
        distanzaMetri: l.distanceMeters ?? 0,
        durataSecondi: Number(String(l.duration ?? '0s').replace('s', '')),
      })),
      ordineOttimizzato: route.optimizedIntermediateWaypointIndex ?? null,
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Errore sconosciuto';
    console.error('maps-route:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
