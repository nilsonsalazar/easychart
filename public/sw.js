// public/sw.js
const CACHE_NAME = 'easychart-v1';

self.addEventListener('install', (e) => {
    console.log('[Service Worker] Instalado correctamente');
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    console.log('[Service Worker] Activado');
    return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    // Manejo básico de peticiones de red
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});