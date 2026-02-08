(function () {
  "use strict";

  var KEY = "__YSS_SINGLE_V2__";

  // onceki v2 calisiyorsa temizle
  try {
    if (window[KEY] && typeof window[KEY].destroy === "function") {
      window[KEY].destroy();
    }
  } catch (e) {}

  var Y = (window[KEY] = {});
  Y.KEY = KEY;
  Y.VERSION = "v2";
  Y.STARTED_AT = Date.now();

  // --- helpers ---
  Y.util = {};

  Y.util.clamp0 = function (n) { n = Number(n || 0); return n > 0 ? n : 0; };

  Y.util.fmtHMS = function (sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    if (h) return h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    return m + ":" + String(s).padStart(2, "0");
  };

  Y.util.waitFor = function (fn, ms) {
    ms = ms || 15000;
    var t0 = Date.now();
    return new Promise(function (resolve, reject) {
      (function tick() {
        try { if (fn()) return resolve(true); } catch (e) {}
        if (Date.now() - t0 > ms) return reject(new Error("Timeout"));
        setTimeout(tick, 100);
      })();
    });
  };

  Y.util.isScavengePage = function () {
    try {
      if (window.game_data && game_data.screen === "place" && game_data.mode === "scavenge") return true;
    } catch (e) {}
    return (location.href.indexOf("screen=place") >= 0 && location.href.indexOf("mode=scavenge") >= 0);
  };

  Y.util.gotoScavengePage = function () {
    try {
      var base = (window.game_data && game_data.link_base_pure) ? game_data.link_base_pure : "/game.php?";
      location.href = base + "place&mode=scavenge";
    } catch (e) {}
  };

  // panel icindeki mesaj kutusu
  Y.util.msg = function (html, kind) {
    kind = kind || "info";
    var el = document.getElementById("yss_msg_v2");
    if (!el) return;
    el.className = (kind === "ok" ? "success_box" : (kind === "err" ? "error_box" : "info_box"));
    el.innerHTML = '<div class="content">' + html + "</div>";
  };

  // assets
  Y.IMG_BASE = (window.image_base || "https://dsen.innogamescdn.com/asset/c645ceed/graphic/");
  Y.UNIT_ICON = function (u) { return Y.IMG_BASE + "unit/unit_" + u + ".png"; };

  // order (oyunla uyumlu)
  Y.sendOrderDefault = ["spear", "sword", "axe", "archer", "light", "marcher", "heavy"];

  // storage (world bazli)
  Y.storageKey = function (k) {
    var world = "world";
    try { world = (window.game_data && game_data.world) ? game_data.world : "world"; } catch (e) {}
    return "YSS_SINGLE:" + Y.VERSION + ":" + world + ":" + k;
  };

  Y.loadCfg = function () {
    try { return JSON.parse(localStorage.getItem(Y.storageKey("CFG")) || "{}"); } catch (e) { return {}; }
  };

  Y.saveCfg = function (obj) {
    try { localStorage.setItem(Y.storageKey("CFG"), JSON.stringify(obj || {})); } catch (e) {}
  };

  // state
  Y.state = {
    plan: [],
    idx: 0,
    targetSec: 3600
  };

  // destroy
  Y.destroy = function () {
    try {
      document.getElementById("yss_panel_native_v2") && document.getElementById("yss_panel_native_v2").remove();
      document.getElementById("yss_style_native_v2") && document.getElementById("yss_style_native_v2").remove();
      document.querySelectorAll(".scavenge-option.yss_hl_v2").forEach(function (x) { x.classList.remove("yss_hl_v2"); });
    } catch (e) {}
    try { delete window[KEY]; } catch (e2) {}
  };
})();
