(function () {
  "use strict";

  var BASE =
    "https://cdn.jsdelivr.net/gh/yasinenes92/tw-scripts@main/Yaver-Resources/Resource%20Orchestrator/modules/";
  var FILES = [
    "00_bootstrap_ro_v7.js",
    "10_data_ro_v7.js",
    "20_fetch_ro_v7.js",
    "30_compute_ro_v7.js",
    "40_ui_ro_v7.js",
    "50_main_ro_v7.js"
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
    console.log("[YRO Loader v7] loading:", url);
    return new Promise(function (res, rej) {
      $.ajax({ url: url, dataType: "script", cache: false, timeout: 30000 })
        .done(function () {
          console.log("[YRO Loader v7] OK:", f);
          res(true);
        })
        .fail(function (jq, st, er) {
          console.log("[YRO Loader v7] FAIL:", f, { st: st, er: er, http: jq && jq.status });
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

      for (var i = 0; i < FILES.length; i++) await loadOne(FILES[i]);

      var KEY = "__YAVER_RESOURCE_ORCHESTRATOR_V7__";
      if (window[KEY] && typeof window[KEY].init === "function") {
        window[KEY].init();
        if (window.UI && UI.SuccessMessage) UI.SuccessMessage("Resource Orchestrator v7 Hazır ✅", 2000);
      } else {
        alert("YRO init (v7) bulunamadı.");
      }
    } catch (e) {
      console.error("[YRO Loader v7] ERROR:", e);
      if (window.UI && UI.ErrorMessage) UI.ErrorMessage("Resource Orchestrator v7 yüklenemedi ❌ (Console'a bak)", 6000);
      else alert("Yüklenemedi (Console'a bak).");
    }
  })();
})();
