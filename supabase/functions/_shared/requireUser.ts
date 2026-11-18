import { createClient } from "npm:@supabase/supabase-js@2";

// Verifies the caller's session token. Returns the user id, or a 401 Response
// to send back unchanged. Used by every function that spends AI credits or
// calls third-party services, so anonymous visitors cannot trigger them.
export async function requireUser(
  req: Request,
  corsHeaders: Record<string, string>,
  options: { allowServiceRole?: boolean } = {},
): Promise<{ userId: string | null; service?: boolean } | Response> {
  const unauthorized = () =>
    new Response(JSON.stringify({ error: "Accesso richiesto" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  const header = req.headers.get("Authorization") ?? "";
  const token = /^Bearer\s+(\S+)$/.exec(header)?.[1];
  if (!token) return unauthorized();
  // Internal server-to-server calls (e.g. email ingestion) authenticate with
  // the service key, which never leaves the backend.
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (options.allowServiceRole && serviceKey && token === serviceKey) {
    return { userId: null, service: true };
  }
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return unauthorized();
  const client = createClient(url, anon, { global: { headers: { Authorization: header } } });
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user?.id) return unauthorized();
  return { userId: data.user.id };
}
