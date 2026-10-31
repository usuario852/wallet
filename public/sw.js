// Wallet 22 — service worker. Navegación: red primero (siempre la última
// versión); recursos con hash: caché primero. Avisos: igual que antes.
const CACHE = 'wallet-pwa-v23';
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && (k.startsWith('wallet-personal-pwa-') || k.startsWith('wallet-pwa-'))).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin !== self.location.origin) return;
  if (u.pathname.startsWith('/api/')) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then((r) => { const x = r.clone(); caches.open(CACHE).then((c) => c.put('/', x)); return r; }).catch(() => caches.match('/')));
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => { if (r.ok && (u.pathname.startsWith('/assets/') || u.pathname.startsWith('/brands/') || u.pathname.startsWith('/icons/'))) { const x = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, x)); } return r; })));
});
self.addEventListener('push', (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Wallet', { body: d.body || 'Tienes una actualización en Wallet.', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: d.tag || 'wallet', data: { url: d.url || '/' } }));
});
// Una notificación solo puede llevar a Wallet.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = (() => { try { const u = new URL((e.notification.data && e.notification.data.url) || '/', self.location.origin); return u.origin === self.location.origin ? u.href : self.location.origin + '/'; } catch (_) { return self.location.origin + '/'; } })();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => { for (const c of cs) { if ('focus' in c) { c.navigate(target).catch(() => {}); return c.focus(); } } return self.clients.openWindow && self.clients.openWindow(target); }));
});
