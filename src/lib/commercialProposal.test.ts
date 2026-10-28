import { describe,it,expect } from 'vitest';
import { normalizedProposalPrice,proposalStatus,potentialReward,type ProposalRow } from './commercialProposal';
const row:ProposalRow={product_id:'p',category:'',name:'Tonica',description:'',format:'1L',image:'',price:'0.50',unit:'pezzo',vat_mode:'esclusa',vat_rate:'22',notes:''};
describe('Prezzi proposta',()=>{
 it('preserva 0,50 euro per pezzo IVA esclusa',()=>expect(normalizedProposalPrice(row,{pezzi_per_cartone:12,cartoni_per_strato:12,strati:5})).toBe(0.5));
 it('converte cartoni soltanto con conversione reale',()=>expect(normalizedProposalPrice({...row,price:'6',unit:'cartone'},{pezzi_per_cartone:12,cartoni_per_strato:12,strati:5})).toBe(0.5));
 it('non deduce unità assente',()=>expect(normalizedProposalPrice({...row,unit:''},{pezzi_per_cartone:12,cartoni_per_strato:12,strati:5})).toBeNull());
 it('non deduce IVA assente',()=>expect(normalizedProposalPrice({...row,vat_mode:''},{pezzi_per_cartone:12,cartoni_per_strato:12,strati:5})).toBeNull());
 it('non converte pallet senza dati',()=>expect(normalizedProposalPrice({...row,unit:'pallet'},{pezzi_per_cartone:12,cartoni_per_strato:0,strati:5})).toBeNull());
 it('scorpora IVA esplicita dal prezzo incluso',()=>expect(normalizedProposalPrice({...row,price:'1.22',vat_mode:'inclusa'},{pezzi_per_cartone:1,cartoni_per_strato:1,strati:1})).toBe(1));
});
describe('Stati e premi',()=>{
 it('scade la proposta non accettata oltre termine',()=>expect(proposalStatus({status:'inviata',valid_until:'2026-10-27'},'2026-10-28')).toBe('scaduta'));
 it('non scade una proposta accettata',()=>expect(proposalStatus({status:'accettata',valid_until:'2026-10-27'},'2026-10-28')).toBe('accettata'));
 it('somma 1% base + 1% a 8000 soltanto se cumulabili, senza dichiarare maturato',()=>expect(potentialReward([{description:'Base',value:'1',unit:'percentuale',threshold:'0'},{description:'Aggiuntivo',value:'1',unit:'percentuale',threshold:'8000'}],true)).toBe(2));
 it('non somma senza regola di cumulabilità',()=>expect(potentialReward([{description:'Base',value:'1',unit:'percentuale',threshold:'0'}],false)).toBeNull());
});