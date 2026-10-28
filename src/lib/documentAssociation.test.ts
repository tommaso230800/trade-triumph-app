import { describe,it,expect } from 'vitest';
import { matchIdentity } from '../../supabase/functions/classify-document/matching';
describe('Associazioni documentali',()=>{
 it('collega per partita IVA esatta',()=>expect(matchIdentity({vat:'IT 12345678901'},[{id:'polara',nome:'Polara',partita_iva:'12345678901'}]).id).toBe('polara'));
 it('non sceglie fra omonimi',()=>expect(matchIdentity({name:'Calonaci SRL'},[{id:'a',nome:'Calonaci SRL'},{id:'b',nome:'Calonaci SRL'}]).id).toBeNull());
 it('non inventa Elba assente',()=>expect(matchIdentity({name:'Elba Bevande'},[{id:'polara',nome:'Polara'}]).id).toBeNull());
});