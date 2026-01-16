// Quickbar'a yapistirdigin bookmarklet'in "ayni mantikta" dosya hali.
// Quickbar: javascript:(function(){ ... })()

(function () {
  var BASE = "https://cdn.jsdelivr.net/gh/yasinenes92/tw-scripts@main/Yaver-Scavenging/SingleVillage/modules/";
  var FILES = [
    "00_bootstrap_v2.js",
    "10_dom_gamebridge_v2.js",
    "20_math_planner_v2.js",
    "30_apply_inputs_v2.js",
    "40_ui_panel_v2.js",
    "50_main_v2.js"
  ];

  function bust(url) {
    var sep = (url.indexOf("?") >= 0) ? "&" : "?";
    return url + sep + "v=" + Date.now() + "_" + Math.random().toString(16).slice(2);
  }

  function loadOne(file) {
    var url = bust(BASE + file);
    console.log("[YSS Loader v2] loading:", url);

    return new Promise(function (resolve, reject) {
      $.ajax({ url: url, dataType: "script", cache: false, timeout: 25000 })
        .done(function () { resolve(true); })
        .fail(function (jq, status, err) {
          console.log("[YSS Loader v2] FAIL", { file: file, status: status, err: err, http: jq && jq.status, url: url });
          reject(new Error("Load failed: " + file));
        });
    });
  }

  (async function () {
    for (var i = 0; i < FILES.length; i++) await loadOne(FILES[i]);
    window.__YSS_SINGLE_V2__ && window.__YSS_SINGLE_V2__.init && window.__YSS_SINGLE_V2__.init();
  })();
})();
