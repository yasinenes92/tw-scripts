(function () {
  var BASE = "https://cdn.jsdelivr.net/gh/yasinenes92/tw-scripts@main/Yaver-Scavenging/SingleVillage/modules/";
  var FILES = [
    "00_bootstrap_v2.js",
    "10_dom_gamebridge_v2.js",
    "20_math_planner_v2.js",
    "30_apply_inputs_v2.js",
    "40_ui_panel_v3.js",
    "50_main_v3.js"
  ];

  function bust(url) {
    var sep = (url.indexOf("?") >= 0) ? "&" : "?";
    return url + sep + "v=" + Date.now() + "_" + Math.random().toString(16).slice(2);
  }

  function loadOne(file) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = bust(BASE + file);
      s.onload = function () {
        console.log("[YSS Loader v3] OK:", file);
        resolve(true);
      };
      s.onerror = function () {
        console.log("[YSS Loader v3] FAIL:", file, s.src);
        reject(new Error("Load failed: " + file));
      };
      document.head.appendChild(s);
    });
  }

  (async function () {
    try {
      for (var i = 0; i < FILES.length; i++) await loadOne(FILES[i]);

      if (window.__YSS_SINGLE_V2__ && typeof window.__YSS_SINGLE_V2__.init === "function") {
        window.__YSS_SINGLE_V2__.init();
      } else {
        console.warn("[YSS Loader v3] __YSS_SINGLE_V2__.init bulunamadı.");
      }
    } catch (e) {
      console.error("[YSS Loader v3] ERROR:", e);
      if (window.UI && UI.ErrorMessage) UI.ErrorMessage("Yaver Scav yüklenemedi ❌ (Console'a bak)", 6000);
      else alert("Yaver Scav yüklenemedi. Console'a bak.");
    }
  })();
})();
