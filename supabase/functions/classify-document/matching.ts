export type Entity = { id:string; nome:string; partita_iva?:string|null; codice_fiscale?:string|null; codice_cliente?:string|null; indirizzo?:string|null };
export type Identity = { name?:string; vat?:string; code?:string; address?:string };
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function matchIdentity(identity:Identity,entities:Entity[]) {
 const candidates=entities.map(e=>{let score=0;const vat=norm(identity.vat||'');if(vat&&[e.partita_iva,e.codice_fiscale].some(x=>x&&norm(x)===vat))score=1;
 if(identity.code&&e.codice_cliente&&norm(identity.code)===norm(e.codice_cliente))score=Math.max(score,.98);
 if(identity.name&&norm(identity.name)===norm(e.nome))score=Math.max(score,.88);
 if(score&&identity.address&&e.indirizzo&&norm(identity.address)===norm(e.indirizzo))score=Math.min(1,score+.1);
 return {id:e.id,name:e.nome,score};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
 const top=candidates[0];return {id:top&&top.score>=.88&&(!candidates[1]||top.score-candidates[1].score>.05)?top.id:null,candidates};
}