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
      UI.ErrorMessage("Redirecting to Mass Scav screen... After the page loads, click Quickbar again.", 5000);
    }
    return;
  }

  var BASE = "https://cdn.jsdelivr.net/gh/yasinenes92/tw-scripts@main/Yaver-Scavenging/MassScav/modules/";
  var FILES = [
    "00_bootstrap_mass_v2.js",
    "10_data_mass_v3.js",
    "20_planner_mass_v3.js",
    "30_sender_mass_v3.js",
    "40_ui_mass_v4.js",
    "50_main_mass_v3.js"
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
        console.log("[YaverMassLoader v7] OK:", file);
        resolve(true);
      };
      s.onerror = function () {
        console.log("[YaverMassLoader v7] FAIL:", file, s.src);
        reject(new Error("Load failed: " + file));
      };
      document.head.appendChild(s);
    });
  }

  function patchY() {
    var Y = window.__YAVER_MASS_SCAV_V1__;
    if (!Y) return null;

    if (Y.util) {
      Y.util.isMassPage = isMassPage;
      Y.util.gotoMassPage = gotoMassPage;
    }

    return Y;
  }

  function forceOpenPanel(Y) {
    if (!Y) return false;
    if (document.getElementById("yms_panel_v1")) return true;
    if (!Y.ui || typeof Y.ui.ensure !== "function") return false;

    try {
      Y.ui.ensure();

      if (typeof Y.ui.applyCfgToUI === "function") {
        try { Y.ui.applyCfgToUI(); } catch (e1) { console.error(e1); }
      }

      if (Y.data && typeof Y.data.readGroupsFromDOM === "function") {
        try { Y.data.readGroupsFromDOM(); } catch (e2) { console.error(e2); }
      }

      if (Y.ui && typeof Y.ui.renderGroups === "function") {
        try { Y.ui.renderGroups(); } catch (e3) { console.error(e3); }
      }

      if (Y.ui && typeof Y.ui.renderOptions === "function") {
        try { Y.ui.renderOptions(); } catch (e4) { console.error(e4); }
      }

      if (Y.ui && typeof Y.ui.renderUnits === "function") {
        try { Y.ui.renderUnits(); } catch (e5) { console.error(e5); }
      }

      if (Y.ui && typeof Y.ui.renderVillages === "function") {
        try { Y.ui.renderVillages(); } catch (e6) { console.error(e6); }
      }

      if (Y.main && typeof Y.main.bind === "function") {
        try { Y.main.bind(); } catch (e7) { console.error(e7); }
      }

      if (window.UI && UI.InfoMessage) {
        UI.InfoMessage("Mass panel forced open. Use LOAD DATA.", 5000);
      }

      return !!document.getElementById("yms_panel_v1");
    } catch (e) {
      console.error("[YaverMassLoader v7] forceOpenPanel ERROR:", e);
      return false;
    }
  }

  (async function () {
    try {
      for (var i = 0; i < FILES.length; i++) {
        await loadOne(FILES[i]);
      }

      var Y = patchY();

      if (!Y) {
        throw new Error("__YAVER_MASS_SCAV_V1__ missing after script-tag load");
      }

      if (typeof Y.init === "function") {
        try {
          await Y.init();
        } catch (eInit) {
          console.error("[YaverMassLoader v7] init ERROR:", eInit);
        }
      }

      setTimeout(function () {
        var ok = !!document.getElementById("yms_panel_v1");
        if (!ok) {
          ok = forceOpenPanel(Y);
        }

        if (ok) {
          if (window.UI && UI.SuccessMessage) UI.SuccessMessage("Yaver Mass Scav v7 Ready ✅", 2500);
        } else {
          if (window.UI && UI.ErrorMessage) UI.ErrorMessage("MassScav loaded but panel could not be opened. Check Console.", 6000);
        }
      }, 600);

    } catch (e) {
      console.error("[YaverMassLoader v7] ERROR:", e);
      if (window.UI && UI.ErrorMessage) {
        UI.ErrorMessage("Yaver Mass Scav v7 failed to load ❌ (check Console)", 6000);
      } else {
        alert("Failed to load");
      }
    }
  })();
})();