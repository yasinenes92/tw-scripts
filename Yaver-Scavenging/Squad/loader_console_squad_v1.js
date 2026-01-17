(function () {
  var BASE = "https://cdn.jsdelivr.net/gh/yasinenes92/tw-scripts@main/Yaver-Scavenging/Squad/modules/";
  var FILES = [
    "00_bootstrap_squad_v1.js",
    "10_data_squad_v1.js",
    "20_compute_squad_v1.js",
    "30_ui_squad_v1.js",
    "40_main_squad_v1.js"
  ];

  function bust(u) {
    return u + (u.indexOf("?") >= 0 ? "&" : "?") + "v=" + Date.now() + "_" + Math.random().toString(16).slice(2);
  }

  function loadOne(f) {
    var url = bust(BASE + f);
    console.log("[YaverSquadLoader] loading:", url);
    return new Promise(function (res, rej) {
      $.ajax({ url: url, dataType: "script", cache: false, timeout: 25000 })
        .done(function () { res(true); })
        .fail(function (jq, st, er) {
          console.log("[YaverSquadLoader] FAIL", { file: f, status: st, err: er, http: jq && jq.status, url: url });
          console.log("[YaverSquadLoader] head:", ((jq && jq.responseText) || "").slice(0, 200));
          rej(new Error("Load failed: " + f));
        });
    });
  }

  (async function () {
    for (var i = 0; i < FILES.length; i++) await loadOne(FILES[i]);
    if (window.__YAVER_SQUAD_V1__ && typeof window.__YAVER_SQUAD_V1__.init === "function") {
      window.__YAVER_SQUAD_V1__.init();
    }
  })();
})();
