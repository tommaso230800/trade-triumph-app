export async function spreadsheetText(file:File){const XLSX=await import('xlsx');const workbook=XLSX.read(await file.arrayBuffer(),{type:'array'});return workbook.SheetNames.map(name=>`${name}\n${XLSX.utils.sheet_to_csv(workbook.Sheets[name])}`).join('\n').slice(0,180000);}

export const isWordFile=(name:string)=>/\.docx$/i.test(name);

/** Reads one entry from a ZIP archive (stored or deflate) using the browser's native decompression. */
async function readZipEntry(buf:ArrayBuffer,entry:string):Promise<string|null>{
  const v=new DataView(buf);const bytes=new Uint8Array(buf);
  let eocd=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){if(v.getUint32(i,true)===0x06054b50){eocd=i;break;}}
  if(eocd<0)return null;
  const count=v.getUint16(eocd+10,true);let p=v.getUint32(eocd+16,true);const dec=new TextDecoder();
  for(let n=0;n<count;n++){
    if(v.getUint32(p,true)!==0x02014b50)return null;
    const method=v.getUint16(p+10,true),csize=v.getUint32(p+20,true),nl=v.getUint16(p+28,true),el=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),off=v.getUint32(p+42,true);
    const name=dec.decode(bytes.subarray(p+46,p+46+nl));
    if(name===entry){
      const start=off+30+v.getUint16(off+26,true)+v.getUint16(off+28,true);const data=bytes.slice(start,start+csize);
      if(method===0)return dec.decode(data);
      if(method!==8)return null;
      const stream=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return await new Response(stream).text();
    }
    p+=46+nl+el+cl;
  }
  return null;
}

/** Plain text of a .docx (paragraphs, tables), without inventing content. */
export async function wordText(file:File){
  const xml=await readZipEntry(await file.arrayBuffer(),'word/document.xml');
  if(!xml)return '';
  return xml.replace(/<w:tab\/>/g,'\t').replace(/<\/w:tc>/g,'\t').replace(/<w:br\/>|<\/w:p>|<\/w:tr>/g,'\n').replace(/<[^>]+>/g,'')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'")
    .replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim().slice(0,180000);
}
