// GymPro AI — Service Worker v1
const CACHE = 'gymglass-v1';

// ── Install ──
self.addEventListener('install', e => {
  self.skipWaiting();
});

// ── Activate ──
self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

// ── Timer State ──
let _timerTimeout = null;
let _timerEnd = 0;

// ── Messages from main thread ──
self.addEventListener('message', e => {
  const { type, seconds, endAt } = e.data || {};

  if (type === 'START_TIMER') {
    // إلغاء أي تايمر قديم
    if (_timerTimeout) clearTimeout(_timerTimeout);
    _timerEnd = endAt || (Date.now() + seconds * 1000);
    const remaining = Math.max(0, _timerEnd - Date.now());

    _timerTimeout = setTimeout(() => {
      // أرسل إشعار لما الوقت ينتهي
      self.registration.showNotification('⏰ انتهت الراحة!', {
        body: 'يلا شهاب! جهز السيت الجاي 💪',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [300, 100, 300, 100, 500],
        requireInteraction: true,
        tag: 'gym-timer',
        actions: [
          { action: 'open', title: '✅ فتح التطبيق' }
        ]
      });
      _timerEnd = 0;
      _timerTimeout = null;
    }, remaining);
  }

  if (type === 'STOP_TIMER') {
    if (_timerTimeout) {
      clearTimeout(_timerTimeout);
      _timerTimeout = null;
      _timerEnd = 0;
    }
  }

  // ping للتحقق من الحالة
  if (type === 'GET_STATUS') {
    const remaining = _timerEnd > 0 ? Math.max(0, Math.round((_timerEnd - Date.now()) / 1000)) : 0;
    e.source?.postMessage({ type: 'STATUS', remaining, endAt: _timerEnd });
  }
});

// ── Notification Click ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // لو التطبيق مفتوح — افتحه
      for (const c of list) {
        if (c.url.includes(self.location.origin)) return c.focus();
      }
      // لو مغلق — افتح تاب جديد
      return clients.openWindow(self.location.origin);
    })
  );
});
