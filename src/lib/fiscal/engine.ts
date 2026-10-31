export type FiscalData = { competence_from?: string; competence_until?: string; invoice_on?: string; gross?: number; enasarco?: number; document_id?: string; receipts_managed?: boolean; duplicate_of?: string; confirmed?: boolean; legacy_receipt_confirmed?: boolean };
export type Receipt = { id: string; source: string; source_id: string; received_on: string; gross_amount: number; enasarco_withheld: number | null; bank_amount: number | null; verification: string; withholding?: number | null; vat?: number | null; stamp?: number | null; other_deductions?: number | null; document_id?: string | null };
export type Commission = { id: string; source: 'ordine'|'fattura'|'movimento'; sourceId: string; number: string; companyId: string|null; company: string; customerId: string|null; customer: string; competence: string|null; competenceUntil: string|null; subjectId: string|null; mandateId: string|null; gross: number|null; estimated: boolean; paidSnapshot: number|null; paidDate: string|null; status: string; fiscal: FiscalData; receipts: Receipt[]; issues: string[]; revenue: number; notes: string|null };
export type Mandate = { id: string; subject_id: string; company_id: string; relationship_key: string; valid_from: string; valid_until: string|null; agency_type: string };
export type Entry = { id: string; subject_id: string; year: number; kind: string; nature: string; amount: number; compensation: number; paid_on: string|null; due_on: string|null; verification: string; deductible: boolean; deduction_percent: number; document_id?: string|null; notes?: string|null };
export type Settings = { regime?: string; accounting?: string; criterion?: string; coefficient?: number; rate?: number; ateco?: string; deductionsComplete?: boolean; expensesComplete?: boolean; otherIncomeComplete?: boolean; otherIncome?: number; taxCredits?: number; regionalRate?: number; municipalRate?: number; inpsEnabled?: boolean; inpsIncome?: number; inpsMonths?: number; inpsCeiling?: number; inpsReduction?: number; reliefConfirmed?: boolean; reserve?: number; fiscalDomicile?: string; partners?: {subjectId:string;share:number;role:string}[]; sasIncome?: number; irap?: number; vatDue?: number; eligibilityConfirmed?: boolean };
export const HISTORICAL: Record<number, Record<string,number>> = {2024:{receipts:32924,coefficient:62,forfaitIncome:20413,deducted:5644,taxable:14769,rate:5,tax:738,advances:707,balance:31},2025:{receipts:34735,coefficient:62,forfaitIncome:21536,deducted:6139,taxable:15397,rate:15,tax:2310,advances:738,balance:1572,inpsMinimum:2984,maternity:7,inpsExcess:479}};
export const SOURCES = { inps:'https://www.inps.it/content/dam/inps-site/it/scorporati/circolari-e-messaggi/2026/02/Circolare_15162/Allegati/16561_Circolare-numero-14-del-09-02-2026.pdf', enasarco:'https://www.enasarco.it/2026/02/minimali-e-massimali-2026/', forfait:'https://www.agenziaentrate.gov.it/portale/schede/agevolazioni/regime-agevolato-forfettario/reddito-e-tassazione-nuovo-regime-forfettario-agevolato-intermediari', irpef:'https://www.fiscooggi.it/portale/-/le-misure-fiscali-del-bilancio-2026-per-il-sostegno-del-reddito' };
export const money = (n:number|null|undefined)=>n==null?'N/D':new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(n);
export const round = (n:number)=>Math.round((n+Number.EPSILON)*100)/100;
export function resolveMandate(mandates:Mandate[],company:string|null,date:string|null){if(!date||!company)return null;const found=mandates.filter(m=>m.company_id===company&&m.valid_from<=date&&(!m.valid_until||m.valid_until>=date));return found.length===1?found[0]:null;}
export function cashOf(c:Commission):Receipt[]{
 if(c.fiscal.receipts_managed||c.receipts.length)return c.receipts;
 // A paid status never substitutes for an amount or receipt date.
 if(c.fiscal.legacy_receipt_confirmed!==true||c.paidSnapshot==null||c.paidSnapshot<=0||!c.paidDate||!['pagata','parziale'].includes(c.status))return [];
 return [{id:'legacy-'+c.id,source:c.source,source_id:c.sourceId,received_on:c.paidDate,gross_amount:c.paidSnapshot,enasarco_withheld:null,bank_amount:null,verification:'da_verificare'}];
}
export function progressiveTax(income:number,year:number){if(year!==2026)return null;return round(Math.min(Math.max(income,0),28000)*.23+Math.min(Math.max(income-28000,0),22000)*.33+Math.max(income-50000,0)*.43);}
export function inpsCalc(income:number,s:Settings,year:number){
 if(s.inpsEnabled===false)return {total:0,minimum:0,excess:0,maternity:0};
 if(year!==2026||s.inpsEnabled!==true||s.inpsMonths==null||s.inpsMonths<1||s.inpsMonths>12||![93707,122295].includes(s.inpsCeiling??0)||(s.inpsReduction??0)!==0)return null;
 const months=s.inpsMonths, minimumIncome=18808*months/12, cap=s.inpsCeiling===93707?93707*months/12:122295, base=Math.min(Math.max(income,minimumIncome),cap);
 const minimum=round(minimumIncome*.2448), excess=round(Math.max(0,base-minimumIncome)*.2448+Math.max(0,base-56224)*.01), maternity=round(months*.62);
 return {minimum,excess,maternity,total:round(minimum+excess+maternity)};
}
export function enasarcoCalc(rows:Commission[],mandates:Mandate[],year:number){
 const groups=new Map<string,{base:number;type:string;ids:string[]}>();let incomplete=false;
 for(const c of rows){if(c.gross==null){incomplete=true;continue;}const m=mandates.find(x=>x.id===c.mandateId);if(!m||m.subject_id!==c.subjectId||m.company_id!==c.companyId||!c.competence||c.competence<m.valid_from||(m.valid_until!=null&&c.competence>m.valid_until)||!['mono','pluri'].includes(m.agency_type)){incomplete=true;continue;}const key=m.subject_id+':'+m.company_id+':'+m.relationship_key;const g=groups.get(key)??{base:0,type:m.agency_type,ids:[]};g.base+=c.gross;g.ids.push(c.id);groups.set(key,g);}
 const details=[...groups.entries()].map(([key,g])=>{const cap=year===2026?(g.type==='mono'?45717:30478):null;return {key,...g,cap,remaining:cap==null?null:Math.max(0,cap-g.base),agent:cap==null?null:round(Math.min(Math.max(0,g.base),cap)*.085)};});
 return {total:incomplete||year!==2026?null:round(details.reduce((s,g)=>s+(g.agent??0),0)),details,incomplete};
}
export type Filter = {subjectId:string;year:number;companyId?:string;mandateId?:string;month?:number;quarter?:number};
const matchesPeriod=(date:string|null,f:Filter)=>!!date&&Number(date.slice(0,4))===f.year&&(!f.month||Number(date.slice(5,7))===f.month)&&(!f.quarter||Math.ceil(Number(date.slice(5,7))/3)===f.quarter);
export function fiscalSummary(all:Commission[],mandates:Mandate[],entries:Entry[],settings:Settings,f:Filter){
 const subjectRows=all.filter(c=>c.subjectId===f.subjectId&&!c.fiscal.duplicate_of);
 const annualEarned=subjectRows.filter(c=>c.competence?.startsWith(String(f.year)));
 const localCompany=(c:Commission)=>(!f.companyId||c.companyId===f.companyId)&&(!f.mandateId||c.mandateId===f.mandateId);
 const localEarned=annualEarned.filter(c=>localCompany(c)&&matchesPeriod(c.competence,f));
 const annualCash=subjectRows.flatMap(c=>cashOf(c).filter(r=>r.received_on.startsWith(String(f.year))).map(r=>({commission:c,receipt:r})));
 const localCash=annualCash.filter(x=>localCompany(x.commission)&&matchesPeriod(x.receipt.received_on,f));
 const sumCash=(xs:typeof annualCash)=>round(xs.reduce((s,x)=>s+x.receipt.gross_amount,0));
 const annualReceipts=sumCash(annualCash),receipts=sumCash(localCash),gross=round(localEarned.reduce((s,c)=>s+(c.gross??0),0));
 const invoices=subjectRows.filter(c=>localCompany(c)&&matchesPeriod(c.fiscal.invoice_on??null,f));
 const billed=round(invoices.reduce((s,c)=>s+(c.gross??0),0));
 const outstanding=round(localEarned.reduce((s,c)=>s+Math.max(0,(c.gross??0)-cashOf(c).reduce((a,r)=>a+r.gross_amount,0)),0));
 const fiscalEntries=entries.filter(e=>e.subject_id===f.subjectId&&e.year===f.year);
 const payments=entries.filter(e=>e.subject_id===f.subjectId&&e.paid_on?.startsWith(String(f.year))&&e.verification==='verificato');
 const deductible=round(payments.filter(e=>e.deductible&&['inps','enasarco'].includes(e.kind)).reduce((s,e)=>s+(e.amount+e.compensation)*e.deduction_percent/100,0));
 const expenses=fiscalEntries.filter(e=>e.kind==='spesa');const expensesAmount=round(expenses.reduce((s,e)=>s+e.amount,0));
 const deductibleExpenses=expenses.filter(e=>e.deductible).reduce((s,e)=>s+e.amount*e.deduction_percent/100,0);
 const cashCriterion=settings.regime==='forfettario'||settings.criterion==='cassa';
 const annualRevenue=cashCriterion?annualReceipts:annualEarned.reduce((s,c)=>s+(c.gross??0),0);
 const income=settings.regime==='forfettario'?annualReceipts*(settings.coefficient??62)/100:annualRevenue-deductibleExpenses;
 const inps=inpsCalc(settings.inpsIncome??Math.max(0,income),settings,f.year);
 const enasarco=enasarcoCalc(annualEarned,mandates,f.year);
 const taxable=round(Math.max(0,income-deductible+(settings.regime==='ordinario'?(settings.otherIncome??0):0)));
 const incompleteCash=subjectRows.some(c=>['pagata','parziale'].includes(c.status)&&!c.fiscal.receipts_managed&&!c.receipts.length&&c.fiscal.legacy_receipt_confirmed!==true);
 const blocked=incompleteCash||settings.deductionsComplete!==true||(settings.regime==='ordinario'&&(settings.expensesComplete!==true||settings.otherIncomeComplete!==true||!settings.criterion));
 let tax:number|null=null;
 if(!blocked&&settings.regime==='forfettario'&&settings.rate!=null&&annualReceipts<=100000)tax=round(taxable*settings.rate/100);
 if(!blocked&&settings.regime==='ordinario'&&settings.regionalRate!=null&&settings.municipalRate!=null){const irpef=progressiveTax(taxable,f.year);tax=irpef==null?null:round(Math.max(0,irpef-(settings.taxCredits??0))+taxable*(settings.regionalRate+settings.municipalRate)/100);}
 const confirmedPayments=fiscalEntries.filter(e=>e.verification==='verificato'&&e.paid_on&&['inps','imposta','irpef','irap'].includes(e.kind));
 const paidLiabilities=confirmedPayments.reduce((s,e)=>s+e.amount+e.compensation,0);
 const withheld=annualCash.reduce((s,x)=>s+(x.receipt.enasarco_withheld??0),0);
 const documentedEnasarco=fiscalEntries.filter(e=>e.kind==='enasarco'&&e.verification==='verificato'&&e.paid_on).reduce((s,e)=>s+e.amount+e.compensation,0);
 const net=settings.expensesComplete!==true||tax==null||inps==null||enasarco.total==null?null:round(annualRevenue-tax-inps.total-enasarco.total-expensesAmount);
 const reserve=tax==null||inps==null||enasarco.total==null?null:round(Math.max(0,tax+inps.total+Math.max(0,enasarco.total-withheld-documentedEnasarco)-paidLiabilities-(settings.reserve??0)));
 const ratio=annualRevenue>0?Math.max(0,(cashCriterion?receipts:gross)/annualRevenue):0;
 const bankKnown=settings.expensesComplete===true&&!incompleteCash&&localCash.every(x=>x.receipt.bank_amount!=null);
 const cashAvailable=bankKnown?round(localCash.reduce((s,x)=>s+(x.receipt.bank_amount??0),0)-payments.filter(e=>matchesPeriod(e.paid_on,f)).reduce((s,e)=>s+e.amount,0)):null;
 const issues=[...subjectRows.flatMap(c=>c.issues.map(issue=>`${c.number}: ${issue}`))];
 if(incompleteCash)issues.push('Incassi cumulativi precedenti da confermare o ricostruire: non inclusi nel reddito fiscale');
 if(settings.expensesComplete!==true)issues.push('Spese attività incomplete: netto e disponibilità di cassa N/D');
 if(settings.deductionsComplete!==true)issues.push('Contributi deducibili effettivamente versati da completare');
 if(inps==null)issues.push('Posizione INPS, periodo di iscrizione o agevolazioni da confermare');
 if(enasarco.incomplete)issues.push('Tipo di mandato o base Enasarco da verificare');
 if(settings.regime==='ordinario'&&blocked)issues.push('Contabilità, costi o altri redditi incompleti');
 if(settings.regime==='sas')issues.push('Calcolo societario e ripartizione ai soci richiedono documentazione e quote verificate');
 if(annualReceipts>100000&&settings.regime==='forfettario')issues.push('Incassi oltre 100.000 €: fuoriuscita in corso d’anno, ricalcolo ordinario e IVA necessario');
 else if(annualReceipts>85000&&settings.regime==='forfettario')issues.push('Incassi oltre 85.000 €: verificare uscita dal forfettario nell’anno successivo');
 if(settings.regime==='forfettario'&&!settings.eligibilityConfirmed)issues.push('Requisiti del regime forfettario da confermare');
 return {gross,billed,receipts,outstanding,annualReceipts,annualRevenue,income:round(income),deductible,taxable,tax,inps,enasarco,net,reserve,expensesAmount,cashAvailable,ratio,localEarned,localCash,invoices,annualEarned,annualCash,entries:fiscalEntries,payments,issues,withheld,allocatedTax:tax==null?null:round(tax*ratio),allocatedInps:inps==null?null:round(inps.total*ratio)};
}
