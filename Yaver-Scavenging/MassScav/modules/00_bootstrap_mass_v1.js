(function () {
  "use strict";

  var KEY = "__YAVER_MASS_SCAV_V1__";

  try {
    if (window[KEY] && typeof window[KEY].destroy === "function") window[KEY].destroy();
  } catch (e) {}

  var Y = (window[KEY] = {});
  Y.KEY = KEY;
  Y.VERSION = "mass_v1";
  Y.STARTED_AT = Date.now();

  Y.util = {};

  Y.util.clamp0 = function (n) { n = Number(n || 0); return n > 0 ? n : 0; };
  Y.util.fmtInt = function (n) { n = Math.floor(Number(n || 0)); return n.toLocaleString("en-US"); };

  Y.util.fmtHMS = function (sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    return h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  };

  Y.util.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  Y.util.waitFor = function (fn, ms) {
    ms = ms || 20000;
    var t0 = Date.now();
    return new Promise(function (resolve, reject) {
      (function tick() {
        try { if (fn()) return resolve(true); } catch (e) {}
        if (Date.now() - t0 > ms) return reject(new Error("Timeout"));
        setTimeout(tick, 100);
      })();
    });
  };

  Y.util.isMassPage = function () {
    try { return window.game_data && game_data.screen === "place" && game_data.mode === "scavenge_mass"; } catch (e) {}
    return location.href.indexOf("mode=scavenge_mass") >= 0;
  };

  Y.util.gotoMassPage = function () {
    try {
      var base = (window.game_data && game_data.link_base_pure) ? game_data.link_base_pure : "/game.php?&screen=";
      location.href = base + "place&mode=scavenge_mass";
    } catch (e) {}
  };

  Y.util.getUrlParam = function (name) {
    try {
      var u = new URL(location.href);
      return u.searchParams.get(name);
    } catch (e) {
      var m = location.href.match(new RegExp("[?&]" + name + "=([^&]+)"));
      return m ? decodeURIComponent(m[1]) : null;
    }
  };

  Y.util.getBaseMassUrl = function (groupId) {
    groupId = (groupId == null) ? "0" : String(groupId);
    var sitter = 0;
    try { sitter = Number(game_data.player.sitter || 0); } catch (e) {}
    var tpart = "";
    try { if (sitter > 0) tpart = "t=" + game_data.player.id + "&"; } catch (e2) {}

    var url = "game.php?" + tpart + "&screen=place&mode=scavenge_mass";
    if (groupId !== "0") url += "&group=" + encodeURIComponent(groupId);
    return url;
  };

  // TW assets
  Y.IMG_BASE = (window.image_base || "https://dsen.innogamescdn.com/asset/c645ceed/graphic/");
  Y.UNIT_ICON = function (u) { return Y.IMG_BASE + "unit/unit_" + u + ".png"; };

  // sendOrder (militia/snob/ram/catapult/spy/knight hariç)
  Y.sendOrder = (function () {
    var worldUnits = [];
    try { worldUnits = (game_data.units || []).slice(); } catch (e) {}
    var out = [];
    for (var i = 0; i < worldUnits.length; i++) {
      var u = worldUnits[i];
      if (u === "militia" || u === "snob" || u === "ram" || u === "catapult" || u === "spy" || u === "knight") continue;
      out.push(u);
    }
    // bazı dünyalarda archer/marcher yoksa zaten worldUnits’te olmayacak
    return out;
  })();

  // LocalStorage
  Y.storageKey = function (k) {
    var world = "world";
    try { world = (game_data.world || "world"); } catch (e) {}
    return "YAVER_MASS_SCAV:" + Y.VERSION + ":" + world + ":" + k;
  };

  Y.loadCfg = function () {
    try { return JSON.parse(localStorage.getItem(Y.storageKey("CFG")) || "{}"); } catch (e) { return {}; }
  };

  Y.saveCfg = function (obj) {
    try { localStorage.setItem(Y.storageKey("CFG"), JSON.stringify(obj || {})); } catch (e) {}
  };

  // Defaults
  Y.defaults = {
    time: { h: 1, m: 0, s: 0 },
    mode: "priority",
    usePremiumBoost: false,
    enabledOptions: [1, 2, 3, 4],
    troopEnabled: null,      // first run -> all true
    keepHome: null           // first run -> 0 for each unit
  };

  // State
  Y.state = {
    dataLoaded: false,
    groups: [],                // {id,name,type}
    selectedGroups: new Set(), // group ids
    villages: [],              // full village objects (merged)
    villagesById: new Map(),
    groupVillageMap: new Map(), // groupId -> Set(village_id)
    selSources: new Map(),     // village_id -> {manual:boolean, groups:Set}
    selectedVillageIds: new Set(),

    optionBases: null,         // option_bases map
    unitsMeta: null,           // unit meta map (carry/name)

    planRows: [],              // flat rows
    batches: [],               // array of arrays (requests)
    sendCursor: 0
  };

  Y.destroy = function () {
    try {
      var p = document.getElementById("yms_panel_v1");
      if (p) p.remove();
      var s = document.getElementById("yms_style_v1");
      if (s) s.remove();
    } catch (e) {}
    try { delete window[KEY]; } catch (e2) {}
  };
})();
