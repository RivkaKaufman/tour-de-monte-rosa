const CACHE = 'tmr-v1';
const TILE_RE = /tile\.(opentopomap\.org|openstreetmap\.org)/;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const isTile = TILE_RE.test(req.url);
  const isShell = req.url.startsWith(self.location.origin) || req.url.includes('cdnjs.cloudflare.com/ajax/libs/leaflet');
  if (!isTile && !isShell) return;
  event.respondWith(handle(req, isTile));
});

async function handle(req, isTile) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  if (cached) {
    // app shell: refresh in the background so updates still land; tiles: cache-first only, no need to re-fetch
    if (!isTile) fetch(req).then(res => res.ok && cache.put(req, res.clone())).catch(() => {});
    return cached;
  }
  try {
    const res = await fetch(req);
    if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
    return res;
  } catch (err) {
    return cached || new Response('', { status: 503, statusText: 'Offline and not cached' });
  }
}
