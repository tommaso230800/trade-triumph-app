export function graphLink(link: string): string {
  if (link.startsWith('/')) {
    if (!link.startsWith('/me/drive/') && !link.startsWith('/drives/')) throw new Error('Percorso OneDrive non valido');
    return link;
  }
  const url = new URL(link);
  if (url.protocol !== 'https:' || url.hostname !== 'graph.microsoft.com') throw new Error('Collegamento Microsoft non valido');
  return url.pathname.replace(/^\/v1\.0/, '') + url.search;
}
export function validName(name: string): boolean {
  return name.length > 0 && name.length <= 255 && !/["*:<>?\/\\|\x00-\x1f]/.test(name) && !/[. ]$/.test(name) && name !== '.' && name !== '..';
}
export function itemKey(user: string, drive: string, item: string) { return `${user}:${drive}:${item}`; }
export function nextCheckpoint(page: Record<string, unknown>) {
  const next = typeof page['@odata.nextLink'] === 'string' ? page['@odata.nextLink'] : null;
  const delta = typeof page['@odata.deltaLink'] === 'string' ? page['@odata.deltaLink'] : null;
  if (!next && !delta) throw new Error('Risposta delta priva di continuazione');
  return { next, delta, complete: !next && !!delta };
}
