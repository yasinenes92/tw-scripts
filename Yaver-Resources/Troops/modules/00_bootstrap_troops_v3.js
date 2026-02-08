(function () {
  "use strict";

  var KEY = "__YAVER_RES_TROOPS_V1__"; // aynı key: diğer v1 modüller bunu kullanıyor

  try {
    if (window[KEY] && typeof window[KEY].destroy === "function") window[KEY].destroy();
  } catch (e) {}

  var Y = (window[KEY] = {});
  Y.KEY = KEY;
  Y.VERSION = "v3";
  Y.STARTED_AT = new Date().toISOString();

  Y.cfg = {
    // ✅ DEF'e spy eklendi
    DEF_UNITS: ["spear", "sword", "archer", "heavy", "spy"],
    OFF_UNITS: ["axe", "light", "marcher", "ram", "catapult"],
    OTHER_UNITS: ["knight", "snob", "militia"],

    ALL_UNITS: ["spear", "sword", "axe", "archer", "spy", "light", "marcher", "heavy", "ram", "catapult", "knight", "snob", "militia"],

    POP_FALLBACK: {
      spear: 1, sword: 1, axe: 1, archer: 1,
      spy: 2, light: 4, marcher: 5, heavy: 6,
      ram: 5, catapult: 8, knight: 10, snob: 100, militia: 0
    }
  };

  Y.state = {
    villages: [],
    perVillage: new Map(),
    totals: null,
    isLoading: false,
    progress: { done: 0, total: 0 }
  };

  Y.util = {};

  Y.util.n = function (num) {
    try { return Number(num || 0).toLocaleString("de-DE"); } catch (e) { return String(num || 0); }
  };

  Y.util.safeInt = function (x) {
    var n = parseInt(String(x).replace(/[^\d-]/g, ""), 10);
    return isFinite(n) ? n : 0;
  };

  Y.util.sleep = function (ms) {
    return new Promise(function (res) { setTimeout(res, ms); });
  };

  Y.util.imageBase = function () {
    try { if (typeof image_base === "string" && image_base) return image_base; } catch (e) {}
    return "/graphic/";
  };

  Y.util.unitIcon = function (u) {
    var base = Y.util.imageBase();
    var webp = base + "unit/unit_" + u + ".webp";
    var png = base + "unit/unit_" + u + ".png";
    return { webp: webp, png: png };
  };

  Y.util.unitIconHTML = function (u, size) {
    size = size || 18;
    var ic = Y.util.unitIcon(u);
    return '<img src="' + ic.webp + '" onerror="this.onerror=null;this.src=\'' + ic.png + '\';" style="width:' + size + 'px;height:' + size + 'px;vertical-align:-4px;" alt="">';
  };

  Y.util.popOf = function (unitMeta, u) {
    if (unitMeta && unitMeta[u] && unitMeta[u].pop != null) return Number(unitMeta[u].pop) || 0;
    return Y.cfg.POP_FALLBACK[u] || 0;
  };

  Y.util.prodPerDayFromBuildTime = function (build_time, requirements_met) {
    if (!requirements_met) return 0;
    var bt = Number(build_time || 0);
    if (!(bt > 0)) return 0;
    return Math.floor(86400 / bt);
  };

  Y.destroy = function () {
    try { if (Y.state.tick) clearInterval(Y.state.tick); } catch (e) {}

    // eski v1 panel/style + yeni v2 panel/style temizliği
    try { $("#yaver_res_troops_panel_v1").remove(); } catch (e1) {}
    try { $("#yaver_res_troops_style_v1").remove(); } catch (e2) {}
    try { $("#yaver_res_troops_panel_v2").remove(); } catch (e3) {}
    try { $("#yaver_res_troops_style_v2").remove(); } catch (e4) {}
  };
})();
