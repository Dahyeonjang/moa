// 솔담 구매코드 — 앱 쪽 한 파일 (2026-10-02 · 모여셈 웹 결제)
//
// 로그인 없이 「이메일 + 구매코드」로 프로를 연다. 결제 확인과 코드 발급은 결제 서버(api.soldamlab.com)가 한다.
// 이 파일에는 비밀값이 하나도 없다 — 포트원 상점 ID·채널 키(공개값)도 서버가 결제 때 내려준다.
//
// index.html이 쓰는 것:  window.soldamLicense.create(app, product) →
//   isActive()           이 기기에 살아 있는 구매코드가 있는가 (오프라인이면 마지막 확인 결과)
//   stored()             저장된 { code, kind, verifiedAt }
//   verifyCode(code)     코드 입력(기기 이동) → 서버 확인 → 맞으면 저장
//   recheck()            켤 때 한 번 다시 확인. 서버가 「꺼진 코드」라고 하면 지운다. 연결이 안 되면 그대로 둔다
//   price(legacy)        결제창에 띄울 지금 가격 (서버가 정한 값)
//   purchase({email, legacy})  결제 → 확인 → 코드 저장. { code } | { cancelled, message }
//   resumeRedirect()     모바일 결제창이 페이지를 넘겼다 돌아온 경우 마무리
//   exposure(place)      결제창이 뜬 횟수만 센다(개인정보 없음)
//
// 로컬 시험(localhost에서만): ?api=http://localhost:8787 로 서버 주소를 바꾸고, ?fakepay=1 이면 포트원 대신 모의 결제.

(function () {
  "use strict";

  var DEFAULT_API = "https://api.soldamlab.com";      // ⚠️ 결제 서버 배포 주소 (아직 없음)
  var SDK_URL = "https://cdn.portone.io/v2/browser-sdk.js";
  var TIMEOUT = 12000;

  var isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var params = new URLSearchParams(location.search);
  var API = (isLocal && params.get("api")) || DEFAULT_API;
  var FAKE_PAY = isLocal && params.get("fakepay") === "1";

  function readJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; }
  }
  function writeJson(key, v) {
    try { v == null ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(v)); } catch (e) {}
  }

  function call(method, path, body) {
    var ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, TIMEOUT);
    return fetch(API + path, {
      method: method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctl ? ctl.signal : undefined
    }).then(function (res) {
      clearTimeout(timer);
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) { var e = new Error(data.error || ("HTTP " + res.status)); e.status = res.status; e.data = data; throw e; }
        return data;
      });
    }, function (err) {
      clearTimeout(timer);
      var e = new Error("offline"); e.offline = true; e.cause = err; throw e;
    });
  }

  var sdkPromise = null;
  function loadSdk() {
    if (window.PortOne) return Promise.resolve(window.PortOne);
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = SDK_URL;
      s.onload = function () { window.PortOne ? resolve(window.PortOne) : reject(new Error("결제창을 불러오지 못했어요")); };
      s.onerror = function () { sdkPromise = null; reject(new Error("결제창을 불러오지 못했어요")); };
      document.head.appendChild(s);
    });
    return sdkPromise;
  }

  function create(app, product) {
    var KEY = app + "-license";
    var PENDING = app + "-pending-pay";

    function stored() { return readJson(KEY); }
    function isActive() { var s = stored(); return !!(s && s.code && s.status === "active"); }
    function save(r) {
      writeJson(KEY, { code: r.code, kind: r.kind || "purchase", status: "active", verifiedAt: new Date().toISOString() });
    }

    function verifyCode(code) {
      return call("POST", "/api/verify", { code: String(code || ""), product: product }).then(function (r) {
        if (r.valid) save(r);
        return r;
      });
    }

    function recheck() {
      var s = stored();
      if (!s || !s.code) return Promise.resolve(false);
      return call("POST", "/api/verify", { code: s.code, product: product }).then(function (r) {
        if (r.valid) { save(r); return true; }
        // 서버가 분명히 「아니다」라고 한 경우만 지운다(환불·잘못 발급). 연결 문제는 아래 catch로 간다
        writeJson(KEY, null);
        return false;
      }, function (err) {
        return isActive();   // 오프라인·서버 오류 → 마지막 확인 결과를 그대로 쓴다
      });
    }

    function price(legacy) {
      return call("GET", "/api/price?product=" + encodeURIComponent(product) + (legacy ? "&legacy=1" : ""));
    }

    function complete(paymentId) {
      return call("POST", "/api/complete", { paymentId: paymentId }).then(function (r) {
        writeJson(PENDING, null);
        save({ code: r.code, kind: "purchase" });
        return { code: r.code };
      });
    }

    function purchase(opt) {
      return call("POST", "/api/prepare", { product: product, email: opt.email, legacy: !!opt.legacy }).then(function (order) {
        writeJson(PENDING, { paymentId: order.paymentId, at: Date.now() });
        if (FAKE_PAY) {
          // 로컬 시험 전용: 결제창 대신 모의 서버에 「결제했다」고 알린다
          return call("POST", "/__mock/pay", { paymentId: order.paymentId }).then(function () { return complete(order.paymentId); });
        }
        return loadSdk().then(function (PortOne) {
          var back = location.origin + location.pathname;   // 모바일은 결제 후 이 주소로 돌아온다(?paymentId=…)
          return PortOne.requestPayment({
            storeId: order.storeId,
            channelKey: order.channelKey,
            paymentId: order.paymentId,
            orderName: order.orderName,
            totalAmount: order.amount,
            currency: "CURRENCY_KRW",
            payMethod: "CARD",
            customer: { email: opt.email },
            redirectUrl: back
          });
        }).then(function (resp) {
          if (resp && resp.code) {   // 실패·취소 — code가 있으면 실패다(포트원 문서)
            writeJson(PENDING, null);
            return { cancelled: true, message: resp.message || "" };
          }
          return complete(order.paymentId);
        });
      });
    }

    // 모바일: 결제창이 페이지를 통째로 넘겼다가 redirectUrl?paymentId=…&code=… 로 돌아온다.
    // 돌려주는 값: null(해당 없음) | { code } | { cancelled, message } | { error }
    function resumeRedirect() {
      var q = new URLSearchParams(location.search);
      var pid = q.get("paymentId");
      if (!pid) return Promise.resolve(null);
      var failCode = q.get("code");
      var msg = q.get("message") || "";
      // 주소창에서 결제 흔적을 지운다(새로고침해도 다시 돌지 않게)
      ["paymentId", "code", "message", "transactionType", "txId", "pgCode", "pgMessage"].forEach(function (k) { q.delete(k); });
      try { history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q.toString() : "") + location.hash); } catch (e) {}
      var pending = readJson(PENDING);
      if (!pending || pending.paymentId !== pid) return Promise.resolve(null);   // 이 기기에서 시작한 결제가 아니다
      if (failCode) { writeJson(PENDING, null); return Promise.resolve({ cancelled: true, message: msg }); }
      return complete(pid).catch(function (e) { return { error: e.message || "확인 실패" }; });
    }

    function exposure(place) {
      try {
        fetch(API + "/api/exposure", {
          method: "POST", keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ app: app, place: place })
        }).catch(function () {});
      } catch (e) {}
    }

    return {
      stored: stored, isActive: isActive, verifyCode: verifyCode, recheck: recheck,
      price: price, purchase: purchase, resumeRedirect: resumeRedirect, exposure: exposure,
      forget: function () { writeJson(KEY, null); }
    };
  }

  window.soldamLicense = { create: create, api: API, local: isLocal };
})();
