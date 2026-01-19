(function () {
  "use strict";

  var KEY = "__YAVER_RES_ANALYZER_V1__";

  try {
    if (window[KEY] && typeof window[KEY].destroy === "function") {
      window[KEY].destroy();
    }
  } catch (e) {}

  var Y = (window[KEY] = {});
  Y.KEY = KEY;
  Y.VERSION = "v1";
  Y.STARTED_AT = Date.now();

  Y._xhr = [];
  Y._timers = [];

  Y.cfg = {
    GROUP_NAME_PARENTS: "Parents",
    GROUP_NAME_CHILDREN: "Children",

    // Kullanıcı “kesin aynı” dedi: defaultlar (yine de sayfadan doğrulamaya çalışıyoruz)
    DEFAULT_GROUP_ID_PARENTS: 35681,
    DEFAULT_GROUP_ID_CHILDREN: 35682,

    LOW_POINTS_THRESHOLD: 2000,

    RESERVE_PCT: 0.01, // Parents köylerde her resource için depodan %1 bırak
    CHILD_CAP_PCT: 0.8, // Children köylerde her resource için depo %80 üstüne çıkma

    // Merchants kuralı: max transport = merchants_total * 1000 (oyun verisi ile doğruladık)
    MERCHANT_CAP_PER: 1000,

    PANEL_ID: "yaver_res_analyzer_panel_v1",
    STYLE_ID: "yaver_res_analyzer_style_v1"
  };

  Y.state = {
    groups: {
      parentsId: Y.cfg.DEFAULT_GROUP_ID_PARENTS,
      childrenId: Y.cfg.DEFAULT_GROUP_ID_CHILDREN
    },
    villages: new Map(), // id -> {id,name,points,wood,stone,iron,storage,merchAvail,merchTotal}
    membership: {
      parents: new Set(),
      children: new Set()
    },
    incoming: new Map(), // villageId -> {wood,stone,iron}
    computed: null,
    ui: {
      mode: "all" // summary | optimizer | all
    }
  };

  Y.util = {
    n: function (x) {
      var v = Number(x || 0);
      if (!isFinite(v)) v = 0;
      try {
        return v.toLocaleString("de-DE");
      } catch (e) {
        return String(Math.round(v));
      }
    },

    // "8.<span class=grey>.</span>167" gibi textContent => "8.167"
    toInt: function (s) {
      if (s == null) return 0;
      var t = String(s)
        .replace(/\s+/g, "")
        .replace(/<[^>]*>/g, "");
      // sadece rakam bırak
      t = t.replace(/[^0-9]/g, "");
      if (!t) return 0;
      var v = parseInt(t, 10);
      return isNaN(v) ? 0 : v;
    },

    parseRes: function (s) {
      // "33.000" veya "33 . 000" benzeri => 33000
      if (s == null) return 0;
      var t = String(s).replace(/\s+/g, "");
      t = t.replace(/[^0-9]/g, "");
      if (!t) return 0;
      var v = parseInt(t, 10);
      return isNaN(v) ? 0 : v;
    },

    parsePair: function (s) {
      // "75/110"
      var m = String(s || "").match(/(\d+)\s*\/\s*(\d+)/);
      if (!m) return { a: 0, b: 0 };
      return { a: parseInt(m[1], 10) || 0, b: parseInt(m[2], 10) || 0 };
    },

    getParam: function (url, key) {
      try {
        var u = String(url || "");
        var m = u.match(new RegExp("[?&]" + key + "=(\\d+)"));
        return m ? parseInt(m[1], 10) : null;
      } catch (e) {
        return null;
      }
    },

    // /game.php?village=16088&screen=
    baseScreen: function () {
      if (window.game_data && game_data.link_base_pure) return game_data.link_base_pure;
      // fallback
      var qs = location.search || "";
      var m = qs.match(/village=\d+/);
      var villagePart = m ? m[0] : "village=0";
      return "/game.php?" + villagePart + "&screen=";
    },

    urlOverviewProd: function (groupId) {
      var url = Y.util.baseScreen() + "overview_villages&mode=prod&page=-1";
      url += "&group=" + encodeURIComponent(groupId == null ? 0 : groupId);
      return url;
    },

    urlOverviewTraderInc: function () {
      // incoming transports (henüz ulaşmasa bile)
      var url = Y.util.baseScreen() + "overview_villages&mode=trader&type=inc&page=-1&group=0";
      return url;
    },

    // oyun ikonu (header icon) wrapper
    iconSpan: function (cls) {
      return '<span class="icon header ' + cls + '"></span>';
    },

    // storage/market ikonları (kullanıcının istediği gibi .png)
    iconImg: function (path, title) {
      var t = title ? ' title="' + title.replace(/"/g, "") + '"' : "";
      return '<img src="' + path + '" style="width:16px;height:16px;vertical-align:-3px;"' + t + " />";
    }
  };

  Y.destroy = function () {
    try {
      Y._xhr.forEach(function (x) {
        try {
          if (x && typeof x.abort === "function") x.abort();
        } catch (e) {}
      });
    } catch (e) {}
    Y._xhr = [];

    try {
      Y._timers.forEach(function (t) {
        try {
          clearTimeout(t);
        } catch (e) {}
      });
    } catch (e) {}
    Y._timers = [];

    try {
      var pid = Y.cfg.PANEL_ID;
      var sid = Y.cfg.STYLE_ID;
      var p = document.getElementById(pid);
      if (p) p.remove();
      var s = document.getElementById(sid);
      if (s) s.remove();
    } catch (e) {}

    try {
      delete window[KEY];
    } catch (e) {}
  };

  // placeholders
  Y.data = {};
  Y.fetch = {};
  Y.compute = {};
  Y.ui = {};
  Y.main = {};
})();
