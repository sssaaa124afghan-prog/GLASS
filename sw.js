const CACHE_NAME = 'gympro-elite-fast-v2';
const ASSETS_TO_CACHE =[
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800;900&display=swap'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

let timerTimeout;
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'START_TIMER') {
    clearTimeout(timerTimeout);
    const timeRemaining = event.data.endAt - Date.now();
    if (timeRemaining > 0) {
      timerTimeout = setTimeout(() => {
        self.registration.showNotification('⏰ انتهت الراحة!', {
          body: 'يلا يا وحش، ارجع للتمرين حالاً! 🦍',
          icon: 'https://cdn-icons-png.flaticon.com/512/2964/2964514.png',
          vibrate:[300, 100, 300, 100, 500],
          requireInteraction: true
        });
      }, timeRemaining);
    }
  } else if (event.data && event.data.type === 'STOP_TIMER') {
    clearTimeout(timerTimeout);
  }
});
