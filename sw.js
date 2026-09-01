// Club Beluga SW — cachea el shell y sirve offline tras la 1ª visita.
const CACHE = 'beluga-v12';
const CORE = ['./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(()=>{})); });
self.addEventListener('activate', e => { e.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
  await self.clients.claim();
})()); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;  // fotos de Google/externas: sin SW (las gestiona la caché normal del navegador)
  // Documento HTML (mismo origen): network-first, fallback a caché (offline).
  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('.html'))) {
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        const c = await caches.open(CACHE); c.put(req, net.clone()); return net;
      } catch (err) {
        const cached = await caches.match(req); if (cached) return cached;
        return caches.match('./index.html');
      }
    })());
    return;
  }
  // Fotos de Google y demás: stale-while-revalidate.
  e.respondWith((async () => {
    const cached = await caches.match(req);
    const fetching = fetch(req).then(net => { caches.open(CACHE).then(c => c.put(req, net.clone())); return net; }).catch(()=>cached);
    return cached || fetching;
  })());
});
