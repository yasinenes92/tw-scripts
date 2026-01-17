(function () {
  // Eğer mass scav sayfasında değilsek: aynı sekmede oraya git.
  // Sayfa değişince JS devam edemeyeceği için, sayfa açılınca tekrar Quickbar'a basman gerekir.
  try {
    if (!(window.game_data && game_data.screen === "place" && game_data.mode === "scavenge_mass")) {
      var base = (window.game_data && game_data.link_base_pure) ? game_data.link_base_pure : "/game.php?&screen=";
      location.href = base + "place&mode=scavenge_mass";
      if (window.UI && UI.ErrorMessage) UI.ErrorMessage("Mass Scavenging sayfasına gidiliyor... Sayfa açılınca Quickbar'a tekrar bas.", 5000);
      return;
    }
  } catch (e) {}

  var BASE = "https://cdn.jsdelivr.net/gh/yasinenes92/tw-scripts@main/Yaver-Scavenging/MassScav/modules/";
  var FILES = [
    "00_bootstrap_mass_v1.js",
    "10_data_mass_v1.js",
    "20_planner_mass_v1.js",
    "30_sender_mass_v2.js",
    "40_ui_mass_v3.js",
    "50_main_mass_v2.js"
  ];

  function bust(u) {
    return u + (u.indexOf("?") >= 0 ? "&" : "?") + "v=" + Date.now() + "_" + Math.random().toString(16).slice(2);
  }

  function loadOne(f) {
    var url = bust(BASE + f);
    console.log("[YaverMassLoader v3] loading:", url);
    return new Promise(function (res, rej) {
      $.ajax({ url: url, dataType: "script", cache: false, timeout: 25000 })
        .done(function () { res(true); })
        .fail(function (jq, st, er) {
          console.log("[YaverMassLoader v3] FAIL", { file: f, status: st, err: er, http: jq && jq.status, url: url });
          console.log("[YaverMassLoader v3] head:", ((jq && jq.responseText) || "").slice(0, 200));
          rej(new Error("Load failed: " + f));
        });
    });
  }

  (async function () {
    try {
      if (typeof $ !== "function") {
        (window.UI && UI.ErrorMessage) ? UI.ErrorMessage("jQuery ($) bulunamadı.", 5000) : alert("jQuery ($) yok");
        return;
      }

      for (var i = 0; i < FILES.length; i++) await loadOne(FILES[i]);

      if (window.__YAVER_MASS_SCAV_V1__ && typeof window.__YAVER_MASS_SCAV_V1__.init === "function") {
        window.__YAVER_MASS_SCAV_V1__.init();
      }

      (window.UI && UI.SuccessMessage) && UI.SuccessMessage("Yaver Mass Scav v3 Hazır ✅", 2000);
    } catch (e) {
      (window.UI && UI.ErrorMessage) ? UI.ErrorMessage("Yaver Mass Scav v3 yüklenemedi ❌ (Console'a bak)", 6000) : alert("Yüklenemedi");
      console.error("[YaverMassLoader v3] ERROR:", e);
    }
  })();
})();
