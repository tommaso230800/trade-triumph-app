export const DEFAULT_ORDER_SUBJECT = 'Ordine {nome_cliente} – {data_del_giorno}';
export const DEFAULT_ORDER_BODY = '{saluto},\n\nin allegato ordine.\n\nAttendo conferma ordine.\n\n{chiusura}.\n\n{firma}';

export function romeEmailContext(name: string, signature: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const minutes = Number(parts.find(p => p.type === 'hour')?.value) * 60 + Number(parts.find(p => p.type === 'minute')?.value);
  const morning = minutes >= 360 && minutes <= 840;
  return { nome_cliente: name, data_del_giorno: new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric' }).format(now), saluto: morning ? 'Buongiorno' : 'Buonasera', chiusura: morning ? 'Buona giornata' : 'Buona serata', firma: signature };
}
export function renderEmailTemplate(template: string, context: ReturnType<typeof romeEmailContext>) {
  return template.replace(/\{(nome_cliente|data_del_giorno|saluto|chiusura|firma)\}/g, (_, key: keyof typeof context) => context[key]);
}
export function dynamicEmailTemplate(text: string, context: ReturnType<typeof romeEmailContext>) {
  let result = text;
  for (const key of ['firma', 'nome_cliente', 'data_del_giorno', 'saluto', 'chiusura'] as const) {
    if (context[key]) result = result.split(context[key]).join(`{${key}}`);
  }
  return result;
}
export function parseEmailAddresses(value: string) {
  return [...new Set(value.split(/[,;\n]+/).map(x => x.trim()).filter(Boolean))];
}
export function validEmailAddresses(values: string[]) {
  return values.every(x => /^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(x) && !/[\r\n]/.test(x));
}