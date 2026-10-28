import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAziende } from './useAziende';
import { useClienti } from './useClienti';
import { computeReorderPairs,type ReorderOrder } from '@/lib/reorderPairs';
export function useReorderPairs(){
 const {user}=useAuth();const companies=useAziende();const clients=useClienti();
 const query=useQuery({queryKey:['reorder_forecast_v1','pairs',user?.id],enabled:!!user,staleTime:60000,refetchOnMount:'always',refetchOnWindowFocus:true,refetchInterval:60000,queryFn:async()=>{const all:ReorderOrder[]=[];for(let from=0;;from+=1000){const {data,error}=await supabase.from('ordini').select('id,cliente_id,azienda_id,data_ordine,status,totale,deleted_at').is('deleted_at',null).order('id').range(from,from+999);if(error)throw error;all.push(...data);if(data.length<1000)return computeReorderPairs(all);}}});
 return {...query,isLoading:query.isLoading||companies.isLoading||clients.isLoading,isError:query.isError||companies.isError||clients.isError,data:query.data?.map(p=>({...p,cliente_nome:clients.data?.find(c=>c.id===p.cliente_id)?.nome||'N/D',azienda_nome:companies.data?.find(c=>c.id===p.azienda_id)?.nome||'N/D'}))};
}