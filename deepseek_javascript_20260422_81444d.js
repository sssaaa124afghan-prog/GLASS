// Service Worker for GymPro AI Titan Elite
// الإصدار: 2.0.0
// يدعم التخزين المؤقت الذكي واستراتيجية Stale-While-Revalidate

const CACHE_NAME = 'gympro-cache-v2';
const DYNAMIC_CACHE = 'gympro-dynamic-v2';

// قائمة الموارد الأساسية التي سيتم تخزينها عند التثبيت
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  // سنقوم بتخزين الأيقونات (يجب أن تكون موجودة في المسارات المحددة)
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
];

// ==================== حدث التثبيت ====================
self.addEventListener('install', event => {
  console.log('[SW] تثبيت Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] تخزين الموارد الثابتة');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting()) // تفعيل فوري
  );
});

// ==================== حدث التفعيل ====================
self.addEventListener('activate', event => {
  console.log('[SW] تفعيل Service Worker...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
            console.log('[SW] حذف الكاش القديم:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ==================== استراتيجية الجلب ====================
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // تجاهل الطلبات غير GET أو التي تستهدف API خارجي (مثل Groq) أو طلبات Chrome الداخلية
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) {
    // السماح بمرور طلبات API الخارجية (مثل Groq) بدون تخزين مؤقت
    return;
  }

  // التعامل مع الصفحات (Navigate) – عرض صفحة offline عند عدم الاتصال
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match('/offline.html');
        })
    );
    return;
  }

  // للموارد الأخرى: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      const fetchPromise = fetch(request).then(networkResponse => {
        // تحديث الكاش بالنسخة الجديدة إذا كانت ناجحة
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(error => {
        console.warn('[SW] فشل جلب الشبكة، استخدام المخزن:', error);
      });

      // إعادة المخزن أولاً إن وجد، ثم انتظار الشبكة لتحديث الكاش
      return cachedResponse || fetchPromise;
    })
  );
});

// ==================== إشعارات الدفع (Push Notifications) ====================
self.addEventListener('push', event => {
  let data = { title: 'GymPro AI', body: 'حان وقت التمرين! 💪' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'فتح التطبيق' },
      { action: 'close', title: 'إغلاق' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// التعامل مع النقر على الإشعار
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url || '/');
        }
      })
  );
});

// ==================== تحديث الخلفية (Background Sync) ====================
// يمكن استخدامه لاحقاً لمزامنة البيانات عند عودة الاتصال
self.addEventListener('sync', event => {
  if (event.tag === 'sync-sessions') {
    event.waitUntil(
      // هنا يمكن إضافة منطق مزامنة الجلسات المحفوظة محلياً مع الخادم
      Promise.resolve()
    );
  }
});