(function () {
  function isMassPage() {
    try {
      if (window.game_data && game_data.screen === "place" && game_data.mode === "scavenge_mass") {
        return true;
      }
    } catch (e) {}

    try {
      var href = String(location.href || "");
      return href.indexOf("screen=place") >= 0 && href.indexOf("mode=scavenge_mass") >= 0;
    } catch (e2) {}

    return false;
  }

  function gotoMassPage() {
    try {
      var base = (window.game_data && game_data.link_base_pure)
        ? game_data.link_base_pure
        : "/game.php?&screen=";
      location.href = base + "place&mode=scavenge_mass";
    } catch (e) {
      location.href = "/game.php?screen=place&mode=scavenge_mass";
    }
  }

  if (!isMassPage()) {
    gotoMassPage();
    if (window.UI && UI.ErrorMessage) {
      UI.ErrorMessage("Redirecting to Mass Scavenging... When the page opens, press Quickbar again.", 5000);
    }
    return;
  }

  var BASE = "https://cdn.jsdelivr.net/gh/yasinenes92/tw-scripts@main/Yaver-Scavenging/Squad/modules/";
  var FILES = [
    "00_bootstrap_squad_v2.js",
    "10_data_squad_v2.js",
    "20_compute_squad_v2.js",
    "30_ui_squad_v5.js",
    "40_main_squad_v3.js"
  ];

  function bust(u) {
    return u + (u.indexOf("?") >= 0 ? "&" : "?") + "v=" + Date.now() + "_" + Math.random().toString(16).slice(2);
  }

  function loadOne(file) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = bust(BASE + file);
      s.async = false;
      s.onload = function () {
        console.log("[YaverSquadLoader v6] OK:", file);
        resolve(true);
      };
      s.onerror = function () {
        console.log("[YaverSquadLoader v6] FAIL:", file, s.src);
        reject(new Error("Load failed: " + file));
      };
      document.head.appendChild(s);
    });
  }

  (async function () {
    try {
      for (var i = 0; i < FILES.length; i++) {
        await loadOne(FILES[i]);
      }

      if (window.__YAVER_SQUAD_V1__ && typeof window.__YAVER_SQUAD_V1__.init === "function") {
        window.__YAVER_SQUAD_V1__.init(true);
        if (window.UI && UI.SuccessMessage) UI.SuccessMessage("Yaver Squad v6 ready ✅", 2000);
      } else {
        console.warn("[YaverSquadLoader v6] init not found after module load.");
        if (window.UI && UI.ErrorMessage) UI.ErrorMessage("Yaver Squad loaded but init is missing (check Console).", 5000);
      }
    } catch (e) {
      console.error("[YaverSquadLoader v6] ERROR:", e);
      if (window.UI && UI.ErrorMessage) UI.ErrorMessage("Yaver Squad failed to load ❌ (check Console).", 6000);
      else alert("Failed to load");
    }
  })();
})();