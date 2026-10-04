// 모여셈 서비스워커 — 오프라인 지원
// 캐시 버전을 올리면 예전 캐시를 비우고 새로 받는다
const CACHE = "moyeosem-v13";  // v13: 회비 없는 모임의 결제자 기본값 = 고르지 않음 · 가이드 무료 1개·글꼴 — 2026-10-04
// v12: 디자인 개편 B(기록 시트·지출|정산 탭·히어로·새 모임 시트·모임 메뉴) — 2026-10-04
// v11: 디자인 개편 A(Pretendard 실제 로드·토큰 정리·공유 미리보기·결제창 제목) — 2026-10-04
// ※ Pretendard(jsdelivr)는 아래 ASSETS에 넣지 않는다 — 설치 때 외부 주소 하나만 실패해도 서비스워커 설치가 통째로 깨진다.
//   대신 fetch 처리기가 처음 받을 때 캐시에 넣는다(index.html의 <link crossorigin> 덕에 정상 응답으로 저장된다).
//   그래서 한 번 온라인으로 연 기기는 비행기 모드에서도 같은 글꼴이 뜬다. 처음부터 오프라인이면 시스템 글꼴로 뜬다(앱은 멀쩡하다).
// v10: 웹 결제(구매코드·license.js, PAY_ENABLED=false로 잠듦) — 2026-10-02
// v9: 통화 찾기(나라·통화·코드로 찾으면 기호·이름 자동 채움) — 2026-10-02
// v8: 「🎁 제가 쏠게요」 + 지출 내역 보기 전환(항목별·날짜별·결제자별)·찾기 — 2026-09-16
// v7: 예산 알리기(온보딩 문구·예산 안내 카드·새 기능 한 줄·목록 🎯) — 2026-09-09
// v6: 예산 모임(찬조 부활·정산표 접기) + 회비 「모두 선택」 — 2026-09-09 (배포 전에 v7로 합쳐짐)
const ASSETS = [
  "./",
  "./index.html",
  "./license.js",
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
