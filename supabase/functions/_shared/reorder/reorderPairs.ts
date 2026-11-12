import { orderRevenue } from './revenue.ts';
import { todayRome } from './rome.ts';
import { analyzePair } from './reorderIntelligence.ts';
import { reorderExclusion, type ReorderSourceOrder } from './reorderEligibility.ts';
export type ReorderOrder = ReorderSourceOrder & { totale: number | string | null };
export const calendarDay=(date:string)=>Date.parse(`${date.slice(0,10)}T00:00:00Z`)/86400000;
export function computeReorderPairs(orders:ReorderOrder[],today=todayRome()) {
 // Every pair uses the same provenance checks and cadence as the intelligence view.
 const groups=new Map<string,ReorderOrder[]>();
 for(const o of orders) {
  if(reorderExclusion(o,today)) continue;
  const key=`${o.cliente_id}|${o.azienda_id}`;
  groups.set(key,[...(groups.get(key)||[]),o]);
 }
 return Array.from(groups,([id,list])=>{
  const sorted=[...new Map(list.map(o=>[o.id,o])).values()].sort((a,b)=>(b.data_ordine||'').localeCompare(a.data_ordine||'') || a.id.localeCompare(b.id));
  const latest=sorted[0];
  const stats=analyzePair(latest.cliente_id||'',latest.azienda_id||'',sorted.map(o=>({id:o.id,data_ordine:o.data_ordine||'',totale:orderRevenue(o),cartoni:0,pezzi:0})),[],{today});
  return {id,cliente_id:latest.cliente_id||'',azienda_id:latest.azienda_id||'',ultimo_ordine_data:stats.ultimo_ordine,media_giorni_riordino:stats.frequenza_operativa,numero_ordini:sorted.length,prossimo_riordino_previsto:stats.prossimo_riordino_previsto,giorni_trascorsi:stats.giorni_da_ultimo,giorni_ritardo:stats.giorni_ritardo,da_ricontattare:stats.stato==='ritardo',ultimo_importo:orderRevenue(latest),ordine_ids:sorted.map(o=>o.id)};
 });
}
