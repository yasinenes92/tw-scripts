(function () {
  "use strict";

  // NOTE: GitHub klasör adında boşluk var: "Resource Orchestrator"
  // jsDelivr URL'inde %20 kullanıyoruz.
  var BASE =
    "https://cdn.jsdelivr.net/gh/yasinenes92/tw-scripts@main/Yaver-Resources/Resource%20Orchestrator/modules/";
  var FILES = [
    "00_bootstrap_ro_v1.js",
    "10_data_ro_v1.js",
    "20_fetch_ro_v1.js",
    "30_compute_ro_v1.js",
    "40_ui_ro_v1.js",
    "50_main_ro_v1.js"
  ];

  function bust(u) {
    return (
      u +
      (u.indexOf("?") >= 0 ? "&" : "?") +
      "v=" +
      Date.now() +
      "_" +
      Math.random().toString(16).slice(2)
    );
  }

  function loadOne(f) {
    var url = bust(BASE + f);
    console.log("[YRO Loader v1] loading:", url);
    return new Promise(function (res, rej) {
      $.ajax({
        url: url,
        dataType: "script",
        cache: false,
        timeout: 30000
      })
        .done(function () {
          console.log("[YRO Loader v1] OK:", f);
          res(true);
        })
        .fail(function (jq, st, er) {
          console.log("[YRO Loader v1] FAIL:", f, { st: st, er: er, http: jq && jq.status });
          rej(new Error("Load failed: " + f));
        });
    });
  }

  (async function () {
    try {
      if (typeof $ !== "function") {
        alert("jQuery ($) bulunamadı. Sayfa tam yüklenmeden çalıştırmış olabilirsin.");
        return;
      }

      for (var i = 0; i < FILES.length; i++) {
        await loadOne(FILES[i]);
      }

      var KEY = "__YAVER_RESOURCE_ORCHESTRATOR_V1__";
      if (window[KEY] && typeof window[KEY].init === "function") {
        window[KEY].init();
        if (window.UI && UI.SuccessMessage) UI.SuccessMessage("Resource Orchestrator v1 Hazır ✅", 2000);
      } else {
        alert("YRO init bulunamadı. Modüller yüklenmiş ama bootstrap tamamlanmamış olabilir.");
      }
    } catch (e) {
      console.error("[YRO Loader v1] ERROR:", e);
      if (window.UI && UI.ErrorMessage) UI.ErrorMessage("Resource Orchestrator yüklenemedi ❌ (Console'a bak)", 6000);
      else alert("Yüklenemedi (Console'a bak).");
    }
  })();
})();
