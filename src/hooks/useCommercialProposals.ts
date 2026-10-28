import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { emptyProposalContent, type ProposalContent } from '@/lib/commercialProposal';
import type { Tables, Json } from '@/integrations/supabase/types';
export type CommercialProposal = Omit<Tables<'commercial_proposals'>, 'content'> & { content: ProposalContent };
export function useCommercialProposals(companyId?: string, customerId?: string) {
 const { user } = useAuth();
 return useQuery({ queryKey: ['commercial_proposals', user?.id, companyId, customerId], enabled: !!user, queryFn: async () => {
  const {data:removed,error:removalError}=await supabase.from('proposal_removals').select('proposal_id');if(removalError)throw removalError;const removedIds=new Set((removed||[]).map(r=>r.proposal_id));
  const all: CommercialProposal[] = [];
  for(let from=0;;from+=1000) {
   let q = supabase.from('commercial_proposals').select('*').order('created_at', {ascending:false}).order('id').range(from,from+999);
   if(companyId) q=q.eq('company_id',companyId); if(customerId) q=q.eq('customer_id',customerId);
   const {data,error}=await q; if(error) throw error;
   all.push(...(data || []).filter(p=>!removedIds.has(p.id)).map(p=>({...p,content:{...emptyProposalContent(),...p.content as object}} as CommercialProposal))); if(!data || data.length<1000) return all;
  }
 }});
}
export async function saveProposal(p: CommercialProposal) {
 const {data:{user}}=await supabase.auth.getUser(); if(!user) throw new Error('Accedi per salvare');
 const content={...p.content,rows:p.content.rows.map(r=>({...r,price:r.price.replace(',','.'),vat_rate:r.vat_rate.replace(',','.')}))};
 const values={company_id:p.company_id,customer_id:p.customer_id || null,year:p.year,kind:p.kind,title:p.title,status:p.status,valid_from:p.valid_from || null,valid_until:p.valid_until || null,content:content as unknown as Json,apply_prices:p.apply_prices,apply_conditions:p.apply_conditions,parent_id:p.parent_id,user_id:p.id?p.user_id:user.id};
 const q=p.id ? supabase.from('commercial_proposals').update(values).eq('id',p.id).eq('version',p.version) : supabase.from('commercial_proposals').insert(values);
 const {data,error}=await q.select().single(); if(error) throw error; return {...data,content:data.content as unknown as ProposalContent} as CommercialProposal;
}
export function useRefreshCommercial() {
 const qc=useQueryClient(); return () => Promise.all(['commercial_proposals','accepted_commercial_conditions','customer_price_history','customer_product_prices','canvass','contratti_clienti','documenti'].map(key=>qc.invalidateQueries({queryKey:[key]})));
}
export function useAcceptedConditions(companyId?:string,customerId?:string) {
 const {user}=useAuth(); return useQuery({queryKey:['accepted_commercial_conditions',user?.id,companyId,customerId],enabled:!!user,queryFn:async()=>{
  let q=supabase.from('accepted_commercial_conditions').select('*, aziende(nome), clienti(nome)').order('accepted_on',{ascending:false}); if(companyId)q=q.eq('company_id',companyId);if(customerId)q=q.eq('customer_id',customerId);
  const {data,error}=await q;if(error)throw error;return data;
 }});
}