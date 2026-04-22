// GymPro AI — Service Worker v3 (Merged)

const CACHE_NAME = 'gymglass-v3';
const CACHE_FILES = [
  './',
  './gymglass_final.html',
  './manifest.json',
  './icon.svg'
];

// ── Install ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_FILES).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => clients.claim())
  );
});

// ── Fetch (Offline Cache) ──
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('groq.com') || e.request.url.includes('anthropic.com')) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});

// ── Timer State ──
let _timerTimeout = null;
let _timerEnd = 0;

// ── Scheduled Notifications State ──
let _dailyTimeout = null;
let _missedTimeout = null;

// ── Helper: Fire Notification ──
function fireNotif(title, body, tag, required = false) {
  return self.registration.showNotification(title, {
    body,
    icon: './icon.svg',
    badge: './icon.svg',
    tag,
    requireInteraction: required,
    vibrate: [300, 100, 300, 100, 500],
    actions: [{ action: 'open', title: '🏋️ افتح التطبيق' }]
  });
}

// ── Helper: Cancel Scheduled Notifications ──
function cancelScheduled() {
  if (_dailyTimeout)  { clearTimeout(_dailyTimeout);  _dailyTimeout = null; }
  if (_missedTimeout) { clearTimeout(_missedTimeout); _missedTimeout = null; }
}

// ── Schedule Daily & Missed Workout Notifications ──
function scheduleDailyNotif(schedule, lastWorkout) {
  cancelScheduled();
  if (!schedule?.length) return;

  const now = new Date();

  // إشعار صباحي الساعة 8
  const morning = new Date();
  morning.setHours(8, 0, 0, 0);
  if (morning <= now) morning.setDate(morning.getDate() + 1);

  _dailyTimeout = setTimeout(() => {
    const dow = new Date().getDay();
    const s = schedule[dow];
    if (s?.type === 'train') {
      fireNotif('🏋️ النهارده تمرين يا شهاب!', `${s.label} — جاهز تحطم الأوزان؟ 💪`, 'daily-train');
    } else {
      fireNotif('😴 النهارده راحة يا شهاب', `${s?.label || 'يوم راحة'} — جسمك بيبني عضلة 🌙`, 'daily-rest');
    }
    scheduleDailyNotif(schedule, lastWorkout);
  }, morning - now);

  // إشعار الساعة 7 مساءً لو فات التمرين
  const todayDow = now.getDay();
  const todaySched = schedule[todayDow];
  if (lastWorkout && todaySched?.type === 'train') {
    const daysSince = Math.floor((now - new Date(lastWorkout)) / 86400000);
    if (daysSince >= 1) {
      const evening = new Date();
      evening.setHours(19, 0, 0, 0);
      if (evening > now) {
        _missedTimeout = setTimeout(() => {
          fireNotif('👀 فاتك التمرين يا شهاب!', `${todaySched.label} — لسه وقت تعوضه 🔥`, 'missed-workout');
        }, evening - now);
      }
    }
  }
}

// ── Messages from Main Thread ──
self.addEventListener('message', e => {
  const { type, seconds, endAt, schedule, lastWorkout } = e.data || {};

  if (type === 'START_TIMER') {
    if (_timerTimeout) clearTimeout(_timerTimeout);
    _timerEnd = endAt || (Date.now() + seconds * 1000);
    _timerTimeout = setTimeout(() => {
      fireNotif('⏰ انتهت الراحة!', 'يلا شهاب! جهز السيت الجاي 💪', 'timer', true);
      _timerEnd = 0;
      _timerTimeout = null;
    }, Math.max(0, _timerEnd - Date.now()));
  }

  if (type === 'STOP_TIMER') {
    if (_timerTimeout) {
      clearTimeout(_timerTimeout);
      _timerTimeout = null;
      _timerEnd = 0;
    }
  }

  if (type === 'GET_STATUS') {
    const remaining = _timerEnd > 0 ? Math.max(0, Math.round((_timerEnd - Date.now()) / 1000)) : 0;
    e.source?.postMessage({ type: 'STATUS', remaining, endAt: _timerEnd });
  }

  if (type === 'SCHEDULE_DAILY') {
    scheduleDailyNotif(schedule, lastWorkout);
  }

  if (type === 'CANCEL_NOTIFS') {
    cancelScheduled();
  }
});

// ── Notification Click ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin)) return c.focus();
      }
      return clients.openWindow('./gymglass_final.html');
    })
  );
});
