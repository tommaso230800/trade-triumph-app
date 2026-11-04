import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';
import { graphLink, nextCheckpoint, validName } from './protocol.ts';
const GATEWAY = 'https://connector-gateway.lovable.dev/microsoft_onedrive';
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {status, headers:{...corsHeaders,'Content-Type':'application/json'}});
async function graph(path: string, init: RequestInit = {}) {
  const key = Deno.env.get('LOVABLE_API_KEY'), connector = Deno.env.get('MICROSOFT_ONEDRIVE_API_KEY');
  if (!key || !connector) throw new Error('Connessione Microsoft non configurata');
  const response = await fetch(GATEWAY + path, {...init,headers:{...Object.fromEntries(new Headers(init.headers)),Authorization:`Bearer ${key}`,'X-Connection-Api-Key':connector}});
  if (!response.ok) { const details=await response.text(); throw new Error(`Microsoft [${response.status}]: ${details}`); }
  return response;
}
async function graphJson(path: string, init: RequestInit = {}) { return (await graph(path,init)).json(); }
const schema=z.object({action:z.enum(['status','browse','configure','pull','push','suspend','resume','download','create_folder','rename','move','delete','versions','integrity','retry','ai_consent','worker']),folderId:z.string().max(256).nullable().optional(),itemId:z.string().min(1).max(256).optional(),documentoId:z.string().uuid().optional(),name:z.string().max(255).optional(),etag:z.string().max(512).optional(),confirmed:z.boolean().optional(),enabled:z.boolean().optional(),userId:z.string().uuid().optional(),offset:z.number().int().min(0).optional(),search:z.string().max(200).optional(),rootFolderId:z.string().nullable().optional(),rootFolderPath:z.string().optional()});
Deno.serve(async req => {
  if(req.method==='OPTIONS') return new Response('ok',{headers:corsHeaders});
  try {
    const input=schema.safeParse(await req.json()); if(!input.success)return json({error:'Richiesta OneDrive non valida'},400);
    const b=input.data;
    const url=Deno.env.get('SUPABASE_URL'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),anon=Deno.env.get('SUPABASE_ANON_KEY');
    if(!url||!service||!anon)return json({error:'Servizio non configurato'},503);
    const db=createClient(url,service);
    let userId:string;
    if(b.action==='worker') {
      if(!b.userId)return json({error:'Utente mancante'},400);
      const {data:key}=await db.from('onedrive_worker_keys').select('token').eq('user_id',b.userId).maybeSingle();
      if(!key || req.headers.get('x-onedrive-worker')!==key.token)return json({error:'Non autorizzato'},401);
      userId=b.userId;
    } else {
      const client=createClient(url,anon,{global:{headers:{Authorization:req.headers.get('Authorization')||''}}});
      const {data:{user},error}=await client.auth.getUser();
      if(error||!user)return json({error:'Accedi per usare OneDrive'},401); userId=user.id;
    }
    const {data:access}=await db.from('onedrive_access').select('*').eq('user_id',userId).maybeSingle();
    if(!access)return json({error:'Questo account non è autorizzato al OneDrive aziendale'},403);
    const checked=async (query:PromiseLike<any>)=>{const r=await query;if(r.error)throw new Error(r.error.message);return r.data;};
    const log=async(tipo:string,stato='completato',errore:string|null=null,dettagli:unknown=null)=>checked(db.from('onedrive_sync_eventi').insert({user_id:userId,tipo_evento:tipo,stato,errore,dettagli}));
    let state=await checked(db.from('onedrive_sync_state').select('*').eq('user_id',userId).maybeSingle());
    const drivePath=state?.drive_id?`/drives/${encodeURIComponent(state.drive_id)}`:'/me/drive';
    const itemPath=(id:string)=>`${drivePath}/items/${encodeURIComponent(id)}`;
    const rootPath=()=>`${drivePath}/root`;
    const counts=async()=>{
      const count=async(table:string,filter:(q:any)=>any)=>{const r=await filter(db.from(table).select('id',{count:'exact',head:true}).eq('user_id',userId));if(r.error)throw new Error(r.error.message);return r.count??0;};
      const [files,folders,errors,conflicts,analysis,pending]=await Promise.all([
        count('onedrive_items',q=>q.eq('deleted',false).eq('is_folder',false)),count('onedrive_items',q=>q.eq('deleted',false).eq('is_folder',true)),count('onedrive_jobs',q=>q.eq('status','error')),count('onedrive_jobs',q=>q.eq('status','conflict')),count('documenti',q=>q.eq('stato_elaborazione','in_elaborazione').is('deleted_at',null)),count('onedrive_jobs',q=>q.eq('status','pending'))]);
      return {sincronizzati:files,cartelle:folders,errori:errors,conflitti:conflicts,in_elaborazione:analysis,pendenti:pending};
    };
    if(b.action==='status') {
      const drive=await graphJson('/me/drive?$select=id,name,driveType,quota,owner');
      return json({drive:{id:drive.id,name:drive.name,type:drive.driveType,email:drive.owner?.user?.email??null,quota:drive.quota??null},state:state?{stato:state.stato,ultima_sync_at:state.ultima_sync_at,ultimo_esito:state.ultimo_esito,scan_status:state.scan_status,scan_pages:state.scan_pages,scan_error:state.scan_error,root_folder_path:'/',documenti_sincronizzati:state.documenti_sincronizzati}:null,conteggi:await counts(),access:{can_write:access.can_write,ai_enabled:access.ai_enabled}});
    }
    if(b.action==='configure' || !state && ['pull','browse'].includes(b.action)) {
      const drive=await graphJson('/me/drive?$select=id,name,owner');
      state=await checked(db.from('onedrive_sync_state').upsert({user_id:userId,drive_id:drive.id,drive_name:drive.name,account_email:drive.owner?.user?.email??null,root_folder_id:null,root_folder_path:'/',delta_token:null,cursor_next:null,scan_status:'idle',scan_pages:0,stato:'attiva'},{onConflict:'user_id'}).select('*').single());
      if(b.action==='configure')return json({ok:true,rootFolderPath:'/'});
    }
    if(b.action==='browse') {
      // Live paginated browsing keeps every format accessible before initial indexing completes.
      let path=(b.folderId?itemPath(b.folderId):rootPath())+'/children?$top=200&$select=id,name,folder,file,size,lastModifiedDateTime,eTag,webUrl,parentReference';
      const items:any[]=[];
      while(path){const page=await graphJson(path);items.push(...(page.value??[]));path=page['@odata.nextLink']?graphLink(page['@odata.nextLink']):'';}
      items.sort((a,c)=>Number(!!c.folder)-Number(!!a.folder)||a.name.localeCompare(c.name,'it'));
      const filtered=b.search?items.filter(i=>i.name.toLocaleLowerCase().includes(String(b.search).toLocaleLowerCase())):items;
      const offset=b.offset??0;
      return json({items:filtered.slice(offset,offset+200).map(i=>({id:i.id,name:i.name,isFolder:!!i.folder,size:i.size??0,childCount:i.folder?.childCount??0,modified:i.lastModifiedDateTime??null,etag:i.eTag,webUrl:i.webUrl,mimeType:i.file?.mimeType})),total:filtered.length,nextOffset:offset+200<filtered.length?offset+200:null});
    }
    if(b.action==='ai_consent') {await checked(db.from('onedrive_access').update({ai_enabled:b.enabled===true}).eq('user_id',userId));return json({ok:true});}
    if(b.action==='suspend'||b.action==='resume'){await checked(db.from('onedrive_sync_state').update({stato:b.action==='suspend'?'sospesa':'attiva'}).eq('user_id',userId));return json({ok:true});}
    if(b.action==='integrity')return json({ok:true,conteggi:await counts(),complete:state?.scan_status==='complete',error:state?.scan_error??null});
    if(b.action==='retry'){await checked(db.from('onedrive_jobs').update({status:'pending',next_attempt_at:new Date().toISOString()}).eq('user_id',userId).eq('status','error'));return json({ok:true});}
    if(['download','versions'].includes(b.action)) {
      if(!b.itemId)return json({error:'File mancante'},400);
      if(b.action==='versions')return json(await graphJson(itemPath(b.itemId)+'/versions'));
      const item=await graphJson(itemPath(b.itemId));
      if(!item['@microsoft.graph.downloadUrl'])return json({error:'Microsoft non rende disponibile il contenuto di questo elemento'},404);
      return json({url:item['@microsoft.graph.downloadUrl']});
    }
    // Write operations carry stable item ID + ETag and are persisted before executing.
    if(['create_folder','rename','move','delete','push'].includes(b.action)) {
      if(!access.can_write)return json({error:'Accesso OneDrive in sola lettura'},403);
      if(b.action==='delete' && b.confirmed!==true)return json({error:'Conferma la cancellazione su OneDrive'},400);
      if(['create_folder','rename'].includes(b.action) && (!b.name||!validName(b.name)))return json({error:'Nome non valido'},400);
      if(['rename','move','delete'].includes(b.action) && (!b.itemId||!b.etag))return json({error:'Elemento o versione mancanti: aggiorna la cartella'},400);
      if(b.action==='push'&&!b.documentoId)return json({error:'Documento mancante'},400);
      const job=await checked(db.from('onedrive_jobs').insert({user_id:userId,item_id:b.itemId??null,operation:b.action,payload:b,idempotency_key:`${userId}:${b.action}:${b.itemId??b.documentoId??b.name}:${b.etag??b.folderId??'root'}`}).select('*').single());
      return json({ok:true,queued:true,jobId:job.id});
    }
    if(b.action==='pull'||b.action==='worker') {
      if(!state)return json({error:'Avvia la sincronizzazione dalla pagina Impostazioni'},400);
      if(state.stato==='sospesa')return json({ok:true,suspended:true});
      const {data:locked,error:lockError}=await db.rpc('claim_onedrive_sync',{p_user_id:userId});
      if(lockError)throw lockError;if(!locked)return json({ok:true,busy:true});
      let imported=0,updated=0;
      try {
        // Bounded worker; cursor persisted per page, total archive size is unbounded.
        await checked(db.from('onedrive_sync_state').update({scan_status:'running',scan_error:null}).eq('user_id',userId));
        let path=state.cursor_next?graphLink(state.cursor_next):state.delta_token?graphLink(state.delta_token):rootPath()+'/delta?$top=100';
        const page=await graphJson(path);
        for(const i of page.value??[]) {
          const existing=await checked(db.from('onedrive_items').select('*').eq('user_id',userId).eq('drive_id',state.drive_id).eq('item_id',i.id).maybeSingle());
          if(i.deleted){if(existing){await checked(db.from('onedrive_items').update({deleted:true}).eq('id',existing.id));if(existing.documento_id)await checked(db.from('documenti').update({sync_stato:'eliminato_remoto'}).eq('id',existing.documento_id).eq('user_id',userId));}continue;}
          // Graph root itself is not counted as a child folder.
          if(i.root)continue;
          let docId=existing?.documento_id??null;
          if(!i.folder) {
            if(!docId){const old=await checked(db.from('documenti').select('id').eq('user_id',userId).eq('onedrive_drive_id',state.drive_id).eq('onedrive_item_id',i.id).limit(1).maybeSingle());docId=old?.id??null;}
            const fields={nome_file:i.name,dimensione:i.size??0,mime_type:i.file?.mimeType??null,onedrive_item_id:i.id,onedrive_drive_id:state.drive_id,onedrive_etag:i.eTag??null,onedrive_web_url:i.webUrl??null,onedrive_modified_at:i.lastModifiedDateTime??null,sync_stato:'solo_riferimento',sync_origine:'onedrive',updated_at:new Date().toISOString()};
            if(docId){await checked(db.from('documenti').update(fields).eq('id',docId).eq('user_id',userId));if(existing?.etag!==i.eTag)updated++;}
            else {const doc=await checked(db.from('documenti').insert({...fields,user_id:userId,entita:'generico',tipo:'altro',storage_path:`onedrive://${state.drive_id}/${i.id}`,stato_elaborazione:'da_verificare',association_status:'review'}).select('id').single());docId=doc.id;imported++;}
          }
          await checked(db.from('onedrive_items').upsert({user_id:userId,drive_id:state.drive_id,item_id:i.id,parent_id:i.parentReference?.id??null,name:i.name,is_folder:!!i.folder,size:i.size??0,mime_type:i.file?.mimeType??null,etag:i.eTag??null,web_url:i.webUrl??null,modified_at:i.lastModifiedDateTime??null,deleted:false,documento_id:docId,updated_at:new Date().toISOString()},{onConflict:'user_id,drive_id,item_id'}));
        }
        const checkpoint=nextCheckpoint(page);
        await checked(db.from('onedrive_sync_state').update({cursor_next:checkpoint.next,delta_token:checkpoint.delta??state.delta_token,scan_status:checkpoint.complete?'complete':'running',scan_pages:(state.scan_pages??0)+1,ultima_sync_at:checkpoint.complete?new Date().toISOString():state.ultima_sync_at,ultimo_esito:checkpoint.complete?'ok':'in_corso',root_folder_path:'/',root_folder_id:null}).eq('user_id',userId));
        const jobs=await checked(db.from('onedrive_jobs').select('*').eq('user_id',userId).eq('status','pending').lte('next_attempt_at',new Date().toISOString()).order('created_at').limit(3));
        for(const job of jobs??[]) {
          const p=job.payload;const headers:Record<string,string>={'Content-Type':'application/json'};if(p.etag)headers['If-Match']=p.etag;
          try {
            let result:any=null;
            if(job.operation==='create_folder')result=await graphJson((p.folderId?itemPath(p.folderId):rootPath())+'/children',{method:'POST',headers,body:JSON.stringify({name:p.name,folder:{},'@microsoft.graph.conflictBehavior':'fail'})});
            if(job.operation==='rename'||job.operation==='move')result=await graphJson(itemPath(p.itemId),{method:'PATCH',headers,body:JSON.stringify(job.operation==='rename'?{name:p.name}:{parentReference:p.folderId?{id:p.folderId}:{path:'/drive/root:'}})});
            if(job.operation==='delete'){
              const doc=await checked(db.from('onedrive_items').select('documento_id').eq('user_id',userId).eq('item_id',p.itemId).maybeSingle());
              if(doc?.documento_id){const record=await checked(db.from('documenti').select('proposal_id,storage_path').eq('id',doc.documento_id).single());if(record.proposal_id)throw new Error('Documento di proposta protetto: conserva lo storico originale');}
              await graph(itemPath(p.itemId),{method:'DELETE',headers});
              await checked(db.from('onedrive_items').update({deleted:true}).eq('user_id',userId).eq('item_id',p.itemId));
            }
            if(job.operation==='push') {
              const doc=await checked(db.from('documenti').select('*').eq('id',p.documentoId).eq('user_id',userId).single());
              if(doc.storage_path.startsWith('onedrive://'))throw new Error('Originale già presente in OneDrive');
              const {data:file,error}=await db.storage.from('documenti').download(doc.storage_path);if(error||!file)throw new Error('File locale non disponibile');
              if(file.size>250*1024*1024)throw new Error('File oltre il caricamento semplice Microsoft (250 MB): usa OneDrive per questo trasferimento');
              const target=doc.onedrive_item_id?itemPath(doc.onedrive_item_id)+'/content':(p.folderId?itemPath(p.folderId):rootPath())+`:/${encodeURIComponent(doc.nome_file)}:/content?@microsoft.graph.conflictBehavior=fail`;
              result=await graphJson(target,{method:'PUT',headers:{'Content-Type':doc.mime_type||'application/octet-stream',...(doc.onedrive_etag?{'If-Match':doc.onedrive_etag}:{})},body:file});
              await checked(db.from('documenti').update({onedrive_item_id:result.id,onedrive_drive_id:state.drive_id,onedrive_etag:result.eTag,onedrive_web_url:result.webUrl,sync_stato:'sincronizzato',sync_origine:'lovable'}).eq('id',doc.id));
            }
            await checked(db.from('onedrive_jobs').update({status:'done',error:null,attempts:job.attempts+1,updated_at:new Date().toISOString()}).eq('id',job.id));
            await log(job.operation,'completato',null,{nome:p.name??result?.name});
          }catch(e){const error=e instanceof Error?e.message:String(e);await checked(db.from('onedrive_jobs').update({status:error.includes('[412]')?'conflict':'error',error,attempts:job.attempts+1}).eq('id',job.id));await log(job.operation,'errore',error);}
        }
        return json({ok:true,importati:imported,aggiornati:updated,duplicati:0,errori:0,troncato:!checkpoint.complete,complete:checkpoint.complete,conteggi:await counts()});
      }catch(e){const error=e instanceof Error?e.message:String(e);await db.from('onedrive_sync_state').update({scan_status:'error',scan_error:error}).eq('user_id',userId);await log('sincronizzazione','errore',error);throw e;}
      finally{await db.from('onedrive_sync_state').update({lease_until:null}).eq('user_id',userId);}
    }
    return json({error:'Azione non disponibile'},400);
  }catch(e){const error=e instanceof Error?e.message:String(e);console.error('OneDrive:',error);return json({error},500);}
});
