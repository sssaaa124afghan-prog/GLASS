/* =========================================
   GymPro AI Titan Elite - Advanced SW v5
   Updated: AI Coach per-set, Session Plan,
   Smart Progression, Weekly Challenge,
   Form Phases (18 categories, 30+ exercises)
========================================= */

const CACHE_VERSION = "gympro-elite-v5";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

const STATIC_ASSETS = [
  "./",
  "./GymPro_v12_fixed.html",
  "./manifest.json",
  "./icon.svg",
  "./sw.js"
];

/* =========================================
   INSTALL
========================================= */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

/* =========================================
   ACTIVATE — حذف الكاشات القديمة
========================================= */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* =========================================
   FETCH STRATEGY
========================================= */
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  // استثناء Groq API و CDN خارجي من الـ cache
  if (
    request.url.includes("groq.com") ||
    request.url.includes("anthropic.com") ||
    request.url.includes("googleapis.com")
  ) return;

  // HTML → Network First (عشان دايماً يحمّل آخر نسخة)
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request).then(r => r || new Response("Offline", {status: 503})))
    );
    return;
  }

  // Static files → Cache First
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
        }
        return res;
      }).catch(() => cached || new Response("", {status: 503}));
    })
  );
});

/* =========================================
   BACKGROUND REST TIMER
========================================= */
let timerTimeout = null;
let timerEnd = 0;

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === "START_TIMER") {
    clearTimeout(timerTimeout);
    timerEnd = data.endAt || (Date.now() + (data.seconds || 90) * 1000);
    const remaining = Math.max(0, timerEnd - Date.now());
    timerTimeout = setTimeout(() => {
      self.registration.showNotification("⏰ الراحة انتهت", {
        body: "يلا يا شهاب 💪 ارجع كمل التمرين!",
        icon: "./icon.svg",
        badge: "./icon.svg",
        vibrate: [300, 100, 300, 100, 500],
        requireInteraction: true,
        tag: "rest-timer",
        renotify: true
      });
      timerEnd = 0;
      timerTimeout = null;
    }, remaining);
  }

  if (data.type === "STOP_TIMER") {
    clearTimeout(timerTimeout);
    timerTimeout = null;
    timerEnd = 0;
  }

  if (data.type === "GET_STATUS") {
    const remaining = timerEnd > 0
      ? Math.max(0, Math.round((timerEnd - Date.now()) / 1000))
      : 0;
    event.source?.postMessage({ type: "STATUS", remaining, endAt: timerEnd });
  }
});

/* =========================================
   PUSH SUPPORT
========================================= */
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {
    title: "GymPro AI 💪",
    body: "🔥 مستعد لتمرين جديد يا شهاب؟"
  };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "./icon.svg",
      badge: "./icon.svg",
      vibrate: [200, 100, 200]
    })
  );
});

/* =========================================
   NOTIFICATION CLICK
========================================= */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      const existing = cs.find(c => c.url && c.visibilityState !== "hidden");
      if (existing) return existing.focus();
      return clients.openWindow("./GymPro_v12_fixed.html");
    })
  );
});
