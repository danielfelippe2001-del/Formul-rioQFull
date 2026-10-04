const CACHE_NAME = 'qualificacao-v34';
const ASSETS = [
  './',
  './index.html',
  './xlsx.full.min.js',
  './manifest.webmanifest',
  './sw.js',
  './logo.png',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png',
  './apple-touch-icon.png',
  './library.excalidrawlib'
];

// Instala e força o cache de tudo
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.log('Cache parcial:', err);
        // Tenta um por um se o addAll falhar
        return Promise.all(
          ASSETS.map((url) => cache.add(url).catch(() => null))
        );
      });
    })
  );
  self.skipWaiting();
});

// Ativa e limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estratégia: cache primeiro, depois rede
self.addEventListener('fetch', (event) => {
  // Só trata pedidos GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Atualiza em segundo plano se possível
        fetch(event.request).then((response) => {
          if (response && response.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, response.clone());
            });
          }
        }).catch(() => {});
        return cached;
      }

      return fetch(event.request).then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        // Offline e sem cache → tenta a página principal
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
