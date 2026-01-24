(function () {
  "use strict";

  var KEY = "__YAVER_RESOURCE_ORCHESTRATOR_V8__";
  try {
    if (window[KEY] && typeof window[KEY].destroy === "function") window[KEY].destroy();
  } catch (e) {}

  var Y = (window[KEY] = {});
  Y.KEY = KEY;
  Y.VERSION = "v8";
  Y.STARTED_AT = Date.now();

  Y._xhr = [];
  Y._timers = [];

  Y.cfg = {
    PANEL_ID: "yro_panel_v8",
    STYLE_ID: "yro_style_v8",
    MERCHANT_CAP_PER: 1000,
    SEND_DELAY_MS: 250
  };

  Y.state = {
    // groups from TribalWars.get("groups",{ajax:"load_group_menu"})
    groups: [{ id: 0, name: "All villages" }],
    groupMembers: new Map(), // gid -> Set(villageId)

    // Core data (always ALL villages)
    all: {
      villages: [],         // base resources, storage, merchants
      incomingRes: new Map(), // vid -> {wood,stone,iron} (from market transports)
      prod24: new Map()       // vid -> {w24,s24,i24,total24, wph,sph,iph}
    },

    ui: { search: "" },

    // Table 1 (NEW): Production 24h
    t1: {
      groupId: 0,
      groupName: "All villages",
      villagesCollapsed: false
    },

    // Table 2 (OLD Table1): Current + Incoming
    t2: {
      groupId: 0,
      groupName: "All villages",
      villagesCollapsed: false
    },

    // Table 3 (OLD Table2): Orchestrator
    t3: {
      mode: "balance",
      A: { targetGroupId: 0, surplusGroupId: 0, reservePct: 0, capPct: 80, surplusCapPct: 95 },
      B: { senderGroupId: 0, targetGroupId: 0, surplusGroupId: 0, reservePct: 1, capPct: 80, surplusCapPct: 95 },
      C: { senderGroupId: -1, targetGroupId: 0, surplusGroupId: 0, reservePct: 1, capPct: 80, surplusCapPct: 95 }
    },

    computed: {
      t1: null,
      t2: null,
      t3: null
    }
  };

  Y.util = {
    n: function (x) {
      var v = Number(x || 0);
      if (!isFinite(v)) v = 0;
      try { return v.toLocaleString("de-DE"); } catch (e) { return String(Math.round(v)); }
    },
    toInt: function (s) {
      if (s == null) return 0;
      var t = String(s).replace(/\s+/g, "").replace(/<[^>]*>/g, "");
      t = t.replace(/[^0-9]/g, "");
      if (!t) return 0;
      var v = parseInt(t, 10);
      return isNaN(v) ? 0 : v;
    },
    parseRes: function (s) {
      if (s == null) return 0;
      var t = String(s).replace(/\s+/g, "");
      t = t.replace(/[^0-9]/g, "");
      if (!t) return 0;
      var v = parseInt(t, 10);
      return isNaN(v) ? 0 : v;
    },
    parsePair: function (s) {
      var m = String(s || "").match(/(\d+)\s*\/\s*(\d+)/);
      if (!m) return { a: 0, b: 0 };
      return { a: parseInt(m[1], 10) || 0, b: parseInt(m[2], 10) || 0 };
    },
    clamp: function (x, lo, hi) {
      x = Number(x);
      if (!isFinite(x)) x = lo;
      return Math.max(lo, Math.min(hi, x));
    },
    merchNeeded: function (total) {
      total = Math.max(0, Math.floor(total || 0));
      if (total <= 0) return 0;
      return Math.ceil(total / Y.cfg.MERCHANT_CAP_PER);
    },
    coordOfName: function (name) {
      var m = String(name || "").match(/(\d{3}\|\d{3})/);
      return m ? m[1] : null;
    },
    splitCoord: function (coord) {
      var m = String(coord || "").match(/(\d{3})\|(\d{3})/);
      if (!m) return null;
      return { x: parseInt(m[1], 10), y: parseInt(m[2], 10) };
    },
    iconSpan: function (cls) { return '<span class="icon header ' + cls + '"></span>'; },
    iconImg: function (path, title) {
      var t = title ? ' title="' + title.replace(/"/g, "") + '"' : "";
      return '<img src="' + path + '" style="width:16px;height:16px;vertical-align:-3px;"' + t + " />";
    },
    basePureForVillage: function (vid) {
      return "/game.php?village=" + encodeURIComponent(vid) + "&screen=";
    },
    urlProdAll: function () {
      // NOTE: we only ever use group=0 and mode=prod (safe; no trader calls)
      var base = (window.game_data && game_data.link_base_pure) ? game_data.link_base_pure : "/game.php?village=0&screen=";
      return base + "overview_villages&mode=prod&page=-1&group=0";
    },
    urlVillageOverview: function (vid) {
      return "/game.php?village=" + encodeURIComponent(vid) + "&screen=overview";
    },
    urlMarketTransports: function (vid) {
      return "/game.php?village=" + encodeURIComponent(vid) + "&screen=market&mode=transports";
    },
    nowStamp: function () {
      var d = new Date();
      function z(n){ return (n<10?"0":"")+n; }
      return z(d.getDate()) + "." + z(d.getMonth()+1) + "." + d.getFullYear() + " " + z(d.getHours()) + ":" + z(d.getMinutes()) + ":" + z(d.getSeconds());
    }
  };

  Y.destroy = function () {
    try { Y._xhr.forEach(function (x) { try { if (x && typeof x.abort === "function") x.abort(); } catch (e) {} }); } catch (e) {}
    Y._xhr = [];
    try { Y._timers.forEach(function (t) { try { clearTimeout(t); } catch (e) {} }); } catch (e) {}
    Y._timers = [];
    try {
      var p = document.getElementById(Y.cfg.PANEL_ID); if (p) p.remove();
      var s = document.getElementById(Y.cfg.STYLE_ID); if (s) s.remove();
    } catch (e) {}
    try { delete window[KEY]; } catch (e) {}
  };

  Y.data = {};
  Y.fetch = {};
  Y.compute = {};
  Y.ui = {};
  Y.main = {};
})();
