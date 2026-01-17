(function () {
  // Squad v3 Loader
  // - Mass Scav sayfasında değilsek: aynı sekmede oraya yönlendirir.
  // - Sayfa açılınca tekrar Quickbar'a basarak scripti çalıştırırsın.

  try {
    var isMass = (window.game_data && game_data.screen === "place" && game_data.mode === "scavenge_mass");
    if (!isMass) {
      var base = (window.game_data && game_data.link_base_pure) ? game_data.link_base_pure : "/game.php?&screen=";
      location.href = base + "place&mode=scavenge_mass";
      if (window.UI && UI.ErrorMessage) UI.ErrorMessage("Mass Scavenging sayfasına gidiliyor... Sayfa açılınca Quickbar'a tekrar bas.", 5000);
      return;
    }
  } catch (e) {
    location.href = "/game.php?screen=place&mode=scavenge_mass";
    return;
  }

  var BASE = "https://cdn.jsdelivr.net/gh/yasinenes92/tw-scripts@main/Yaver-Scavenging/Squad/modules/";
  var FILES = [
    "00_bootstrap_squad_v1.js",
    "10_data_squad_v1.js",
    "20_compute_squad_v1.js",
    "30_ui_squad_v2.js",
    "40_main_squad_v2.js"
  ];

  function bust(u) {
    return u + (u.indexOf("?") >= 0 ? "&" : "?") + "v=" + Date.now() + "_" + Math.random().toString(16).slice(2);
  }

  function loadOne(f) {
    var url = bust(BASE + f);
    console.log("[YaverSquadLoader v3] loading:", url);
    return new Promise(function (res, rej) {
      $.ajax({ url: url, dataType: "script", cache: false, timeout: 25000 })
        .done(function () { console.log("[YaverSquadLoader v3] OK:", f); res(true); })
        .fail(function (jq, st, er) {
          console.log("[YaverSquadLoader v3] FAIL", { file: f, status: st, err: er, http: jq && jq.status, url: url });
          console.log("[YaverSquadLoader v3] head:", ((jq && jq.responseText) || "").slice(0, 200));
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

      if (window.__YAVER_SQUAD_V1__ && typeof window.__YAVER_SQUAD_V1__.init === "function") {
        window.__YAVER_SQUAD_V1__.init(true);
        (window.UI && UI.SuccessMessage) && UI.SuccessMessage("Yaver Squad v3 hazır ✅", 2000);
      } else {
        (window.UI && UI.ErrorMessage) && UI.ErrorMessage("Yaver Squad yüklendi ama init yok (Console'a bak).", 5000);
      }
    } catch (e) {
      console.error("[YaverSquadLoader v3] ERROR:", e);
      (window.UI && UI.ErrorMessage) ? UI.ErrorMessage("Yaver Squad yüklenemedi ❌ (Console'a bak)", 6000) : alert("Yüklenemedi");
    }
  })();
})();
