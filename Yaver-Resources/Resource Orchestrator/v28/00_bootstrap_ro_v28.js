(function () {
  'use strict';

  var VERSION = 'v28';
  var NS = 'YRO_V28';
  var PANEL_ID = 'yro_panel_v28';
  var STYLE_ID = 'yro_css_v28';
  var PICKER_OVERLAY_ID = 'yro_picker_overlay_v28';
  var LS_KEY = 'yro_v28_state';

  function removeIfExists(id) {
    var el = document.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function cleanupOlderInstances() {
    [
      'yro_panel_v7', 'yro_css_v7',
      'yro_panel_v10', 'yro_css_v10',
      'yro_panel_v11', 'yro_css_v11',
      'yro_panel_v22', 'yro_css_v22', 'yro_picker_overlay_v22',
      PANEL_ID, STYLE_ID, PICKER_OVERLAY_ID
    ].forEach(removeIfExists);

    try { if (window.YRO_V11) delete window.YRO_V11; } catch (e1) {}
    try { if (window.YRO_V22) delete window.YRO_V22; } catch (e2) {}
    try { if (window.YRO_V28) delete window.YRO_V28; } catch (e3) {}
    try { if (window.__YAVER_RESOURCE_ORCHESTRATOR_V7__) delete window.__YAVER_RESOURCE_ORCHESTRATOR_V7__; } catch (e4) {}
  }

  cleanupOlderInstances();

  var Y = {};
  window[NS] = Y;

  Y._rt = { listeners: [], aborters: [], destroyed: false };

  function nowTs() {
    var d = new Date();
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  function log() {
    var a = [].slice.call(arguments);
    a.unshift('[YRO ' + VERSION + ']');
    console.log.apply(console, a);
  }

  function warn() {
    var a = [].slice.call(arguments);
    a.unshift('[YRO ' + VERSION + ']');
    console.warn.apply(console, a);
  }

  function err() {
    var a = [].slice.call(arguments);
    a.unshift('[YRO ' + VERSION + ']');
    console.error.apply(console, a);
  }

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function safeInt(x, dflt) {
    var n = parseInt(x, 10);
    return isNaN(n) ? (dflt || 0) : n;
  }

  function toId(x) {
    var n = safeInt(x, 0);
    return n > 0 ? n : 0;
  }

  function uniqIds(arr) {
    arr = Array.isArray(arr) ? arr : [];
    var seen = Object.create(null);
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var id = toId(arr[i]);
      if (!id || seen[id]) continue;
      seen[id] = true;
      out.push(id);
    }
    return out;
  }

  function normalizeGroupName(name) {
    var s = String(name == null ? '' : name)
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!s) return '';
    s = s.replace(/^[>\]]+\s*/, '').replace(/\s*[<\[]+$/, '').trim();
    s = s.replace(/^[>\[]+\s*/, '').replace(/\s*[<\]]+$/, '').trim();
    return s;
  }

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
      t = setTimeout(function () { fn.apply(ctx, args); }, ms || 150);
    };
  }

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms || 0); });
  }

  function lsGet(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function lsSet(key, obj) {
    try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) {}
  }

  function getCurrentVillageId() {
    try {
      if (window.game_data && game_data.village && game_data.village.id) return toId(game_data.village.id);
    } catch (e1) {}
    try {
      var sp = new URLSearchParams(window.location.search);
      return toId(sp.get('village'));
    } catch (e2) {}
    return 0;
  }

  function getLinkBasePure() {
    try {
      if (window.game_data && game_data.link_base_pure) return game_data.link_base_pure;
    } catch (e) {}
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
      return toId(u.searchParams.get('village'));
    } catch (e) {
      var m = String(href).match(/[?&]village=(\d+)/);
      return m ? toId(m[1]) : 0;
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

    Y._rt.aborters.forEach(function (a) {
      try { a.abort(); } catch (e) {}
    });
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
    var t = setTimeout(function () {
      try { ac.abort(); } catch (e) {}
    }, timeoutMs);

    try {
      var resp = await fetch(url, { method: 'GET', credentials: 'same-origin', signal: ac.signal });
      if (!resp.ok) throw new Error('HTTP ' + resp.status + ' ' + resp.statusText);
      return await resp.text();
    } finally {
      clearTimeout(t);
    }
  }

  function parseHTML(html) {
    return new DOMParser().parseFromString(String(html || ''), 'text/html');
  }

  function extractUpdateGameData(html) {
    var s = String(html || '');
    var key = 'TribalWars.updateGameData(';
    var idx = s.indexOf(key);
    if (idx < 0) return null;

    var i = s.indexOf('{', idx + key.length);
    if (i < 0) return null;

    var depth = 0;
    var j = i;
    for (; j < s.length; j++) {
      var ch = s[j];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
    }
    if (depth !== 0) return null;

    var jsonText = s.slice(i, j);
    try {
      return JSON.parse(jsonText);
    } catch (e) {
      warn('updateGameData JSON.parse failed', e);
      return null;
    }
  }

  function defaultState() {
    return {
      ui: {
        left: 30,
        top: 70,
        minimized1: true,
        minimized2: true,
        search: ''
      },
      groups: {
        list: [{ id: 0, name: 'All villages' }, { id: -1, name: 'Custom selection...' }],
        sel1: 0,
        sel2: 0,
        A_target: 0,
        A_surplus: 0,
        B_parents: 0,
        B_children: 0,
        B_surplus: 0,
        C_sources: 0,
        C_coin: 0,
        C_buffer: 0
      },
      custom: {
        t1: [],
        t2: [],
        A_target: [],
        A_surplus: [],
        B_parents: [],
        B_children: [],
        B_surplus: [],
        C_sources: [],
        C_coin: [],
        C_buffer: []
      },
      orchestrator: {
        mode: 'push'
      },
      modeA: {
        capPct: 80,
        surplusCapPct: 95
      },
      modeB: {
        parentReservePct: 1,
        childrenMaxFillPct: 80,
        surplusCapPct: 95
      },
      modeC: {
        sourceReservePct: 1,
        bufferCapPct: 95
      },
      cache: {
        groupsFetchedAt: 0,
        groupVillageIds: {},
        villages: {},
        incomingMap: {},
        outgoingMap: {},
        coinCosts: {},
        lastFullScanAt: 0
      }
    };
  }

  function mergeMissing(target, defaults) {
    for (var k in defaults) {
      if (!Object.prototype.hasOwnProperty.call(defaults, k)) continue;
      if (defaults[k] && typeof defaults[k] === 'object' && !Array.isArray(defaults[k])) {
        if (!target[k] || typeof target[k] !== 'object' || Array.isArray(target[k])) target[k] = {};
        mergeMissing(target[k], defaults[k]);
      } else if (target[k] === undefined) {
        target[k] = defaults[k];
      }
    }
    return target;
  }

  function sanitizeState(st) {
    st = st && typeof st === 'object' ? st : {};
    st = mergeMissing(st, defaultState());

    st.groups.list = Array.isArray(st.groups.list) ? st.groups.list : defaultState().groups.list;
    st.groups.list = st.groups.list.map(function (g) {
      return {
        id: safeInt(g && g.id, 0),
        name: normalizeGroupName(g && g.name) || (safeInt(g && g.id, 0) === 0 ? 'All villages' : (safeInt(g && g.id, 0) === -1 ? 'Custom selection...' : String(safeInt(g && g.id, 0))))
      };
    }).filter(function (g, idx, arr) {
      if (!g.name) return false;
      for (var i = 0; i < idx; i++) {
        if (String(arr[i].id) === String(g.id)) return false;
      }
      return true;
    });
    st.custom.t1 = uniqIds(st.custom.t1);
    st.custom.t2 = uniqIds(st.custom.t2);
    st.custom.A_target = uniqIds(st.custom.A_target);
    st.custom.A_surplus = uniqIds(st.custom.A_surplus);
    st.custom.B_parents = uniqIds(st.custom.B_parents);
    st.custom.B_children = uniqIds(st.custom.B_children);
    st.custom.B_surplus = uniqIds(st.custom.B_surplus);
    if (!Array.isArray(st.custom.C_coin) && Array.isArray(st.custom.C_target)) st.custom.C_coin = st.custom.C_target.slice();
    if (!Array.isArray(st.custom.C_buffer) && Array.isArray(st.custom.C_surplus)) st.custom.C_buffer = st.custom.C_surplus.slice();
    st.custom.C_sources = uniqIds(st.custom.C_sources);
    st.custom.C_coin = uniqIds(st.custom.C_coin);
    st.custom.C_buffer = uniqIds(st.custom.C_buffer);

    st.groups.sel1 = safeInt(st.groups.sel1, 0);
    st.groups.sel2 = safeInt(st.groups.sel2, 0);
    st.groups.A_target = safeInt(st.groups.A_target, 0);
    st.groups.A_surplus = safeInt(st.groups.A_surplus, 0);
    st.groups.B_parents = safeInt(st.groups.B_parents, 0);
    st.groups.B_children = safeInt(st.groups.B_children, 0);
    st.groups.B_surplus = safeInt(st.groups.B_surplus, 0);
    if (st.groups.C_coin == null && st.groups.C_target != null) st.groups.C_coin = st.groups.C_target;
    if (st.groups.C_buffer == null && st.groups.C_surplus != null) st.groups.C_buffer = st.groups.C_surplus;
    st.groups.C_sources = safeInt(st.groups.C_sources, 0);
    st.groups.C_coin = safeInt(st.groups.C_coin, 0);
    st.groups.C_buffer = safeInt(st.groups.C_buffer, 0);
    delete st.groups.C_target;
    delete st.groups.C_surplus;

    st.modeA.capPct = safeInt(st.modeA.capPct, 80);
    st.modeA.surplusCapPct = safeInt(st.modeA.surplusCapPct, 95);
    delete st.modeA.ironDeltaPct;

    st.modeB.parentReservePct = safeInt(st.modeB.parentReservePct, 1);
    st.modeB.childrenMaxFillPct = safeInt(st.modeB.childrenMaxFillPct, 80);
    st.modeB.surplusCapPct = safeInt(st.modeB.surplusCapPct, 95);

    if (st.modeC.sourceReservePct == null && st.modeC.reservePct != null) st.modeC.sourceReservePct = st.modeC.reservePct;
    if (st.modeC.bufferCapPct == null && st.modeC.surplusCapPct != null) st.modeC.bufferCapPct = st.modeC.surplusCapPct;
    st.modeC.sourceReservePct = safeInt(st.modeC.sourceReservePct, 1);
    st.modeC.bufferCapPct = safeInt(st.modeC.bufferCapPct, 95);
    delete st.modeC.reservePct;
    delete st.modeC.capPct;
    delete st.modeC.surplusCapPct;
    delete st.modeC.ironDeltaPct;

    if (!st.cache || typeof st.cache !== 'object') st.cache = defaultState().cache;
    if (!st.cache.groupVillageIds || typeof st.cache.groupVillageIds !== 'object') st.cache.groupVillageIds = {};
    if (!st.cache.villages || typeof st.cache.villages !== 'object') st.cache.villages = {};
    if (!st.cache.incomingMap || typeof st.cache.incomingMap !== 'object') st.cache.incomingMap = {};
    if (!st.cache.outgoingMap || typeof st.cache.outgoingMap !== 'object') st.cache.outgoingMap = {};
    if (!st.cache.coinCosts || typeof st.cache.coinCosts !== 'object') st.cache.coinCosts = {};

    return st;
  }

  function loadState() {
    return sanitizeState(lsGet(LS_KEY));
  }

  Y.state = loadState();
  Y.saveState = function () {
    Y.state = sanitizeState(Y.state);
    lsSet(LS_KEY, Y.state);
  };

  Y.runtime = {
    plan: null,
    snapshotsById: {},
    coordToId: {},
    nameToIds: {}
  };

  Y.cfg = {
    VERSION: VERSION,
    NS: NS,
    PANEL_ID: PANEL_ID,
    STYLE_ID: STYLE_ID,
    PICKER_OVERLAY_ID: PICKER_OVERLAY_ID,
    LS_KEY: LS_KEY,
    MERCH_CAP_PER: 1000,
    SEND_DELAY_MS: 250,
    PHASE_ORDER: {
      COI: 1,
      BUF: 2,
      CRB: 1,
      PIM: 2,
      SUR: 3
    }
  };

  Y.ts = nowTs;
  Y.log = log;
  Y.warn = warn;
  Y.err = err;
  Y.qs = qs;
  Y.qsa = qsa;
  Y.on = on;
  Y.safeInt = safeInt;
  Y.toId = toId;
  Y.uniqIds = uniqIds;
  Y.normalizeGroupName = normalizeGroupName;
  Y.parseTwNumber = parseTwNumber;
  Y.formatTwNumber = formatTwNumber;
  Y.debounce = debounce;
  Y.sleep = sleep;
  Y.lsGet = lsGet;
  Y.lsSet = lsSet;
  Y.getCurrentVillageId = getCurrentVillageId;
  Y.getLinkBasePure = getLinkBasePure;
  Y.buildGameUrl = buildGameUrl;
  Y.parseVillageIdFromHref = parseVillageIdFromHref;
  Y.parseCoordsFromText = parseCoordsFromText;
  Y.httpGet = httpGet;
  Y.parseHTML = parseHTML;
  Y.extractUpdateGameData = extractUpdateGameData;
  Y.defaultState = defaultState;
  Y.destroy = destroy;

  log('bootstrap loaded');
})();

