const CACHE = "creator-intel-v2";

const PRECACHE = ["/", "/inbox", "/signals", "/dashboard", "/changelog", "/casestudy", "/readinglist", "/search", "/digest", "/alerts", "/stats", "/compare"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Skip API routes and Next.js internals — always network-first
  // /m 是手机伴侣版：cache-first 会返回旧外壳，影响演示与录屏，因此永不缓存。
  // 判定逻辑的真源在 src/lib/companion/nav.ts 的 isCompanionPath()——
  // 注意不能用 startsWith("/m")，桌面站的 /monitor 与 /method 也以它开头。
  // service worker 从 public/ 原样送出，无法 import src/，故此处重复一份。
  const isCompanion = url.pathname === "/m" || url.pathname.startsWith("/m/");
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/") || isCompanion) return;
  if (e.request.method !== "GET") return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone)).catch(() => {});
        }
        return res;
      }).catch(() => cached ?? new Response("Offline", { status: 503 }));
    })
  );
});
