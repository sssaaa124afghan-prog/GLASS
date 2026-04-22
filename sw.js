/* =========================================
   GymPro AI Titan Elite - Advanced SW v3
========================================= */

const CACHE_VERSION = "gympro-elite-v3";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json"
];

/* =========================================
   INSTALL
========================================= */
self.addEventListener("install", (event) => {
  console.log("✅ SW Installing...");
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

/* =========================================
   ACTIVATE
========================================= */
self.addEventListener("activate", (event) => {
  console.log("✅ SW Activated");

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (!key.startsWith(CACHE_VERSION)) {
            console.log("🧹 Removing old cache:", key);
            return caches.delete(key);
          }
        })
      )
    )
  );

  self.clients.claim();
});

/* =========================================
   FETCH STRATEGY
========================================= */
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  // HTML → Network First
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, clone);
          });
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static files → Cache First
  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached ||
        fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, clone);
          });
          return res;
        })
      );
    })
  );
});

/* =========================================
   BACKGROUND REST TIMER
========================================= */
let timerTimeout = null;

self.addEventListener("message", (event) => {
  const data = event.data;

  if (data?.type === "START_TIMER") {
    clearTimeout(timerTimeout);

    const duration = data.seconds * 1000;

    timerTimeout = setTimeout(() => {
      self.registration.showNotification("⏰ الراحة انتهت", {
        body: "يلا يا شهاب 💪 ارجع كمل التمرين",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        vibrate: [300, 100, 300],
        requireInteraction: true
      });
    }, duration);
  }

  if (data?.type === "STOP_TIMER") {
    clearTimeout(timerTimeout);
  }
});

/* =========================================
   PUSH SUPPORT
========================================= */
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {
    title: "GymPro AI",
    body: "🔥 مستعد لتمرين جديد؟"
  };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png"
    })
  );
});

/* =========================================
   NOTIFICATION CLICK
========================================= */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
