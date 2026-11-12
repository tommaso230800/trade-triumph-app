/* Notifiche push AMG. Solo push e apertura: nessuna cache, l'app resta sempre aggiornata. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

function receipt(data, evento) {
  if (!data || !data.receipt || !data.delivery || !data.token) return Promise.resolve();
  return fetch(data.receipt, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delivery: data.delivery, token: data.token, evento: evento }),
  }).catch(() => undefined);
}

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'AMG HORECA';
  const shown = self.registration.showNotification(title, {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || undefined,
    data: { url: data.url || '/notifiche', delivery: data.delivery, token: data.token, receipt: data.receipt },
  });
  event.waitUntil(Promise.all([shown, receipt(data, 'ricevuta')]));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const target = new URL(data.url || '/notifiche', self.location.origin).href;
  event.waitUntil((async () => {
    receipt(data, 'aperta');
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      await client.focus();
      try { if ('navigate' in client) { await client.navigate(target); return; } } catch (e) { /* fallback below */ }
      client.postMessage({ type: 'amg-open', url: target });
      return;
    }
    await self.clients.openWindow(target);
  })());
});
