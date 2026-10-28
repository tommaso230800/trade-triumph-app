import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getDocumentoSignedUrl } from '@/hooks/useDocumenti';
import { Button } from '@/components/ui/button';
import { FileText, X } from 'lucide-react';
import { toast } from 'sonner';
export function ProposalAttachments({ids,onRemove}:{ids:string[];onRemove?:(id:string)=>void}) {
 const {data=[]}=useQuery({queryKey:['proposal_attachments',ids.join(',')],enabled:ids.length>0,queryFn:async()=>{const {data,error}=await supabase.from('documenti').select('id,nome_file,storage_path').in('id',ids).is('deleted_at',null);if(error)throw error;return data;}});
 if(!ids.length)return null;
 return <section className="space-y-2"><h3 className="text-base font-semibold">Allegati della proposta</h3>{data.map(d=><div key={d.id} className="flex min-w-0 items-center gap-2 border-b py-2"><Button variant="ghost" className="h-auto min-h-11 min-w-0 flex-1 justify-start whitespace-normal text-left" onClick={async()=>{try{window.open(await getDocumentoSignedUrl(d.storage_path),'_blank','noopener,noreferrer');}catch{toast.error('Allegato non disponibile');}}}><FileText className="mr-2 h-4 w-4 shrink-0"/><span className="break-all">{d.nome_file}</span></Button>{onRemove&&<Button variant="ghost" size="icon" aria-label="Rimuovi allegato dalla proposta" onClick={()=>onRemove(d.id)}><X className="h-4 w-4"/></Button>}</div>)}</section>;
}