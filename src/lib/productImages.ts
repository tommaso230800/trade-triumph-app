import bio from '@/assets/polara/limonata-bio.asset.json';
import bitter from '@/assets/polara/bitter-lemon.asset.json';
// Official producer photographs, matched to exact existing catalog IDs and formats.
const official:Record<string,string>={
 'bd386822-9a77-4539-a4fa-28a495f5ab6f':bio.url,
 'dc410fa1-74fe-413c-b875-e580368e0c98':bitter.url,
};
export const productImage=(product:{id:string;immagine_url?:string|null})=>product.immagine_url||official[product.id]||'';