import { jsPDF } from 'jspdf';
import type { CommercialProposal } from '@/hooks/useCommercialProposals';
import { decimalPrice,euro,validateProposalExport } from './commercialProposal';
const WIDTH=1654,HEIGHT=2339;
async function loadImage(url:string){const image=new Image();image.crossOrigin='anonymous';image.src=url;await image.decode();return image;}
export async function renderPosterPages(p:CommercialProposal,company:string){
 validateProposalExport(p);const pages:HTMLCanvasElement[]=[];const c=p.content;
 for(const r of c.rows){const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Esportazione immagine non disponibile');
 // Export-only print palette, independent of the application's dark theme.
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.fillStyle='#151b26';ctx.textAlign='center';
 const text=(value:string,y:number,size:number,bold=false,max=1414)=>{ctx.font=`${bold?'700':'400'} ${size}px Arial`;const words=value.split(/\s+/);let line='';for(const word of words){if(ctx.measureText(`${line} ${word}`).width>max&&line){ctx.fillText(line,WIDTH/2,y);y+=size*1.3;line=word;}else line+=`${line?' ':''}${word}`;}if(line){ctx.fillText(line,WIDTH/2,y);y+=size*1.3;}return y;};
 const fit=(image:HTMLImageElement,x:number,y:number,w:number,h:number)=>{const scale=Math.min(w/image.naturalWidth,h/image.naturalHeight);const iw=image.naturalWidth*scale,ih=image.naturalHeight*scale;ctx.drawImage(image,x+(w-iw)/2,y+(h-ih)/2,iw,ih);};
 if(c.logo){const logo=await loadImage(c.logo).catch(()=>{throw new Error('Logo non disponibile. Sostituiscilo prima di esportare.');});fit(logo,527,65,600,190);}
 let y=text(company,310,32);y=text(p.title,y+40,p.title.length>40?52:68,true);if(y>590)throw new Error('Titolo troppo lungo: abbrevialo per la locandina.');
 const product=await loadImage(r.image).catch(()=>{throw new Error(`Fotografia non disponibile: ${r.name}`);});fit(product,300,590,1054,780);
 y=text(r.name,1460,52,true);y=text([r.category,r.format].filter(Boolean).join(' · '),y+5,32);
 const offer=c.poster;const mode=offer?.mode||'price';
 if(mode!=='gift'){if(offer?.previous_price&&decimalPrice(offer.previous_price)!==null){ctx.font='32px Arial';const old=euro(decimalPrice(offer.previous_price)||0);ctx.fillText(old,WIDTH/2,y+15);const w=ctx.measureText(old).width;ctx.beginPath();ctx.moveTo((WIDTH-w)/2,y+4);ctx.lineTo((WIDTH+w)/2,y+4);ctx.stroke();y+=65;}y=text(euro(decimalPrice(r.price)||0),y+45,116,true);y=text(`/ ${r.unit} · IVA ${r.vat_mode}${r.vat_rate?` ${r.vat_rate}%`:''}`,y,30);}
 if(mode!=='price'&&offer){y=text(`Acquista ${offer.buy} cartoni e ricevi ${offer.gift} ${Number(offer.gift)===1?'cartone':'cartoni'} in omaggio`,y+20,46,true);const gift=c.rows.find(x=>x.product_id===offer.gift_product_id);if(gift)y=text(`In omaggio: ${gift.name}`,y,30);y=text(`Totale consegnato: ${Number(offer.buy)+Number(offer.gift)} cartoni`,y,28);}
 const conditions=[offer?.minimum?`Minimo: ${offer.minimum}`:'',p.valid_from||p.valid_until?`Validità: ${p.valid_from||'da concordare'} / ${p.valid_until||'da concordare'}`:'',offer?.conditions,c.notes].filter(Boolean).join(' · ');
 y=text(conditions,y+30,28);if(y>2185)throw new Error('Condizioni troppo lunghe per A4: abbreviale prima di esportare.');
 ctx.fillStyle='#334155';text('Agenzia Mazzi Group',2220,32,true);const contactEnd=text(c.contact,2270,26);if(contactEnd>2340)throw new Error('Contatti troppo lunghi per la locandina.');pages.push(canvas);
 }return pages;
}
export async function generatePosterPdf(p:CommercialProposal,company:string){const pages=await renderPosterPages(p,company);const doc=new jsPDF({format:'a4'});pages.forEach((canvas,i)=>{if(i)doc.addPage();doc.addImage(canvas.toDataURL('image/jpeg',.95),'JPEG',0,0,210,297);});return doc.output('blob');}
export async function downloadPosterImages(p:CommercialProposal,company:string){const pages=await renderPosterPages(p,company);for(const [i,canvas] of pages.entries()){const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('Immagine non generata');const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download=`AMG-${p.id.slice(0,8)}-${i+1}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);}}