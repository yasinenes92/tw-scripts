(function () {
  var BASE = "https://cdn.jsdelivr.net/gh/yasinenes92/tw-scripts@main/Yaver-Resources/Troops/modules/";
  var FILES = [
    "00_bootstrap_troops_v2.js",
    "10_data_troops_v1.js",
    "20_fetch_recruit_troops_v1.js",
    "30_compute_troops_v1.js",
    "40_ui_troops_v3.js",
    "50_main_troops_v1.js"
  ];

  function bust(u) {
    return u + (u.indexOf("?") >= 0 ? "&" : "?") + "v=" + Date.now() + "_" + Math.random().toString(16).slice(2);
  }

  function loadOne(f) {
    var url = bust(BASE + f);
    console.log("[YRT Troops Loader v3] loading:", url);
    return new Promise(function (res, rej) {
      $.ajax({ url: url, dataType: "script", cache: false, timeout: 30000 })
        .done(function () { console.log("[YRT Troops Loader v3] OK:", f); res(true); })
        .fail(function (jq, st, er) {
          console.log("[YRT Troops Loader v3] FAIL", { file: f, status: st, err: er, http: jq && jq.status, url: url });
          console.log("[YRT Troops Loader v3] head:", ((jq && jq.responseText) || "").slice(0, 200));
          rej(new Error("Load failed: " + f));
        });
    });
  }

  (async function () {
    try {
      if (typeof $ !== "function") {
        (window.UI && UI.ErrorMessage) ? UI.ErrorMessage("jQuery ($) bulunamadı.", 5000) : alert("jQuery yok");
        return;
      }

      for (var i = 0; i < FILES.length; i++) await loadOne(FILES[i]);

      if (window.__YAVER_RES_TROOPS_V1__ && typeof window.__YAVER_RES_TROOPS_V1__.init === "function") {
        window.__YAVER_RES_TROOPS_V1__.init();
        (window.UI && UI.SuccessMessage) && UI.SuccessMessage("Yaver Resources: Troops Hazır ✅ (v3)", 2000);
      } else {
        (window.UI && UI.ErrorMessage) && UI.ErrorMessage("Troops yüklendi ama init bulunamadı (Console'a bak).", 5000);
      }
    } catch (e) {
      console.error("[YRT Troops Loader v3] ERROR:", e);
      (window.UI && UI.ErrorMessage) ? UI.ErrorMessage("Troops yüklenemedi ❌ (Console'a bak)", 6000) : alert("Troops yüklenemedi");
    }
  })();
})();
