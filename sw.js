// 모여셈 서비스워커 — 오프라인 지원
// 캐시 버전을 올리면 예전 캐시를 비우고 새로 받는다
const CACHE = "moyeosem-v7";   // v7: 예산 알리기(온보딩 문구·예산 안내 카드·새 기능 한 줄·목록 🎯) — 2026-09-09
// v6: 예산 모임(찬조 부활·정산표 접기) + 회비 「모두 선택」 — 2026-09-09 (배포 전에 v7로 합쳐짐)
const ASSETS = [
  "./",
  "./index.html",
  "./guide.html",
  "./privacy.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 네트워크 우선 → 실패(오프라인)하면 캐시에서 (온라인일 땐 항상 최신, 비행기 모드에서도 열림)
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
  );
});
