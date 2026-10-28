import { useReorderPairs } from "./useReorderPairs";
export interface ReorderAlert {
  id: string;
  cliente_id: string;
  azienda_id: string;
  cliente_nome: string;
  azienda_nome: string;
  ultimo_ordine_data: string | null;
  media_giorni_riordino: number;
  numero_ordini: number;
  prossimo_riordino_previsto: string | null;
  giorni_ritardo: number;
}

export function useReorderTracking(){return useReorderPairs();}
export function useReorderAlerts(){const query=useReorderPairs();return {...query,data:query.data?.filter(p=>p.da_ricontattare).map(p=>({...p,media_giorni_riordino:p.media_giorni_riordino||0})).sort((a,b)=>b.giorni_ritardo-a.giorni_ritardo)};}
export function useClienteReorderTracking(clienteId?:string){const query=useReorderPairs();return {...query,data:query.data?.filter(p=>p.cliente_id===clienteId).map(p=>({...p,media_giorni_riordino:p.media_giorni_riordino||0}))};}
