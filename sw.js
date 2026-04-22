const CACHE_NAME = 'gympro-elite-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800;900&display=swap'
];

// [ميزة جديدة] - حفظ ملفات التطبيق في الـ Cache ليعمل بدون إنترنت
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// [ميزة جديدة] - مسح الـ Cache القديم عند تحديث التطبيق
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    })
  );
});

// [ميزة جديدة] - استراتيجية Cache First للملفات المحفوظة لضمان سرعة الفتح
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => caches.match('./index.html'));
    })
  );
});

// [ميزة جديدة] - إدارة المؤقت في الخلفية وإرسال الإشعارات
let timerTimeout = null;
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'START_TIMER') {
    const { seconds } = event.data;
    if (timerTimeout) clearTimeout(timerTimeout);
    
    // تشغيل المنبه بعد انتهاء الوقت
    timerTimeout = setTimeout(() => {
      self.registration.showNotification('⏰ انتهت الراحة!', {
        body: 'يلا يا بطل، ارجع للتمرين! ⚡',
        icon: 'https://cdn-icons-png.flaticon.com/512/2964/2964514.png',
        vibrate: [300, 100, 300, 100, 500],
        requireInteraction: true,
        tag: 'workout-timer'
      });
    }, seconds * 1000);
  }

  if (event.data && event.data.type === 'STOP_TIMER') {
    if (timerTimeout) clearTimeout(timerTimeout);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window' }).then(clientList => {
    for (const client of clientList) {
      if (client.url === '/' && 'focus' in client) return client.focus();
    }
    if (clients.openWindow) return clients.openWindow('/');
  }));
});
