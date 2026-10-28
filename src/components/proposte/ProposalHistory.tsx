import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getDocumentoSignedUrl } from '@/hooks/useDocumenti';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
export function ProposalHistory({id}:{id:string}) {
 const {data,isLoading,isError,refetch}=useQuery({queryKey:['proposal_acceptances',id],queryFn:async()=>{const {data,error}=await supabase.from('proposal_acceptances').select('*').eq('proposal_id',id).maybeSingle();if(error)throw error;return data;}});
 async function open(id:string){try{const {data,error}=await supabase.from('documenti').select('storage_path').eq('id',id).single();if(error)throw error;window.open(await getDocumentoSignedUrl(data.storage_path),'_blank','noopener,noreferrer');}catch{toast.error('Documento non disponibile. Riprova.');}}
 if(isLoading)return <div className="h-16 animate-pulse bg-muted"/>;
 if(isError)return <Button variant="outline" onClick={()=>refetch()}>Riprova storico</Button>;
 if(!data)return null;
 return <div className="space-y-2 border-t pt-3 text-sm"><p className="font-semibold">Accettata il {data.accepted_on}</p><p className="text-xs text-muted-foreground">Registrazione {new Date(data.created_at).toLocaleString('it-IT')} · utente {data.user_id.slice(0,8)}</p><p>Listino: {data.apply_prices?'aggiornato':'non aggiornato'} · CANVASS/PFA: {data.apply_conditions?'registrato':'non trasferito'}</p>{data.notes&&<p>{data.notes}</p>}<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>open(data.pdf_document_id)}>PDF accettato</Button>{data.evidence_document_id&&<Button variant="outline" onClick={()=>open(data.evidence_document_id || '')}>Conferma cliente</Button>}</div></div>;
}