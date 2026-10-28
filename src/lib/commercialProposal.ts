export type ProposalRow = { product_id: string; category: string; name: string; format: string; description: string; image: string; price: string; unit: string; vat_mode: string; vat_rate: string; notes: string };
export type ProposalPromotion = { title: string; product_ids: string[]; buy: string; gift: string; minimum: string; unit: string; start: string; end: string; periods: string; months: string; notes: string };
export type ProposalReward = { description: string; value: string; unit: string; threshold: string };
export type ProposalContent = { rows: ProposalRow[]; promotions: ProposalPromotion[]; rewards: ProposalReward[]; reward_rules: string; loading: string; payment: string; discounts: string; notes: string; contact: string; logo: string; show_images: boolean; attachment_ids: string[] };
export const emptyProposalContent = (): ProposalContent => ({ rows: [], promotions: [], rewards: [], reward_rules: '', loading: '', payment: '', discounts: '', notes: '', contact: 'Tommaso Salti · Agenzia Mazzi Group · 331 7328488', logo: '', show_images: false, attachment_ids: [] });
export const euro = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
export const todayRome = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(new Date());
export function proposalStatus(p: { status: string; valid_until: string | null }, today = todayRome()) { return p.status !== 'accettata' && p.status !== 'rifiutata' && p.valid_until && p.valid_until < today ? 'scaduta' : p.status; }
export function normalizedProposalPrice(row: ProposalRow, product: { pezzi_per_cartone: number; cartoni_per_strato: number; strati: number }) {
 const factors: Record<string, number> = { pezzo: 1, cartone: product.pezzi_per_cartone, strato: product.pezzi_per_cartone * product.cartoni_per_strato, pallet: product.pezzi_per_cartone * product.cartoni_per_strato * product.strati };
 const count = factors[row.unit]; const price = Number(row.price); const vat = Number(row.vat_rate);
 if (!count || count < 0 || row.price === '' || !Number.isFinite(price) || price < 0 || !['esclusa','inclusa'].includes(row.vat_mode) || row.vat_rate === '' || !Number.isFinite(vat) || vat < 0) return null;
 return price / count / (row.vat_mode === 'inclusa' ? 1 + vat / 100 : 1);
}
export function potentialReward(rewards: ProposalReward[], cumulative: boolean) {
 if (!cumulative || rewards.some(r => r.unit !== 'percentuale')) return null;
 return rewards.reduce((s,r) => s + Number(r.value || 0), 0);
}