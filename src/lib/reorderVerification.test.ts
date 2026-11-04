import { describe, expect, it } from 'vitest';
import { analyzePair, dayOf, type IntelligenceOrder } from './reorderIntelligence';
import { computeReorderPairs } from './reorderPairs';
import { reorderExclusion } from './reorderEligibility';
import { computeReorderForecast } from './reorderForecastEngine';

const orders = (intervals: number[], start = '2022-01-01'): IntelligenceOrder[] => {
  let d = dayOf(start);
  return [0, ...intervals].map((gap,i) => {
    d += gap;
    return {id:`o${i}`,data_ordine:new Date(d*86400000).toISOString().slice(0,10),totale:100,cartoni:1,pezzi:1};
  });
};
const opts = {today:'2026-11-04'};
describe('Correzione frequenze — A–F', () => {
  it('A: GHILLI due acquisti reali distano 144 giorni, non sono una frequenza consolidata', () => {
    const real = orders([144], '2026-02-26');
    expect(real[1].data_ordine).toBe('2026-07-20');
    const p = analyzePair('ghilli','quattro-valli',real,[],opts);
    expect(p.intervalli.map(x=>x.giorni)).toEqual([144]);
    expect(p.affidabilita).toBe('insufficiente');
    expect(p.prossimo_riordino_previsto).toBeNull();
    expect(p.giorni_ritardo).toBe(0);
  });
  it('B: ciclo di cinque mesi non produce previsione mensile', () => {
    const p = analyzePair('c','a',orders([145,150,155,150,145,155,150]),[],opts);
    expect(p.frequenza_operativa).toBe(150);
    expect(dayOf(p.prossimo_riordino_previsto || '')-dayOf(p.ultimo_ordine)).toBe(150);
    expect(p.affidabilita).toBe('alta');
  });
  it('tre date distanti 150 e 152 giorni mostrano media 151 e bassa affidabilità', () => {
    const p=analyzePair('c','a',orders([150,152]),[],opts);
    expect(p.media_giorni).toBe(151);
    expect(p.frequenza_operativa).toBe(151);
    expect(p.affidabilita).toBe('bassa');
  });
  it('C: baseline 33 conservata, due cicli 50/52 producono operativa 51 persistente', () => {
    const p=analyzePair('c','a',orders([33,33,33,33,50,52]),[],opts);
    expect(p.frequenza_abituale).toBe(33);
    expect(p.frequenza_recente).toBe(51);
    expect(p.frequenza_operativa).toBe(51);
    expect(p.rallentamento).toBe('persistente');
  });
  it('30,32,35,31,33,145,150: operativa 147,5, non 31', () => {
    const p=analyzePair('c','a',orders([30,32,35,31,33,145,150]),[],opts);
    expect(p.frequenza_abituale).toBe(32);
    expect(p.frequenza_operativa).toBe(147.5);
    expect(p.rallentamento).toBe('persistente');
  });
  it('D: primo rallentamento abbassa affidabilità e sospende data/ritardo', () => {
    const p=analyzePair('c','a',orders([33,33,33,33,145]),[],opts);
    expect(p.affidabilita).toBe('bassa');
    expect(p.prossimo_riordino_previsto).toBeNull();
    expect(p.giorni_ritardo).toBe(0);
  });
  it('E: intero storico per ID non dipende da filtri UI; stesso importo non è duplicato', () => {
    const source=orders([150,150,150]).map(o=>({...o,cliente_id:'c',azienda_id:'a',status:'completato'}));
    const baseline=computeReorderPairs(source,'2026-11-04');
    const other={...source[0],id:'other',azienda_id:'other'};
    expect(computeReorderPairs([...source,other],'2026-11-04').find(p=>p.azienda_id==='a')).toEqual(baseline[0]);
    expect(baseline[0].numero_ordini).toBe(4);
    expect(baseline[0].media_giorni_riordino).toBe(150);
  });
  it('F: ricalcolo idempotente, nessuna modifica di dati originali o conteggio doppio di ID', () => {
    const source=orders([30,31,32,33]);
    const before=JSON.stringify(source);
    const first=analyzePair('c','a',source,[],opts);
    expect(analyzePair('c','a',[...source,source[0]],[],opts)).toEqual(first);
    expect(JSON.stringify(source)).toBe(before);
  });
  it('solo il marker di ripartizione ricostruita è escluso, non storico valido senza righe', () => {
    const o={id:'x',cliente_id:'c',azienda_id:'a',data_ordine:'2025-01-15',status:'completato',note:'Storico importato da fattura'};
    expect(reorderExclusion(o,'2026-11-04')).toBeNull();
    expect(reorderExclusion({...o,note:'Storico 2025 ricostruito'},'2026-11-04')).not.toBeNull();
    for (const status of ['bozza','da_confermare','annullato','stand_by']) expect(reorderExclusion({...o,status},'2026-11-04')).not.toBeNull();
  });
  it('ritardo positivo solo dopo data prevista più sei giorni', () => {
    const source=orders([145,145,145], '2025-05-11');
    const last=source[3].data_ordine;
    const onDay=(n:number)=>new Date((dayOf(last)+n)*86400000).toISOString().slice(0,10);
    expect(analyzePair('c','a',source,[],{today:onDay(151)}).giorni_ritardo).toBe(0);
    expect(analyzePair('c','a',source,[],{today:onDay(152)}).giorni_ritardo).toBe(1);
  });
  it('prodotti: stesso ciclo operativo adattivo e nessuna previsione da un intervallo', () => {
    const rows=orders([33,33,33,33,50,52]).map(o=>({ordine_id:o.id,prodotto_id:'p',quantita_cartoni:1,quantita_pezzi:1,is_omaggio:false,prezzo_unitario:1,data_ordine:o.data_ordine,cliente_id:'c',azienda_id:'a'}));
    expect(computeReorderForecast(rows,new Date('2026-11-04'))[0].frequenza_operativa).toBe(51);
    expect(computeReorderForecast(rows.slice(0,2),new Date('2026-11-04'))[0].prossimo_riordino).toBeNull();
  });
});