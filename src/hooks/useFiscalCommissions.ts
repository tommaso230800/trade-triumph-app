import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/hooks/useAuth';
import {Commission,FiscalData,Receipt} from '@/lib/fiscal/engine';
export function useFiscalCommissions(){const {user}=useAuth();return useQuery({queryKey:['fiscal-commissions',user?.id],enabled:!!user,refetchOnMount:'always',refetchOnWindowFocus:true,queryFn:async()=>{
 if(!user)return [];
 async function load(table:'ordini'|'scadenziario_fatture'|'movimenti_provvigione'|'aziende'|'commission_receipts'){
 const result:any[]=[];for(let from=0;;from+=1000){let q=supabase.from(table).select('*').eq('user_id',user.id).order('id').range(from,from+999);if(table==='ordini'||table==='aziende')q=q.is('deleted_at',null);const {data,error}=await q;if(error)throw error;result.push(...data);if(data.length<1000)break;}return result;
 }
 const [orders,invoices,movements,companies,receipts]=await Promise.all([load('ordini'),load('scadenziario_fatture'),load('movimenti_provvigione'),load('aziende'),load('commission_receipts')]);
 const companyMap=new Map(companies.map(c=>[c.id,c]));
 const out:Commission[]=[];
 for(const [source,records] of [['ordine',orders],['fattura',invoices],['movimento',movements]] as const){for(const r of records){
 if(source==='ordine'&&['annullato','stand_by'].includes(r.status))continue;
 const fiscal=(r.fiscal_data??{}) as FiscalData,company=companyMap.get(r.azienda_id),related=(receipts as Receipt[]).filter(p=>p.source===source&&p.source_id===r.id);
 const competence=fiscal.competence_from??(source==='ordine'?r.data_ordine:source==='fattura'?(r.anno_competenza&&r.trimestre_competenza?`${r.anno_competenza}-${String((r.trimestre_competenza-1)*3+1).padStart(2,'0')}-01`:r.data_fattura):r.anno&&r.trimestre?`${r.anno}-${String((r.trimestre-1)*3+1).padStart(2,'0')}-01`:null);
 const recognized=source==='ordine'?r.provvigione_riconosciuta:null;
 const estimated=source==='ordine'&&fiscal.gross==null&&recognized==null;
 const gross=fiscal.gross??recognized??(source==='ordine'?(r.condizione_applicata_id&&r.provvigione_prevista!=null?r.provvigione_prevista:(company?.provvigione_percentuale!=null?Number(r.totale)*Number(company.provvigione_percentuale)/100:null)):source==='fattura'?r.provvigione_calcolata:r.importo);
 const status=source==='movimento'?r.stato:r.stato_provvigione??((r.provvigione_pagata||r.provvigione_incassata)?'pagata':'da_pagare');
 const paidSnapshot=source==='movimento'?(status==='pagata'?r.importo:null):r.importo_provvigione_pagata;
 const paidDate=source==='movimento'?r.data_pagamento:r.data_incasso_provvigione;
 const issues:string[]=[];if(!r.fiscal_subject_id)issues.push('Intestatario da assegnare');if(!r.fiscal_mandate_id)issues.push('Mandato da collegare');if(!competence)issues.push('Competenza mancante');if(gross==null)issues.push('Importo lordo mancante');if(['pagata','parziale'].includes(status)&&!related.length&&!fiscal.receipts_managed&&(!paidDate||!(Number(paidSnapshot)>0)))issues.push('Stato incassato senza data o importo: escluso dagli incassi');if(estimated)issues.push('Provvigione prevista, non ancora documentata');
 if(!fiscal.receipts_managed&&related.length===0&&Number(paidSnapshot)>0&&paidDate)issues.push('Incasso cumulativo precedente da riconciliare');
 out.push({id:(source==='ordine'?'ord-':source==='fattura'?'sc-':'mv-')+r.id,source,sourceId:r.id,number:r.codice??r.numero_fattura??r.descrizione??r.tipo,companyId:r.azienda_id,company:company?.nome??r.azienda_nome??'Da collegare',customerId:r.cliente_id??null,customer:r.cliente_nome??'',competence,competenceUntil:fiscal.competence_until??null,subjectId:r.fiscal_subject_id,mandateId:r.fiscal_mandate_id,gross:gross==null?null:Number(gross),estimated,paidSnapshot:paidSnapshot==null?null:Number(paidSnapshot),paidDate,status,fiscal,receipts:related,issues,revenue:source==='movimento'?0:Number(r.totale??r.importo??0),notes:r.note_provvigione??r.note??null});
 }}return out;
 }});}
