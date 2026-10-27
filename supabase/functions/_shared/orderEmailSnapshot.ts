export const ORDER_EMAIL_SELECT = '*, clienti(*), aziende(*), ordini_righe(*, prodotti(*, brands(name)))';

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
  return value;
}
export async function orderEmailVersion(order: unknown): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(canonical(order))));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}