javascript:(function () {
  // ====== AYAR ======
  // jsDelivr (default)
  var BASE = "https://cdn.jsdelivr.net/gh/yasinenes92/tw-scripts@main/Yaver-Scavenging/SingleVillage/modules/";
  // En kesin alternatif (GitHub raw) - jsDelivr gecikirse aç:
  // var BASE = "https://raw.githubusercontent.com/yasinenes92/tw-scripts/main/Yaver-Scavenging/SingleVillage/modules/";

  var FILES = [
    "00_bootstrap.js",
    "10_utils.js",
    "20_game.js",
    "30_planner.js",
    "40_apply.js",
    "50_ui.js"
  ];

  function bust(url) {
    var sep = (url.indexOf("?") >= 0) ? "&" : "?";
    return url + sep + "v=" + Date.now() + "_" + Math.random().toString(16).slice(2);
  }

  function loadOne(file) {
    var url = bust(BASE + file);
    console.log("[YaverLoader] loading:", url);

    return new Promise(function (resolve, reject) {
      $.ajax({
        url: url,
        dataType: "script",
        cache: false,     // jQuery ayrıca _=timestamp de ekler
        timeout: 20000
      })
      .done(function () { resolve(true); })
      .fail(function (jq, status, err) {
        console.log("[YaverLoader] FAIL", { file: file, status: status, err: err, http: jq && jq.status, url: url });
        console.log("[YaverLoader] response head:", ((jq && jq.responseText) || "").slice(0, 200));
        reject(new Error("Load failed: " + file));
      });
    });
  }

  (async function () {
    try {
      if (typeof $ !== "function") {
        UI && UI.ErrorMessage
          ? UI.ErrorMessage("jQuery ($) bulunamadı. Sayfa tam yüklenmeden çalıştırmış olabilirsin.", 5000)
          : alert("jQuery ($) bulunamadı.");
        return;
      }

      for (var i = 0; i < FILES.length; i++) {
        await loadOne(FILES[i]);
      }

      if (window.Yaver && window.Yaver.ScavSingle && typeof window.Yaver.ScavSingle.init === "function") {
        window.Yaver.ScavSingle.init();
      }

      UI && UI.SuccessMessage
        ? UI.SuccessMessage("Yaver Scav (Modüler) Hazır ✅", 2000)
        : console.log("[YaverLoader] ready ✅");
    } catch (e) {
      UI && UI.ErrorMessage
        ? UI.ErrorMessage("Yaver Scav yüklenemedi ❌ (Console log'a bak)", 6000)
        : alert("Yaver Scav yüklenemedi. Console'a bak.");
      console.error("[YaverLoader] ERROR:", e);
    }
  })();

  void(0);
})();
