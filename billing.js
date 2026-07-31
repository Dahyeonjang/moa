// 모여셈 — Google Play 결제 어댑터
//
// index.html은 window.moaBilling 의 세 가지 함수만 씁니다.
//   check()    → Promise<boolean>  이 계정이 프로를 샀는가
//   purchase() → Promise<boolean>  결제창을 띄우고 결과를 돌려준다
//   restore()  → Promise<boolean>  구매 기록을 다시 확인한다
//
// 웹(브라우저)에는 결제 플러그인이 없으므로 이 파일은 아무것도 하지 않습니다.
// 앱(Capacitor + cordova-plugin-purchase)에서만 window.moaBilling 이 만들어집니다.

(function () {
  "use strict";

  var PRODUCT_ID = "moyeosem_pro";   // Play Console에 등록할 상품 ID (한 번 정하면 못 바꿉니다)
  var PLUGIN_TIMEOUT = 10000;        // 플러그인이 안 뜨면 이만큼 기다렸다 포기

  var isNative = false;
  try {
    isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  } catch (e) {}

  if (!isNative) return;   // 웹이면 여기서 끝. index.html이 알아서 결제 없이 동작합니다

  // cordova 플러그인 JS는 deviceready 이후에 준비되므로 기다렸다 잡는다
  function whenPluginReady() {
    return new Promise(function (resolve, reject) {
      if (typeof CdvPurchase !== "undefined") return resolve();

      var done = false;
      var finish = function (ok) {
        if (done) return;
        done = true;
        if (ok && typeof CdvPurchase !== "undefined") resolve();
        else reject(new Error("결제 기능을 불러오지 못했어요"));
      };

      document.addEventListener("deviceready", function () { finish(true); }, { once: true });
      setTimeout(function () { finish(true); }, PLUGIN_TIMEOUT);
    });
  }

  var readyPromise = null;

  function ready() {
    if (readyPromise) return readyPromise;

    readyPromise = whenPluginReady().then(function () {
      var store = CdvPurchase.store;

      store.register([{
        id: PRODUCT_ID,
        type: CdvPurchase.ProductType.NON_CONSUMABLE,   // 한 번 사면 끝. 구독 아님
        platform: CdvPurchase.Platform.GOOGLE_PLAY
      }]);

      // 서버 검증 없이 기기 안에서만 처리한다 (모여셈은 서버가 없습니다)
      store.when().approved(function (transaction) {
        transaction.finish();
      });

      store.error(function (err) {
        // 결제 취소는 오류가 아니라 정상 흐름이므로 조용히 넘긴다
        if (err && err.code === CdvPurchase.ErrorCode.PAYMENT_CANCELLED) return;
        console.warn("[moaBilling]", err && err.message ? err.message : err);
      });

      return store.initialize([CdvPurchase.Platform.GOOGLE_PLAY]);
    });

    // 한 번 실패해도 다음 버튼 클릭 때 다시 시도할 수 있게 초기화한다
    readyPromise.catch(function () { readyPromise = null; });

    return readyPromise;
  }

  function product() {
    return CdvPurchase.store.get(PRODUCT_ID, CdvPurchase.Platform.GOOGLE_PLAY);
  }

  function owned() {
    try {
      var p = product();
      return !!(p && p.owned);
    } catch (e) {
      return false;
    }
  }

  window.moaBilling = {
    // 앱을 켤 때 호출. 기기를 바꿔도 같은 구글 계정이면 여기서 프로가 살아난다
    check: function () {
      return ready().then(owned);
    },

    // "프로 사용하기" 버튼
    purchase: function () {
      return ready().then(function () {
        var p = product();
        if (!p) throw new Error("상품 정보를 불러오지 못했어요");
        if (p.owned) return true;                 // 이미 산 경우

        var offer = p.getOffer();
        if (!offer) throw new Error("상품 정보를 불러오지 못했어요");

        return offer.order().then(function (err) {
          // order()는 실패 시 에러 객체를 '반환'한다 (throw 하지 않음)
          if (err) {
            if (err.code === CdvPurchase.ErrorCode.PAYMENT_CANCELLED) return false;
            throw new Error(err.message || "결제를 마치지 못했어요");
          }
          return owned();
        });
      });
    },

    // "이미 구매했어요 (구매 복원)" 버튼
    restore: function () {
      return ready()
        .then(function () { return CdvPurchase.store.restorePurchases(); })
        .then(owned);
    }
  };
})();
