(function () {
  // ===== SingleVillage Loader v5 =====
  // Amaç:
  // - Eğer scavenge sayfasında değilsek: aynı sekmede /place&mode=scavenge sayfasına git
  // - Eğer scavenge sayfasındaysak: modülleri yükle ve init çalıştır

  function isScavengePage() {
    try {
      if (window.game_data && game_data.screen === "place" && game_data.mode === "scavenge") return true;
    } catch (e) {}
    return (location.href.indexOf("screen=place") >= 0 && location.href.indexOf("mode=scavenge") >= 0);
  }

  function gotoScavengeSameTab() {
    try {
      var base = (window.game_data && game_data.link_base_pure) ? game_data.link_base_pure : "/game.php?&screen=";
      location.href = base + "place&mode=scavenge";
    } catch (e) {
      location.href = "/game.php?screen=place&mode=scavenge";
    }
  }

  // Sayfada değilsek yönlendir ve çık
  if (!isScavengePage()) {
    gotoScavengeSameTab();
    if (window.UI && UI.ErrorMessage) {
      UI.ErrorMessage("Scavenging sayfasına gidiliyor... Sayfa açılınca Quickbar'a tekrar bas.", 5000);
    }
    return;
  }

  // Sayfadaysak yükle
  var BASE = "https://cdn.jsdelivr.net/gh/yasinenes92/tw-scripts@main/Yaver-Scavenging/SingleVillage/modules/";
  var FILES = [
    "00_bootstrap_v2.js",
    "10_dom_gamebridge_v2.js",
    "20_math_planner_v3.js",
    "30_apply_inputs_v2.js",
    "40_ui_panel_v6.js",
    "50_main_v8.js"
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
        console.log("[YSS Loader v5] OK:", file);
        resolve(true);
      };
      s.onerror = function () {
        console.log("[YSS Loader v5] FAIL:", file, s.src);
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
        if (window.UI && UI.SuccessMessage) UI.SuccessMessage("Yaver Scav hazır ✅", 2000);
      } else {
        console.warn("[YSS Loader v5] __YSS_SINGLE_V2__.init bulunamadı.");
        if (window.UI && UI.ErrorMessage) UI.ErrorMessage("Yaver Scav yüklendi ama init bulunamadı (Console'a bak).", 5000);
      }
    } catch (e) {
      console.error("[YSS Loader v5] ERROR:", e);
      if (window.UI && UI.ErrorMessage) UI.ErrorMessage("Yaver Scav yüklenemedi ❌ (Console'a bak)", 6000);
      else alert("Yaver Scav yüklenemedi. Console'a bak.");
    }
  })();
})();
