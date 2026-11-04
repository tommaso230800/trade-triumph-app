// Sincronizzazione bidirezionale OneDrive <-> archivio documenti CRM.
// Azioni: status | browse | configure | pull | push | suspend | resume
// Regole: nessuna cancellazione distruttiva automatica, niente cicli infiniti
// (etag registrato dopo il push), duplicati rilevati via SHA-256.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const GATEWAY = "https://connector-gateway.lovable.dev/microsoft_onedrive";
const MAX_DOWNLOAD = 20 * 1024 * 1024; // 20 MB: oltre si indicizza solo il riferimento
const MAX_UPLOAD = 4 * 1024 * 1024; // limite upload semplice Graph

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function graph(path: string, init: RequestInit = {}) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const connKey = Deno.env.get("MICROSOFT_ONEDRIVE_API_KEY");
  if (!lovableKey || !connKey) throw new Error("Credenziali connettore OneDrive mancanti");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${lovableKey}`);
  headers.set("X-Connection-Api-Key", connKey);
  const res = await fetch(`${GATEWAY}${path}`, { ...init, headers });
  return res;
}

async function graphJson(path: string, init: RequestInit = {}) {
  const res = await graph(path, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Microsoft Graph [${res.status}]: ${body}`);
  }
  return res.json();
}

// Riscrive nextLink/deltaLink assoluti verso il gateway
function rewriteLink(link: string): string {
  const u = new URL(link);
  if (u.hostname !== "graph.microsoft.com") throw new Error(`Host Graph imprevisto: ${u.hostname}`);
  // Il gateway include già /v1.0 nel base path
  return u.pathname.replace(/^\/v1\.0/, "") + u.search;
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autenticato" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "Sessione non valida" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "status");

    const logEvento = async (e: {
      documento_id?: string | null; origine?: string; tipo_evento: string;
      stato?: string; tentativi?: number; errore?: string | null; dettagli?: unknown;
    }) => {
      await admin.from("onedrive_sync_eventi").insert({
        user_id: user.id,
        documento_id: e.documento_id ?? null,
        origine: e.origine ?? "onedrive",
        tipo_evento: e.tipo_evento,
        stato: e.stato ?? "completato",
        tentativi: e.tentativi ?? 0,
        errore: e.errore ?? null,
        dettagli: e.dettagli ?? null,
      });
    };

    const getState = async () => {
      const { data } = await admin.from("onedrive_sync_state").select("*").eq("user_id", user.id).maybeSingle();
      return data;
    };

    // ---------- STATUS ----------
    if (action === "status") {
      const drive = await graphJson("/me/drive?$select=id,name,driveType,quota,owner");
      const state = await getState();
      const { count: sincronizzati } = await admin.from("documenti").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).not("onedrive_item_id", "is", null).is("deleted_at", null);
      const { count: inElaborazione } = await admin.from("documenti").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("stato_elaborazione", "in_elaborazione").is("deleted_at", null);
      const { count: errori } = await admin.from("onedrive_sync_eventi").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("stato", "errore");
      const { count: conflitti } = await admin.from("documenti").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("sync_stato", "conflitto").is("deleted_at", null);
      return json({
        drive: {
          id: drive.id, name: drive.name, type: drive.driveType,
          email: drive.owner?.user?.email ?? null,
          quota: drive.quota ?? null,
        },
        state,
        conteggi: { sincronizzati: sincronizzati ?? 0, in_elaborazione: inElaborazione ?? 0, errori: errori ?? 0, conflitti: conflitti ?? 0 },
      });
    }

    // ---------- BROWSE (esplora cartelle) ----------
    if (action === "browse") {
      const folderId = body.folderId ? String(body.folderId) : null;
      const path = folderId
        ? `/me/drive/items/${encodeURIComponent(folderId)}/children?$select=id,name,folder,file,size,lastModifiedDateTime&$top=200`
        : `/me/drive/root/children?$select=id,name,folder,file,size,lastModifiedDateTime&$top=200`;
      const data = await graphJson(path);
      const items = (data.value ?? []).map((it: any) => ({
        id: it.id, name: it.name, isFolder: !!it.folder,
        size: it.size ?? 0, childCount: it.folder?.childCount ?? 0,
        modified: it.lastModifiedDateTime ?? null,
      }));
      items.sort((a: any, b: any) => (b.isFolder - a.isFolder) || a.name.localeCompare(b.name));
      return json({ items });
    }

    // ---------- CONFIGURE (cartella principale) ----------
    if (action === "configure") {
      const rootFolderId = body.rootFolderId ? String(body.rootFolderId) : null;
      const rootFolderPath = String(body.rootFolderPath || "/");
      const drive = await graphJson("/me/drive?$select=id,name,owner");
      const existing = await getState();
      const row = {
        user_id: user.id,
        drive_id: drive.id,
        drive_name: drive.name,
        account_email: drive.owner?.user?.email ?? null,
        root_folder_id: rootFolderId,
        root_folder_path: rootFolderPath,
        delta_token: null, // reset: la prossima pull fa scansione completa
        stato: "attiva",
        updated_at: new Date().toISOString(),
      };
      if (existing) {
        await admin.from("onedrive_sync_state").update(row).eq("user_id", user.id);
      } else {
        await admin.from("onedrive_sync_state").insert(row);
      }
      await logEvento({ tipo_evento: "configurazione", dettagli: { rootFolderPath } });
      return json({ ok: true, rootFolderPath });
    }

    // ---------- SUSPEND / RESUME ----------
    if (action === "suspend" || action === "resume") {
      const stato = action === "suspend" ? "sospesa" : "attiva";
      await admin.from("onedrive_sync_state").update({ stato, updated_at: new Date().toISOString() }).eq("user_id", user.id);
      await logEvento({ tipo_evento: action === "suspend" ? "sospensione" : "ripresa" });
      return json({ ok: true, stato });
    }

    // ---------- PULL (OneDrive -> CRM, delta query) ----------
    if (action === "pull") {
      const state = await getState();
      if (!state?.root_folder_id) return json({ error: "Cartella OneDrive non configurata" }, 400);
      if (state.stato === "sospesa") return json({ error: "Sincronizzazione sospesa" }, 400);

      let nextPath: string | null = state.delta_token
        ? rewriteLink(state.delta_token)
        : `/me/drive/items/${encodeURIComponent(state.root_folder_id)}/delta?$select=id,name,folder,file,size,lastModifiedDateTime,eTag,parentReference,deleted&$top=200`;

      let importati = 0, aggiornati = 0, duplicati = 0, saltati = 0, errori = 0;
      let deltaLink: string | null = null;
      let pages = 0;

      while (nextPath && pages < 25) {
        pages++;
        const data = await graphJson(nextPath);
        for (const item of data.value ?? []) {
          try {
            if (item.folder) continue; // le cartelle non diventano documenti
            if (item.deleted) {
              // Cestino logico: mai cancellazione distruttiva automatica
              const { data: doc } = await admin.from("documenti").select("id")
                .eq("user_id", user.id).eq("onedrive_item_id", item.id).maybeSingle();
              if (doc) {
                await admin.from("documenti").update({ sync_stato: "eliminato_remoto" }).eq("id", doc.id);
                await logEvento({ documento_id: doc.id, tipo_evento: "eliminato_remoto", dettagli: { nome: item.name } });
              }
              continue;
            }

            const etag = item.eTag ?? null;
            const { data: existing } = await admin.from("documenti").select("*")
              .eq("user_id", user.id).eq("onedrive_item_id", item.id).is("deleted_at", null).maybeSingle();

            // Anti-ciclo: se l'etag corrisponde a quello registrato (es. dopo un nostro push), salta
            if (existing && existing.onedrive_etag === etag) { saltati++; continue; }

            // Conflitto: modificato in locale dopo l'ultima sincronizzazione e cambiato anche in remoto
            if (existing && existing.sync_origine === "lovable" && existing.onedrive_etag && existing.onedrive_etag !== etag) {
              const localMod = new Date(existing.updated_at).getTime();
              const remoteMod = new Date(item.lastModifiedDateTime).getTime();
              if (localMod > remoteMod) {
                await admin.from("documenti").update({ sync_stato: "conflitto" }).eq("id", existing.id);
                await logEvento({ documento_id: existing.id, tipo_evento: "conflitto", dettagli: { nome: item.name } });
                saltati++;
                continue;
              }
            }

            const size = item.size ?? 0;
            let buf: ArrayBuffer | null = null;
            let hash: string | null = null;
            if (size <= MAX_DOWNLOAD) {
              const res = await graph(`/me/drive/items/${encodeURIComponent(item.id)}/content`);
              if (res.ok) {
                buf = await res.arrayBuffer();
                hash = await sha256Hex(buf);
              }
            }

            // Duplicato per contenuto: stesso hash di un altro documento
            if (hash) {
              const { data: dup } = await admin.from("documenti").select("id")
                .eq("user_id", user.id).eq("hash_sha256", hash).is("deleted_at", null)
                .neq("id", existing?.id ?? "00000000-0000-0000-0000-000000000000").limit(1).maybeSingle();
              if (dup) {
                duplicati++;
                await logEvento({ documento_id: dup.id, tipo_evento: "duplicato", dettagli: { nome: item.name, item_id: item.id } });
                continue;
              }
            }

            let storagePath = existing?.storage_path ?? null;
            if (buf) {
              storagePath = `${user.id}/onedrive/${item.id}-${safeName(item.name)}`;
              const { error: upErr } = await admin.storage.from("documenti").upload(storagePath, buf, {
                contentType: item.file?.mimeType ?? "application/octet-stream",
                upsert: true,
              });
              if (upErr) throw new Error(`Storage: ${upErr.message}`);
            }

            const fields = {
              nome_file: item.name,
              mime_type: item.file?.mimeType ?? null,
              dimensione: size,
              hash_sha256: hash,
              onedrive_item_id: item.id,
              onedrive_drive_id: state.drive_id,
              onedrive_etag: etag,
              onedrive_modified_at: item.lastModifiedDateTime ?? null,
              sync_stato: buf ? "sincronizzato" : "solo_riferimento",
              sync_origine: "onedrive",
              updated_at: new Date().toISOString(),
            };

            if (existing) {
              await admin.from("documenti").update({ ...fields, ...(storagePath ? { storage_path: storagePath } : {}) }).eq("id", existing.id);
              aggiornati++;
              await logEvento({ documento_id: existing.id, tipo_evento: "aggiornato", dettagli: { nome: item.name } });
            } else {
              const parentPath: string = item.parentReference?.path ?? "";
              const { data: inserted, error: insErr } = await admin.from("documenti").insert({
                ...fields,
                user_id: user.id,
                entita: "generico",
                tipo: "altro",
                storage_path: storagePath ?? `onedrive://${item.id}`,
                association_status: "review",
                stato_elaborazione: "da_verificare",
                tags: [],
                note: `Importato da OneDrive (${parentPath.replace(/^\/drive\/root:/, "") || "/"})`,
              }).select("id").single();
              if (insErr) throw new Error(insErr.message);
              importati++;
              await logEvento({ documento_id: inserted.id, tipo_evento: "importato", dettagli: { nome: item.name } });
            }
          } catch (e) {
            errori++;
            await logEvento({ tipo_evento: "importato", stato: "errore", errore: e instanceof Error ? e.message : String(e), dettagli: { nome: item?.name } });
          }
        }
        if (data["@odata.nextLink"]) nextPath = rewriteLink(data["@odata.nextLink"]);
        else { deltaLink = data["@odata.deltaLink"] ?? null; nextPath = null; }
      }

      await admin.from("onedrive_sync_state").update({
        delta_token: deltaLink ?? state.delta_token,
        ultima_sync_at: new Date().toISOString(),
        ultimo_esito: errori > 0 ? "parziale" : "ok",
        documenti_sincronizzati: (state.documenti_sincronizzati ?? 0) + importati,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);

      return json({ ok: true, importati, aggiornati, duplicati, saltati, errori, pagine: pages, troncato: !!nextPath });
    }

    // ---------- PUSH (CRM -> OneDrive) ----------
    if (action === "push") {
      const documentoId = String(body.documentoId || "");
      if (!documentoId) return json({ error: "documentoId mancante" }, 400);
      const state = await getState();
      if (!state?.root_folder_id) return json({ error: "Cartella OneDrive non configurata" }, 400);

      const { data: doc, error: docErr } = await admin.from("documenti").select("*")
        .eq("id", documentoId).eq("user_id", user.id).single();
      if (docErr || !doc) return json({ error: "Documento non trovato" }, 404);
      if (doc.storage_path?.startsWith("onedrive://")) return json({ error: "Documento presente solo come riferimento OneDrive" }, 400);

      const { data: fileData, error: dlErr } = await admin.storage.from("documenti").download(doc.storage_path);
      if (dlErr || !fileData) return json({ error: `File non leggibile: ${dlErr?.message}` }, 400);
      const buf = await fileData.arrayBuffer();
      if (buf.byteLength > MAX_UPLOAD) {
        await logEvento({ documento_id: doc.id, origine: "lovable", tipo_evento: "caricato", stato: "errore", errore: "File oltre 4 MB: upload automatico non supportato" });
        return json({ error: "File oltre 4 MB: caricamento automatico non supportato per ora" }, 400);
      }

      // Cartella di destinazione: root / <nome azienda> se collegata
      let parentId = state.root_folder_id;
      if (doc.company_id) {
        const { data: az } = await admin.from("aziende").select("nome").eq("id", doc.company_id).maybeSingle();
        if (az?.nome) {
          const folderName = az.nome.slice(0, 80);
          const created = await graphJson(`/me/drive/items/${encodeURIComponent(state.root_folder_id)}/children`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: folderName, folder: {}, "@microsoft.graph.conflictBehavior": "fail" }),
          }).catch(async () => {
            // Esiste già: la cerco
            const list = await graphJson(`/me/drive/items/${encodeURIComponent(state.root_folder_id)}/children?$select=id,name,folder&$top=200`);
            return (list.value ?? []).find((it: any) => it.folder && it.name.toLowerCase() === folderName.toLowerCase());
          });
          if (created?.id) parentId = created.id;
        }
      }

      const uploadPath = `/me/drive/items/${encodeURIComponent(parentId)}:/${encodeURIComponent(doc.nome_file)}:/content`;
      const upRes = await graph(uploadPath, {
        method: "PUT",
        headers: { "Content-Type": doc.mime_type ?? "application/octet-stream" },
        body: buf,
      });
      if (!upRes.ok) {
        const errBody = await upRes.text();
        await logEvento({ documento_id: doc.id, origine: "lovable", tipo_evento: "caricato", stato: "errore", errore: `Graph [${upRes.status}]: ${errBody.slice(0, 300)}` });
        return json({ error: `Caricamento OneDrive fallito [${upRes.status}]` }, 502);
      }
      const uploaded = await upRes.json();

      await admin.from("documenti").update({
        onedrive_item_id: uploaded.id,
        onedrive_drive_id: state.drive_id,
        onedrive_web_url: uploaded.webUrl ?? null,
        onedrive_etag: uploaded.eTag ?? null,
        onedrive_modified_at: uploaded.lastModifiedDateTime ?? null,
        sync_stato: "sincronizzato",
        sync_origine: "lovable",
        updated_at: new Date().toISOString(),
      }).eq("id", doc.id);
      await logEvento({ documento_id: doc.id, origine: "lovable", tipo_evento: "caricato", dettagli: { nome: doc.nome_file } });

      return json({ ok: true, webUrl: uploaded.webUrl ?? null });
    }

    return json({ error: `Azione sconosciuta: ${action}` }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("onedrive-sync error:", msg);
    return json({ error: msg }, 500);
  }
});
