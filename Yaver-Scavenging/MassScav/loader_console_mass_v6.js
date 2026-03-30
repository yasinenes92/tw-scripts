(function () {
  // MassScav Loader v6
  // Düzeltme:
  // - game_data.mode bazı dünyalarda/null durumlarda güvenilmez olabiliyor
  // - Bu yüzden URL fallback ile doğru sayfa tespiti yapıyoruz

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

  function loadOne(f) {
    var url = bust(BASE + f);
    console.log("[YaverMassLoader v6] loading:", url);

    return new Promise(function (res, rej) {
      if (typeof $ !== "function") {
        rej(new Error("jQuery ($) not found"));
        return;
      }

      $.ajax({
        url: url,
        dataType: "script",
        cache: false,
        timeout: 25000
      })
        .done(function () {
          console.log("[YaverMassLoader v6] OK:", f);
          res(true);
        })
        .fail(function (jq, st, er) {
          console.log("[YaverMassLoader v6] FAIL", {
            file: f,
            status: st,
            err: er,
            http: jq && jq.status,
            url: url
          });
          console.log("[YaverMassLoader v6] head:", ((jq && jq.responseText) || "").slice(0, 200));
          rej(new Error("Load failed: " + f));
        });
    });
  }

  (async function () {
    try {
      if (typeof $ !== "function") {
        (window.UI && UI.ErrorMessage)
          ? UI.ErrorMessage("jQuery ($) not found.", 5000)
          : alert("jQuery ($) missing");
        return;
      }

      for (var i = 0; i < FILES.length; i++) {
        await loadOne(FILES[i]);
      }

      if (window.__YAVER_MASS_SCAV_V1__ && typeof window.__YAVER_MASS_SCAV_V1__.init === "function") {
        await window.__YAVER_MASS_SCAV_V1__.init();
        (window.UI && UI.SuccessMessage) && UI.SuccessMessage("Yaver Mass Scav v6 Ready ✅", 2000);
      } else {
        console.warn("[YaverMassLoader v6] init not found after module load.");
        (window.UI && UI.ErrorMessage) && UI.ErrorMessage("MassScav loaded but init not found. Check Console.", 5000);
      }
    } catch (e) {
      console.error("[YaverMassLoader v6] ERROR:", e);
      (window.UI && UI.ErrorMessage)
        ? UI.ErrorMessage("Yaver Mass Scav v6 failed to load ❌ (check Console)", 6000)
        : alert("Failed to load");
    }
  })();
})();