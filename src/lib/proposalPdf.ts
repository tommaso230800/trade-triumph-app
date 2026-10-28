import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CommercialProposal } from '@/hooks/useCommercialProposals';
import { euro } from './commercialProposal';
async function imageData(url:string) {
 if(!url) return null;
 try { const res=await fetch(url); if(!res.ok)return null; const blob=await res.blob(); return await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);}); } catch {return null;}
}
export async function generateProposalPdf(p:CommercialProposal,company:string,customer:string) {
 const doc=new jsPDF({format:'a4',unit:'mm'}); const c=p.content; let y=16;
 const logo=await imageData(c.logo); if(logo) {const props=doc.getImageProperties(logo);const h=Math.min(25,45*props.height/props.width);doc.addImage(logo, 'PNG',82.5,y,45,h);y+=h+8;}
 const text=(s:string,size=10,bold=false)=>{if(!s.trim())return;doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);const lines=doc.splitTextToSize(s,178);for(const line of lines){if(y>276){doc.addPage();y=18;}doc.text(line,16,y);y+=size*0.45;}y+=3;};
 const section=(s:string)=>{if(y>256){doc.addPage();y=18;}y+=3;text(s,12,true);};
 text(p.title || `${p.kind==='locandina'?'Promozione':'Proposta commerciale'} ${company} ${p.year}`,16,true);
 text(`${company} · ${p.year}`,10); if(customer)text(`Cliente: ${customer}`,12,true);
 text(`AMG-${p.id.slice(0,8).toUpperCase()} · Versione ${p.version} · ${new Date(p.created_at).toLocaleDateString('it-IT')}`,8);
 if(p.valid_from || p.valid_until)text(`Validità: ${p.valid_from || 'da concordare'} / ${p.valid_until || 'da concordare'}`,9);
 if(c.rewards.length){section('Premio Fine Anno (PFA)');for(const r of c.rewards)text(`${r.value}${r.unit==='percentuale'?'%': ' EUR'} · ${r.description}${Number(r.threshold)>0?` · Soglia ${euro(Number(r.threshold))}`:''}`);text(c.reward_rules);text('Premio maturato: N/D (da verificare sui dati annuali)',9);}
 if(c.rows.length){section('Listino prodotti e prezzi');
 if(c.show_images || p.kind==='locandina'){
  for(const r of c.rows){if(y>237){doc.addPage();y=18;}const image=await imageData(r.image);if(image){const props=doc.getImageProperties(image); const h=Math.min(28,28*props.height/props.width);doc.addImage(image,'PNG',16,y,28,h);}const start=y;doc.setFontSize(11);doc.setFont('helvetica','bold');const lines=doc.splitTextToSize(`${r.name} ${r.format}`,125);doc.text(lines,49,y+5);doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text(`${r.price===''?'N/D':euro(Number(r.price))} / ${r.unit || 'unità N/D'}`,49,y+18);y=start+36;}
 }
 autoTable(doc,{startY:y,margin:{left:16,right:16,top:18,bottom:18},head:[['Categoria','Prodotto e formato','Prezzo / unità · IVA']],body:c.rows.map(r=>[r.category || '—',`${r.name} ${r.format}\n${r.description || ''}${r.notes?`\n${r.notes}`:''}`,`${r.price===''?'N/D':euro(Number(r.price))} / ${r.unit || 'N/D'}\nIVA ${r.vat_mode || 'N/D'} ${r.vat_rate!==''?`${r.vat_rate}%`:''}`]),styles:{fontSize:9,cellPadding:3,overflow:'linebreak'},headStyles:{fillColor:35,textColor:255},columnStyles:{0:{cellWidth:38},1:{cellWidth:87},2:{cellWidth:53,halign:'right'}},showHead:'everyPage'});
 y=(doc as unknown as {lastAutoTable:{finalY:number}}).lastAutoTable.finalY+7;
 }
 if(c.promotions.length){section('Promozioni');autoTable(doc,{startY:y,margin:{left:16,right:16,top:18,bottom:18},head:[['Prodotto','Promozione','Minimo ordine / Note']],body:c.promotions.map(t=>[t.title,`${t.buy} acquistati + ${t.gift} omaggio (${t.unit || 'N/D'})\n${t.start&&t.end?`${t.start} / ${t.end}`:`${t.periods || 'N/D'} periodi di ${t.months || 'N/D'} mesi · date da concordare`}`,`${t.minimum || 'N/D'} ${t.unit}\n${t.notes}`]),styles:{fontSize:9,cellPadding:3},headStyles:{fillColor:35,textColor:255},showHead:'everyPage'});y=(doc as unknown as {lastAutoTable:{finalY:number}}).lastAutoTable.finalY+7;}
 if(c.loading){section('Condizioni di carico');text(c.loading);} if(c.payment){section('Condizioni di pagamento');text(c.payment);} if(c.discounts){section('Sconti e cumulabilità');text(c.discounts);} if(c.notes){section('Note');text(c.notes);} section('Referente e contatti');text(c.contact);
 for(let i=1;i<=doc.getNumberOfPages();i++){doc.setPage(i);doc.setFontSize(8);doc.text(`AMG-${p.id.slice(0,8)} · v${p.version}`,16,289);doc.text(`${i} / ${doc.getNumberOfPages()}`,194,289,{align:'right'});}
 return doc.output('blob');
}