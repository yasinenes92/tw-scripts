(function () {
  'use strict';

  var VERSION = 'v10';
  var NS = 'YRO_V10';

  // Cleanup older panels (don’t touch other scripts; only our ids)
  function removeIfExists(id) {
    var el = document.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }
  removeIfExists('yro_panel_v6');
  removeIfExists('yro_panel_v7');
  removeIfExists('yro_panel_v8');
  removeIfExists('yro_panel_v9');
  removeIfExists('yro_panel_v10');

  // Cleanup older namespace
  try {
    if (window.YRO_V8) delete window.YRO_V8;
    if (window.YRO_V9) delete window.YRO_V9;
  } catch (e) {}

  function nowTs() {
    var d = new Date();
    // TR style (but keep leading zeros)
    function pad(n) {
      return (n < 10 ? '0' : '') + n;
    }
    return (
      pad(d.getDate()) +
      '/' +
      pad(d.getMonth() + 1) +
      '/' +
      d.getFullYear() +
      ' ' +
      pad(d.getHours()) +
      ':' +
      pad(d.getMinutes()) +
      ':' +
      pad(d.getSeconds())
    );
  }

  function log() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[YRO ' + VERSION + ']');
    console.log.apply(console, args);
  }
  function warn() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[YRO ' + VERSION + ']');
    console.warn.apply(console, args);
  }
  function err() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[YRO ' + VERSION + ']');
    console.error.apply(console, args);
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }
  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function safeInt(x, dflt) {
    var n = parseInt(x, 10);
    return isNaN(n) ? (dflt || 0) : n;
  }

  // TribalWars numbers: "1.262.616" => 1262616
  function parseTwNumber(s) {
    if (s == null) return 0;
    var str = String(s).trim();
    if (!str) return 0;
    // remove anything non-digit
    var digits = str.replace(/[^\d]/g, '');
    return digits ? safeInt(digits, 0) : 0;
  }

  // format 1262616 => "1.262.616"
  function formatTwNumber(n) {
    n = safeInt(n, 0);
    var s = String(Math.max(0, n));
    var out = '';
    while (s.length > 3) {
      out = '.' + s.slice(-3) + out;
      s = s.slice(0, -3);
    }
    return s + out;
  }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var ctx = this;
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(ctx, args);
      }, ms || 150);
    };
  }

  function sleep(ms) {
    return new Promise(function (res) {
      setTimeout(res, ms || 0);
    });
  }

  // URL helpers (same origin)
  function getCurrentVillageId() {
    try {
      if (window.game_data && game_data.village && game_data.village.id) {
        return safeInt(game_data.village.id, 0);
      }
    } catch (e) {}
    try {
      var sp = new URLSearchParams(window.location.search);
      var v = sp.get('village');
      if (v) return safeInt(v, 0);
    } catch (e2) {}
    return 0;
  }

  function getLinkBasePure() {
    try {
      if (window.game_data && game_data.link_base_pure) return game_data.link_base_pure;
    } catch (e) {}
    // fallback
    var vid = getCurrentVillageId();
    return '/game.php?village=' + vid + '&screen=';
  }

  function buildGameUrl(screen, params) {
    params = params || {};
    var base = getLinkBasePure(); // ends with &screen=
    var url = base + encodeURIComponent(screen);

    var qp = [];
    for (var k in params) {
      if (!Object.prototype.hasOwnProperty.call(params, k)) continue;
      if (params[k] === undefined || params[k] === null) continue;
      qp.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(params[k])));
    }
    if (qp.length) url += '&' + qp.join('&');
    return url;
  }

  function parseVillageIdFromHref(href) {
    if (!href) return 0;
    try {
      // href may be relative
      var u = new URL(href, window.location.origin);
      var v = u.searchParams.get('village');
      return v ? safeInt(v, 0) : 0;
    } catch (e) {
      // fallback regex
      var m = String(href).match(/[?&]village=(\d+)/);
      return m ? safeInt(m[1], 0) : 0;
    }
  }

  function parseCoordsFromText(txt) {
    // "(433|390)" -> {x:433,y:390,k:34}
    var m = String(txt || '').match(/\((\d+)\|(\d+)\)/);
    if (!m) return null;
    var x = safeInt(m[1], 0);
    var y = safeInt(m[2], 0);
    var k = safeInt(Math.floor(x / 100) * 10 + Math.floor(y / 100), 0);
    return { x: x, y: y, k: k };
  }

  function httpGet(url) {
    return fetch(url, { credentials: 'include' })
      .then(function (r) {
        return r.text();
      })
      .catch(function (e) {
        err('httpGet failed', url, e);
        throw e;
      });
  }

  function parseHTML(html) {
    try {
      return new DOMParser().parseFromString(html, 'text/html');
    } catch (e) {
      err('DOMParser failed', e);
      // fallback: create document fragment-ish
      var d = document.implementation.createHTMLDocument('');
      d.documentElement.innerHTML = html;
      return d;
    }
  }

  function lsGet(key) {
    try {
      var v = localStorage.getItem(key);
      if (!v) return null;
      return JSON.parse(v);
    } catch (e) {
      return null;
    }
  }
  function lsSet(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  }
  function lsDel(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  }

  window[NS] = {
    VERSION: VERSION,
    NS: NS,
    ts: nowTs,
    log: log,
    warn: warn,
    err: err,
    qs: qs,
    qsa: qsa,
    safeInt: safeInt,
    parseTwNumber: parseTwNumber,
    formatTwNumber: formatTwNumber,
    debounce: debounce,
    sleep: sleep,
    getCurrentVillageId: getCurrentVillageId,
    buildGameUrl: buildGameUrl,
    parseVillageIdFromHref: parseVillageIdFromHref,
    parseCoordsFromText: parseCoordsFromText,
    httpGet: httpGet,
    parseHTML: parseHTML,
    lsGet: lsGet,
    lsSet: lsSet,
    lsDel: lsDel,
  };

  log('bootstrap loaded ✅');
})();
