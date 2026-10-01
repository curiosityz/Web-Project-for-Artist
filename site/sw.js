/* Offline-first shell for the ENEM archive. Bump CACHE_VERSION with releases. */
const CACHE_VERSION = 'enem-archive-v6';
const PRECACHE = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/app.js', './js/data.js', './js/fx.js', './js/gallery.js', './js/player.js', './js/merch.js', './js/spray.js', './js/doodle.js',
  './js/vendor/gsap.min.js', './js/vendor/ScrollTrigger.min.js',
  './assets/fonts/ArchivoBlack.ttf', './assets/fonts/PermanentMarker.woff2', './assets/fonts/SpaceGrotesk.ttf',
  './assets/icons/enem-192.png', './assets/icons/enem-512.png',
  './assets/art/album-cover.jpg', './assets/art/enem-black-orange-tdk.jpg', './assets/art/enem-buffalo-blue.jpg',
  './assets/art/enem-fua-bw.jpg', './assets/art/enem-grey-orange.jpg', './assets/art/enem-montana-process.jpg',
  './assets/art/enem-oakland-2016-doc.jpg', './assets/art/enem-pigs-blue.jpg', './assets/art/enem-process-session.jpg',
  './assets/art/enem-purple-yellow.jpg', './assets/art/enem-red-gold-wall.jpg', './assets/art/enem-shark-truck.jpg',
  './assets/art/enem-sketch-press.jpg', './assets/art/enem-smoke-bw.jpg', './assets/art/enem-teal-orange-philly.jpg',
  './assets/art/enem-teal-white.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await cache.addAll(PRECACHE);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('enem-archive-') && key !== CACHE_VERSION).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.endsWith('/ws')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_VERSION).then((cache) => cache.put('./index.html', copy));
      return response;
    }).catch(async () => (await caches.match('./index.html')) || Response.error()));
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_VERSION);
        cache.put(request, response.clone());
      }
      return response;
    } catch {
      return (await caches.match('./index.html')) || Response.error();
    }
  })());
});
