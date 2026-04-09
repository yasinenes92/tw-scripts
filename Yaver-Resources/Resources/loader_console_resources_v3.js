(function () {
  var BASE =
    "https://cdn.jsdelivr.net/gh/yasinenes92/tw-scripts@main/Yaver-Resources/Resources/modules/";
  var FILES = [
    "00_bootstrap_resources_v1.js",
    "10_data_resources_v1.js",
    "20_fetch_resources_v4.js",
    "30_compute_resources_v3.js",
    "40_ui_resources_v2.js",
    "50_main_resources_v2.js"
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
    console.log("[YRA Loader v3] loading:", url);
    return new Promise(function (res, rej) {
      $.ajax({
        url: url,
        dataType: "script",
        cache: false,
        timeout: 30000
      })
        .done(function () {
          console.log("[YRA Loader v3] OK:", f);
          res(true);
        })
        .fail(function (jq, st, er) {
          console.log("[YRA Loader v3] FAIL:", f, {
            st: st,
            er: er,
            http: jq && jq.status
          });
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

      var KEY = "__YAVER_RES_ANALYZER_V1__";
      if (window[KEY] && typeof window[KEY].init === "function") {
        window[KEY].init();
        if (window.UI && UI.SuccessMessage) {
          UI.SuccessMessage("Yaver Resources Analyzer v3 Hazır ✅", 2500);
        }
      } else {
        alert("YRA init bulunamadı. Modüller yüklenmiş ama bootstrap tamamlanmamış olabilir.");
      }
    } catch (e) {
      console.error("[YRA Loader v3] ERROR:", e);
      if (window.UI && UI.ErrorMessage) {
        UI.ErrorMessage("Yaver Resources Analyzer yüklenemedi ❌ (Console'a bak)", 6000);
      } else {
        alert("Yüklenemedi (Console'a bak).");
      }
    }
  })();
})();