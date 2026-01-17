(function () {
  "use strict";

  var KEY = "__YAVER_SQUAD_V1__";

  try {
    if (window[KEY] && typeof window[KEY].destroy === "function") window[KEY].destroy();
  } catch (e) {}

  var Y = (window[KEY] = {});
  Y.KEY = KEY;
  Y.VERSION = "squad_v1";
  Y.STARTED_AT = Date.now();

  Y.IMG_BASE = (window.image_base || "https://dsen.innogamescdn.com/asset/c645ceed/graphic/");

  Y.util = {};
  Y.util.n = function (num) {
    num = Math.floor(Number(num || 0));
    try { return num.toLocaleString("de-DE"); } catch (e) { return String(num); }
  };

  Y.util.pad2 = function (n) { return String(n).padStart(2, "0"); };

  Y.util.fmtHMS = function (sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    return h + ":" + Y.util.pad2(m) + ":" + Y.util.pad2(s);
  };

  // Server time (best-effort)
  Y.util.getServerNowSec = function () {
    try {
      if (window.Timing && typeof Timing.getCurrentServerTime === "function") {
        var d = Timing.getCurrentServerTime(); // Date
        return Math.floor(d.getTime() / 1000);
      }
    } catch (e) {}

    // fallback: parse #serverDate + #serverTime (dd/mm/yyyy)
    try {
      var t = ($("#serverTime").text() || "").trim();
      var d2 = ($("#serverDate").text() || "").trim();
      var m = d2.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      var t2 = t.match(/^(\d{2}):(\d{2}):(\d{2})$/);
      if (m && t2) {
        var dd = parseInt(m[1], 10), mm = parseInt(m[2], 10), yy = parseInt(m[3], 10);
        var hh = parseInt(t2[1], 10), mi = parseInt(t2[2], 10), ss = parseInt(t2[3], 10);
        var dt = new Date(yy, mm - 1, dd, hh, mi, ss);
        return Math.floor(dt.getTime() / 1000);
      }
    } catch (e2) {}

    return Math.floor(Date.now() / 1000);
  };

  Y.util.isMassPage = function () {
    try { return window.game_data && game_data.screen === "place" && game_data.mode === "scavenge_mass"; } catch (e) {}
    return location.href.indexOf("mode=scavenge_mass") >= 0;
  };

  Y.state = {
    villages: [],
    statsByVillageId: new Map(),
    maxReturnByVillageId: new Map(),
    totals: { wood: 0, stone: 0, iron: 0, total: 0, activeSquads: 0 },
    tickTimer: null
  };

  Y.destroy = function () {
    try {
      $("#yaver_squad_summary_v1").remove();
      $(".yaver_squad_th_v1").remove();
      $(".yaver_squad_td_v1").remove();
      $(".yaver_squad_total_row_v1").remove();
    } catch (e) {}
    try {
      if (Y.state.tickTimer) clearInterval(Y.state.tickTimer);
      Y.state.tickTimer = null;
    } catch (e2) {}
    try { delete window[KEY]; } catch (e3) {}
  };
})();
