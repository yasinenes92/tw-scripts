(function () {
  var BASE = "https://cdn.jsdelivr.net/gh/yasinenes92/tw-scripts@main/Yaver-Resources/Troops/modules/";
  var FILES = [
    "00_bootstrap_troops_v4.js",
    "10_data_troops_v3.js",
    "20_fetch_recruit_troops_v3.js",
    "30_compute_troops_v3.js",
    "40_ui_troops_v8.js",
    "50_main_troops_v3.js"
  ];

  function bust(u) {
    return u + (u.indexOf("?") >= 0 ? "&" : "?") + "v=" + Date.now() + "_" + Math.random().toString(16).slice(2);
  }

  function loadOne(f) {
    var url = bust(BASE + f);
    console.log("[YRT Troops Loader v8] loading:", url);
    return new Promise(function (res, rej) {
      $.ajax({ url: url, dataType: "script", cache: false, timeout: 30000 })
        .done(function () { console.log("[YRT Troops Loader v8] OK:", f); res(true); })
        .fail(function (jq, st, er) {
          console.log("[YRT Troops Loader v8] FAIL", { file: f, status: st, err: er, http: jq && jq.status, url: url });
          console.log("[YRT Troops Loader v8] head:", ((jq && jq.responseText) || "").slice(0, 200));
          rej(new Error("Load failed: " + f));
        });
    });
  }

  (async function () {
    try {
      if (typeof $ !== "function") {
        (window.UI && UI.ErrorMessage) ? UI.ErrorMessage("jQuery ($) not found.", 5000) : alert("jQuery missing");
        return;
      }
      for (var i = 0; i < FILES.length; i++) await loadOne(FILES[i]);

      if (window.__YAVER_RES_TROOPS_V1__ && typeof window.__YAVER_RES_TROOPS_V1__.init === "function") {
        window.__YAVER_RES_TROOPS_V1__.init();
        (window.UI && UI.SuccessMessage) && UI.SuccessMessage("Yaver Troop Counter Ready ✅ (v8)", 2000);
      } else {
        (window.UI && UI.ErrorMessage) && UI.ErrorMessage("Troops loaded but init not found (check Console).", 5000);
      }
    } catch (e) {
      console.error("[YRT Troops Loader v8] ERROR:", e);
      (window.UI && UI.ErrorMessage) ? UI.ErrorMessage("Troops failed to load ❌ (check Console)", 6000) : alert("Troops failed to load");
    }
  })();
})();
