/* Service Worker de Mi Panel.
   - Guarda en caché el "cascarón" de la app para que abra sin conexión.
   - NO intercepta pedidos a Google (otros orígenes): la API de Calendar siempre va directo a la red.
   - Actualización: una versión nueva queda "en espera" hasta que el usuario toca "Actualizar" (así nunca
     se queda atrapado en una versión vieja ni se recarga en medio de una carga de datos).
   Al publicar cambios, subí VERSION. */
const VERSION = 'mi-panel-1.3.1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'config.js', 'guia.html', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k.startsWith('mi-panel-')).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    // Páginas: red primero (para ver cambios), caché si no hay conexión
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return r; }).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
    return;
  }
  // Recursos: caché primero y se refresca en segundo plano
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
