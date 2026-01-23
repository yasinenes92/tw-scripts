(function () {
  "use strict";

  var KEY = "__YAVER_RESOURCE_ORCHESTRATOR_V1__";

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
    PANEL_ID: "yro_panel_v1",
    STYLE_ID: "yro_style_v1"
  };

  Y.state = {
    ui: {
      groupId: 0,
      groupName: "All villages",
      search: "",
      collapsed: false
    },
    groups: [], // [{id,name}]
    villages: [], // [{id,name,points,wood,stone,iron,storage,merchAvail,merchTotal,urlOverview}]
    incoming: new Map(), // villageId -> {wood,stone,iron}
    computed: null
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

    getParam: function (url, key) {
      try {
        var u = String(url || "");
        var m = u.match(new RegExp("[?&]" + key + "=(\\d+)"));
        return m ? parseInt(m[1], 10) : null;
      } catch (e) {
        return null;
      }
    },

    baseScreen: function () {
      if (window.game_data && game_data.link_base_pure) return game_data.link_base_pure;
      var qs = location.search || "";
      var m = qs.match(/village=\d+/);
      var villagePart = m ? m[0] : "village=0";
      return "/game.php?" + villagePart + "&screen=";
    },

    urlProd: function (groupId) {
      var url = Y.util.baseScreen() + "overview_villages&mode=prod&page=-1";
      url += "&group=" + encodeURIComponent(groupId == null ? 0 : groupId);
      return url;
    },

    urlTraderAll: function (groupId) {
      // trades_table: incoming/outgoing + origin/destination + resources
      var url = Y.util.baseScreen() + "overview_villages&mode=trader&type=all&page=-1";
      url += "&group=" + encodeURIComponent(groupId == null ? 0 : groupId);
      return url;
    },

    iconSpan: function (cls) {
      return '<span class="icon header ' + cls + '"></span>';
    },

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
      var p = document.getElementById(Y.cfg.PANEL_ID);
      if (p) p.remove();
      var s = document.getElementById(Y.cfg.STYLE_ID);
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
