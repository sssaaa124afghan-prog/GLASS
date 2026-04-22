const CACHE_NAME = 'gympro-elite-full-v1';
const ASSETS_TO_CACHE =[
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800;900&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
        })
      );
    })
  );
  self.clients.claim();
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
          body: 'يلا يا بطل ارجع للتمرين! 💪',
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
```
