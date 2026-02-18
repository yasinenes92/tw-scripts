(function () {
  'use strict';

  var VERSION = 'v15';
  var NS = 'YRO_V15';
  var PANEL_ID = 'yro_panel_v15';
  var STYLE_ID = 'yro_css_v15';
  var PICKER_OVERLAY_ID = 'yro_picker_overlay_v15';
  var LS_KEY = 'yro_v15_state';

  function removeIfExists(id) {
    var el = document.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  // Clean older YRO panels/styles (safe)
  removeIfExists('yro_panel_v7'); removeIfExists('yro_css_v7');
  removeIfExists('yro_panel_v10'); removeIfExists('yro_css_v10');
  removeIfExists('yro_panel_v11'); removeIfExists('yro_css_v11');
  removeIfExists(PANEL_ID);
  removeIfExists(STYLE_ID);
  removeIfExists(PICKER_OVERLAY_ID);

  try { if (window.YRO_V11) delete window.YRO_V11; } catch (e) {}
  try { if (window.YRO_V15) delete window.YRO_V15; } catch (e2) {}
  try { if (window.__YAVER_RESOURCE_ORCHESTRATOR_V7__) delete window.__YAVER_RESOURCE_ORCHESTRATOR_V7__; } catch (e3) {}

  var Y = {};
  window[NS] = Y;

  Y._rt = { listeners: [], aborters: [], destroyed: false };

  function nowTs() {
    var d = new Date();
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  function log() { var a = [].slice.call(arguments); a.unshift('[YRO ' + VERSION + ']'); console.log.apply(console, a); }
  function warn() { var a = [].slice.call(arguments); a.unshift('[YRO ' + VERSION + ']'); console.warn.apply(console, a); }
  function err() { var a = [].slice.call(arguments); a.unshift('[YRO ' + VERSION + ']'); console.error.apply(console, a); }

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function safeInt(x, dflt) { var n = parseInt(x, 10); return isNaN(n) ? (dflt || 0) : n; }

  function parseTwNumber(s) {
    if (s == null) return 0;
    var str = String(s).trim();
    if (!str) return 0;
    var digits = str.replace(/[^\d]/g, '');
    return digits ? safeInt(digits, 0) : 0;
  }

  function formatTwNumber(n) {
    n = safeInt(n, 0);
    var s = String(Math.max(0, n));
    var out = '';
    while (s.length > 3) { out = '.' + s.slice(-3) + out; s = s.slice(0, -3); }
    return s + out;
  }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms || 150);
    };
  }

  function sleep(ms) { return new Promise(function (res) { setTimeout(res, ms || 0); }); }

  function lsGet(key) { try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
  function lsSet(key, obj) { try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {} }

  function getCurrentVillageId() {
    try { if (window.game_data && game_data.village && game_data.village.id) return safeInt(game_data.village.id, 0); } catch (e) {}
    try { var sp = new URLSearchParams(window.location.search); var v = sp.get('village'); if (v) return safeInt(v, 0); } catch (e2) {}
    return 0;
  }

  function getLinkBasePure() {
    try { if (window.game_data && game_data.link_base_pure) return game_data.link_base_pure; } catch (e) {}
    var vid = getCurrentVillageId();
    return '/game.php?village=' + vid + '&screen=';
  }

  function buildGameUrl(screen, params) {
    params = params || {};
    var base = getLinkBasePure();
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
      var u = new URL(href, window.location.origin);
      var v = u.searchParams.get('village');
      return v ? safeInt(v, 0) : 0;
    } catch (e) {
      var m = String(href).match(/[?&]village=(\d+)/);
      return m ? safeInt(m[1], 0) : 0;
    }
  }

  function parseCoordsFromText(txt) {
    var m = String(txt || '').match(/\((\d+)\|(\d+)\)/);
    if (!m) return null;
    var x = safeInt(m[1], 0);
    var y = safeInt(m[2], 0);
    var k = safeInt(Math.floor(y / 100) * 10 + Math.floor(x / 100), 0);
    return { x: x, y: y, k: k, coord: x + '|' + y };
  }

  function on(el, type, fn, opts) {
    if (!el) return;
    el.addEventListener(type, fn, opts || false);
    Y._rt.listeners.push({ el: el, type: type, fn: fn, opts: opts || false });
  }

  function destroy() {
    if (Y._rt.destroyed) return;
    Y._rt.destroyed = true;

    Y._rt.aborters.forEach(function (a) { try { a.abort(); } catch (e) {} });
    Y._rt.aborters = [];

    Y._rt.listeners.forEach(function (l) {
      try { l.el.removeEventListener(l.type, l.fn, l.opts); } catch (e) {}
    });
    Y._rt.listeners = [];

    removeIfExists(PANEL_ID);
    removeIfExists(STYLE_ID);
    removeIfExists(PICKER_OVERLAY_ID);

    try { delete window[NS]; } catch (e2) {}
  }

  async function httpGet(url, timeoutMs) {
    timeoutMs = timeoutMs || 30000;
    var ac = new AbortController();
    Y._rt.aborters.push(ac);

    var t = setTimeout(function () { try { ac.abort(); } catch (e) {} }, timeoutMs);
    try {
      var resp = await fetch(url, { method: 'GET', credentials: 'same-origin', signal: ac.signal });
      if (!resp.ok) throw new Error('HTTP ' + resp.status + ' ' + resp.statusText);
      return await resp.text();
    } finally {
      clearTimeout(t);
    }
  }

  function parseHTML(html) { return new DOMParser().parseFromString(String(html || ''), 'text/html'); }

  function extractUpdateGameData(html) {
    var s = String(html || '');
    var key = 'TribalWars.updateGameData(';
    var idx = s.indexOf(key);
    if (idx < 0) return null;

    var i = s.indexOf('{', idx + key.length);
    if (i < 0) return null;

    var depth = 0, j = i;
    for (; j < s.length; j++) {
      var ch = s[j];
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) { j++; break; } }
    }
    if (depth !== 0) return null;

    var jsonText = s.slice(i, j);
    try { return JSON.parse(jsonText); } catch (e) { warn('updateGameData JSON.parse failed', e); return null; }
  }

  function defaultState() {
    return {
      ui: {
        left: 30,
        top: 70,
        minimized1: true,
        minimized2: true,
        search: '',
      },
      groups: {
        list: [{ id: 0, name: 'All villages' }, { id: -1, name: 'Custom selection…' }],
        sel1: 0,
        sel2: 0,
        A_target: 0, A_surplus: 0,
        B_sender: 0, B_target: 0, B_surplus: 0,
        C_target: 0, C_surplus: 0,
      },
      custom: {
        t1: [], t2: [],
        A_target: [], A_surplus: [],
        B_sender: [], B_target: [], B_surplus: [],
        C_target: [], C_surplus: [],
      },
      orchestrator: { mode: 'balance', cap: 80, scap: 95, reserve: 1 },
      cache: {
        groupsFetchedAt: 0,
        groupVillageIds: {},
        villages: {},
        incomingMap: {},
        outgoingMap: {},
        lastFullScanAt: 0,
      },
    };
  }

  function loadState() {
    var st = lsGet(LS_KEY);
    if (!st || typeof st !== 'object') return defaultState();

    var def = defaultState();
    function merge(a, b) {
      for (var k in b) {
        if (!Object.prototype.hasOwnProperty.call(b, k)) continue;
        if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) {
          if (!a[k] || typeof a[k] !== 'object') a[k] = {};
          merge(a[k], b[k]);
        } else if (a[k] === undefined) {
          a[k] = b[k];
        }
      }
      return a;
    }
    return merge(st, def);
  }

  Y.state = loadState();
  Y.saveState = function () { lsSet(LS_KEY, Y.state); };

  Y.runtime = { plan: null, snapshotsById: {}, coordToId: {}, nameToIds: {} };

  Y.cfg = {
    VERSION: VERSION,
    NS: NS,
    PANEL_ID: PANEL_ID,
    STYLE_ID: STYLE_ID,
    PICKER_OVERLAY_ID: PICKER_OVERLAY_ID,
    MERCH_CAP_PER: 1000,
    SEND_DELAY_MS: 250,
  };

  Y.ts = nowTs;
  Y.log = log; Y.warn = warn; Y.err = err;

  Y.qs = qs; Y.qsa = qsa; Y.on = on;

  Y.safeInt = safeInt;
  Y.parseTwNumber = parseTwNumber;
  Y.formatTwNumber = formatTwNumber;

  Y.debounce = debounce;
  Y.sleep = sleep;

  Y.lsGet = lsGet; Y.lsSet = lsSet;

  Y.getCurrentVillageId = getCurrentVillageId;
  Y.getLinkBasePure = getLinkBasePure;
  Y.buildGameUrl = buildGameUrl;
  Y.parseVillageIdFromHref = parseVillageIdFromHref;
  Y.parseCoordsFromText = parseCoordsFromText;

  Y.httpGet = httpGet;
  Y.parseHTML = parseHTML;
  Y.extractUpdateGameData = extractUpdateGameData;

  Y.destroy = destroy;

  log('bootstrap loaded ✅');
})();
