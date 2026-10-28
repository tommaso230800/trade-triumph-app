import { describe,it,expect } from 'vitest';
import { computeReorderPairs,type ReorderOrder } from './reorderPairs';
const order:ReorderOrder={id:'september',cliente_id:'calonaci',azienda_id:'casoni',data_ordine:'2026-09-29',status:'in_attesa',totale:2478.97};
describe('Riordino cliente–azienda',()=>{
 it('Calonaci Casoni 29 settembre: 29 giorni al 28 ottobre',()=>expect(computeReorderPairs([order],'2026-10-28')[0].giorni_trascorsi).toBe(29));
 it('non richiede righe prodotto per includere ordini importati',()=>expect(computeReorderPairs([order],'2026-10-28')[0].ultimo_ordine_data).toBe('2026-09-29'));
 it('esclude bozze e annullati',()=>expect(computeReorderPairs([order,{...order,id:'draft',data_ordine:'2026-10-27',status:'bozza'},{...order,id:'cancel',data_ordine:'2026-10-28',status:'annullato'}],'2026-10-28')[0].ultimo_ordine_data).toBe('2026-09-29'));
 it('se annullato torna al precedente valido',()=>expect(computeReorderPairs([{...order,status:'annullato'},{...order,id:'previous',data_ordine:'2026-09-11'}],'2026-10-28')[0].ultimo_ordine_data).toBe('2026-09-11'));
 it('separa le aziende dello stesso cliente',()=>expect(computeReorderPairs([order,{...order,id:'polara',azienda_id:'polara'}],'2026-10-28')).toHaveLength(2));
 it('storico insufficiente non inventa frequenza',()=>expect(computeReorderPairs([order],'2026-10-28')[0].media_giorni_riordino).toBeNull());
 it('deduplica giorni uguali e rispetta media più 7 giorni',()=>{const p=computeReorderPairs([order,{...order,id:'same'},{...order,id:'prior',data_ordine:'2026-08-29'}],'2026-11-07')[0];expect(p.media_giorni_riordino).toBe(31);expect(p.da_ricontattare).toBe(true);});
});